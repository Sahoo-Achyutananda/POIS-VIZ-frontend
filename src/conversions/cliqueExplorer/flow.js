import { Position } from '@xyflow/react'
import { createFlowNode, createFlowEdge } from '../../components/flow/flowNodeFactory'

function shortHex(value, take = 10) {
  if (!value) return 'N/A'
  if (typeof value !== 'string') return String(value)
  return value.length > take * 2 ? `${value.slice(0, take)}...${value.slice(-take)}` : value
}

const stepGapX = 360
const outputGapY = 100

export function buildCliqueFlow({ foundation, sourcePrimitive, targetPrimitive, queryBits, col1Data, col2Data }) {
  if (!col1Data) return { nodes: [], edges: [] }

  const nodes = []
  const edges = []
  const startX = 80
  const startY = 200

  // Seed input node
  nodes.push(createFlowNode({
    id: 'seed',
    x: startX,
    y: startY - 100,
    variant: 'input',
    title: `seed: ${shortHex(col1Data.seed)}`,
    showInputHandle: false,
    showOutputHandle: true,
    outputLabel: 'Out',
    outputPosition: Position.Bottom,
  }))

  // OWF foundation node
  nodes.push(createFlowNode({
    id: 'owf',
    x: startX,
    y: startY,
    variant: 'main',
    title: 'Foundation OWF',
    detailRows: [
      `foundation: ${foundation}`,
      `in: ${shortHex(col1Data.seed)}`,
      `out: ${shortHex(col1Data?.owf?.output)}`,
    ],
    showInputHandle: true,
    showOutputHandle: true,
  }))

  edges.push(createFlowEdge({ id: 'e-seed-owf', source: 'seed', target: 'owf' }))

  let prevId = 'owf'
  let x = startX + stepGapX

  // If PRG step exists
  if (col1Data.prg) {
    nodes.push(createFlowNode({
      id: 'owf_out',
      x,
      y: startY - outputGapY,
      variant: 'input',
      title: shortHex(col1Data?.owf?.output),
      showInputHandle: true,
      showOutputHandle: true,
    }))

    nodes.push(createFlowNode({
      id: 'prg',
      x,
      y: startY,
      variant: 'main',
      title: 'PRG Extension',
      detailRows: [
        `in: ${shortHex(col1Data?.owf?.output)}`,
        `ext: ${col1Data?.prg?.extension_length ?? 'N/A'} bits`,
        `out: ${shortHex(col1Data?.prg?.output)}`,
      ],
    }))

    edges.push(createFlowEdge({ id: 'e-owf-owf_out', source: 'owf', target: 'owf_out' }))
    edges.push(createFlowEdge({ id: 'e-owf_out-prg', source: 'owf_out', target: 'prg' }))
    prevId = 'prg'
    x += stepGapX
  }

  // If PRF step exists
  if (col1Data.prf) {
    const prfInput = col1Data.prg ? col1Data.prg.output : col1Data.owf?.output
    nodes.push(createFlowNode({
      id: 'prg_out',
      x,
      y: startY - outputGapY,
      variant: 'input',
      title: shortHex(prfInput),
      showInputHandle: true,
      showOutputHandle: true,
    }))

    nodes.push(createFlowNode({
      id: 'prf',
      x,
      y: startY,
      variant: 'main',
      title: 'PRF (GGM Tree)',
      detailRows: [
        `key: ${shortHex(col1Data.prf.key_hex || col1Data.prf.key)}`,
        `query: ${col1Data.prf.query_bits || 'N/A'}`,
        `out: ${shortHex(col1Data.prf.output_hex || col1Data.prf.output)}`,
      ],
    }))

    edges.push(createFlowEdge({ id: `e-${prevId}-prg_out`, source: prevId, target: 'prg_out' }))
    edges.push(createFlowEdge({ id: 'e-prg_out-prf', source: 'prg_out', target: 'prf' }))
    prevId = 'prf'
    x += stepGapX
  }

  // Source primitive output node
  const sourceOutputVal = col1Data.sourceOutput
  nodes.push(createFlowNode({
    id: 'source_out',
    x,
    y: startY - outputGapY,
    variant: 'input',
    title: shortHex(sourceOutputVal),
    showInputHandle: true,
    showOutputHandle: true,
  }))

  nodes.push(createFlowNode({
    id: 'source_node',
    x,
    y: startY,
    variant: 'main',
    title: `${sourcePrimitive} Instance`,
    detailRows: [
      `primitive: ${sourcePrimitive}`,
      `foundation: ${foundation}`,
      `out: ${shortHex(sourceOutputVal)}`,
    ],
    showInputHandle: true,
    showOutputHandle: true,
  }))

  edges.push(createFlowEdge({ id: `e-${prevId}-source_out`, source: prevId, target: 'source_out' }))
  edges.push(createFlowEdge({ id: 'e-source_out-source_node', source: 'source_out', target: 'source_node' }))
  prevId = 'source_node'
  x += stepGapX

  // Reduction steps (BFS route)
  if (col2Data?.warning) {
    nodes.push(createFlowNode({
      id: 'warn',
      x,
      y: startY,
      variant: 'info',
      title: 'No Reduction Path',
      detailRows: [col2Data.warning],
      showInputHandle: true,
      showOutputHandle: false,
    }))
    edges.push(createFlowEdge({ id: 'e-source-warn', source: prevId, target: 'warn' }))
    return { nodes, edges }
  }

  const steps = Array.isArray(col2Data?.steps) ? col2Data.steps : []

  if (steps.length === 0 && sourcePrimitive === targetPrimitive) {
    nodes.push(createFlowNode({
      id: 'final',
      x,
      y: startY,
      variant: 'output',
      title: `${targetPrimitive} (identity)`,
      detailRows: [`out: ${shortHex(col2Data?.final)}`],
      showInputHandle: true,
      showOutputHandle: false,
    }))
    edges.push(createFlowEdge({ id: 'e-source-final', source: prevId, target: 'final' }))
    return { nodes, edges }
  }

  // Query input for reduction steps
  if (steps.length > 0) {
    nodes.push(createFlowNode({
      id: 'query_input',
      x: x - 100,
      y: startY - 50,
      variant: 'input',
      title: `query: ${queryBits ?? 'N/A'}`,
      minWidth: 130,
      maxWidth: 210,
      showInputHandle: false,
      showOutputHandle: true,
      outputPosition: Position.Right,
    }))
  }

  steps.forEach((step, idx) => {
    const nodeId = `reduce-${idx}`
    const outNodeId = `reduce-${idx}-out`
    const prevOut = idx === 0 ? shortHex(sourceOutputVal) : shortHex(steps[idx - 1]?.value)

    nodes.push(createFlowNode({
      id: nodeId,
      x,
      y: startY,
      variant: 'main',
      title: `Step ${idx + 1}: ${step.from} → ${step.to}`,
      detailRows: [
        `theorem: ${step.theorem}`,
        `in: ${prevOut}`,
        `out: ${shortHex(step.value)}`,
      ],
    }))

    nodes.push(createFlowNode({
      id: outNodeId,
      x: x + stepGapX,
      y: startY - outputGapY,
      variant: 'input',
      title: shortHex(step.value),
      showInputHandle: true,
      showOutputHandle: true,
    }))

    edges.push(createFlowEdge({ id: `e-${prevId}-${nodeId}`, source: prevId, target: nodeId }))
    edges.push(createFlowEdge({ id: `e-${nodeId}-${outNodeId}`, source: nodeId, target: outNodeId }))

    if (idx === 0) {
      edges.push(createFlowEdge({ id: 'e-query-reduce-0', source: 'query_input', target: nodeId }))
    }

    prevId = outNodeId
    x += stepGapX
  })

  // Final target node
  nodes.push(createFlowNode({
    id: 'final',
    x,
    y: startY,
    variant: 'output',
    title: `${targetPrimitive} Output`,
    detailRows: [
      `target: ${targetPrimitive}`,
      `out: ${shortHex(col2Data?.final)}`,
    ],
    showInputHandle: true,
    showOutputHandle: false,
    inputLabel: 'In',
  }))
  edges.push(createFlowEdge({ id: 'e-last-final', source: prevId, target: 'final' }))

  return { nodes, edges }
}
