import { useState, useCallback } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'

export const FLOW_FUNCTION_NODE_TYPE = 'flowFunctionNode'

/**
 * A circular node for intermediate functions (Hash, XOR, etc.)
 */
export default function FlowFunctionNode({ id, data }) {
  const { label, sublabel, value, color = '#9333ea', borderColor = '#c084fc' } = data
  const [hovered, setHovered] = useState(false)
  const { setNodes } = useReactFlow()
  
  const size = 64

  const onEnter = useCallback(() => {
    setHovered(true)
    setNodes((nds) => nds.map((node) => {
      if (node.id === id) {
        return { ...node, zIndex: 5000 }
      }
      return node
    }))
  }, [id, setNodes])

  const onLeave = useCallback(() => {
    setHovered(false)
    setNodes((nds) => nds.map((node) => {
      if (node.id === id) {
        return { ...node, zIndex: 1 }
      }
      return node
    }))
  }, [id, setNodes])

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="relative flex items-center justify-center transition-transform duration-200"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        border: `2.5px solid ${borderColor}`,
        boxShadow: hovered ? '0 10px 40px rgba(147,51,234,0.4)' : '0 6px 20px rgba(0,0,0,0.3)',
        transform: hovered ? 'scale(1.1)' : 'scale(1)',
      }}
    >
      <div className="flex flex-col items-center justify-center pointer-events-none">
        <span className="text-white font-black text-xs uppercase">{label}</span>
      </div>

      {/* External Sublabel (outside circle) */}
      {sublabel && (
        <span className="absolute -bottom-6 text-[9px] font-black text-[#64748b] uppercase tracking-[0.2em] whitespace-nowrap pointer-events-none">
          {sublabel}
        </span>
      )}

      {/* Hover Popover */}
      {hovered && value && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-3 bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl min-w-[280px] z-[9999] animate-in fade-in zoom-in duration-200">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 text-center">Result</p>
           <p className="text-[12px] font-mono font-medium text-purple-300 text-center break-all leading-relaxed px-1">
              {value}
           </p>
           <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0f172a] border-l border-t border-[#1e293b] rotate-45" />
        </div>
      )}

      {/* Inputs/Outputs */}
      {(data.handles || ['top', 'bottom']).map((side) => {
        const type = data.handleTypes?.[side] || (['bottom', 'right'].includes(side) ? 'source' : 'target')
        const posMap = { top: Position.Top, bottom: Position.Bottom, left: Position.Left, right: Position.Right }
        return (
          <Handle
            key={side}
            id={side}
            type={type}
            position={posMap[side]}
            style={{ background: '#475569', width: 8, height: 8, border: '1.5px solid #f8fafc' }}
          />
        )
      })}
    </div>
  )
}
