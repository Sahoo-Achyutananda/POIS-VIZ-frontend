import { useMemo, useState } from 'react'
import { Position } from '@xyflow/react'

import FlowCanvas from '../components/flow/FlowCanvas'
import FlowBlockNode, { FLOW_BLOCK_NODE_TYPE } from '../components/flow/FlowBlockNode'
import { createFlowEdge, createFlowNode } from '../components/flow/flowNodeFactory'
import api from '../lib/api'

const MAX_BYTES = 64
const BLOCK_SIZE = 16
const EMPTY_BLOCK = new Uint8Array(0)
const DEMO_BLOCK_CAP = 3

function getErrorText(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (typeof error?.message === 'string') return error.message
  return 'Request failed'
}

function shortHex(value) {
  if (!value) return 'N/A'
  return value.length > 20 ? `${value.slice(0, 8)}...${value.slice(-8)}` : value
}

function resolveDemoBlockHex(block, idx) {
  const hex = bytesToHex(block)
  if (hex) return hex
  return `block-${idx}`
}

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

function splitHexIntoBlocks(hex) {
  const normalized = (hex || '').trim().toLowerCase()
  if (!normalized || /[^0-9a-f]/.test(normalized)) return []
  const blocks = []
  for (let i = 0; i < normalized.length; i += BLOCK_SIZE * 2) {
    blocks.push(normalized.slice(i, i + BLOCK_SIZE * 2))
  }
  return blocks
}

function cumulativeMessageAt(plaintextBlocks, idx) {
  const joined = plaintextBlocks.slice(0, idx + 1).join('')
  const decoded = fromUtf8Bytes(hexToBytes(joined))
  return decoded || '[empty]'
}

