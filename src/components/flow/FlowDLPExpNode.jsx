import { Handle, Position } from '@xyflow/react'
import { useState } from 'react'

export const FLOW_DLP_EXP_NODE_TYPE = 'flowDLPExpNode'

/**
 * A circular node for Exponentiation (g^x or h^y).
 * Hovering shows the actual hex result.
 */
export default function FlowDLPExpNode({ data }) {
  const { label, value, variant = 'indigo' } = data
  const [hovered, setHovered] = useState(false)
  
  const size = 60
  const color = variant === 'indigo' ? '#6366f1' : '#14b8a6' // Indigo vs Teal
  const border = variant === 'indigo' ? '#818cf8' : '#2dd4bf'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        border: `2px solid ${border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: hovered ? 'scale(1.15)' : 'scale(1)',
        zIndex: hovered ? 50 : 1
      }}
    >
      <span className="text-white font-black text-sm select-none">
        {label}
      </span>

      {/* Hover Popover */}
      {hovered && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl min-w-[140px] z-[100] animate-in fade-in zoom-in duration-200">
           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 text-center">Calculated Value</p>
           <p className="text-[11px] font-mono font-black text-white text-center break-all">
              {value || '0x...'}
           </p>
           <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-l border-t border-slate-700 rotate-45" />
        </div>
      )}

      <Handle id="in" type="target" position={Position.Left} style={{ background: '#334155' }} />
      <Handle id="out" type="source" position={Position.Right} style={{ background: '#334155' }} />
    </div>
  )
}
