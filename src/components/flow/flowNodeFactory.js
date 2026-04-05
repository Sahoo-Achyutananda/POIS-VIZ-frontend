import { Position } from '@xyflow/react'

import { FLOW_BLOCK_NODE_TYPE } from './FlowBlockNode'

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
