import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import api from '../../lib/api'
import FlowCanvas from '../../components/flow/FlowCanvas'
import { generateMDChainFlow } from '../../conversions/pa7/flow'
import { nodeTypes } from '../../components/flow/flowNodeFactory'
import { bytesToHex, toUtf8Bytes } from '../PA4/utils'
import FlowMDCompressNode, { FLOW_MD_NODE_TYPE } from '../../components/flow/FlowMDCompressNode'
import PageHeader from '../../components/PageHeader'

export default function MDChainViewer() {
  const [message, setMessage] = useState('hello world')
  const [isHex, setIsHex] = useState(false)
  const isSyncingRef = useRef(false)
  
  // Array of parsed block data
  const [blocks, setBlocks] = useState([])
  const [trace, setTrace] = useState([])
  
  // React Flow state
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Init the chain whenever the raw input message changes
  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false
      return
    }
    const timeoutId = setTimeout(() => {
      handleInitChain()
    }, 500) // Debounce 500ms
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, isHex])

  const handleInitChain = async () => {
    if (!message) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa7/md/init', {
        message,
        is_hex: isHex,
      })
      const data = res.data
      setBlocks(data.blocks_hex)
      setTrace(data.trace)
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Validation error')
    } finally {
      setLoading(false)
    }
  }

  // Handle a direct hex edit inside the flow diagram!
  const blockChangeTimeoutRef = useRef(null)

  const handleBlockChange = useCallback((index, newHex) => {
    // We NO LONGER clear the error immediately on every keystroke
    // because that causes layout jumps while the user is still typing.
    
    setBlocks(prev => {
        const next = [...prev]
        const cleanHex = newHex.replace(/[^0-9a-fA-F]/g, '').slice(0, 16)
        next[index] = cleanHex
        
        // Sync back to message textarea if the block is complete
        if (cleanHex.length === 16) {
           isSyncingRef.current = true
           if (isHex) {
              setMessage(next.join(''))
           } else {
             try {
                // Attempt to decode back to string if not hex mode
                // Note: this will include padding bytes as special chars
                const combinedHex = next.join('')
                const bytes = new Uint8Array(combinedHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
                const decoded = new TextDecoder().decode(bytes)
                // Only update if it's reasonably 'text-like' or just do it anyway as requested
                setMessage(decoded)
             } catch (e) {
                // Fallback: don't update text input if binary
                isSyncingRef.current = false 
             }
           }
        }

        // Clear existing recompute timer
        if (blockChangeTimeoutRef.current) {
          clearTimeout(blockChangeTimeoutRef.current)
        }

        // Attempt backend recompute after 600ms of typing rest
        blockChangeTimeoutRef.current = setTimeout(async () => {
          if (next[index].length !== 16) {
             setError(`Block M${index} must be exactly 16 hex chars (8 bytes) to compute chain.`)
             return
          }
          setLoading(true)
          try {
            const res = await api.post('/api/pa7/md/recompute', {
              blocks_hex: next
            })
            const data = res.data
            setBlocks(data.blocks_hex)
            setTrace(data.trace)
          } catch (err) {
            setError(err?.response?.data?.detail || 'Recompute failed.')
          } finally {
            setLoading(false)
          }
        }, 600)

        return next
    })
  }, [isHex]) // Added isHex to deps for syncing logic

  // Update React flow exactly when trace OR blocks update
  useEffect(() => {
    // generateMDChainFlow creates new objects, so we only want to sync them
    // once we have a stable trace. For blocks, the individual nodes now use
    // local state to avoid jumping cursors, so we don't need to rebuild 
    // the nodes list on every keystroke if the trace length hasn't changed.
    const flowData = generateMDChainFlow(trace, blocks, handleBlockChange)
    setNodes(flowData.nodes)
    setEdges(flowData.edges)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trace]) 

  const paddingStats = useMemo(() => {
    let byteLength = 0
    if (isHex) {
      byteLength = Math.ceil(message.replace(/[^0-9a-f]/gi, '').length / 2)
    } else {
      byteLength = toUtf8Bytes(message).length
    }
    
    // MD Strengthening: message + 0x80 + zeros + 64-bit length
    // (byteLength + 1 + zeros + 8) % 8 == 0
    // (byteLength + 1 + zeros) % 8 == 0
    // zeros = (7 - byteLength) % 8
    const zerosAdded = (7 - (byteLength % 8) + 8) % 8
    const totalPadding = 1 + zerosAdded + 8
    
    return { zerosAdded, totalPadding }
  }, [message, isHex])
  // We remove 'blocks' from the dependency array because our custom MessageNodes 
  // now handle their own local keystrokes smoothly. We only rebuild the 
  // graph when the 'trace' (backend structure) changes.


  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow) overflow-hidden">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer - PA7: Merkle-Damgård Interactive Chain" />

        <section className="p-4">
          <div className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:border-(--accent-border) hover:shadow-(--shadow)">
            <h4 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-[12px] font-bold uppercase tracking-wider text-(--text-h)">
                Raw message input
            </h4>
            
            <div className="grid gap-3 p-3 text-left">
              <div className="flex items-center gap-4">
                 <label className="text-xs font-semibold cursor-pointer flex items-center gap-2 text-(--text-h)">
                   <input
                     type="checkbox"
                     checked={isHex}
                     onChange={e => setIsHex(e.target.checked)}
                     className="accent-(--accent-border)"
                   />
                   Treat input as raw Hex
                 </label>
                 {loading && <span className="text-[10px] uppercase font-bold text-indigo-400 animate-pulse">Syncing...</span>}
              </div>

              <textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="h-24 w-full resize-none rounded-md border border-(--border) bg-(--bg) p-3 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                placeholder="Type your message here... The graph will auto-generate below."
              />

              {!isHex && message && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[14px] font-bold text-(--text) uppercase tracking-tighter">Hex Representation :</p>
                    <div className="rounded border border-(--border)/50 bg-(--code-bg)/50 p-2 font-mono text-[14px] break-all text-white-400">
                        {bytesToHex(toUtf8Bytes(message))}
                    </div>
                  </div>
              )}
              
              {error && <p className="text-xs text-rose-400 font-semibold">{error}</p>}
            </div>
          </div>
        </section>

        <section className="mt-2 p-4 pt-0">
          <div className="rounded-lg border border-(--border) bg-[#0b1020] shadow-sm relative pt-12 overflow-hidden">
             <div className="absolute top-0 left-0 right-0 z-10 bg-(--bg) backdrop-blur-sm border-b border-white/5 px-4 py-2 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <span className="rounded bg-(--bg) px-2 py-0.5 text-[11px] font-black uppercase tracking-widest text-slate-200 border border-white/10">
                        Avalanche Editor
                    </span>
                    <p className="text-[12px] font-medium text-white">Modify <b>Message Blocks</b> to see propagation</p>
                 </div>
                 
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 text-[14px] font-mono text-white-500 uppercase tracking-tighter">
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold">Zeros:</span>
                            <span className="text-slate-300 font-bold">{paddingStats.zerosAdded}</span>
                        </div>
                        <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                            <span className="font-bold">Padding:</span>
                            <span className="text-slate-300 font-bold">{paddingStats.totalPadding} bytes</span>
                        </div>
                    </div>
                    {loading && <span className="text-[9px] font-black text-slate-300 animate-pulse uppercase ml-2">Syncing...</span>}
                 </div>
             </div>
             
             <FlowCanvas
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
             />
          </div>
        </section>
      </section>
    </main>
  )
}
