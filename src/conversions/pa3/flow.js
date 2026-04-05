import { Position } from '@xyflow/react'

import { createFlowEdge, createFlowNode } from '../../components/flow/flowNodeFactory'

function shortText(value, take = 14) {
  if (!value) return 'N/A'
  const text = String(value)
  return text.length > take * 2 ? `${text.slice(0, take)}...${text.slice(-take)}` : text
}

// Basic starter graph for PA3 encryption.
// You can extend this with per-block nodes, decryption flow, and live metadata.
export function buildPa3EncryptionFlow({
  keyHex,
  message,
  nonce,
  ciphertext,
  blockSize = 16,
  queryBits = 8,
} = {}) {
  const nodes = []
  const edges = []

  const startX = 80
  const startY = 180
  const stepGapX = 260

  nodes.push(
    createFlowNode({
      id: 'enc-key',
      x: startX,
      y: startY - 90,
      variant: 'input',
      title: `k: ${shortText(keyHex)}`,
      detailRows: ['Input key (hex)'],
      showInputHandle: false,
      showOutputHandle: true,
      outputPosition: Position.Right,
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'enc-message',
      x: startX,
      y: startY + 40,
      variant: 'input',
      title: `m: ${shortText(message)}`,
      detailRows: ['Input plaintext'],
      showInputHandle: false,
      showOutputHandle: true,
      outputPosition: Position.Right,
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'enc-padding',
      x: startX + stepGapX,
      y: startY + 40,
      variant: 'main',
      title: 'Pad message',
      detailRows: [`PKCS#7`, `block size: ${blockSize} bytes`],
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'enc-split',
      x: startX + stepGapX * 2,
      y: startY + 40,
      variant: 'main',
      title: 'Split blocks',
      detailRows: ['m -> m1, m2, ...'],
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'enc-nonce',
      x: startX + stepGapX,
      y: startY - 100,
      variant: 'input',
      title: `r: ${shortText(nonce)}`,
      detailRows: ['Sample random nonce'],
      showInputHandle: false,
      showOutputHandle: true,
      outputPosition: Position.Bottom,
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'enc-prf',
      x: startX + stepGapX * 3,
      y: startY - 30,
      variant: 'main',
      title: 'PRF pads',
      detailRows: ['F(k, r+i)', `counter bits: ${queryBits}`],
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'enc-xor',
      x: startX + stepGapX * 4,
      y: startY + 40,
      variant: 'main',
      title: 'XOR blocks',
      detailRows: ['ci = mi xor pad_i'],
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'enc-join',
      x: startX + stepGapX * 5,
      y: startY + 40,
      variant: 'main',
      title: 'Join ciphertext',
      detailRows: ['c = c1 || c2 || ...'],
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'enc-output',
      x: startX + stepGapX * 6,
      y: startY + 40,
      variant: 'output',
      title: 'Output (r, c)',
      detailRows: [`r: ${shortText(nonce)}`, `c: ${shortText(ciphertext)}`],
      showOutputHandle: false,
    }),
  )

  edges.push(createFlowEdge({ id: 'e-key-prf', source: 'enc-key', target: 'enc-prf', label: 'k' }))
  edges.push(createFlowEdge({ id: 'e-msg-pad', source: 'enc-message', target: 'enc-padding', label: 'm' }))
  edges.push(createFlowEdge({ id: 'e-pad-split', source: 'enc-padding', target: 'enc-split' }))
  edges.push(createFlowEdge({ id: 'e-split-xor', source: 'enc-split', target: 'enc-xor', label: 'mi' }))
  edges.push(createFlowEdge({ id: 'e-nonce-prf', source: 'enc-nonce', target: 'enc-prf', label: 'r+i' }))
  edges.push(createFlowEdge({ id: 'e-prf-xor', source: 'enc-prf', target: 'enc-xor', label: 'pad_i' }))
  edges.push(createFlowEdge({ id: 'e-xor-join', source: 'enc-xor', target: 'enc-join' }))
  edges.push(createFlowEdge({ id: 'e-join-out', source: 'enc-join', target: 'enc-output', label: '(r,c)' }))

  return { nodes, edges }
}

