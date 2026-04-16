import { 
  createMDCompressNode, 
  createMDMessageNode, 
  createMDOutputNode, 
  createFlowEdge 
} from '../../components/flow/flowNodeFactory'

export function generateMDChainFlow(trace, blocks, onChangeBlock) {
  const nodes = []
  const edges = []
  
  if (!trace || trace.length === 0) return { nodes, edges }

  const startX = 20
  const yHNode = 120
  const yMNode = 0
  const spacingX = 250

  // 1. IV Node
  nodes.push({
    id: 'iv-node',
    type: 'input',
    position: { x: startX, y: yHNode + 10 },
    data: { label: 'IV = 0ⁿ' },
    style: {
      background: '#1d4ed8', // Premium Blue
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
    const x = startX + 150 + (index * spacingX)
    lastHX = x

    // 2. Message Node (Mi)
    nodes.push(
      createMDMessageNode({
        id: `m-node-${index}`,
        x,
        y: yMNode,
        m_hex: blocks[index] || blockInfo.m_hex,
        index,
        onChangeBlock,
      })
    )

    // 3. Compress Node (h)
    nodes.push(
      createMDCompressNode({
        id: `h-node-${index}`,
        x: x + 80, // offset to center under M node (M width 220, h width 60)
        y: yHNode,
        z_out_hex: blockInfo.z_out_hex,
        index,
      })
    )

    // 4. Edge: Message -> Compress
    edges.push(
      createFlowEdge({
        id: `e-m${index}-to-h${index}`,
        source: `m-node-${index}`,
        target: `h-node-${index}`,
        sourceHandle: 'm-out',
        targetHandle: 'm-in',
        label: `M${index}`,
        labelStyle: { fill: '#166534', fontWeight: 600, fontSize: 10 },
      })
    )

    // 5. Edge: Previous (h or IV) -> This h
    const prevId = index === 0 ? 'iv-node' : `h-node-${index - 1}`
    const sourceHandle = index === 0 ? null : 'z-out'
    const label = `z${index}`
    
    edges.push(
      createFlowEdge({
        id: `e-chain-${index}`,
        source: prevId,
        target: `h-node-${index}`,
        sourceHandle,
        targetHandle: 'z-in',
        label,
        labelStyle: { fill: '#4338ca', fontWeight: 600, fontSize: 10 },
      })
    )
  })

  // 6. Final Hash Output Node
  const finalX = lastHX + spacingX
  const finalZOut = trace[trace.length - 1].z_out_hex

  nodes.push(
    createMDOutputNode({
      id: 'output-node',
      x: finalX,
      y: yHNode,
      hash_hex: finalZOut
    })
  )

  edges.push(
    createFlowEdge({
      id: 'e-final-to-out',
      source: `h-node-${trace.length - 1}`,
      target: 'output-node',
      sourceHandle: 'z-out',
      targetHandle: 'h-in',
      label: `z${trace.length}`,
      labelStyle: { fill: '#4338ca', fontWeight: 600, fontSize: 10 },
    })
  )

  return { nodes, edges }
}

