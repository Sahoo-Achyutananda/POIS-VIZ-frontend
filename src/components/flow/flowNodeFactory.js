import { Position } from '@xyflow/react'

import FlowBlockNode, { FLOW_BLOCK_NODE_TYPE } from './FlowBlockNode'
import FlowXorNode, { FLOW_XOR_NODE_TYPE } from './FlowXorNode'
import FlowAesNode, { FLOW_AES_NODE_TYPE } from './FlowAesNode'
import FlowMDCompressNode, { FLOW_MD_NODE_TYPE } from './FlowMDCompressNode'
import FlowMDMessageNode, { FLOW_MD_MESSAGE_NODE_TYPE } from './FlowMDMessageNode'
import FlowMDOutputNode, { FLOW_MD_OUTPUT_NODE_TYPE } from './FlowMDOutputNode'
import FlowDLPCompressNode, { FLOW_DLP_NODE_TYPE } from './FlowDLPCompressNode'
import FlowDLPExpNode, { FLOW_DLP_EXP_NODE_TYPE } from './FlowDLPExpNode'
import FlowDLPProdNode, { FLOW_DLP_PROD_NODE_TYPE } from './FlowDLPProdNode'

export {
  FLOW_BLOCK_NODE_TYPE,
  FLOW_XOR_NODE_TYPE,
  FLOW_AES_NODE_TYPE,
  FLOW_MD_NODE_TYPE,
  FLOW_MD_MESSAGE_NODE_TYPE,
  FLOW_MD_OUTPUT_NODE_TYPE,
  FLOW_DLP_NODE_TYPE,
  FLOW_DLP_EXP_NODE_TYPE,
  FLOW_DLP_PROD_NODE_TYPE,
}

export const nodeTypes = {
  [FLOW_BLOCK_NODE_TYPE]: FlowBlockNode,
  [FLOW_XOR_NODE_TYPE]: FlowXorNode,
  [FLOW_AES_NODE_TYPE]: FlowAesNode,
  [FLOW_MD_NODE_TYPE]: FlowMDCompressNode,
  [FLOW_MD_MESSAGE_NODE_TYPE]: FlowMDMessageNode,
  [FLOW_MD_OUTPUT_NODE_TYPE]: FlowMDOutputNode,
  [FLOW_DLP_NODE_TYPE]: FlowDLPCompressNode,
  [FLOW_DLP_EXP_NODE_TYPE]: FlowDLPExpNode,
  [FLOW_DLP_PROD_NODE_TYPE]: FlowDLPProdNode,
}

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

/**
 * Create a specialized Merkle-Damgard Compress Node for PA7.
 */
export function createMDCompressNode({ id, x, y, m_hex, z_out_hex, index, onChangeBlock, ...rest }) {
  return {
    id,
    type: FLOW_MD_NODE_TYPE,
    position: { x, y },
    data: { id, m_hex, z_out_hex, index, onChangeBlock, ...rest },
    style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
  }
}

/**
 * Create a specialized Merkle-Damgard Message Node for PA7.
 */
export function createMDMessageNode({ id, x, y, m_hex, index, onChangeBlock, ...rest }) {
  return {
    id,
    type: FLOW_MD_MESSAGE_NODE_TYPE,
    position: { x, y },
    data: { id, m_hex, index, onChangeBlock, ...rest },
    style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
  }
}

/**
 * Create a specialized Merkle-Damgard Output Node (H(M)) for PA7.
 */
export function createMDOutputNode({ id, x, y, hash_hex, ...rest }) {
  return {
    id,
    type: FLOW_MD_OUTPUT_NODE_TYPE,
    position: { x, y },
    data: { id, hash_hex, ...rest },
    style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
  }
}

/**
 * Create a specialized DLP Compress Node for PA8.
 */
export function createDLPCompressNode({ id, x, y, ...rest }) {
  return {
    id,
    type: FLOW_DLP_NODE_TYPE,
    position: { x, y },
    data: { id, ...rest },
    style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
  }
}

/**
 * Create a granular Exponent Node for PA8.
 */
export function createDLPExpNode({ id, x, y, label, value, variant = 'indigo', ...rest }) {
  return {
    id,
    type: FLOW_DLP_EXP_NODE_TYPE,
    position: { x, y },
    data: { id, label, value, variant, ...rest },
    style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
  }
}

/**
 * Create a granular Product Node (Multiplier) for PA8.
 */
export function createDLPProdNode({ id, x, y, value, ...rest }) {
  return {
    id,
    type: FLOW_DLP_PROD_NODE_TYPE,
    position: { x, y },
    data: { id, value, ...rest },
    style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
  }
}
