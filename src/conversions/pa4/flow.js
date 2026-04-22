import { Position } from '@xyflow/react'

import { createFlowEdge, createFlowNode, createXorNode, createAesNode } from '../../components/flow/flowNodeFactory'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToBytes(hex) {
  if (!hex || typeof hex !== 'string' || hex.length % 2 !== 0) return new Uint8Array(0)
  const values = []
  for (let i = 0; i < hex.length; i += 2) {
    const parsed = Number.parseInt(hex.slice(i, i + 2), 16)
    if (Number.isNaN(parsed)) return new Uint8Array(0)
    values.push(parsed)
  }
  return new Uint8Array(values)
}

function fromUtf8Bytes(bytes) {
  return new TextDecoder().decode(bytes)
}

function blockMessageAt(plaintextBlocks, idx) {
  if (!plaintextBlocks || plaintextBlocks.length <= idx) return '[empty]'
  const blockHex = plaintextBlocks[idx]
  const decoded = fromUtf8Bytes(hexToBytes(blockHex))
  return decoded || '[empty]'
}

export function splitHexIntoBlocks(hex, blockSize = 16) {
  const normalized = (hex || '').trim().toLowerCase()
  if (!normalized || /[^0-9a-f]/.test(normalized)) return []
  const blocks = []
  for (let i = 0; i < normalized.length; i += blockSize * 2) {
    blocks.push(normalized.slice(i, i + blockSize * 2))
  }
  return blocks
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
//
// CBC:  Single vertical column per lane.
//       Encrypt: P_i → ⊕ → AES_Enc → C_i   (top → bottom)
//       Decrypt: C_i → AES_Dec → ⊕ → P_i   (top → bottom)
//       IV/chain enters ⊕ from the left.
//
// OFB/CTR: Two sub-columns per lane.
//       Left  (keystream): State → AES
//       Right (data):      P_i / C_i
//       Both merge at ⊕ (center), output below.
//
// Lane geometry:
//   LANE_GAP      — horizontal distance between lane centres
//   LANE_CX       — x within a lane where the "main column" is centred
//   IV_OFFSET_X   — how far left of the lane centre the IV/chain node sits
//   Node x        — always: LANE_CX - nodeHalfWidth  (to centre the node)
// ---------------------------------------------------------------------------

const LANE_GAP    = 500   // px between lane left edges
const START_X     = 80    // left edge of lane 0
const LANE_CX     = 130   // centre of main column within a lane (relative to laneX)

// half-widths used to centre each node type around LANE_CX
const HW_BLOCK  = 110   // FlowBlockNode  (minWidth ≈ 220)
const HW_AES    = 70    // FlowAesNode    (width  ≈ 140)
const HW_XOR    = 26    // FlowXorNode    (size   ≈ 52)

// ---------------------------------------------------------------------------
// Main graph builder
// ---------------------------------------------------------------------------

/**
 * Build ReactFlow nodes/edges for the PA4 encryption/decryption flow.
 *
 * @param {string}   mode             - 'cbc' | 'ofb' | 'ctr'
 * @param {string}   flowTab          - 'encrypt' | 'decrypt'
 * @param {string}   ivHex            - IV / nonce hex string
 * @param {string[]} plaintextBlocks  - array of block hex strings
 * @param {string[]} ciphertextBlocks - array of block hex strings
 * @returns {{ nodes: object[], edges: object[] }}
 */
export function buildPa4BackendFlow(mode, flowTab, ivHex, plaintextBlocks, ciphertextBlocks, expectedPlainBlocks = []) {
  const isDecrypt = flowTab === 'decrypt'
  const rows      = Math.max(1, plaintextBlocks.length, ciphertextBlocks.length)
  const blockIdxs = Array.from({ length: rows }, (_, i) => i)
  const nodes     = []
  const edges     = []

  // ── CBC ────────────────────────────────────────────────────────────────────
  if (mode === 'cbc') {
    blockIdxs.forEach((i) => {
      const laneX = START_X + i * LANE_GAP
      const cx    = laneX + LANE_CX   // horizontal centre of this lane

      const inId  = isDecrypt ? `cbc-c-in-${i}`  : `cbc-p-in-${i}`
      const xorId = `cbc-xor-${flowTab}-${i}`
      const aesId = `cbc-aes-${flowTab}-${i}`
      const outId = isDecrypt ? `cbc-p-out-${i}` : `cbc-c-out-${i}`

      // Y rows — order depends on direction
      //   encrypt: in → ⊕(xor) → AES → out
      //   decrypt: in → AES   → ⊕(xor) → out
      const Y_IN  = 20
      const Y_MID1 = isDecrypt ? 155 : 155   // first processing node
      const Y_MID2 = isDecrypt ? 295 : 285   // second processing node
      const Y_OUT  = isDecrypt ? 430 : 420

      // Assign xor/aes to correct row
      const Y_XOR = isDecrypt ? Y_MID2 : Y_MID1
      const Y_AES = isDecrypt ? Y_MID1 : Y_MID2

      // ── Input block (P_i or C_i) ──
      nodes.push(
        createFlowNode({
          id: inId,
          x: cx - HW_BLOCK,
          y: Y_IN,
          variant: 'input',
          title: isDecrypt ? `C_${i}` : `P_${i}`,
          detailRows: [isDecrypt ? (ciphertextBlocks[i] || 'N/A') : (plaintextBlocks[i] || 'N/A')],
          showInputHandle: false,
          showOutputHandle: true,
          outputPosition: Position.Bottom,
          minWidth: 220,
          maxWidth: 250,
        }),
      )

      // ── AES chip ──
      nodes.push(
        createAesNode({
          id: aesId,
          x: cx - HW_AES,
          y: Y_AES,
          mode: isDecrypt ? 'dec' : 'enc',
          label: isDecrypt ? `AES_Dec_${i}` : `AES_Enc_${i}`,
          sublabel: isDecrypt ? 'block decrypt' : 'block encrypt',
          width: 140,
          inputPosition: Position.Top,
          outputPosition: Position.Bottom,
        }),
      )

      // ── XOR circle ──
      // handles: top (in-main from prev step), left (in-chain from IV/prev C), bottom (out)
      nodes.push(
        createXorNode({
          id: xorId,
          x: cx - HW_XOR,
          y: Y_XOR,
          size: 52,
          handles: ['top', 'left', 'bottom'],
          handleIds: { top: 'in-main', left: 'in-chain' },
          // 'bottom' auto-gets id='out' (it's in defaultOutputSides)
        }),
      )

      // ── Output block (C_i or P_i) ──
      const isCorrupted = isDecrypt && expectedPlainBlocks[i] !== undefined && expectedPlainBlocks[i] !== plaintextBlocks[i]

      nodes.push(
        createFlowNode({
          id: outId,
          x: cx - HW_BLOCK,
          y: Y_OUT,
          variant: isCorrupted ? 'info' : 'output',
          title: isDecrypt ? `P_${i}` : `C_${i}`,
          detailRows: isDecrypt
            ? [
                plaintextBlocks[i] || 'N/A',
                `m= ${blockMessageAt(plaintextBlocks, i)}`
              ]
            : [ciphertextBlocks[i] || 'N/A'],
          showInputHandle: true,
          inputPosition: Position.Top,
          // For encrypt: non-last blocks chain to the next XOR via RIGHT handle
          showOutputHandle: !isDecrypt && i !== blockIdxs.length - 1,
          outputPosition: Position.Right,
          minWidth: 220,
          maxWidth: 260,
        }),
      )

      // ── IV / chain node (block 0 only) ──
      if (i === 0) {
        const ivId = `cbc-iv-${flowTab}`
        nodes.push(
          createFlowNode({
            id: ivId,
            x: laneX - 200,       // to the left of the lane
            y: Y_XOR + 4,         // vertically centred on the XOR circle
            variant: 'input',
            title: 'IV',
            detailRows: [ivHex || 'N/A'],
            showInputHandle: false,
            showOutputHandle: true,
            outputPosition: Position.Right,
            minWidth: 160,
            maxWidth: 200,
          }),
        )
        edges.push(createFlowEdge({
          id: `e-${ivId}-${xorId}`,
          source: ivId,
          target: xorId,
          targetHandle: 'in-chain',
          label: 'IV',
        }))
      } else {
        // Chain from previous block's ciphertext to current XOR
        const prevChain = isDecrypt ? `cbc-c-in-${i - 1}` : `cbc-c-out-${i - 1}`
        edges.push(createFlowEdge({
          id: `e-cbc-chain-${flowTab}-${i}`,
          source: prevChain,
          target: xorId,
          targetHandle: 'in-chain',
          label: `C_${i - 1}`,
        }))
      }

      // ── Main data edges ──
      if (isDecrypt) {
        // C_i → AES_Dec → XOR → P_i
        edges.push(createFlowEdge({ id: `e-${inId}-${aesId}`,  source: inId,  target: aesId, label: `c_${i}` }))
        edges.push(createFlowEdge({ id: `e-${aesId}-${xorId}`, source: aesId, target: xorId, targetHandle: 'in-main', label: `dec(c_${i})` }))
        edges.push(createFlowEdge({ id: `e-${xorId}-${outId}`, source: xorId, target: outId, label: `p_${i}` }))
      } else {
        // P_i → XOR → AES_Enc → C_i
        edges.push(createFlowEdge({ id: `e-${inId}-${xorId}`,  source: inId,  target: xorId, targetHandle: 'in-main', label: `p_${i}` }))
        edges.push(createFlowEdge({ id: `e-${xorId}-${aesId}`, source: xorId, target: aesId, label: 'xor_out' }))
        edges.push(createFlowEdge({ id: `e-${aesId}-${outId}`, source: aesId, target: outId, label: `c_${i}` }))
      }
    })

    return { nodes, edges }
  }

  // ── OFB / CTR ──────────────────────────────────────────────────────────────
  //
  // Layout per lane:
  //
  //   LEFT column (keystream path)     RIGHT column (data)
  //   ─────────────────────────────    ──────────────────
  //   State_i  (y=20)
  //        ↓
  //   AES(State_i)  (y=160)                P_i / C_i  (y=195)
  //        ↓                                    ↓ (right handle →)
  //        └────────────→  ⊕ XOR  ←────────────┘
  //                         (y=320)
  //                              ↓
  //                         C_i / P_i  (y=450)
  //
  // The AES bottom handle feeds into XOR top (in-keystream).
  // The Input right handle feeds into XOR right (in-main) — right is forced to target.
  // OFB only: AES also feeds the next State via a forward edge.

  const LEFT_CX   = 110   // centre of state/AES column within lane
  const RIGHT_LX  = 280   // left edge of input block column within lane
  const XOR_CX    = 110   // centre of XOR circle within lane (aligned with AES)

  const HW_STATE  = 95    // half-width of state block (minWidth ≈ 190)
  const HW_INPUT  = 100   // half-width of input block (minWidth ≈ 200)

  blockIdxs.forEach((i) => {
    const laneX = START_X + i * LANE_GAP

    const stateId = `${mode}-state-${flowTab}-${i}`
    const aesId   = `${mode}-aes-${flowTab}-${i}`
    const inId    = `${mode}-${isDecrypt ? 'c' : 'p'}-in-${i}`
    const xorId   = `${mode}-xor-${flowTab}-${i}`
    const outId   = `${mode}-${isDecrypt ? 'p' : 'c'}-out-${i}`

    const Y_STATE = 20
    const Y_AES   = 170
    const Y_IN    = 200   // input block, same-ish height as AES
    const Y_XOR   = 340
    const Y_OUT   = 470

    // ── State node (S_i or Counter_i) ──
    nodes.push(
      createFlowNode({
        id: stateId,
        x: laneX + LEFT_CX - HW_STATE,
        y: Y_STATE,
        variant: 'input',
        title: mode === 'ctr' ? `Counter_${i}` : (i === 0 ? 'S_0 (IV)' : `S_${i}`),
        detailRows: [
          mode === 'ctr'
            ? 'nonce || i'
            : (i === 0 ? (ivHex || 'N/A') : `from AES(S_${i - 1})`),
        ],
        showInputHandle: mode !== 'ctr' && i !== 0,
        inputPosition: Position.Top,
        showOutputHandle: true,
        outputPosition: Position.Bottom,
        minWidth: 190,
        maxWidth: 220,
      }),
    )

    // ── AES chip (keystream generation) ──
    nodes.push(
      createAesNode({
        id: aesId,
        x: laneX + LEFT_CX - HW_AES,
        y: Y_AES,
        mode: 'enc',   // always encrypt for keystream, regardless of flowTab
        label: mode === 'ctr' ? `AES(Ctr_${i})` : `AES(S_${i})`,
        sublabel: `keystream_${i}`,
        width: 140,
        inputPosition: Position.Top,
        outputPosition: Position.Bottom,
      }),
    )

    // ── Input block (P_i or C_i) on the right ──
    // Output handle is on the LEFT so the edge goes left toward XOR.
    nodes.push(
      createFlowNode({
        id: inId,
        x: laneX + RIGHT_LX,
        y: Y_IN,
        variant: 'input',
        title: isDecrypt ? `C_${i}` : `P_${i}`,
        detailRows: [isDecrypt ? (ciphertextBlocks[i] || 'N/A') : (plaintextBlocks[i] || 'N/A')],
        showInputHandle: false,
        showOutputHandle: true,
        outputPosition: Position.Left,
        minWidth: 200,
        maxWidth: 240,
      }),
    )

    // ── XOR circle ──
    // in-keystream: top (from AES below state)
    // in-main:      right (from input block on the right — forced to 'target')
    // out:          bottom (to output)
    nodes.push(
      createXorNode({
        id: xorId,
        x: laneX + XOR_CX - HW_XOR,
        y: Y_XOR,
        size: 52,
        handles: ['top', 'right', 'bottom'],
        handleIds:   { top: 'in-keystream', right: 'in-main' },
        handleTypes: { top: 'target', right: 'target', bottom: 'source' },
      }),
    )

    // ── Output block (C_i or P_i) ──
    const isCorrupted = isDecrypt && expectedPlainBlocks[i] !== undefined && expectedPlainBlocks[i] !== plaintextBlocks[i]

    nodes.push(
      createFlowNode({
        id: outId,
        x: laneX + XOR_CX - HW_BLOCK,
        y: Y_OUT,
        variant: isCorrupted ? 'info' : 'output',
        title: isDecrypt ? `P_${i}` : `C_${i}`,
        detailRows: isDecrypt
          ? [
              plaintextBlocks[i] || 'N/A',
              `m= ${blockMessageAt(plaintextBlocks, i)}`
            ]
          : [ciphertextBlocks[i] || 'N/A'],
        showInputHandle: true,
        inputPosition: Position.Top,
        // OFB only: non-last encrypt blocks chain state to the right
        showOutputHandle: false,
        minWidth: 220,
        maxWidth: 260,
      }),
    )

    // ── Edges ──
    // State → AES (keystream generation)
    edges.push(createFlowEdge({
      id: `e-${stateId}-${aesId}`,
      source: stateId,
      target: aesId,
      label: mode === 'ctr' ? `ctr_${i}` : `S_${i}`,
    }))

    // AES → XOR (keystream)
    edges.push(createFlowEdge({
      id: `e-${aesId}-${xorId}`,
      source: aesId,
      target: xorId,
      targetHandle: 'in-keystream',
      label: `K_${i}`,
    }))

    // Input → XOR (data)
    edges.push(createFlowEdge({
      id: `e-${inId}-${xorId}`,
      source: inId,
      target: xorId,
      targetHandle: 'in-main',
      label: isDecrypt ? `c_${i}` : `p_${i}`,
    }))

    // XOR → Output
    edges.push(createFlowEdge({
      id: `e-${xorId}-${outId}`,
      source: xorId,
      target: outId,
      label: isDecrypt ? `p_${i}` : `c_${i}`,
    }))

    // OFB state chain: AES_i feeds S_{i+1} in the next lane
    if (mode === 'ofb' && i < blockIdxs.length - 1) {
      edges.push(createFlowEdge({
        id: `e-ofb-next-state-${flowTab}-${i}`,
        source: aesId,
        target: `${mode}-state-${flowTab}-${i + 1}`,
        label: `S_${i + 1}`,
      }))
    }
  })

  return { nodes, edges }
}
