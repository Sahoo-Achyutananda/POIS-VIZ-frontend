import { Handle, Position } from '@xyflow/react'

export const FLOW_MD_NODE_TYPE = 'flowMDNode'

/**
 * A small, circular/rounded node representing the compression function h.
 * Labeled simply with h.
 */
export default function FlowMDCompressNode({ data }) {
  const { z_out_hex } = data
  const size = 60

  const handleStyle = {
    width: 6,
    height: 6,
    border: '1.5px solid #854d0e',
    background: '#fefce8',
  }

  const isColliding = data?.isColliding === true
  const bg = isColliding ? '#dc2626' : '#9333ea' // Red if colliding, else Purple
  const border = isColliding ? '1px solid #fca5a5' : '1px solid rgba(255, 255, 255, 0.28)'

  return (
    <div
      title={`z_out: ${z_out_hex}`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: bg,
        border: border,
        boxShadow: '0 10px 30px rgba(2, 6, 23, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 800, color: '#fbf8ff', fontFamily: 'serif', fontStyle: 'italic' }}>
        h
      </span>

      <Handle
        id="z-in"
        type="target"
        position={Position.Left}
        style={{ width: 11, height: 11, border: '2px solid #f8fafc', background: '#0f172a' }}
      />
      <Handle
        id="m-in"
        type="target"
        position={Position.Top}
        style={{ width: 11, height: 11, border: '2px solid #f8fafc', background: '#0f172a' }}
      />
      <Handle
        id="z-out"
        type="source"
        position={Position.Right}
        style={{ width: 11, height: 11, border: '2px solid #f8fafc', background: '#0f172a' }}
      />
    </div>
  )
}
