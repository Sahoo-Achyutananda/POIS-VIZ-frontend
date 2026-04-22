import { Handle, Position } from '@xyflow/react'

export const FLOW_AES_NODE_TYPE = 'flowAesNode'

/**
 * A compact chip-style node that represents an AES Encrypt or Decrypt block.
 *
 * Supported data props (all optional):
 *   label       {string}  - text displayed inside the chip
 *                           (default 'AES_Enc')
 *   sublabel    {string}  - smaller grey line below the label
 *                           (default 'block encrypt')
 *   mode        {'enc'|'dec'} - changes accent colour
 *                           enc → purple (default), dec → indigo
 *   width       {number}  - chip width in px   (default 120)
 *   inputPosition  {Position}  (default Position.Top)
 *   outputPosition {Position}  (default Position.Bottom)
 *   showInputHandle  {boolean} (default true)
 *   showOutputHandle {boolean} (default true)
 */
export default function FlowAesNode({ data }) {
  const mode   = data?.mode ?? 'enc'
  const label  = data?.label    ?? (mode === 'dec' ? 'AES_Dec' : 'AES_Enc')
  const sub    = data?.sublabel ?? (mode === 'dec' ? 'block decrypt' : 'block encrypt')
  const width  = data?.width    ?? 120

  const inputPos  = data?.inputPosition  ?? Position.Top
  const outputPos = data?.outputPosition ?? Position.Bottom
  const showIn    = data?.showInputHandle  !== false
  const showOut   = data?.showOutputHandle !== false

  // enc → purple gradient, dec → indigo gradient
  const bg     = mode === 'dec'
    ? 'linear-gradient(135deg, #3730a3 0%, #4338ca 100%)'
    : 'linear-gradient(135deg, #7e22ce 0%, #9333ea 100%)'
  const border = mode === 'dec' ? '#818cf8' : '#c4b5fd'

  const handleStyle = {
    width: 10,
    height: 10,
    border: '2px solid #f8fafc',
    background: '#0f172a',
  }

  return (
    <div
      style={{
        width,
        borderRadius: 8,
        background: bg,
        border: `1.5px solid ${border}`,
        boxShadow: '0 6px 20px rgba(2,6,23,0.4)',
        padding: '7px 10px',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {showIn && (
        <Handle
          id="in"
          type="target"
          position={inputPos}
          style={handleStyle}
        />
      )}

      {/* Lock / key icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {/* <span style={{ fontSize: 13, lineHeight: 1 }}>
          {mode === 'dec' ? '🔓' : '🔒'}
        </span> */}
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 700,
            color: '#f8fafc',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </p>
      </div>

      {sub ? (
        <p
          style={{
            margin: '3px 0 0 0',
            fontSize: 9,
            color: 'rgba(248,250,252,0.6)',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sub}
        </p>
      ) : null}

      {showOut && (
        <Handle
          id="out"
          type="source"
          position={outputPos}
          style={handleStyle}
        />
      )}
    </div>
  )
}
