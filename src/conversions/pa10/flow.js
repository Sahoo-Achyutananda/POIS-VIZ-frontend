import { Position } from '@xyflow/react'
import { createFlowEdge, createFlowNode, createFlowFunctionNode, createXorNode } from '../../components/flow/flowNodeFactory'

/**
 * Build ReactFlow nodes/edges for the HMAC construction flow.
 */
export function buildHmacFlow(trace) {
  if (!trace) return { nodes: [], edges: [] }

  const nodes = []
  const edges = []

  // Layout constants
  const START_X = 40
  const START_Y = 60
  const COL_GAP = 300
  const ROW_GAP = 200

  // ── INPUTS ──

  nodes.push(createFlowNode({
    id: 'key',
    x: START_X,
    y: START_Y,
    variant: 'input',
    title: 'Secret Key k',
    detailRows: [trace.key_hex],
    showOutputHandle: true,
    outputPosition: Position.Right,
    maxWidth: 240,
  }))

  // ── PRE-PROCESSING (Column 2) ──

  // Padding node
  nodes.push(createFlowFunctionNode({
    id: 'k-pad',
    x: START_X + COL_GAP,
    y: START_Y,
    label: 'Pad',
    sublabel: 'to 64B',
    value: trace.key_padded_hex,
    handles: ['left', 'bottom', 'right'], // Input from key(L), output to ipad(B) & opad(R)
  }))
  edges.push(createFlowEdge({
    id: 'e-key-pad',
    source: 'key',
    target: 'k-pad',
    sourceHandle: 'out',
    targetHandle: 'left'
  }))

  // XOR ipad
  nodes.push(createXorNode({
    id: 'xor-ipad',
    x: START_X + COL_GAP + 6,
    y: START_Y + 120,
    size: 52,
    label: 'k ⊕ ipad',
    handles: ['top', 'bottom'],
  }))
  edges.push(createFlowEdge({
    id: 'e-pad-xor-ipad',
    source: 'k-pad',
    target: 'xor-ipad',
    sourceHandle: 'bottom',
    targetHandle: 'in-top'
  }))

  // ── INNER HASH (Column 3) ──

  nodes.push(createFlowFunctionNode({
    id: 'inner-hash',
    x: START_X + COL_GAP * 2,
    y: START_Y + 120,
    label: 'Hash',
    sublabel: 'Inner H',
    value: trace.inner_hash_hex,
    handles: ['bottom', 'left', 'right'],
    handleTypes: { bottom: 'target' }, // Make bottom a target so msg can connect
    color: '#3b82f6',
    borderColor: '#93c5fd',
  }))

  // (k ⊕ ipad) -> Inner Hash (Left)
  edges.push(createFlowEdge({
    id: 'e-ipad-inner',
    source: 'xor-ipad',
    target: 'inner-hash',
    sourceHandle: 'out',
    targetHandle: 'left'
  }))

  // ── Message m (Below Inner Hash) ──
  nodes.push(createFlowNode({
    id: 'msg',
    x: START_X + COL_GAP * 1.7, // Align somewhat under inner-hash
    y: START_Y + 280,
    variant: 'input',
    title: 'Message m',
    detailRows: [trace.message_hex],
    showOutputHandle: true,
    outputPosition: Position.Top,
    maxWidth: 240,
  }))

  // Message -> Inner Hash (Bottom)
  edges.push(createFlowEdge({
    id: 'e-msg-inner',
    source: 'msg',
    target: 'inner-hash',
    sourceHandle: 'out',
    targetHandle: 'bottom'
  }))

  // ── OUTER HASH SETUP (Column 4) ──

  // XOR opad
  nodes.push(createXorNode({
    id: 'xor-opad',
    x: START_X + COL_GAP * 3,
    y: START_Y,
    size: 52,
    label: 'k ⊕ opad',
    handles: ['left', 'bottom'],
    handleTypes: { left: 'target' }
  }))

  edges.push(createFlowEdge({
    id: 'e-pad-xor-opad',
    source: 'k-pad',
    target: 'xor-opad',
    sourceHandle: 'right',
    targetHandle: 'in-left'
  }))

  // Outer Hash Node
  nodes.push(createFlowFunctionNode({
    id: 'outer-hash',
    x: START_X + COL_GAP * 3 - 6,
    y: START_Y + 120,
    label: 'Hash',
    sublabel: 'Outer H',
    value: trace.tag_hex,
    handles: ['top', 'left', 'bottom'],
    color: '#10b981',
    borderColor: '#6ee7b7',
  }))

  // (k ⊕ opad) -> Outer Hash (Top)
  edges.push(createFlowEdge({
    id: 'e-opad-outer',
    source: 'xor-opad',
    target: 'outer-hash',
    sourceHandle: 'out',
    targetHandle: 'top'
  }))

  // Inner Hash Result -> Outer Hash (Left)
  edges.push(createFlowEdge({
    id: 'e-inner-outer',
    source: 'inner-hash',
    target: 'outer-hash',
    sourceHandle: 'right',
    targetHandle: 'left'
  }))

  // ── FINAL OUTPUT (Column 5) ──

  nodes.push(createFlowNode({
    id: 'tag',
    x: START_X + COL_GAP * 3.8,
    y: START_Y + 90,
    variant: 'output',
    title: 'HMAC Authentication Tag',
    detailRows: [trace.tag_hex],
    showInputHandle: true,
    inputPosition: Position.Left,
    minWidth: 380,
  }))

  edges.push(createFlowEdge({
    id: 'e-outer-tag',
    source: 'outer-hash',
    target: 'tag',
    sourceHandle: 'bottom',
    targetHandle: 'in'
  }))

  return { nodes, edges }
}
