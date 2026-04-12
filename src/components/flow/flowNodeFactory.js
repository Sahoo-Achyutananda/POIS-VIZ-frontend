import { Position } from '@xyflow/react'

import { FLOW_BLOCK_NODE_TYPE } from './FlowBlockNode'
import { FLOW_XOR_NODE_TYPE } from './FlowXorNode'
import { FLOW_AES_NODE_TYPE } from './FlowAesNode'

export function createFlowNode({
  id,
  x,
  y,
  variant = 'main',
  title,
  detailRows = [],
  showInputHandle = true,
  showOutputHandle = true,
  inputLabel = 'In',
  outputLabel = 'Out',
  inputPosition = Position.Top,
  outputPosition = Position.Bottom,
  inputHandles = [],
  ...extraData
}) {
  return {
    id,
    type: FLOW_BLOCK_NODE_TYPE,
    position: { x, y },
    sourcePosition: outputPosition,
    targetPosition: inputPosition,
    data: {
      id,
      variant,
      title,
      detailRows,
      showInputHandle,
      showOutputHandle,
      inputLabel,
      outputLabel,
      inputPosition,
      outputPosition,
      inputHandles,
      ...extraData,
    },
    style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
  }
}

export function createFlowEdge({
  id,
  source,
  target,
  label,
  sourceHandle = 'out',
  targetHandle = 'in',
  animated = true,
  ...extraData
}) {
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    animated,
    label,
    ...extraData,
  }
}

/**
 * Create a compact XOR circle node.
 *
 * @param {{ id, x, y, size?, label?, color?, borderColor?, handles?, handleIds? }} opts
 */
export function createXorNode({ id, x, y, ...rest }) {
  return {
    id,
    type: FLOW_XOR_NODE_TYPE,
    position: { x, y },
    data: { id, ...rest },
    style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
  }
}

/**
 * Create a compact AES chip node.
 *
 * @param {{ id, x, y, mode?, label?, sublabel?, width?,
 *           inputPosition?, outputPosition?,
 *           showInputHandle?, showOutputHandle? }} opts
 */
export function createAesNode({ id, x, y, inputPosition = Position.Top, outputPosition = Position.Bottom, ...rest }) {
  return {
    id,
    type: FLOW_AES_NODE_TYPE,
    position: { x, y },
    sourcePosition: outputPosition,
    targetPosition: inputPosition,
    data: { id, inputPosition, outputPosition, ...rest },
    style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
  }
}