// Basic starter graph for PA3 decryption.
export function buildPa3DecryptionFlow({
  keyHex,
  nonce,
  ciphertext,
  plaintext,
  blockSize = 16,
  queryBits = 8,
} = {}) {
  const nodes = []
  const edges = []

  const startX = 80
  const startY = 180
  const stepGapX = 260

  nodes.push(
    createFlowNode({
      id: 'dec-key',
      x: startX,
      y: startY - 90,
      variant: 'input',
      title: `k: ${shortText(keyHex)}`,
      detailRows: ['Input key (hex)'],
      showInputHandle: false,
      showOutputHandle: true,
      outputPosition: Position.Right,
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'dec-nonce',
      x: startX,
      y: startY + 20,
      variant: 'input',
      title: `r: ${shortText(nonce)}`,
      detailRows: ['Input nonce'],
      showInputHandle: false,
      showOutputHandle: true,
      outputPosition: Position.Right,
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'dec-cipher',
      x: startX,
      y: startY + 130,
      variant: 'input',
      title: `c: ${shortText(ciphertext)}`,
      detailRows: ['Input ciphertext'],
      showInputHandle: false,
      showOutputHandle: true,
      outputPosition: Position.Right,
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'dec-split',
      x: startX + stepGapX,
      y: startY + 130,
      variant: 'main',
      title: 'Split ciphertext',
      detailRows: ['c -> c1, c2, ...'],
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'dec-prf',
      x: startX + stepGapX * 2,
      y: startY + 20,
      variant: 'main',
      title: 'PRF pads',
      detailRows: ['F(k, r+i)', `counter bits: ${queryBits}`],
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'dec-xor',
      x: startX + stepGapX * 3,
      y: startY + 130,
      variant: 'main',
      title: 'XOR blocks',
      detailRows: ['mi = ci xor pad_i'],
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'dec-join',
      x: startX + stepGapX * 4,
      y: startY + 130,
      variant: 'main',
      title: 'Join padded m',
      detailRows: ['m_padded = m1 || m2 || ...'],
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'dec-unpad',
      x: startX + stepGapX * 5,
      y: startY + 130,
      variant: 'main',
      title: 'Remove padding',
      detailRows: [`PKCS#7`, `block size: ${blockSize} bytes`],
    }),
  )

  nodes.push(
    createFlowNode({
      id: 'dec-output',
      x: startX + stepGapX * 6,
      y: startY + 130,
      variant: 'output',
      title: 'Output m',
      detailRows: [`m: ${shortText(plaintext)}`],
      showOutputHandle: false,
    }),
  )

  edges.push(createFlowEdge({ id: 'd-key-prf', source: 'dec-key', target: 'dec-prf', label: 'k' }))
  edges.push(createFlowEdge({ id: 'd-r-prf', source: 'dec-nonce', target: 'dec-prf', label: 'r+i' }))
  edges.push(createFlowEdge({ id: 'd-c-split', source: 'dec-cipher', target: 'dec-split', label: 'c' }))
  edges.push(createFlowEdge({ id: 'd-split-xor', source: 'dec-split', target: 'dec-xor', label: 'ci' }))
  edges.push(createFlowEdge({ id: 'd-prf-xor', source: 'dec-prf', target: 'dec-xor', label: 'pad_i' }))
  edges.push(createFlowEdge({ id: 'd-xor-join', source: 'dec-xor', target: 'dec-join' }))
  edges.push(createFlowEdge({ id: 'd-join-unpad', source: 'dec-join', target: 'dec-unpad' }))
  edges.push(createFlowEdge({ id: 'd-unpad-out', source: 'dec-unpad', target: 'dec-output', label: 'm' }))

  return { nodes, edges }
}
