const db = require('../config/db');

exports.trackWallet = (req, res) => {
  const { address, type } = req.body;
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO wallets (address, type) VALUES (?, ?)');
    stmt.run(address, type || 'unknown');
    res.json({ success: true, message: `Tracking wallet: ${address}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCabals = (req, res) => {
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
};
