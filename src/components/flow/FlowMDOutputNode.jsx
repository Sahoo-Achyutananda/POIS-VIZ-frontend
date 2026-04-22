import { Handle, Position } from '@xyflow/react'

export const FLOW_MD_OUTPUT_NODE_TYPE = 'flowMDOutputNode'

/**
 * A node representing the final hash H(M).
 */
export default function FlowMDOutputNode({ data }) {
  const { hash_hex } = data
  const width = 220

  const handleStyle = {
    width: 8,
    height: 8,
    border: '1.5px solid #991b1b',
    background: '#f8fafc',
  }
  return (
    <div
      style={{
        width,
        borderRadius: 12,
        background: '#ec4899', // Premium Pink
        border: '1px solid rgba(255, 255, 255, 0.28)',
        boxShadow: '0 10px 30px rgba(2, 6, 23, 0.35)',
        padding: 10,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minHeight: 60
      }}
    >
      <div className="w-full text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/90">
          Final Hash H(M)
        </p>
      </div>

      <div className="rounded-md border border-white/15 bg-black/20 px-2 py-2">
        <div style={{
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: '#fff6fb',
            textAlign: 'center',
            wordBreak: 'break-all'
        }}>
          {hash_hex}
        </div>
      </div>

      <Handle
        id="h-in"
        type="target"
        position={Position.Left}
        style={{ width: 11, height: 11, border: '2px solid #f8fafc', background: '#0f172a' }}
      />
    </div>
  )
}
