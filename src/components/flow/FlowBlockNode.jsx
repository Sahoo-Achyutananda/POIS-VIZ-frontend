import { Handle, Position } from '@xyflow/react'

export const FLOW_BLOCK_NODE_TYPE = 'flowBlockNode'

const VARIANT_STYLES = {
  input: {
    background: '#1d4ed8',
    border: '1px solid #93c5fd',
    color: '#f8fbff',
  },
  main: {
    background: '#9333ea',
    border: '1px solid #c4b5fd',
    color: '#fbf8ff',
  },
  output: {
    background: '#ec4899',
    border: '1px solid #f9a8d4',
    color: '#fff6fb',
  },
  info: {
    background: '#dc2626',
    border: '1px solid #fca5a5',
    color: '#fff7f7',
  },
  neutral: {
    background: '#334155',
    border: '1px solid #94a3b8',
    color: '#f8fafc',
  },
}

function baseStyle(data, variant) {
  const defaultMinWidth = variant === 'input' ? 170 : 260

  return {
    border: '1px solid rgba(255, 255, 255, 0.28)',
    borderRadius: 12,
    boxShadow: '0 10px 30px rgba(2, 6, 23, 0.35)',
    padding: 10,
    minWidth: data?.minWidth ?? defaultMinWidth,
    width: data?.width ?? 'auto',
    maxWidth: data?.maxWidth,
  }
}

export default function FlowBlockNode({ data }) {
  const variant = data?.variant || 'main'
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.main
  const inputPosition = data?.inputPosition || Position.Top
  const outputPosition = data?.outputPosition || Position.Bottom
  const showInputHandle = data?.showInputHandle !== false
  const showOutputHandle = data?.showOutputHandle !== false
  const multipleInputHandles = Array.isArray(data?.inputHandles) ? data.inputHandles : []

  return (
    <div className="relative inline-block" style={{ ...baseStyle(data, variant), ...style }}>
      {multipleInputHandles.length > 0
        ? multipleInputHandles.map((handle) => (
            <Handle
              key={handle.id}
              id={handle.id}
              type="target"
              position={handle.position || inputPosition}
              style={{ width: 11, height: 11, border: '2px solid #f8fafc', background: '#0f172a' }}
            />
          ))
        : showInputHandle ? (
            <Handle
              id="in"
              type="target"
              position={inputPosition}
              style={{ width: 11, height: 11, border: '2px solid #f8fafc', background: '#0f172a' }}
            />
          ) : null}

      <div className="w-full space-y-2 text-white">
        <p className="text-xs font-semibold tracking-wide text-white">{data?.title}</p>

        {Array.isArray(data?.detailRows) && data.detailRows.length > 0 ? (
          <div className="rounded-md border border-white/15 bg-black/20 px-2 py-1">
            {data.detailRows.map((line) => (
              <p className="truncate font-mono text-[10px] text-white/90" key={`${data.id}-${line}`} title={line}>
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      {showOutputHandle ? (
        <Handle
          id="out"
          type="source"
          position={outputPosition}
          style={{ width: 11, height: 11, border: '2px solid #f8fafc', background: '#0f172a' }}
        />
      ) : null}
    </div>
  )
}
