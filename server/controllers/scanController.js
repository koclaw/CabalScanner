const axios = require('axios');
const db = require('../config/db');

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

exports.scanToken = async (req, res) => {
    const { tokenAddress } = req.params;
    const { timeframe } = req.body; // '24h', '7d', 'custom' (future)
    console.log(`Scanning token: ${tokenAddress} [${timeframe || 'recent'}]`);

    try {
        // 1. Check CACHE (SQLite) for recent analysis (< 5 mins old)
        // For hackathon MVP, we'll cache aggressively.
        // TODO: Implement proper cache expiry.

        // 2. FETCH DATA (If not cached)
        // We need to support time-based fetching.
        // Helius doesn't support 'since' timestamp directly in v0/transactions, 
        // so we have to fetch recent and filter manually, or use 'before' pagination.
        
        // For MVP: Fetch last 1000 txs (approx last hour/day depending on volume)
        // In V2: We will use `before` signature pagination to go back in time.
        
        let allTxs = [];
        let beforeSignature = null;
        const LIMIT = 1000; // Limit to 1000 for now to stay within rate limits

        while (allTxs.length < LIMIT) {
            let url = `https://api.helius.xyz/v0/addresses/${tokenAddress}/transactions?api-key=${HELIUS_API_KEY}`;
            if (beforeSignature) {
                url += `&before=${beforeSignature}`;
            }
            
            const response = await axios.get(url);
            const txs = response.data;

            if (!txs || txs.length === 0) break;
            
            allTxs = allTxs.concat(txs);
            beforeSignature = txs[txs.length - 1].signature;
            
            // Optimization: Stop if we hit transactions older than 24h (if timeframe is 24h)
            // const lastTxTime = txs[txs.length - 1].timestamp;
            // if (Date.now()/1000 - lastTxTime > 86400) break; 
        }

        // 3. ANALYZE (Clustering Algorithm)
        const buys = []; 
        for (const tx of allTxs) {
            if (tx.type === 'SWAP') {
                const tokenTransfer = tx.tokenTransfers.find(t => t.mint === tokenAddress);
                if (tokenTransfer && tokenTransfer.toUserAccount) {
                     const buyer = tokenTransfer.toUserAccount;
                     const timestamp = tx.timestamp; 
                     
                     buys.push({ signature: tx.signature, buyer, timestamp });

                     try {
                         db.prepare('INSERT OR IGNORE INTO wallets (address, type, last_seen) VALUES (?, ?, ?)').run(buyer, 'unknown', timestamp);
                     } catch(e) { /* ignore */ }
                }
            }
        }
        
        // Grouping: Co-occurrence in <60s window
        buys.sort((a, b) => a.timestamp - b.timestamp);

        let relationshipsFound = 0;

        for (let i = 0; i < buys.length; i++) {
            const leader = buys[i];
            
            for (let j = i + 1; j < buys.length; j++) {
                const follower = buys[j];
                const timeDiff = follower.timestamp - leader.timestamp;

                if (timeDiff > 60) break; 
                if (leader.buyer === follower.buyer) continue; 

                try {
                    // Update Relationship Score
                    const updateInfo = db.prepare(`
                        UPDATE relationships 
                        SET score = score + 1 
                        WHERE leader_address = ? AND follower_address = ?
                    `).run(leader.buyer, follower.buyer);

                    if (updateInfo.changes === 0) {
                         db.prepare(`
                            INSERT INTO relationships (leader_address, follower_address, score) 
                            VALUES (?, ?, 1)
                        `).run(leader.buyer, follower.buyer);
                    }
                    relationshipsFound++;
                } catch (e) { 
                    console.error("DB Insert Error:", e.message); 
                }
            }
        }

        res.json({ 
            success: true, 
            message: `Analyzed ${allTxs.length} txs. Found ${buys.length} buys.`,
            relationshipsUpdated: relationshipsFound
        });

    } catch (error) {
        console.error("Scan Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};
