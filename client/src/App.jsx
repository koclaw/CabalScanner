import { useState, useEffect } from 'react'

function App() {
  const [cabals, setCabals] = useState([])
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch Cabal Data (Mock for now, would connect to backend)
  useEffect(() => {
    // In a real app, fetch from /api/cabals
    // fetch('http://localhost:5000/api/cabals')
    //   .then(res => res.json())
    //   .then(data => setCabals(data))
    
    // Mock Data for UI Dev
    setCabals([
      { id: 1, leader: 'HG7...x9z', followers: 12, volume: '$4.2M', tags: ['High Vol', 'Insider'] },
      { id: 2, leader: 'Sol...Ck1', followers: 8, volume: '$1.1M', tags: ['Accumulator'] },
    ])
  }, [])

  const handleTrack = async (e) => {
    e.preventDefault()
    if (!address) return
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setCabals([...cabals, { id: Date.now(), leader: address.substring(0, 6) + '...' + address.substring(address.length - 4), followers: 0, volume: '$0', tags: ['New'] }])
      setAddress('')
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-mono p-8">
      <header className="mb-12 flex justify-between items-center border-b border-gray-700 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-green-400">CabalScanner_</h1>
          <p className="text-gray-400 text-sm mt-1">Detect insider wallets & follower clusters on Solana</p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p>Status: ONLINE</p>
          <p>Helius RPC: CONNECTED</p>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-green-300">Track New Wallet</h2>
            <form onSubmit={handleTrack} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Wallet Address</label>
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="Enter SOL address..."
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
              >
                {loading ? 'Scanning...' : 'Start Tracking'}
              </button>
            </form>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">Live Feed</h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-gray-400 border-b border-gray-700 pb-2">
                <span>TX: 5x9...jK2</span>
                <span className="text-green-400">BUY 500 SOL</span>
              </div>
              <div className="flex justify-between items-center text-gray-400 border-b border-gray-700 pb-2">
                <span>TX: 8z1...mL9</span>
                <span className="text-red-400">SELL 200 SOL</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>TX: 2a4...pQ7</span>
                <span className="text-blue-400">SWAP USDC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-purple-300">Detected Cabals</h2>
              <button className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">Refresh</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="pb-3 pl-2">Leader Wallet</th>
                    <th className="pb-3">Followers</th>
                    <th className="pb-3">24h Volume</th>
                    <th className="pb-3">Tags</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {cabals.map((cabal) => (
                    <tr key={cabal.id} className="hover:bg-gray-750 transition-colors">
                      <td className="py-4 pl-2 font-mono text-blue-400">{cabal.leader}</td>
                      <td className="py-4">{cabal.followers} Wallets</td>
                      <td className="py-4 text-green-400">{cabal.volume}</td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          {cabal.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300 border border-gray-600">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <button className="text-xs text-green-400 hover:text-green-300 underline">Analyze</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {cabals.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No cabals detected yet. Start tracking wallets to build the graph.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
