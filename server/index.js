const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// Database Setup
const db = new Database('cabal_scanner.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS wallets (
    address TEXT PRIMARY KEY,
    type TEXT DEFAULT 'unknown', -- 'leader', 'follower', 'ignored'
    volume REAL DEFAULT 0,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    signature TEXT PRIMARY KEY,
    wallet_address TEXT,
    token_address TEXT,
    amount REAL,
    timestamp DATETIME,
    FOREIGN KEY(wallet_address) REFERENCES wallets(address)
  );
  
  CREATE TABLE IF NOT EXISTS relationships (
    leader_address TEXT,
    follower_address TEXT,
    score INTEGER DEFAULT 0,
    UNIQUE(leader_address, follower_address)
  );
`);

// API Routes
app.get('/', (req, res) => {
  res.send('CabalScanner API Running');
});

// Add a wallet to track
app.post('/api/track', (req, res) => {
  const { address, type } = req.body;
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO wallets (address, type) VALUES (?, ?)');
    stmt.run(address, type || 'unknown');
    res.json({ success: true, message: `Tracking wallet: ${address}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get potential cabals (leaders with followers)
app.get('/api/cabals', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        w.address as leader, 
        COUNT(r.follower_address) as follower_count,
        GROUP_CONCAT(r.follower_address) as followers
      FROM wallets w
      JOIN relationships r ON w.address = r.leader_address
      GROUP BY w.address
      ORDER BY follower_count DESC
    `);
    const cabals = stmt.all();
    res.json(cabals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helius Proxy (Example: Get Transaction History)
app.get('/api/history/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const response = await axios.get(`https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}`);
        res.json(response.data);
    } catch (error) {
        console.error("Helius API Error:", error.message);
        res.status(500).json({ error: "Failed to fetch from Helius" });
    }
});

// VOLUME HEATMAP: Get transaction volume over time (Bucketed by Hour/Day)
app.get('/api/volume/:tokenAddress', async (req, res) => {
    const { tokenAddress } = req.params;
    console.log(`Fetching volume for: ${tokenAddress}`);

    try {
        // HACK: For the MVP, we'll fetch the last 100 transactions (limit) from Helius 
        // to approximate recent activity. Deep fetching requires more sophisticated pagination.
        // In production, we'd iterate with 'before' cursor until we hit a time limit.
        
        let allTxs = [];
        let beforeSignature = null;
        const LIMIT = 100; // Limit for initial test to be fast. Increase to 1000 for production.

        // Initial fetch
        let url = `https://api.helius.xyz/v0/addresses/${tokenAddress}/transactions?api-key=${HELIUS_API_KEY}`;
        const response = await axios.get(url);
        const txs = response.data;
        
        if (Array.isArray(txs)) {
             allTxs = txs;
        }

        // Bucket by Hour
        const volumeMap = {}; // { "2023-10-27T10:00:00.000Z": 50 }

        allTxs.forEach(tx => {
            if (!tx.timestamp) return;
            const date = new Date(tx.timestamp * 1000);
            date.setMinutes(0, 0, 0); // Round down to hour
            const key = date.toISOString();

            volumeMap[key] = (volumeMap[key] || 0) + 1;
        });

        // Convert to sorted array
        const heatmapData = Object.entries(volumeMap).map(([time, count]) => ({
            time,
            count
        })).sort((a, b) => new Date(a.time) - new Date(b.time));

        res.json({
            success: true,
            totalScanned: allTxs.length,
            heatmap: heatmapData
        });

    } catch (error) {
        console.error("Volume Fetch Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// CORE LOGIC: Scan a Token for Cabals
app.post('/api/scan/:tokenAddress', async (req, res) => {
    const { tokenAddress } = req.params;
    console.log(`Scanning token: ${tokenAddress}`);

    try {
        // 1. Fetch recent transactions for the token
        const response = await axios.get(`https://api.helius.xyz/v0/addresses/${tokenAddress}/transactions?api-key=${HELIUS_API_KEY}`);
        const transactions = response.data;

        // Ensure we got an array
        if (!Array.isArray(transactions)) {
           return res.status(500).json({ error: "Invalid Helius response (not an array)", details: transactions });
        }

        const buys = []; // Store simplified buy events: { signature, buyer, timestamp }

        // 2. Parse Transactions to find BUYs
        for (const tx of transactions) {
            if (tx.type === 'SWAP') {
                // Find the token transfer *to* a wallet (Buying the token)
                const tokenTransfer = tx.tokenTransfers.find(t => t.mint === tokenAddress);
                if (tokenTransfer && tokenTransfer.toUserAccount) {
                     const buyer = tokenTransfer.toUserAccount;
                     const timestamp = tx.timestamp; // Unix timestamp
                     
                     buys.push({ signature: tx.signature, buyer, timestamp });

                     // Store wallet in DB
                     try {
                         db.prepare('INSERT OR IGNORE INTO wallets (address, type, last_seen) VALUES (?, ?, ?)').run(buyer, 'unknown', timestamp);
                     } catch(e) { /* ignore */ }
                }
            }
        }
        
        // 3. Analyze for "Cabal" patterns (Coordinated Buys)
        // Simple algorithm: Group buys that happen within a short window (e.g., 60s)
        
        const relationships = [];
        
        // Sort by time
        buys.sort((a, b) => a.timestamp - b.timestamp);

        for (let i = 0; i < buys.length; i++) {
            const leader = buys[i];
            
            // Look ahead for followers in the next 60 seconds
            for (let j = i + 1; j < buys.length; j++) {
                const follower = buys[j];
                const timeDiff = follower.timestamp - leader.timestamp;

                if (timeDiff > 60) break; // Outside window
                if (leader.buyer === follower.buyer) continue; // Same person

                // Record relationship
                try {
                    // Try to update existing score first
                    const updateInfo = db.prepare(`
                        UPDATE relationships 
                        SET score = score + 1 
                        WHERE leader_address = ? AND follower_address = ?
                    `).run(leader.buyer, follower.buyer);

                    // If no row updated, insert new
                    if (updateInfo.changes === 0) {
                         db.prepare(`
                            INSERT INTO relationships (leader_address, follower_address, score) 
                            VALUES (?, ?, 1)
                        `).run(leader.buyer, follower.buyer);
                    }

                    relationships.push({ leader: leader.buyer, follower: follower.buyer, timeDiff });
                } catch (e) { 
                    console.error("DB Insert Error:", e.message); 
                }
            }
        }

        res.json({ 
            success: true, 
            message: `Scanned ${transactions.length} txs. Found ${buys.length} buys.`,
            relationshipsCount: relationships.length
        });

    } catch (error) {
        console.error("Scan Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
