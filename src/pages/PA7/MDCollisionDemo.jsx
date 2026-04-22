import { useState, useEffect } from 'react'
import api from '../../lib/api'
import FlowCanvas from '../../components/flow/FlowCanvas'
import { generateMDCollisionFlow } from '../../conversions/pa7/collisionFlow'
import { nodeTypes } from '../../components/flow/flowNodeFactory'
import PageHeader from '../../components/PageHeader'

export default function MDCollisionDemo() {
  const [examples, setExamples] = useState([])
  const [selectedExample, setSelectedExample] = useState(null)
  const [chains, setChains] = useState(null)
  
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchExamples()
  }, [])

  const fetchExamples = async () => {
    try {
      const res = await api.get('/api/pa7/md/collisions')
      setExamples(res.data)
      if (res.data.length > 0) {
        handleSelect(res.data[0])
      }
    } catch (err) {
      setError('Failed to load collision sets.')
    }
  }

  const handleSelect = async (ex) => {
    setSelectedExample(ex)
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa7/md/dual-compute', {
        msgA: ex.msgA,
        msgB: ex.msgB
      })
      setChains(res.data)
      const flow = generateMDCollisionFlow(res.data.chainA, res.data.chainB)
      setNodes(flow.nodes)
      setEdges(flow.edges)
    } catch (err) {
      setError('Failed to compute collision chains.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      {/* 1. Full-Width Container (No max-w override) */}
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow) overflow-hidden flex flex-col min-h-[calc(100vh-100px)]">
        
        <PageHeader title="CS8.401 Minicrypt Clique Explorer - PA7: Collision Propagation Demo" />
        {loading && <span className="text-[10px] font-bold text-indigo-400 animate-pulse uppercase mb-2">Computing...</span>}

        {/* 2. Top Section: Selection (Horizontal Grid) */}
        <div className="border-b border-(--border) p-4 bg-(--bg)">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
             {examples.map(ex => (
                <button
                    key={ex.id}
                    onClick={() => handleSelect(ex)}
                    className={`text-left p-3 rounded-md border transition-all duration-200 ${
                        selectedExample?.id === ex.id 
                        ? 'border-(--accent-border) bg-(--accent-bg) shadow-(--shadow)' 
                        : 'border-(--border) hover:border-(--accent-border) hover:-translate-y-0.5 bg-(--bg)'
                    }`}
                >
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-(--text-h)">{ex.name}</p>
                        {selectedExample?.id === ex.id && (
                            <div className="w-1.5 h-1.5 rounded-full bg-(--accent) animate-pulse" />
                        )}
                    </div>
                    <p className="text-xs mt-1 text-(--text)/80 leading-normal">{ex.description}</p>
                </button>
             ))}
          </div>
        </div>

        {/* 3. Middle Section: Exact Input Hex Side-by-Side */}
        <div className="border-b border-(--border) p-4 bg-(--bg)">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                 <h4 className="text-[12px] font-bold uppercase tracking-widest text-white flex items-center gap-2">
                    {/* <span className="w-2 h-2 rounded-full bg-teal-400" /> */}
                    Input Message A (Hex)
                 </h4>
                 <div className="rounded-lg border border-(--border) bg-black/20 p-3 font-mono text-[13px] tracking-wider text-teal-100 break-all border-dashed">
                    {selectedExample?.msgA || '...'}
                 </div>
              </div>

              <div className="space-y-2">
                 <h4 className="text-[12px] font-bold uppercase tracking-widest text-white flex items-center gap-2">
                    {/* <span className="w-2 h-2 rounded-full bg-teal-400" /> */}
                    Input Message B (Hex)
                 </h4>
                 <div className="rounded-lg border border-(--border) bg-black/20 p-3 font-mono text-[13px] tracking-wider text-teal-100 break-all border-dashed">
                    {selectedExample?.msgB || '...'}
                 </div>
              </div>
           </div>
        </div>

        {/* 4. Bottom Section: Flow Diagram (Below inputs) */}
        <div className="flex-1 min-h-[700px] relative bg-[#0b1020] overflow-hidden">
             {/* HUD Overlays */}
             <div className="absolute top-4 left-4 z-20 space-y-3 pointer-events-none">
                {chains && (
                   <>
                      {/* <div className="bg-[#111827]/80 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 shadow-xl overflow-hidden min-w-[200px]">
                         <div className="absolute top-0 left-0 w-1 h-full bg-pink-500/50" />
                         <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Chain A Hash</p>
                         <p className="text-[14px] font-mono font-bold text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.3)] font-black">
                            {chains.chainA.trace[chains.chainA.trace.length-1].z_out_hex}
                         </p>
                      </div>
                      <div className="bg-[#111827]/80 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 shadow-xl overflow-hidden min-w-[200px]">
                         <div className="absolute top-0 left-0 w-1 h-full bg-pink-500/50" />
                         <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Chain B Hash</p>
                         <p className="text-[14px] font-mono font-bold text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.3)] font-black">
                            {chains.chainB.trace[chains.chainB.trace.length-1].z_out_hex}
                         </p>
                      </div> */}
                   </>
                )}
             </div>

             <div className="absolute bottom-4 right-4 z-20 max-w-[300px] pointer-events-none">
                <div className="bg-(--bg)/40 backdrop-blur-md p-3 rounded-lg border border-white/5 space-y-2">
                   <p className="text-[10px] font-bold text-white uppercase tracking-tighter">Collision Proof:</p>
                   <p className="text-[11px] text-slate-300 leading-relaxed italic">
                      "Since h(msgA) = h(msgB), any further message blocks will append identically, 
                      leading to identical hash outputs."
                   </p>
                </div>
             </div>
             
             {error && <div className="absolute inset-0 flex items-center justify-center p-10 text-rose-400 font-bold bg-[#0b1020]">{error}</div>}

             <FlowCanvas
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
             />
        </div>
      </section>
    </main>
  )
}
