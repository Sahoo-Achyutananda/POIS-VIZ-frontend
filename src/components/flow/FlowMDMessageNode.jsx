import { useState, useEffect } from 'react'
import { Handle, Position } from '@xyflow/react'

export const FLOW_MD_MESSAGE_NODE_TYPE = 'flowMDMessageNode'

/**
 * A node representing the message block M_i.
 * Labeled with M_i and contains the editable hex input.
 */
export default function FlowMDMessageNode({ id, data }) {
  const { m_hex, index, onChangeBlock } = data
  const width = 220

  // Use local state to handle typing/backspacing smoothly without React Flow re-render lag
  const [localHex, setLocalHex] = useState(m_hex)

  // Sync local state if parent state changes (e.g. from a full message change)
  useEffect(() => {
    setLocalHex(m_hex)
  }, [m_hex])

  const handleChange = (e) => {
    const val = e.target.value.replace(/[^0-9a-fA-F]/g, '')
    setLocalHex(val)
    onChangeBlock(index, val)
  }

  const handleStyle = {
    width: 8,
    height: 8,
    border: '1.5px solid #166534',
    background: '#f8fafc',
  }
  const isColliding = data?.isColliding === true
  const bg = isColliding ? '#dc2626' : '#0d9488' // Red if colliding, else Teal
  const border = isColliding ? '1px solid #fca5a5' : '1px solid rgba(255, 255, 255, 0.28)'

  return (
    <div
      style={{
        width,
        borderRadius: 12,
        background: bg,
        border: border,
        boxShadow: '0 10px 30px rgba(2, 6, 23, 0.35)',
        padding: 10,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div className="w-full text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/90">
          Message block M<sub>{index}</sub>
        </p>
      </div>

      <div className="rounded-md border border-white/15 bg-black/20 px-2 py-2">
        <input
          value={localHex}
          onChange={handleChange}
          spellCheck={false}
          style={{
             background: 'transparent',
             border: 'none',
             color: '#f0fdfa',
             fontSize: '11px',
             fontFamily: 'monospace',
             width: '100%',
             outline: 'none',
             textAlign: 'center',
             fontWeight: 'bold'
          }}
        />
      </div>

      <Handle
        id="m-in"
        type="target"
        position={Position.Top}
        style={{ width: 11, height: 11, border: '2px solid #f8fafc', background: '#0f172a' }}
      />
      
      <Handle
        id="m-out"
        type="source"
        position={Position.Bottom}
        style={{ width: 11, height: 11, border: '2px solid #f8fafc', background: '#0f172a' }}
      />
    </div>
  )
}
