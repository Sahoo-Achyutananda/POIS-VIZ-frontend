import { Position } from '@xyflow/react'

import { createFlowEdge, createFlowNode } from '../../components/flow/flowNodeFactory'

function shortHex(value) {
  if (!value) return 'N/A'
  if (typeof value !== 'string') return String(value)
  return value.length > 22 ? `${value.slice(0, 10)}...${value.slice(-10)}` : value
}

const outputGapY = 100

export function buildConversionFlow({ foundation, sourcePrimitive, targetPrimitive, queryBits, col1Data, col2Data }) {
  if (!col1Data) return { nodes: [], edges: [] }

  const nodes = []
  const edges = []

  const startX = 80
  const startY = 190
  const stepGapX = 360

  nodes.push(
    createFlowNode({
      id: 'seed',
      x: startX,
      y: startY - 100,
      variant: 'input',
      title: `seed: ${shortHex(col1Data.seed)}`,
      showInputHandle: false,
      showOutputHandle: true,
      outputLabel: 'Out',
      outputPosition: Position.Bottom,
    }),
  )

  nodes.push(
    createFlowNode({
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
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'owf_out',
      x: startX + stepGapX,
      y: startY - outputGapY,
      variant: 'input',
      title: `${shortHex(col1Data?.owf?.output)}`,
      showInputHandle: true,
      showOutputHandle: true,
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'prg',
      x: startX + stepGapX,
      y: startY,
      variant: 'main',
      title: 'PRG Extension',
      detailRows: [
        `source A: ${sourcePrimitive}`,
        `in: ${shortHex(col1Data?.owf?.output)}`,
        `out: ${shortHex(col1Data?.prg?.output)}`,
      ],
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'l_input',
      x: startX + stepGapX - 300,
      y: startY,
      variant: 'input',
      title: `l: ${col1Data?.prg?.extension_length ?? 'N/A'}`,
      minWidth: 120,
      maxWidth: 180,
      showInputHandle: false,
      showOutputHandle: true,
      outputPosition: Position.Right,
    }),
  )

  edges.push(createFlowEdge({ id: 'e-seed-owf', source: 'seed', target: 'owf' }))
  edges.push(createFlowEdge({ id: 'e-owf-out', source: 'owf', target: 'owf_out' }))
  edges.push(createFlowEdge({ id: 'e-owf-prg', source: 'owf_out', target: 'prg' }))
  edges.push(createFlowEdge({ id: 'e-l-prg', source: 'l_input', target: 'prg', label: 'l' }))

  nodes.push(
    createFlowNode({
      id: 'prg_out',
      x: startX + stepGapX * 2,
      y: startY - outputGapY,
      variant: 'input',
      title: `${shortHex(col1Data?.prg?.output)}`,
      showInputHandle: true,
      showOutputHandle: true,
    }),
  )

  edges.push(createFlowEdge({ id: 'e-prg-out-node', source: 'prg', target: 'prg_out' }))

  if (col2Data?.warning) {
    nodes.push(
      createFlowNode({
        id: 'warn',
        x: startX + stepGapX * 3,
        y: startY,
        variant: 'info',
        title: 'Reduction Status',
        detailRows: [`in: ${shortHex(col1Data?.prg?.output)}`, `out: ${col2Data.warning}`],
        showInputHandle: true,
        showOutputHandle: false,
      }),
    )
    nodes.push(
      createFlowNode({
        id: 'warn_out',
        x: startX + stepGapX * 4,
        y: startY - outputGapY,
        variant: 'input',
        title: `${col2Data.warning}`,
        showInputHandle: true,
        showOutputHandle: true,
      }),
    )
    edges.push(createFlowEdge({ id: 'e-prg-warn', source: 'prg_out', target: 'warn', label: 'status' }))
    edges.push(createFlowEdge({ id: 'e-warn-out', source: 'warn', target: 'warn_out', label: 'result' }))
    return { nodes, edges }
  }

  let prevId = 'prg_out'
  let x = startX + stepGapX * 2
  const steps = Array.isArray(col2Data?.steps) ? col2Data.steps : []

  nodes.push(
    createFlowNode({
      id: 'query_input',
      x: startX + stepGapX * 2 - 100,
      y: startY - 50,
      variant: 'input',
      title: `query: ${queryBits ?? 'N/A'}`,
      minWidth: 130,
      maxWidth: 210,
      showInputHandle: false,
      showOutputHandle: true,
      outputPosition: Position.Right,
    }),
  )

  steps.forEach((step, idx) => {
    const nodeId = `reduce-${idx}`
    const outNodeId = `reduce-${idx}-out`
    const prevStepOutput = idx === 0 ? shortHex(col1Data?.prg?.output) : shortHex(steps[idx - 1]?.value)

    nodes.push(
      createFlowNode({
        id: nodeId,
        x,
        y: startY,
        variant: 'main',
        title: `Reduction Step ${idx + 1}`,
        detailRows: [
          `from: ${step.from}`,
          `to: ${step.to}`,
          `in: ${prevStepOutput}`,
          `out: ${shortHex(step.value)}`,
          `theorem: ${step.theorem}`,
        ],
      }),
    )

    nodes.push(
      createFlowNode({
        id: outNodeId,
        x: x + stepGapX,
        y: startY - outputGapY,
        variant: 'input',
        title: `${shortHex(step.value)}`,
        showInputHandle: true,
        showOutputHandle: true,
      }),
    )

    edges.push(createFlowEdge({ id: `e-${prevId}-${nodeId}`, source: prevId, target: nodeId }))
    edges.push(createFlowEdge({ id: `e-${nodeId}-${outNodeId}`, source: nodeId, target: outNodeId }))

    if (idx === 0) {
      edges.push(createFlowEdge({ id: 'e-query-reduce-0', source: 'query_input', target: nodeId }))
    }

    prevId = outNodeId
    x += stepGapX
  })

  nodes.push(
    createFlowNode({
      id: 'final',
      x,
      y: startY,
      variant: 'output',
      title: 'Target Output',
      detailRows: [
        `target B: ${targetPrimitive}`,
        `in: ${shortHex(col2Data?.steps?.at(-1)?.value || col1Data?.prg?.output)}`,
        `out: ${shortHex(col2Data?.final)}`,
      ],
      showInputHandle: true,
      showOutputHandle: false,
      inputLabel: 'In',
    }),
  )
  edges.push(createFlowEdge({ id: 'e-last-final', source: prevId, target: 'final' }))

  return { nodes, edges }
}
