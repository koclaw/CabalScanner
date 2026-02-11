const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../cabal_scanner.db');
const db = new Database(dbPath);

// Initialize Tables
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

module.exports = db;
