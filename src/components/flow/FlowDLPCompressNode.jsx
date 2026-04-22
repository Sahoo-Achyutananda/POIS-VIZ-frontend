import { Handle, Position } from '@xyflow/react'

export const FLOW_DLP_NODE_TYPE = 'flowDLPNode'

/**
 * A specialized node for DLP Compression h(z, m) = g^z * h_hat^m mod p.
 * Optimized for maximum clarity, removing "messy" clutter and emphasizing math structure.
 */
export default function FlowDLPCompressNode({ data }) {
  const { z_in_hex, m_val, z_out_hex, params } = data
  const width = 220

  // Format m_val consistently as hex for the visualization
  const m_hex = typeof m_val === 'number' ? '0x' + m_val.toString(16) : m_val

  return (
    <div
      style={{
        width,
        borderRadius: '12px',
        background: '#0f172a', // Deep Navy (Professional)
        border: '1px solid #334155',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        padding: '0',
        overflow: 'hidden',
        color: '#f8fbff',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      {/* Header bar */}
      {/* <div className="bg-[#1e293b] px-4 py-2 border-b border-[#334155] flex justify-between items-center">
         <span className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">
            Arithmetic Step
         </span>
         <span className="bg-indigo-500/20 text-indigo-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-indigo-500/30">
            DLP HASH
         </span>
      </div> */}

      <div className="p-4 space-y-4">
        
        {/* Term 1: g^x (State) */}
        <div className="space-y-1.5">
           <div className="flex justify-between items-end px-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Term 1: gˣ (State x)</span>
              <span className="text-[8px] font-mono text-slate-600">Base g={params?.g}</span>
           </div>
           <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 flex items-center gap-3">
              <div className="text-indigo-400 font-bold text-sm italic">g</div>
              <div className="h-4 w-[1px] bg-slate-700" />
              <div className="text-[12px] font-mono font-bold text-teal-400 truncate flex-1">
                 {z_in_hex}
              </div>
           </div>
        </div>

        {/* Multiplier Symbol */}
        {/* <div className="flex justify-center">
            <div className="text-[#475569] text-xs font-bold bg-slate-800 w-6 h-6 rounded-full flex items-center justify-center border border-slate-700">
                ×
            </div>
        </div> */}

        {/* Term 2: h^y (Message) */}
        <div className="space-y-1.5">
           <div className="flex justify-between items-end px-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Term 2: ĥʸ (Message y)</span>
              <span className="text-[8px] font-mono text-slate-600">Base ĥ={params?.h_hat}</span>
           </div>
           <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 flex items-center gap-3">
              <div className="text-indigo-400 font-bold text-sm italic">ĥ</div>
              <div className="h-4 w-[1px] bg-slate-700" />
              <div className="text-[12px] font-mono font-bold text-rose-400 truncate flex-1">
                 {m_hex}
              </div>
           </div>
        </div>

        {/* Separator / Mod p */}
        <div className="pt-2 border-t border-slate-800 flex justify-center">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Compute Mod P</span>
        </div>

        {/* Final Result / Current State */}
        <div className="bg-indigo-500/10 rounded-xl p-3 border border-indigo-500/30 text-center shadow-[0_0_20px_rgba(99,102,241,0.1)]">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">New Chain State (zᵢ)</p>
            <p className="text-[13px] font-mono font-black text-indigo-100 truncate">
               {z_out_hex}
            </p>
        </div>
      </div>

      {/* Handles - Standardized and clear */}
      <Handle
        id="z-in"
        type="target"
        position={Position.Left}
        style={{ width: 10, height: 10, border: '2px solid #334155', background: '#0f172a', left: -5 }}
      />
      <Handle
        id="m-in"
        type="target"
        position={Position.Top}
        style={{ width: 10, height: 10, border: '2px solid #334155', background: '#0f172a', top: -5 }}
      />
      <Handle
        id="z-out"
        type="source"
        position={Position.Right}
        style={{ width: 10, height: 10, border: '2px solid #334155', background: '#0f172a', right: -5 }}
      />
    </div>
  )
}