function buildPa4BackendFlow(mode, flowTab, ivHex, plaintextBlocks, ciphertextBlocks) {
  const isDecrypt = flowTab === 'decrypt'
  const rows = Math.max(1, plaintextBlocks.length, ciphertextBlocks.length)
  const blocks = Array.from({ length: rows }, (_, i) => i)
  const nodes = []
  const edges = []
  const startX = 80
  const laneGapX = 540

  if (mode === 'cbc') {
    blocks.forEach((i) => {
      const laneX = startX + i * laneGapX
      const inId = isDecrypt ? `cbc-c-in-${i}` : `cbc-p-in-${i}`
      const xorId = `cbc-xor-${flowTab}-${i}`
      const aesId = `cbc-aes-${flowTab}-${i}`
      const outId = isDecrypt ? `cbc-p-out-${i}` : `cbc-c-out-${i}`

      nodes.push(
        createFlowNode({
          id: inId,
          x: laneX + 160,
          y: 20,
          variant: 'input',
          title: isDecrypt ? `C_${i}` : `P_${i}`,
          detailRows: [isDecrypt ? (ciphertextBlocks[i] || 'N/A') : (plaintextBlocks[i] || 'N/A')],
          showInputHandle: false,
          showOutputHandle: true,
          outputPosition: Position.Bottom,
          minWidth: 200,
          maxWidth: 240,
        }),
      )

      nodes.push(
        createFlowNode({
          id: aesId,
          x: laneX + 50,
          y: 140,
          variant: 'main',
          title: isDecrypt ? `AES_Dec_${i}` : `AES_Enc_${i}`,
          detailRows: [isDecrypt ? 'block decrypt' : 'block encrypt'],
          minWidth: 180,
          maxWidth: 210,
        }),
      )

      nodes.push(
        createFlowNode({
          id: xorId,
          x: laneX + 50,
          y: 280,
          variant: 'main',
          title: `XOR_${i}`,
          detailRows: [isDecrypt ? 'Dec(C_i) XOR chain' : 'P_i XOR chain'],
          inputHandles: [
            { id: 'in-main', position: Position.Top },
            { id: 'in-chain', position: Position.Left },
          ],
          minWidth: 200,
          maxWidth: 230,
        }),
      )

      nodes.push(
        createFlowNode({
          id: outId,
          x: laneX + 50,
          y: 430,
          variant: 'output',
          title: isDecrypt ? `P_${i}` : `C_${i}`,
          detailRows: isDecrypt
            ? [
              plaintextBlocks[i] || 'N/A',
              `m<= ${cumulativeMessageAt(plaintextBlocks, i)}`,
            ]
            : [ciphertextBlocks[i] || 'N/A'],
          showOutputHandle: !isDecrypt && i !== blocks.length - 1,
          outputPosition: Position.Right,
          minWidth: 220,
          maxWidth: 260,
        }),
      )

      if (i === 0) {
        const ivId = `cbc-iv-${flowTab}`
        nodes.push(
          createFlowNode({
            id: ivId,
            x: laneX,
            y: 280,
            variant: 'input',
            title: 'IV',
            detailRows: [ivHex || 'N/A'],
            showInputHandle: false,
            showOutputHandle: true,
            outputPosition: Position.Right,
            minWidth: 180,
            maxWidth: 220,
          }),
        )
        edges.push(createFlowEdge({ id: `e-${ivId}-${xorId}`, source: ivId, target: xorId, targetHandle: 'in-chain', label: 'IV' }))
      } else {
        const prevChain = isDecrypt ? `cbc-c-in-${i - 1}` : `cbc-c-out-${i - 1}`
        edges.push(createFlowEdge({ id: `e-cbc-chain-${flowTab}-${i}`, source: prevChain, target: xorId, targetHandle: 'in-chain', label: `C_${i - 1}` }))
      }

      if (isDecrypt) {
        edges.push(createFlowEdge({ id: `e-${inId}-${aesId}`, source: inId, target: aesId, label: `c_${i}` }))
        edges.push(createFlowEdge({ id: `e-${aesId}-${xorId}`, source: aesId, target: xorId, targetHandle: 'in-main', label: 'dec(c_i)' }))
      } else {
        edges.push(createFlowEdge({ id: `e-${inId}-${xorId}`, source: inId, target: xorId, targetHandle: 'in-main', label: `p_${i}` }))
        edges.push(createFlowEdge({ id: `e-${xorId}-${aesId}`, source: xorId, target: aesId, label: 'xor_out' }))
      }

      edges.push(createFlowEdge({ id: `e-${isDecrypt ? xorId : aesId}-${outId}`, source: isDecrypt ? xorId : aesId, target: outId, label: isDecrypt ? `p_${i}` : `c_${i}` }))
    })

    return { nodes, edges }
  }

  blocks.forEach((i) => {
    const laneX = startX + i * laneGapX
    const stateId = `${mode}-state-${flowTab}-${i}`
    const aesId = `${mode}-aes-${flowTab}-${i}`
    const inId = `${mode}-${isDecrypt ? 'c' : 'p'}-in-${i}`
    const xorId = `${mode}-xor-${flowTab}-${i}`
    const outId = `${mode}-${isDecrypt ? 'p' : 'c'}-out-${i}`

    nodes.push(
      createFlowNode({
        id: stateId,
        x: laneX + 50,
        y: 20,
        variant: 'input',
        title: mode === 'ctr' ? `Counter_${i}` : (i === 0 ? 'S_0 (IV)' : `S_${i}`),
        detailRows: [mode === 'ctr' ? 'nonce || i' : (i === 0 ? (ivHex || 'N/A') : `from AES(S_${i - 1})`)],
        showInputHandle: mode !== 'ctr' && i !== 0,
        showOutputHandle: true,
        outputPosition: Position.Bottom,
        minWidth: 190,
        maxWidth: 220,
      }),
    )

    nodes.push(
      createFlowNode({
        id: aesId,
        x: laneX + 50,
        y: 140,
        variant: 'main',
        title: mode === 'ctr' ? `AES(Counter_${i})` : `AES(S_${i})`,
        detailRows: [`keystream_${i}`],
        minWidth: 190,
        maxWidth: 220,
      }),
    )

    nodes.push(
      createFlowNode({
        id: inId,
        x: laneX + 160,
        y: 20,
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

    nodes.push(
      createFlowNode({
        id: xorId,
        x: laneX + 50,
        y: 270,
        variant: 'main',
        title: `XOR_${i}`,
        detailRows: [isDecrypt ? 'C_i XOR keystream_i' : 'P_i XOR keystream_i'],
        inputHandles: [
          { id: 'in-keystream', position: Position.Top },
          { id: 'in-main', position: Position.Left },
        ],
        minWidth: 200,
        maxWidth: 230,
      }),
    )

    nodes.push(
      createFlowNode({
        id: outId,
        x: laneX + 50,
        y: 400,
        variant: 'output',
        title: isDecrypt ? `P_${i}` : `C_${i}`,
        detailRows: isDecrypt
          ? [
            plaintextBlocks[i] || 'N/A',
            `m<= ${cumulativeMessageAt(plaintextBlocks, i)}`,
          ]
          : [ciphertextBlocks[i] || 'N/A'],
        showOutputHandle: !isDecrypt && mode === 'ofb' && i !== blocks.length - 1,
        outputPosition: Position.Right,
        minWidth: 220,
        maxWidth: 260,
      }),
    )

    edges.push(createFlowEdge({ id: `e-${stateId}-${aesId}`, source: stateId, target: aesId, label: mode === 'ctr' ? `ctr_${i}` : `S_${i}` }))
    edges.push(createFlowEdge({ id: `e-${aesId}-${xorId}`, source: aesId, target: xorId, targetHandle: 'in-keystream', label: `K_${i}` }))
    edges.push(createFlowEdge({ id: `e-${inId}-${xorId}`, source: inId, target: xorId, targetHandle: 'in-main', label: isDecrypt ? `c_${i}` : `p_${i}` }))
    edges.push(createFlowEdge({ id: `e-${xorId}-${outId}`, source: xorId, target: outId, label: isDecrypt ? `p_${i}` : `c_${i}` }))

    if (mode === 'ofb' && i < blocks.length - 1) {
      edges.push(createFlowEdge({ id: `e-ofb-next-state-${flowTab}-${i}`, source: aesId, target: `${mode}-state-${flowTab}-${i + 1}`, label: `S_${i + 1}` }))
    }
  })

  return { nodes, edges }
}

function toUtf8Bytes(input) {
  return new TextEncoder().encode(input)
}

function fromUtf8Bytes(bytes) {
  return new TextDecoder().decode(bytes)
}

function splitBlocks(bytes, blockSize = BLOCK_SIZE) {
  const blocks = []
  for (let i = 0; i < bytes.length; i += blockSize) {
    blocks.push(bytes.slice(i, i + blockSize))
  }
  return blocks
}

function byteToBits(byteValue) {
  return byteValue.toString(2).padStart(8, '0').split('')
}

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export default function PA4() {
  const [mode, setMode] = useState('cbc')
  const [message, setMessage] = useState('pa4-bit-flip-demo')
  const [flowTab, setFlowTab] = useState('encrypt')
  const [keyHex, setKeyHex] = useState('00112233445566778899aabbccddeeff')
  const [ivHex, setIvHex] = useState('0102030405060708090a0b0c0d0e0f10')
  const [ciphertextHex, setCiphertextHex] = useState('')
  const [decryptCiphertextHex, setDecryptCiphertextHex] = useState('')
  const [decryptedText, setDecryptedText] = useState('')
  const [encryptMeta, setEncryptMeta] = useState(null)
  const [decryptMeta, setDecryptMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedBlock, setSelectedBlock] = useState(0)
  const [lastFlip, setLastFlip] = useState(null)

  const sourceBytes = useMemo(() => toUtf8Bytes(message), [message])
  const isTooLong = sourceBytes.length > MAX_BYTES

  const workingBytes = useMemo(() => {
    if (isTooLong) return new Uint8Array(0)
    return toUtf8Bytes(message)
  }, [message, isTooLong])

  const blocks = useMemo(() => splitBlocks(workingBytes), [workingBytes])

  const safeSelectedBlock = useMemo(() => {
    if (blocks.length === 0) return 0
    if (selectedBlock >= blocks.length) return blocks.length - 1
    return selectedBlock
  }, [blocks.length, selectedBlock])

  const activeBlock = useMemo(
    () => blocks[safeSelectedBlock] || EMPTY_BLOCK,
    [blocks, safeSelectedBlock],
  )

  const blockBitGrid = useMemo(() => {
    const padded = new Uint8Array(BLOCK_SIZE)
    padded.set(activeBlock)

    const bits = []
    for (let byteIndex = 0; byteIndex < BLOCK_SIZE; byteIndex += 1) {
      const bitRow = byteToBits(padded[byteIndex])
      for (let bitInByte = 0; bitInByte < 8; bitInByte += 1) {
        bits.push({
          block: safeSelectedBlock,
          byteIndex,
          bitInByte,
          bitValue: bitRow[bitInByte],
          bitIndex: byteIndex * 8 + bitInByte,
          inRange: byteIndex < activeBlock.length,
        })
      }
    }
    return bits
  }, [activeBlock, safeSelectedBlock])

  const demoBlocks = useMemo(() => {
    const source = blocks.length > 0 ? blocks.slice(0, DEMO_BLOCK_CAP) : [EMPTY_BLOCK]
    return source.map((b, idx) => resolveDemoBlockHex(b, idx))
  }, [blocks])

  const encryptPlainBlocks = useMemo(() => {
    if (encryptMeta?.plaintextBlocks?.length) return encryptMeta.plaintextBlocks
    return demoBlocks
  }, [encryptMeta, demoBlocks])

  const encryptCipherBlocks = useMemo(() => {
    if (encryptMeta?.ciphertextBlocks?.length) return encryptMeta.ciphertextBlocks
    return splitHexIntoBlocks(ciphertextHex).slice(0, DEMO_BLOCK_CAP)
  }, [encryptMeta, ciphertextHex])

  const decryptCipherBlocks = useMemo(() => {
    if (decryptMeta?.ciphertextBlocks?.length) return decryptMeta.ciphertextBlocks
    return splitHexIntoBlocks(decryptCiphertextHex || ciphertextHex).slice(0, DEMO_BLOCK_CAP)
  }, [decryptMeta, decryptCiphertextHex, ciphertextHex])

  const decryptPlainBlocks = useMemo(() => {
    if (decryptMeta?.plaintextBlocks?.length) return decryptMeta.plaintextBlocks
    return []
  }, [decryptMeta])

  const activeGraph = useMemo(() => {
    if (flowTab === 'decrypt') {
      return buildPa4BackendFlow(mode, 'decrypt', ivHex, decryptPlainBlocks, decryptCipherBlocks)
    }
    return buildPa4BackendFlow(mode, 'encrypt', ivHex, encryptPlainBlocks, encryptCipherBlocks)
  }, [flowTab, mode, ivHex, encryptPlainBlocks, encryptCipherBlocks, decryptPlainBlocks, decryptCipherBlocks])

  const graphNodeTypes = useMemo(() => ({ [FLOW_BLOCK_NODE_TYPE]: FlowBlockNode }), [])

  const runEncrypt = async () => {
    if (isTooLong) return

    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa4/encrypt', {
        mode,
        key_hex: keyHex,
        iv_hex: ivHex,
        message,
      })
      const data = res?.data || {}
      setCiphertextHex(data.ciphertext_hex || '')
      setEncryptMeta({
        plaintextBlocks: data.plaintext_blocks || [],
        ciphertextBlocks: data.ciphertext_blocks || [],
        steps: data.steps || [],
      })
      if (!decryptCiphertextHex) {
        setDecryptCiphertextHex(data.ciphertext_hex || '')
      }
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  const runDecrypt = async () => {
    const cipherToDecrypt = decryptCiphertextHex || ciphertextHex
    if (!cipherToDecrypt) return

    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa4/decrypt', {
        mode,
        key_hex: keyHex,
        iv_hex: ivHex,
        ciphertext_hex: cipherToDecrypt,
      })
      const data = res?.data || {}
      setDecryptedText(data.plaintext || '')
      setDecryptMeta({
        plaintextBlocks: data.plaintext_blocks || [],
        ciphertextBlocks: data.ciphertext_blocks || [],
        steps: data.steps || [],
      })
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  const flipBit = async (byteIndex, bitInByte) => {
    if (isTooLong) return
    const absoluteByteOffset = safeSelectedBlock * BLOCK_SIZE + byteIndex
    if (absoluteByteOffset >= workingBytes.length) return

    const targetBit = byteIndex * 8 + bitInByte

    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa4/flip-demo', {
        mode,
        key_hex: keyHex,
        iv_hex: ivHex,
        message,
        flip_on: 'plaintext',
        block_index: safeSelectedBlock,
        bit_index: targetBit,
      })

      const data = res?.data || {}
      const nextMessage = data?.after_flip?.message
      const nextCipher = data?.after_flip?.ciphertext_hex
      const nextDecrypted = data?.after_flip?.decrypted
      const baselineCipher = data?.baseline?.ciphertext_hex

      if (typeof nextMessage === 'string') setMessage(nextMessage)
      if (typeof nextCipher === 'string') setCiphertextHex(nextCipher)
      if (typeof nextDecrypted === 'string') setDecryptedText(nextDecrypted)
      if (!decryptCiphertextHex && typeof baselineCipher === 'string') {
        setDecryptCiphertextHex(baselineCipher)
      }

      setLastFlip({
        block: safeSelectedBlock,
        bit: targetBit,
        byte: byteIndex,
        from: blockBitGrid[targetBit]?.bitValue,
        to: blockBitGrid[targetBit]?.bitValue === '1' ? '0' : '1',
      })
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--social-bg) px-3 py-2">
          <strong className="text-sm text-(--text-h)">CS8.401 Minicrypt Clique Explorer - PA4: Modes and Bit Flips</strong>
          <span className="text-xs font-semibold uppercase tracking-wide text-(--text)">Backend wired to PA4 routes</span>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
            <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
              Input and Block Selection
            </h3>

            <div className="grid gap-2 p-3 text-left">
              <label className="flex items-center justify-between gap-3 text-sm font-semibold text-(--text-h)">
                Mode:
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-64 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                >
                  <option value="cbc">CBC</option>
                  <option value="ofb">OFB</option>
                  <option value="ctr">CTR</option>
                </select>
              </label>

              <label className="flex items-center justify-between gap-3 text-sm font-semibold text-(--text-h)">
                Message (max 64 bytes):
                <textarea
                  className="min-h-24 w-74 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type message here"
                />
              </label>

              <label className="flex items-center justify-between gap-3 text-sm font-semibold text-(--text-h)">
                Key (hex, 16 bytes):
                <input
                  className="w-74 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                  value={keyHex}
                  onChange={(e) => setKeyHex(e.target.value.trim())}
                  placeholder="00112233445566778899aabbccddeeff"
                />
              </label>

              <label className="flex items-center justify-between gap-3 text-sm font-semibold text-(--text-h)">
                IV/nonce (hex, 16 bytes):
                <input
                  className="w-74 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                  value={ivHex}
                  onChange={(e) => setIvHex(e.target.value.trim())}
                  placeholder="0102030405060708090a0b0c0d0e0f10"
                />
              </label>

              <div className="rounded-md border border-dashed border-(--border) bg-(--code-bg) px-3 py-2 text-xs font-mono text-(--text)">
                <p><strong className="text-(--text-h)">Byte length:</strong> {sourceBytes.length} / {MAX_BYTES}</p>
                <p><strong className="text-(--text-h)">Blocks:</strong> {Math.max(1, blocks.length)}</p>
                <p><strong className="text-(--text-h)">Selected block:</strong> {safeSelectedBlock}</p>
                <p><strong className="text-(--text-h)">Ciphertext:</strong> {shortHex(ciphertextHex)}</p>
                {lastFlip ? (
                  <p>
                    <strong className="text-(--text-h)">Last flip:</strong> block {lastFlip.block}, byte {lastFlip.byte}, bit {lastFlip.bit}, {lastFlip.from} -&gt; {lastFlip.to}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={runEncrypt}
                  disabled={loading || isTooLong}
                  className="rounded-md border border-(--accent-border) bg-(--accent-bg) px-3 py-1 text-xs font-semibold text-(--text-h) transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) disabled:cursor-wait disabled:opacity-60"
                >
                  {loading ? 'Running...' : 'Encrypt (Backend)'}
                </button>
                <button
                  type="button"
                  onClick={runDecrypt}
                  disabled={loading || !(decryptCiphertextHex || ciphertextHex)}
                  className="rounded-md border border-(--border) bg-(--bg) px-3 py-1 text-xs font-semibold text-(--text-h) transition-all duration-200 hover:bg-(--social-bg) disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Decrypt (Backend)
                </button>
              </div>

              {error ? <p className="text-sm text-[#ff8aa1]">{error}</p> : null}

              {isTooLong ? (
                <p className="text-sm text-[#ff8aa1]">Message is too long for the interactive view. Keep it at most 48 bytes.</p>
              ) : null}
            </div>

            <div className="border-t border-dashed border-(--border) px-3 py-3 text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">Choose Block</p>
              <div className="flex flex-wrap gap-2">
                {(blocks.length > 0 ? blocks : [new Uint8Array(0)]).map((_, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setSelectedBlock(idx)}
                    className={`rounded-md border px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                      idx === safeSelectedBlock
                        ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h)'
                        : 'border-(--border) bg-(--bg) text-(--text) hover:bg-(--social-bg)'
                    }`}
                  >
                    Block {idx}
                  </button>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
            <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
              Clickable Bit Grid (128 bits per selected block)
            </h3>

            <div className="p-3">
              <div className="grid grid-cols-16 gap-1">
                {blockBitGrid.map((cell, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => flipBit(cell.byteIndex, cell.bitInByte)}
                    disabled={!cell.inRange || isTooLong}
                    title={`block=${cell.block}, bit=${cell.bitIndex}`}
                    className={`h-7 rounded border text-[10px] font-mono font-semibold transition-all duration-150 ${
                      !cell.inRange
                        ? 'cursor-not-allowed border-(--border) bg-(--social-bg) text-(--text)/30'
                        : cell.bitValue === '1'
                          ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h) hover:-translate-y-0.5'
                          : 'border-(--border) bg-(--bg) text-(--text) hover:bg-(--social-bg)'
                    }`}
                  >
                    {cell.bitValue}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-dashed border-(--border) px-3 py-3 text-left">
              <p className="my-1 break-all font-mono text-xs text-(--text)">
                <strong className="text-(--text-h)">Selected block hex:</strong> {bytesToHex(activeBlock) || '[empty]'}
              </p>
              <p className="my-1 break-all font-mono text-xs text-(--text)">
                <strong className="text-(--text-h)">Full message hex:</strong> {bytesToHex(workingBytes) || '[empty]'}
              </p>
              <p className="my-1 break-all font-mono text-xs text-(--text)">
                <strong className="text-(--text-h)">Ciphertext hex:</strong> {ciphertextHex || '[empty]'}
              </p>
              <p className="my-1 font-mono text-xs text-(--text)">
                <strong className="text-(--text-h)">Decrypted text:</strong> {decryptedText || '[empty]'}
              </p>
              <p className="my-1 font-mono text-xs text-(--text)">
                <strong className="text-(--text-h)">Current message:</strong> {message || '[empty]'}
              </p>
            </div>
          </article>
        </div>

        <article className="mt-3 rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
          <div className="flex items-center justify-between gap-2 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2">
            <h3 className="m-0 text-left text-sm font-semibold text-(--text-h)">
              Conversion Flow Graph
            </h3>
            <div className="inline-flex rounded-md border border-(--border) bg-(--bg) p-1">
              <button
                type="button"
                onClick={() => setFlowTab('encrypt')}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                  flowTab === 'encrypt' ? 'bg-(--accent-bg) text-(--text-h)' : 'text-(--text) hover:bg-(--social-bg)'
                }`}
              >
                Encrypt
              </button>
              <button
                type="button"
                onClick={() => setFlowTab('decrypt')}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                  flowTab === 'decrypt' ? 'bg-(--accent-bg) text-(--text-h)' : 'text-(--text) hover:bg-(--social-bg)'
                }`}
              >
                Decrypt
              </button>
            </div>
          </div>

          <div className="grid gap-2 border-b border-dashed border-(--border) px-3 py-3 text-left">
            {flowTab === 'encrypt' ? (
              <>
                <p className="text-xs text-(--text)">
                  Encrypt tab uses your current message and mode to generate ciphertext via backend.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={runEncrypt}
                    disabled={loading || isTooLong}
                    className="rounded-md border border-(--accent-border) bg-(--accent-bg) px-3 py-1 text-xs font-semibold text-(--text-h) transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) disabled:cursor-wait disabled:opacity-60"
                  >
                    {loading ? 'Running...' : 'Encrypt'}
                  </button>
                  <span className="text-xs text-(--text)">Ciphertext: {shortHex(ciphertextHex)}</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-(--text)">
                  Decrypt tab keeps encryption data intact and decrypts whichever ciphertext you provide.
                </p>
                <label className="flex items-center justify-between gap-3 text-xs font-semibold text-(--text-h)">
                  Ciphertext (hex):
                  <input
                    className="w-120 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                    value={decryptCiphertextHex}
                    onChange={(e) => setDecryptCiphertextHex(e.target.value.trim())}
                    placeholder={ciphertextHex || 'Paste ciphertext to decrypt'}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={runDecrypt}
                    disabled={loading || !(decryptCiphertextHex || ciphertextHex)}
                    className="rounded-md border border-(--accent-border) bg-(--accent-bg) px-3 py-1 text-xs font-semibold text-(--text-h) transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) disabled:cursor-wait disabled:opacity-60"
                  >
                    {loading ? 'Running...' : 'Decrypt'}
                  </button>
                  <span className="text-xs text-(--text)">Plaintext: {decryptedText || '[empty]'}</span>
                </div>
              </>
            )}
            {flowTab === 'encrypt' && encryptMeta ? (
              <p className="text-xs text-(--text)">
                Encrypt steps loaded: plaintext blocks {encryptMeta.plaintextBlocks.length}, ciphertext blocks {encryptMeta.ciphertextBlocks.length}, per-block steps {encryptMeta.steps.length}.
              </p>
            ) : null}
            {flowTab === 'decrypt' && decryptMeta ? (
              <p className="text-xs text-(--text)">
                Decrypt steps loaded: plaintext blocks {decryptMeta.plaintextBlocks.length}, ciphertext blocks {decryptMeta.ciphertextBlocks.length}, per-block steps {decryptMeta.steps.length}.
              </p>
            ) : null}
          </div>

          <FlowCanvas nodes={activeGraph.nodes} edges={activeGraph.edges} nodeTypes={graphNodeTypes} />
        </article>
      </section>
    </main>
  )
}
