import { 
  createMDCompressNode, 
  createMDMessageNode, 
  createMDOutputNode, 
  createFlowEdge 
} from '../../components/flow/flowNodeFactory'

export function generateMDCollisionFlow(chainA, chainB) {
  const nodes = []
  const edges = []

  const yA = 0
  const yB = 300 // Significant vertical separation
  const startX = 20
  const spacingX = 300 // Increased even more to handle 220px blocks + handles comfortably

  // Helper to add a chain
  const addChain = (chain, yOffset, prefix, colorVariant) => {
    const { trace, blocks_hex } = chain
    
    // IV Node
    nodes.push({
      id: `${prefix}-iv`,
      type: 'input',
      position: { x: startX, y: yOffset + 120 },
      data: { label: 'IV' },
      style: {
        background: '#1d4ed8',
        border: '1px solid rgba(255, 255, 255, 0.28)',
        boxShadow: '0 10px 30px rgba(2, 6, 23, 0.35)',
        color: '#f8fbff',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        width: 150,
        textAlign: 'center',
        padding: '8px'
      }
    })

    let lastHX = startX

    trace.forEach((blockInfo, index) => {
      const x = startX + 180 + (index * spacingX)
      lastHX = x

      // Find if this is the collision point
      const isColliding = (trace[index].z_out_hex === chainA.trace[index].z_out_hex && 
                           trace[index].z_out_hex === chainB.trace[index].z_out_hex &&
                           chainA.blocks_hex[index] !== chainB.blocks_hex[index])

      // Message Node
      nodes.push(
        createMDMessageNode({
          id: `${prefix}-m-${index}`,
          x,
          y: yOffset,
          m_hex: blocks_hex[index],
          index,
          isColliding, // Pass collision flag
        })
      )

      // Compress Node
      nodes.push(
        createMDCompressNode({
          id: `${prefix}-h-${index}`,
          x: x + 80, // Centered under 220px M-node
          y: yOffset + 120,
          z_out_hex: blockInfo.z_out_hex,
          index,
          isColliding, // Pass collision flag
        })
      )

      // Edges
      edges.push(createFlowEdge({
        id: `${prefix}-e-m${index}`,
        source: `${prefix}-m-${index}`,
        target: `${prefix}-h-${index}`,
        sourceHandle: 'm-out',
        targetHandle: 'm-in',
      }))

      const prevId = index === 0 ? `${prefix}-iv` : `${prefix}-h-${index - 1}`
      const sourceHandle = index === 0 ? null : 'z-out'
      edges.push(createFlowEdge({
        id: `${prefix}-e-chain${index}`,
        source: prevId,
        target: `${prefix}-h-${index}`,
        sourceHandle,
        targetHandle: 'z-in',
      }))
    })

    // Output node
    const finalX = lastHX + spacingX
    nodes.push(
      createMDOutputNode({
        id: `${prefix}-out`,
        x: finalX,
        y: yOffset + 120,
        hash_hex: trace[trace.length - 1].z_out_hex
      })
    )
    edges.push(createFlowEdge({
        id: `${prefix}-e-final`,
        source: `${prefix}-h-${trace.length - 1}`,
        target: `${prefix}-out`,
        sourceHandle: 'z-out',
        targetHandle: 'h-in',
    }))
  }

  addChain(chainA, yA, 'A', 'teal')
  addChain(chainB, yB, 'B', 'teal')

  return { nodes, edges }
}
