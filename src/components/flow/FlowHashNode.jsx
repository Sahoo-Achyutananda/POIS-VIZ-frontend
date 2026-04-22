import { Handle, Position } from '@xyflow/react'

export const FLOW_HASH_NODE_TYPE = 'flowHashNode'

/**
 * A specialized card node for Hash functions (Inner/Outer H).
 * Inspired by the premium DLP Compress card.
 */
export default function FlowHashNode({ data }) {
  const { title, input1Label, input1Value, input2Label, input2Value, resultLabel, resultValue, color = 'blue' } = data

  const accents = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', ghost: 'text-blue-100', icon: 'text-blue-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', ghost: 'text-emerald-100', icon: 'text-emerald-400' },
  }[color] || accents.blue

  return (
    <div
      style={{
        width: 260,
        borderRadius: '16px',
        background: '#0f172a', // Deep Navy
        border: '1px solid #334155',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        padding: '0',
        overflow: 'hidden',
        color: '#f8fbff',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      {/* Header */}
      <div className="bg-[#1e293b] px-4 py-2 border-b border-[#334155] flex justify-between items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">
          {title || 'Hash Function'}
        </span>
        <div className={`w-2 h-2 rounded-full ${accents.bg} ${accents.border} border animate-pulse`} />
      </div>

      <div className="p-4 space-y-4">

        {/* Input 1 (Target Handle: Left) */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-end px-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">{input1Label || 'Input 1'}</span>
          </div>
          <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 flex items-center gap-2">
            <div className={`font-mono text-[10px] ${accents.text} truncate flex-1`}>
              {input1Value || '0x...'}
            </div>
          </div>
        </div>

        {/* Input 2 (Target Handle: Top) */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-end px-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">{input2Label || 'Input 2'}</span>
          </div>
          <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 flex items-center gap-2">
            <div className="font-mono text-[10px] text-slate-300 truncate flex-1">
              {input2Value || '0x...'}
            </div>
          </div>
        </div>

        {/* Math Indicator */}
        <div className="pt-2 border-t border-slate-800 flex justify-center">
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">SHA-256 PIPELINE</span>
        </div>

        {/* Result (Source Handle: Right) */}
        <div className={`${accents.bg} rounded-xl p-3 border ${accents.border} text-center shadow-[0_0_20px_rgba(0,0,0,0.2)]`}>
          <p className={`text-[9px] font-black ${accents.text} uppercase tracking-widest mb-1`}>{resultLabel || 'Digest'}</p>
          <p className={`text-[12px] font-mono font-black ${accents.ghost} truncate`}>
            {resultValue || '0x...'}
          </p>
        </div>
      </div>

      {/* Handles */}
      <Handle
        id="in-1"
        type="target"
        position={Position.Left}
        style={{ width: 10, height: 10, border: '2px solid #334155', background: '#0f172a', left: -5 }}
      />
      <Handle
        id="in-2"
        type="target"
        position={Position.Top}
        style={{ width: 10, height: 10, border: '2px solid #334155', background: '#0f172a', top: -5 }}
      />
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        style={{ width: 10, height: 10, border: '2px solid #334155', background: '#0f172a', right: -5 }}
      />
      <Handle
        id="out-bottom"
        type="source"
        position={Position.Bottom}
        style={{ width: 10, height: 10, border: '2px solid #334155', background: '#0f172a', bottom: -5 }}
      />
    </div>
  )
}
