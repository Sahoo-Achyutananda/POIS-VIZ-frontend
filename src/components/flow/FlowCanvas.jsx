import { useEffect } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const defaultEdgeOptions = {
  type: 'smoothstep',
  style: { stroke: '#a5b4fc', strokeWidth: 1.9 },
  labelStyle: { fill: '#dbeafe', fontSize: 10, fontWeight: 700 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#a5b4fc',
    width: 18,
    height: 18,
  },
}

const GROUP_PADDING = 40

function nodeWidth(node) {
  const directWidth = typeof node?.style?.width === 'number' ? node.style.width : null
  const minWidth = typeof node?.data?.minWidth === 'number' ? node.data.minWidth : null
  return directWidth || minWidth || 220
}

function nodeHeight(node) {
  const directHeight = typeof node?.style?.height === 'number' ? node.style.height : null
  const minHeight = typeof node?.data?.minHeight === 'number' ? node.data.minHeight : null
  return directHeight || minHeight || 118
}

function approxEqual(a, b, epsilon = 1) {
  return Math.abs(a - b) <= epsilon
}

export default function FlowCanvas({ nodes, edges, nodeTypes }) {
  const [localNodes, setLocalNodes, onNodesChange] = useNodesState(nodes)
  const [localEdges, setLocalEdges, onEdgesChange] = useEdgesState(edges)

  useEffect(() => {
    setLocalNodes(nodes)
  }, [nodes, setLocalNodes])

  useEffect(() => {
    setLocalEdges(edges)
  }, [edges, setLocalEdges])

  useEffect(() => {
    setLocalNodes((prevNodes) => {
      const groups = prevNodes.filter((n) => n.type === 'group')
      if (groups.length === 0) return prevNodes

      const nextNodes = [...prevNodes]
      const indexById = new Map(nextNodes.map((node, idx) => [node.id, idx]))
      let changed = false

      groups.forEach((group) => {
        const childIndices = []
        const children = []

        nextNodes.forEach((node, idx) => {
          if (node.parentId === group.id) {
            childIndices.push(idx)
            children.push(node)
          }
        })

        if (children.length === 0) return

        const minX = Math.min(...children.map((c) => c.position.x))
        const minY = Math.min(...children.map((c) => c.position.y))

        const shiftX = minX < GROUP_PADDING ? GROUP_PADDING - minX : 0
        const shiftY = minY < GROUP_PADDING ? GROUP_PADDING - minY : 0

        if (shiftX > 0 || shiftY > 0) {
          childIndices.forEach((childIdx) => {
            const child = nextNodes[childIdx]
            nextNodes[childIdx] = {
              ...child,
              position: {
                x: child.position.x + shiftX,
                y: child.position.y + shiftY,
              },
            }
          })
          changed = true
        }

        const shiftedChildren = childIndices.map((idx) => nextNodes[idx])
        const maxX = Math.max(...shiftedChildren.map((c) => c.position.x + nodeWidth(c)))
        const maxY = Math.max(...shiftedChildren.map((c) => c.position.y + nodeHeight(c)))
        const desiredWidth = Math.max(260, Math.ceil(maxX + GROUP_PADDING))
        const desiredHeight = Math.max(260, Math.ceil(maxY + GROUP_PADDING))

        const groupIdx = indexById.get(group.id)
        if (groupIdx === undefined) return
        const current = nextNodes[groupIdx]
        const currentWidth = typeof current?.style?.width === 'number' ? current.style.width : 0
        const currentHeight = typeof current?.style?.height === 'number' ? current.style.height : 0

        if (!approxEqual(currentWidth, desiredWidth) || !approxEqual(currentHeight, desiredHeight)) {
          nextNodes[groupIdx] = {
            ...current,
            style: {
              ...current.style,
              width: desiredWidth,
              height: desiredHeight,
            },
          }
          changed = true
        }
      })

      return changed ? nextNodes : prevNodes
    })
  }, [localNodes, setLocalNodes])

  return (
    <div className="space-y-2 bg-(--bg) px-3 py-3">
      {/* <div className="text-xs text-(--text)">
        Visualized pipeline nodes: {nodes.length} | conversion edges: {edges.length}
      </div> */}
      <div className="h-120 w-full overflow-hidden rounded-xl border border-[#2a3350] bg-[#0b1020] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)]">
        <ReactFlowProvider>
          <ReactFlow
            nodes={localNodes}
            edges={localEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            nodesDraggable
            fitView
            minZoom={0.2}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
            style={{
              backgroundColor: '#0b1020',
              backgroundImage: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
              backgroundSize: '12px 12px',
            }}
          >
            <Background variant={BackgroundVariant.Lines} color="rgba(50, 1, 75, 0.27)" gap={60} size={1} />
            <Background variant={BackgroundVariant.Lines} color="rgba(68, 26, 122, 0.41)" gap={120} size={1.4} />
            <MiniMap
              nodeColor={(node) => {
                if (node.data?.variant === 'input') return '#1d4ed8'
                if (node.data?.variant === 'output') return '#ec4899'
                if (node.data?.variant === 'info') return '#dc2626'
                if (node.data?.variant === 'neutral') return '#334155'
                return '#9333ea'
              }}
              maskColor="rgba(2, 6, 23, 0.45)"
              pannable
              zoomable
            />
            <Controls />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  )
}
