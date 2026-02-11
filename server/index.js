// ... (previous code)

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

// CORE LOGIC: Scan a Token for Cabals
app.post('/api/scan/:tokenAddress', async (req, res) => {
    const { tokenAddress } = req.params;
    console.log(`Scanning token: ${tokenAddress}`);

    try {
        // 1. Fetch recent transactions for the token
        const response = await axios.get(`https://api.helius.xyz/v0/addresses/${tokenAddress}/transactions?api-key=${HELIUS_API_KEY}`);
        const transactions = response.data;

        let processedCount = 0;
        const buys = []; // Store simplified buy events: { signature, wallet, timestamp }

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
        // This is a naive O(N^2) approach for the MVP.
        
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
                // In a real app, we'd weight this (frequency of following)
                try {
                    db.prepare(`
                        INSERT INTO relationships (leader_address, follower_address, score) 
                        VALUES (?, ?, 1)
                        ON CONFLICT(leader_address, follower_address) 
                        DO UPDATE SET score = score + 1
                    `).run(leader.buyer, follower.buyer);
                    relationships.push({ leader: leader.buyer, follower: follower.buyer, timeDiff });
                } catch (e) { console.error(e); }
            }
        }

        res.json({ 
            success: true, 
            message: `Scanned ${transactions.length} txs. Found ${buys.length} buys and ${relationships.length} potential links.`,
            relationships: relationships.slice(0, 50) // Return top 50 for now
        });

    } catch (error) {
        console.error("Scan Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
