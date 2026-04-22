import { useState, useEffect } from 'react'
import api from '../../lib/api'
import FlowCanvas from '../../components/flow/FlowCanvas'
import { generateDLPHashFlow } from '../../conversions/pa8/flow'
import { nodeTypes } from '../../components/flow/flowNodeFactory'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'

export default function DLPHashDemo() {
  const [message, setMessage] = useState('DLP is hard')
  const [trace, setTrace] = useState(null)
  const [params, setParams] = useState(null)
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  
  const [isToy, setIsToy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hunting, setHunting] = useState(false)
  const [huntResult, setHuntResult] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    handleCompute(false)
  }, [])

  const handleCompute = async (toyOverride = null) => {
    const activeIsToy = toyOverride !== null ? toyOverride : isToy
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa8/compute', {
        message: message,
        use_toy: activeIsToy
      })
      if (res.data) {
        setTrace(res.data.trace)
        setParams(res.data.params)
        const flow = generateDLPHashFlow(res.data.trace, res.data.params)
        setNodes(flow.nodes || [])
        setEdges(flow.edges || [])
      }
    } catch (err) {
      setError('Failed to compute DLP Hash.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleHunt = async () => {
    setHunting(true)
    setHuntResult(null)
    setError('')
    try {
        const res = await api.post('/api/pa8/collision-hunt')
        if (res.data) {
          setHuntResult(res.data)
          setShowModal(true)
        }
    } catch (err) {
        setError('Collision hunt failed.')
    } finally {
        setHunting(false)
    }
  }

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow) overflow-hidden flex flex-col min-h-[calc(100vh-100px)]">
        
        {/* Header */}
        <PageHeader title="CS8.401 Minicrypt Clique Explorer - PA8: DLP-Based Collision-Resistant Hash" />
        {(loading || hunting) && (
          <div className="flex items-center gap-3 mb-2">
            {loading && <span className="text-[10px] font-bold text-indigo-400 animate-pulse uppercase">Computing...</span>}
            {hunting && <span className="text-[10px] font-bold text-amber-500 animate-pulse uppercase">Hunting Collision...</span>}
          </div>
        )}

        {/* Section 1: Parameter Selection */}
        <div className="border-b border-(--border) p-4 bg-(--bg)">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
             <button
                onClick={() => { setIsToy(false); handleCompute(false); }}
                className={`text-left p-3 bg-(--bg) rounded-md border transition-all duration-200 ${
                    !isToy 
                    ? 'border-(--accent-border) bg-(--accent-bg) shadow-(--shadow)' 
                    : 'border-(--border) hover:border-(--accent-border) hover:-translate-y-0.5'
                }`}
             >
                <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-(--text-h)">Standard Parameters</p>
                    {!isToy && (
                        <div className="w-1.5 h-1.5 rounded-full bg-(--accent) animate-pulse" />
                    )}
                </div>
                <p className="text-xs mt-1 text-(--text)/80 leading-normal">Full security subgroup indexing.</p>
             </button>

             <button
                onClick={() => { setIsToy(true); handleCompute(true); }}
                className={`text-left p-3 bg-(--bg) rounded-md border transition-all duration-200 ${
                    isToy 
                    ? 'border-amber-500/60 bg-amber-500/10 shadow-(--shadow)' 
                    : 'border-(--border) hover:border-amber-500/30 hover:-translate-y-0.5'
                }`}
             >
                <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-(--text-h)">Toy Parameters (16-bit)</p>
                    {isToy && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                </div>
                <p className="text-xs mt-1 text-(--text)/80 leading-normal">Fast collision demo in keyspace n=2¹⁶.</p>
             </button>

             {/* Group Constants Info */}
             {params && (
                <div className="col-span-1 lg:col-span-2 flex items-center justify-center gap-6 px-4 py-2 bg-(--bg) border border-(--border) border-dashed rounded-xl overflow-hidden relative">
                   <div className="flex gap-6 font-mono text-[14px] font-bold ">
                      <span className="opacity-100 text-white">p: {params.p}</span>
                      <span className="opacity-100 text-white">g: {params.g}</span>
                      <span className="opacity-100 text-white">ĥ: {params.h_hat}</span>
                   </div>
                </div>
             )}
          </div>
        </div>

        {/* Section 2: Inputs & Analysis */}
        <div className="border-b border-(--border) p-4 bg-(--bg)">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              
              {/* Message Input */}
              <div className="space-y-2">
                 <h4 className="text-[13px] font-bold uppercase tracking-widest text-slate-400 px-1">
                    Input Message
                 </h4>
                 <div className="relative">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full h-28 rounded-xl border border-(--border) p-4 text-xs text-(--text-h) focus:border-indigo-500/50 transition-all outline-none resize-none font-medium"
                        placeholder="Enter text to hash..."
                    />
                    <div className="absolute bottom-3 right-3">
                        <Btn
                            onClick={() => handleCompute()}
                            disabled={loading}
                            size="sm"
                        >
                            {loading ? 'Computing...' : 'Compute Hash'}
                        </Btn>
                    </div>
                 </div>
              </div>

              {/* Birthday Attack Tool */}
              <div className="space-y-2">
                 <h4 className="text-[12px] font-bold uppercase tracking-widest text-slate-400 px-1">
                    Birthday Collision Hunt
                 </h4>
                 <div className="rounded-xl border border-(--border) bg-(--bg) p-4 min-h-[112px] flex flex-col justify-center relative overflow-hidden">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4 py-2">
                       <p className="text-[13px] text-white italic flex-1">
                          Demo: Find two different messages that produce identical 16-bit DLP hashes.
                       </p>
                       <Btn
                           onClick={handleHunt}
                           disabled={hunting}
                           variant="secondary"
                       >
                           {hunting ? 'Searching...' : 'Start Hunt'}
                       </Btn>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Hunt Result Modal */}
        {showModal && huntResult && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setShowModal(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative w-full max-w-md mx-4 rounded-2xl border border-(--border) bg-(--bg) shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-(--border) bg-(--accent-bg) px-4 py-3">
                <h3 className="m-0 text-sm font-semibold text-(--text-h)">Collision Found</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-[11px] font-bold text-white hover:text-(--text-h) uppercase tracking-widest transition-colors"
                >
                  Close
                </button>
              </div>
              {/* Modal Body — Set Mapping Diagram */}
              <div className="p-6 space-y-5">

                {/* --- Set Structure Diagram --- */}
                <div className="flex items-center gap-0">

                  {/* Left: Inputs column */}
                  <div className="flex flex-col gap-8 flex-1">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Input A</p>
                      <div className="rounded-lg border border-(--border) bg-(--accent-bg) px-3 py-2 font-mono text-[11px] text-(--text-h) break-all leading-snug">
                        {huntResult.msgA}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Input B</p>
                      <div className="rounded-lg border border-(--border) bg-(--accent-bg) px-3 py-2 font-mono text-[11px] text-(--text-h) break-all leading-snug">
                        {huntResult.msgB}
                      </div>
                    </div>
                  </div>

                  {/* Centre: Arrow diagram */}
                  <div className="flex-shrink-0 w-28 h-28">
                    <svg viewBox="0 0 110 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                          <polygon points="0 0, 7 3.5, 0 7" fill="#6366f1" />
                        </marker>
                      </defs>
                      {/* Label: DLP_Hash */}
                      <text x="55" y="56" textAnchor="middle" fill="#6366f1" fontSize="7" fontFamily="monospace" fontWeight="bold">DLP_Hash</text>
                      {/* Arrow: top input → centre */}
                      <line x1="4" y1="28" x2="96" y2="55" stroke="#6366f1" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#arr)" />
                      {/* Arrow: bottom input → centre */}
                      <line x1="4" y1="82" x2="96" y2="55" stroke="#6366f1" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#arr)" />
                    </svg>
                  </div>

                  {/* Right: Hash output */}
                  <div className="flex-1 space-y-1 self-center">
                    <p className="text-[11px] font-black uppercase tracking-widest text-amber-500 text-center">Hash</p>
                    <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/10 px-3 py-3 font-mono text-[13px] font-black text-amber-400 text-center shadow-md">
                      {huntResult.hash}
                    </div>
                    <p className="text-[11px] text-white font-bold text-center">16-bit DLP output</p>
                  </div>
                </div>

                {/* Birthday Paradox Progress Bar */}
                <div className="border-t border-(--border) pt-4 space-y-2">
                  <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-widest">
                    <span className="text-white">Iterations</span>
                    <span className={huntResult.iterations <= 256 ? 'text-emerald-500' : 'text-amber-500'}>
                      {huntResult.iterations} / 256 expected
                    </span>
                  </div>
                  <div className="relative h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                    {/* Fill bar */}
                    <div
                      className={`h-full rounded-full transition-all ${huntResult.iterations <= 256 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min((huntResult.iterations / 256) * 100, 100)}%` }}
                    />
                    {/* 256 marker line */}
                    <div className="absolute top-0 bottom-0 w-px bg-white/40" style={{ left: '100%', transform: 'translateX(-1px)' }} />
                  </div>
                  <p className="text-[13px] text-white text-center italic">
                    Expected collision at ~ 2^(n/2) = 256 for 16-bit output
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Flow Canvas */}
        <div className="flex-1 min-h-[600px] relative bg-[#0b1020] overflow-hidden">
             {error && (
               <div className="absolute inset-x-0 top-0 z-50 p-3 bg-rose-500 text-white text-[11px] font-black text-center uppercase tracking-widest">
                 {error}
               </div>
             )}

             <FlowCanvas
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
             />

             {/* HUD Architecture Note */}
             {/* <div className="absolute bottom-4 right-4 z-20 max-w-[300px] pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-white/10 space-y-2 shadow-2xl">
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Architecture Note</p>
                   <p className="text-[11px] text-slate-400 leading-relaxed italic">
                      DLP Compression uses modular exponentiation: gˣ · ĥʸ mod p. 
                      Finding collisions is as hard as the Discrete Log problem.
                   </p>
                </div>
             </div> */}
        </div>
      </section>
    </main>
  )
}
