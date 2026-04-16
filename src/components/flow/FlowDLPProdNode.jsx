import { Handle, Position } from '@xyflow/react'
import { useState } from 'react'

export const FLOW_DLP_PROD_NODE_TYPE = 'flowDLPProdNode'

/**
 * A circular/diamond node for Modular Multiplication (x mod p).
 * Hovering shows the intermediate product result.
 */
export default function FlowDLPProdNode({ data }) {
  const { value } = data
  const [hovered, setHovered] = useState(false)
  
  const size = 48
  const color = '#9333ea' // Purple
  const border = '#c084fc'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        border: `2.5px solid ${border}`,
        boxShadow: '0 8px 30px rgba(147,51,234,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.2s',
        transform: hovered ? 'scale(1.15) rotate(90deg)' : 'scale(1) rotate(0deg)',
        zIndex: hovered ? 50 : 1
      }}
    >
      <span className="text-white font-black text-xl select-none">
        ×
      </span>
      
      <span className="absolute -bottom-5 text-[8px] font-black text-purple-400 uppercase tracking-widest whitespace-nowrap">
         mod p
      </span>

      {/* Hover Popover */}
      {hovered && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl min-w-[140px] z-[100] animate-in fade-in zoom-in duration-200"
             style={{ transform: 'rotate(-90deg) translateX(-50%)' }}>
           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 text-center">Final Result</p>
           <p className="text-[11px] font-mono font-black text-white text-center break-all">
              {value || '0x...'}
           </p>
           <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-l border-t border-slate-700 rotate-45" />
        </div>
      )}

      {/* Inputs from left side */}
      <Handle type="target" id="in-1" position={Position.Left} style={{ background: '#334155', top: '25%' }} />
      <Handle type="target" id="in-2" position={Position.Left} style={{ background: '#334155', top: '75%' }} />
      
      <Handle type="source" id="out" position={Position.Right} style={{ background: '#334155' }} />
    </div>
  )
}
