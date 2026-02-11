const axios = require('axios');
const db = require('../config/db');

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

exports.scanToken = async (req, res) => {
    const { tokenAddress } = req.params;
    console.log(`Scanning token: ${tokenAddress}`);

    try {
        const response = await axios.get(`https://api.helius.xyz/v0/addresses/${tokenAddress}/transactions?api-key=${HELIUS_API_KEY}`);
        const transactions = response.data;

        if (!Array.isArray(transactions)) {
           return res.status(500).json({ error: "Invalid Helius response (not an array)", details: transactions });
        }

        const buys = []; 
        for (const tx of transactions) {
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
        
        const relationships = [];
        buys.sort((a, b) => a.timestamp - b.timestamp);

        for (let i = 0; i < buys.length; i++) {
            const leader = buys[i];
            for (let j = i + 1; j < buys.length; j++) {
                const follower = buys[j];
                const timeDiff = follower.timestamp - leader.timestamp;

                if (timeDiff > 60) break; 
                if (leader.buyer === follower.buyer) continue; 

                try {
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
};
