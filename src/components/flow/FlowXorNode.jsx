import { Handle, Position } from '@xyflow/react'

export const FLOW_XOR_NODE_TYPE = 'flowXorNode'

/**
 * A compact circle node that renders ⊕ (XOR symbol).
 *
 * Supported data props (all optional):
 *   size        {number}  - diameter in px          (default 52)
 *   label       {string}  - tooltip / aria-label    (default 'XOR')
 *   color       {string}  - fill colour             (default '#9333ea')
 *   borderColor {string}  - ring colour             (default '#c4b5fd')
 *   handles     {('top'|'bottom'|'left'|'right')[]} - which handles to show
 *               (default ['top', 'bottom', 'left'])
 *   handleIds   {Record<string, string>}            - custom id per position
 *               e.g. { top: 'in-main', left: 'in-chain', bottom: 'out' }
 *   handleTypes {Record<string, 'source'|'target'>} - override type per side
 *               e.g. { right: 'target' } to make right side an input handle
 */
export default function FlowXorNode({ data }) {
  const size        = data?.size        ?? 52
  const label       = data?.label       ?? 'XOR'
  const color       = data?.color       ?? '#9333ea'
  const border      = data?.borderColor ?? '#c4b5fd'
  const sides       = data?.handles     ?? ['top', 'bottom', 'left']
  const handleIds   = data?.handleIds   ?? {}
  const handleTypes = data?.handleTypes ?? {}

  const handleStyle = {
    width: 10,
    height: 10,
    border: '2px solid #f8fafc',
    background: '#0f172a',
  }

  const positionMap = {
    top:    Position.Top,
    bottom: Position.Bottom,
    left:   Position.Left,
    right:  Position.Right,
  }

  // Default: 'bottom' and 'right' are sources (outputs); everything else is a target.
  // handleTypes prop overrides this per side.
  const defaultOutputSides = ['bottom', 'right']

  return (
    <div
      title={label}
      aria-label={label}
      style={{
        width:  size,
        height: size,
        borderRadius: '50%',
        background: color,
        border: `2px solid ${border}`,
        boxShadow: '0 6px 24px rgba(2,6,23,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* ⊕ symbol */}
      <span
        style={{
          fontSize: size * 0.42,
          lineHeight: 1,
          color: '#f8fafc',
          fontWeight: 700,
          pointerEvents: 'none',
        }}
      >
        ⊕
      </span>

      {/* Dynamic handles */}
      {sides.map((side) => {
        const pos = positionMap[side]
        const resolvedType = handleTypes[side]
          ?? (defaultOutputSides.includes(side) ? 'source' : 'target')
        const isOutput = resolvedType === 'source'
        const id = handleIds[side] ?? (isOutput ? 'out' : `in-${side}`)
        return (
          <Handle
            key={side}
            id={id}
            type={resolvedType}
            position={pos}
            style={handleStyle}
          />
        )
      })}
    </div>
  )
}
