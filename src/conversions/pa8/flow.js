import { 
  createDLPExpNode,
  createDLPProdNode,
  createMDMessageNode, 
  createMDOutputNode, 
  createFlowEdge 
} from '../../components/flow/flowNodeFactory'

export function generateDLPHashFlow(trace, params) {
  const nodes = []
  const edges = []
  
  if (!trace || trace.length === 0) return { nodes, edges }

  const startX = 20
  const yCenter = 150
  const yMessage = -100
  const yExpMsg = 30
  const spacingX = 450 // Increased for the granular circuit

  // 1. IV Node (Group Generator g)
  nodes.push({
    id: 'iv-node',
    type: 'input',
    position: { x: startX, y: yCenter + 10 },
    data: { label: `IV = g (${params?.g || '?'})` },
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

  let lastProdId = 'iv-node'
  let lastX = startX

  trace.forEach((blockInfo, index) => {
    const xBase = startX + 200 + (index * spacingX)
    lastX = xBase

    // 2. Message Box (y)
    const msgId = `m-node-${index}`
    nodes.push(
      createMDMessageNode({
        id: msgId,
        x: xBase,
        y: yMessage,
        m_hex: blockInfo.m_hex,
        index,
        onChangeBlock: () => {},
      })
    )

    // 3. State Exponent Node (g^x)
    const expStateId = `exp-state-${index}`
    nodes.push(
      createDLPExpNode({
        id: expStateId,
        x: xBase,
        y: yCenter,
        label: `gˣ`,
        value: blockInfo.g_z_hex,
        variant: 'indigo'
      })
    )

    // 4. Message Exponent Node (ĥʸ)
    const expMsgId = `exp-msg-${index}`
    nodes.push(
      createDLPExpNode({
        id: expMsgId,
        x: xBase + 150,
        y: yExpMsg,
        label: `ĥʸ`,
        value: blockInfo.h_m_hex,
        variant: 'teal'
      })
    )

    // 5. Product Node (× mod p)
    const prodId = `prod-node-${index}`
    nodes.push(
      createDLPProdNode({
        id: prodId,
        x: xBase + 350,
        y: yCenter,
        value: blockInfo.z_out_hex
      })
    )

    // EDGES
    // 6. Chaining: Prev Prod -> ExpState
    edges.push(
      createFlowEdge({
        id: `e-chain-${index}`,
        source: lastProdId,
        target: expStateId,
        sourceHandle: index === 0 ? null : 'out',
        targetHandle: 'in',
        animated: true,
      })
    )

    // 7. Message -> ExpMsg
    edges.push(
      createFlowEdge({
        id: `e-m-to-exp-${index}`,
        source: msgId,
        target: expMsgId,
        sourceHandle: 'm-out',
        targetHandle: 'in',
        animated: true,
      })
    )

    // 8. ExpState -> Prod (in-1)
    edges.push(
      createFlowEdge({
        id: `e-exps-to-prod-${index}`,
        source: expStateId,
        target: prodId,
        sourceHandle: 'out',
        targetHandle: 'in-1',
        animated: true,
      })
    )

    // 9. ExpMsg -> Prod (in-2)
    edges.push(
      createFlowEdge({
        id: `e-expm-to-prod-${index}`,
        source: expMsgId,
        target: prodId,
        sourceHandle: 'out',
        targetHandle: 'in-2',
        animated: true,
      })
    )

    lastProdId = prodId
  })

  // 10. Final Hash Output Node
  const finalX = lastX + spacingX
  const outputId = 'output-node'
  nodes.push(
    createMDOutputNode({
      id: outputId,
      x: finalX,
      y: yCenter,
      hash_hex: trace[trace.length - 1].z_out_hex
    })
  )

  edges.push(
    createFlowEdge({
      id: 'e-final-to-out',
      source: lastProdId,
      target: outputId,
      sourceHandle: 'out',
      targetHandle: 'h-in',
      animated: true,
    })
  )

  return { nodes, edges }
}
