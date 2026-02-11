import { useState, useEffect } from 'react'

function App() {
  const [tokenAddress, setTokenAddress] = useState('DLMmRN9rbZspAAC3a1HgDHMC893Y2Ca9GjoNh9StwnYG')
  const [volumeData, setVolumeData] = useState([])
  const [cabals, setCabals] = useState([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [timeframe, setTimeframe] = useState('24h') // 24h, 7d, custom

  // Fetch Volume Data
  const fetchVolume = async () => {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:5000/api/volume/${tokenAddress}`)
      const data = await res.json()
      if (data.success) {
        setVolumeData(data.heatmap)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Scan for Cabals
  const scanCabals = async () => {
    setScanning(true)
    try {
      const res = await fetch(`http://localhost:5000/api/scan/${tokenAddress}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe })
      })
      const data = await res.json()
      if (data.success) {
        // Refresh cabal list
        fetchCabals()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setScanning(false)
    }
  }

  const fetchCabals = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/cabals')
      const data = await res.json()
      setCabals(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (tokenAddress) {
      fetchVolume()
      fetchCabals()
    }
  }, [])

  // Helper to get color intensity for heatmap (GREEN)
  const getIntensity = (count) => {
    if (count === 0) return 'bg-gray-50'
    if (count < 5) return 'bg-green-100'
    if (count < 10) return 'bg-green-300'
    if (count < 20) return 'bg-green-500'
    return 'bg-green-700'
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans p-8">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center border-b border-gray-200 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-black rounded-full"></div>
          <h1 className="text-xl font-semibold tracking-tight">CabalScanner</h1>
        </div>
        <div className="flex gap-4">
           <button className="text-sm font-medium text-gray-500 hover:text-black transition-colors">Documentation</button>
           <button className="text-sm font-medium text-gray-500 hover:text-black transition-colors">Connect Wallet</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        
        {/* Search & Actions */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Token Contract Address</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                placeholder="Enter SOL token address..."
              />
              
              <select 
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-gray-700"
              >
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7d</option>
                <option value="custom">Custom</option>
              </select>

              <button 
                onClick={fetchVolume}
                disabled={loading}
                className="bg-white border border-gray-200 hover:border-gray-400 text-black font-medium px-6 py-3 rounded-lg text-sm transition-all shadow-sm"
              >
                {loading ? 'Loading...' : 'Load Data'}
              </button>
              <button 
                onClick={scanCabals}
                disabled={scanning}
                className="bg-black text-white hover:bg-gray-800 font-medium px-6 py-3 rounded-lg text-sm transition-all shadow-sm flex items-center gap-2"
              >
                {scanning ? (
                  <>
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    Scanning...
                  </>
                ) : 'Run Cabal Scan'}
              </button>
            </div>
          </div>
        </div>

        {/* Heatmap Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold">Activity Heatmap</h2>
              <p className="text-sm text-gray-500 mt-1">Transaction volume over time</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-gray-50 border border-gray-100"></div>
                <div className="w-3 h-3 rounded-sm bg-green-100"></div>
                <div className="w-3 h-3 rounded-sm bg-green-300"></div>
                <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                <div className="w-3 h-3 rounded-sm bg-green-700"></div>
              </div>
              <span>More</span>
            </div>
          </div>
          
          <div className="flex gap-1 overflow-x-auto pb-2 min-h-[140px] items-end">
            {volumeData.length === 0 ? (
               <div className="w-full h-32 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                 No volume data loaded. Enter a token address to start.
               </div>
            ) : (
              volumeData.map((d, i) => (
                <div key={i} className="group relative flex flex-col gap-1 items-center">
                   {/* Tooltip */}
                   <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 w-max bg-black text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none">
                     {new Date(d.time).toLocaleString()} - {d.count} txs
                   </div>
                   {/* Bar/Block */}
                   <div 
                     className={`w-3 rounded-sm transition-all hover:ring-2 hover:ring-offset-1 hover:ring-green-500 ${getIntensity(d.count)}`}
                     style={{ height: '24px' }} // Fixed height blocks for grid look
                   ></div>
                   {/* Or for pure grid look like reference, we stack them. Let's do a single row for hourly timeline for now */}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Section: 2 Cols */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Live Feed (Left) */}
          <div className="lg:col-span-1 border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">Live Activity</h3>
            <div className="space-y-4">
               {/* Mock Live Items if empty */}
               <div className="flex items-center justify-between py-2 border-b border-gray-100">
                 <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-green-500"></div>
                   <div>
                     <p className="text-sm font-medium">Buying Pressure</p>
                     <p className="text-xs text-gray-400">2 mins ago</p>
                   </div>
                 </div>
                 <span className="text-sm font-mono">+450 SOL</span>
               </div>
               <div className="flex items-center justify-between py-2 border-b border-gray-100">
                 <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-red-500"></div>
                   <div>
                     <p className="text-sm font-medium">Whale Exit</p>
                     <p className="text-xs text-gray-400">5 mins ago</p>
                   </div>
                 </div>
                 <span className="text-sm font-mono">-1,200 SOL</span>
               </div>
            </div>
          </div>

          {/* Detected Cabals (Right - Wider) */}
          <div className="lg:col-span-2 border border-gray-200 rounded-xl p-6 shadow-sm min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Detected Cabals</h3>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                {cabals.length} Found
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs">
                    <th className="pb-4 pl-2 font-medium">Leader Wallet</th>
                    <th className="pb-4 font-medium">Followers</th>
                    <th className="pb-4 font-medium">Confidence</th>
                    <th className="pb-4 text-right pr-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cabals.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center text-gray-400">
                        No cabals detected. Run a scan to find patterns.
                      </td>
                    </tr>
                  ) : (
                    cabals.map((c, i) => (
                      <tr key={i} className="group hover:bg-gray-50 transition-colors">
                        <td className="py-4 pl-2 font-mono text-gray-600 group-hover:text-black">
                          {c.leader.slice(0, 6)}...{c.leader.slice(-4)}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{c.follower_count}</span>
                            <span className="text-gray-400 text-xs">wallets</span>
                          </div>
                        </td>
                        <td className="py-4">
                           <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-green-600" 
                               style={{ width: `${Math.min(c.follower_count * 10, 100)}%` }}
                             ></div>
                           </div>
                        </td>
                        <td className="py-4 text-right pr-2">
                          <button className="text-xs border border-gray-200 hover:border-black hover:bg-black hover:text-white px-3 py-1.5 rounded transition-all">
                            Analyze Graph
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

export default App
