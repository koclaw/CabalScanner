# CabalScanner 🕵️‍♂️

**Detect coordinated insider activity and "Cabal" wallets on Solana.**

CabalScanner is an AI-powered analytics tool that ingests Solana transaction data to identify clusters of wallets that buy and sell in coordination. By analyzing timestamp proximity and volume patterns, it surfaces hidden relationships between wallets, helping traders avoid rug pulls and identify insider accumulation.

![Status](https://img.shields.io/badge/Status-Submitted-success) ![Stack](https://img.shields.io/badge/Stack-MERN-blue) ![Chain](https://img.shields.io/badge/Solana-Mainnet-green)

## 🚀 Features

*   **Token Analysis:** Input any Solana Token CA to fetch recent transaction history.
*   **Cabal Detection:** automatic clustering of wallets that execute buy orders within a 60-second window of each other.
*   **Volume Heatmap:** Visualizes transaction density over time (Green-scale intensity) to spot accumulation phases.
*   **Leader-Follower Graph:** Identifies "Leader" wallets (first movers) and their network of "Followers".
*   **Live Activity Feed:** Real-time monitoring of buy/sell pressure.
*   **Dune-Style Analytics:** Clean, professional dashboard with key metrics (Total Volume, Active Wallets, Cabal Confidence Score).

## 🛠 Tech Stack

*   **Frontend:** React (Vite), TailwindCSS (Geist Font), Recharts
*   **Backend:** Node.js, Express.js
*   **Database:** SQLite (local caching of analysis results)
*   **Blockchain Data:** Helius RPC & API (Transaction ingestion)

## 📦 Installation

### Prerequisites
*   Node.js (v18+)
*   Helius API Key (Get one at [dev.helius.xyz](https://dev.helius.xyz/))

### 1. Clone the Repository
```bash
git clone https://github.com/koclaw/CabalScanner.git
cd CabalScanner
```

### 2. Setup Backend
```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:
```env
PORT=5000
HELIUS_API_KEY=your_helius_api_key_here
```

Start the server:
```bash
npm start
```
*Server runs on http://localhost:5000*

### 3. Setup Frontend
```bash
cd ../client
npm install
npm run dev
```
*Client runs on http://localhost:5173*

## 🧠 How It Works

1.  **Ingestion:** The backend fetches the last 1000 transactions for a given token via Helius.
2.  **Parsing:** Transactions are parsed to identify `SWAP` events and extract buyer/seller addresses.
3.  **Clustering Algorithm:**
    *   Sorts all buy events by timestamp.
    *   Iterates through events to find wallets buying within `60s` of a "Leader".
    *   Assigns a "Coordinated Score" based on the frequency of co-occurrence.
4.  **Visualization:** The frontend renders a heatmap of activity and a list of high-confidence Cabal groups.

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/scan/:tokenAddress` | Triggers a new scan for a token. Accepts `{ timeframe: '24h' }` body. |
| `GET` | `/api/volume/:tokenAddress` | Returns volume data bucketed by time for the heatmap. |
| `GET` | `/api/cabals` | Returns the list of detected cabals and their scores. |
| `POST` | `/api/track` | Manually add a wallet to the tracking watchlist. |

## 🔮 Future Roadmap

*   **V2:** Real-time Telegram/Discord alerts when a known Cabal enters a new token.
*   **Graph Visualization:** Interactive node-link diagram of the wallet network.
*   **Pro Tier:** Historical analysis beyond the last 1000 transactions using a dedicated indexer.

## 🏆 Hackathon
Submitted to the **Solana AI Agent Hackathon** (February 2026).

---
*Built with ❤️ on Solana.*
