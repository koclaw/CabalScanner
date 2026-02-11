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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
