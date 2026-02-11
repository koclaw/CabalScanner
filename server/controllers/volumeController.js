const axios = require('axios');

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

exports.getVolume = async (req, res) => {
    const { tokenAddress } = req.params;
    console.log(`Fetching volume for: ${tokenAddress}`);

    try {
        let allTxs = [];
        let url = `https://api.helius.xyz/v0/addresses/${tokenAddress}/transactions?api-key=${HELIUS_API_KEY}`;
        const response = await axios.get(url);
        const txs = response.data;
        
        if (Array.isArray(txs)) {
             allTxs = txs;
        }

        const volumeMap = {}; 

        allTxs.forEach(tx => {
            if (!tx.timestamp) return;
            const date = new Date(tx.timestamp * 1000);
            date.setMinutes(0, 0, 0); 
            const key = date.toISOString();

            volumeMap[key] = (volumeMap[key] || 0) + 1;
        });

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
};
