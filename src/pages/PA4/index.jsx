import { useEffect, useMemo, useRef, useState } from 'react'

import FlowBlockNode, { FLOW_BLOCK_NODE_TYPE } from '../../components/flow/FlowBlockNode'
import FlowXorNode, { FLOW_XOR_NODE_TYPE } from '../../components/flow/FlowXorNode'
import FlowAesNode, { FLOW_AES_NODE_TYPE } from '../../components/flow/FlowAesNode'
import api from '../../lib/api'
import { buildPa4BackendFlow, splitHexIntoBlocks } from '../../conversions/pa4/flow'
import {
  getErrorText,
  toUtf8Bytes,
  splitBlocks,
  byteToBits,
  bytesToHex,
  hexToBytes,
  flipCipherBit,
  resolveDemoBlockHex,
} from './utils'
import InputPanel   from './InputPanel'
import BitGrid      from './BitGrid'
import IvReuseComparison from './IvReuseComparison'
import FlowSection  from './FlowSection'
import NavSidebar from '../../components/NavSidebar'

const MAX_BYTES            = 64
const BLOCK_SIZE           = 16
const EMPTY_BLOCK          = new Uint8Array(0)
const DEMO_BLOCK_CAP       = 3
const AUTO_ENCRYPT_DELAY   = 800   // ms — debounce before sending encrypt request

export default function PA4() {
  // ── Core input state ───────────────────────────────────────────────────────
  const [mode,    setMode]    = useState('cbc')
  const [message, setMessage] = useState('pa4-bit-flip-demo')
  const [message2, setMessage2] = useState('pa4-second-demo-message')
  const [isIvReuseMode, setIsIvReuseMode] = useState(false)
  const [flowTab, setFlowTab] = useState('encrypt')
  const [keyHex,  setKeyHex]  = useState('00112233445566778899aabbccddeeff')
  const [ivHex,   setIvHex]   = useState('0102030405060708090a0b0c0d0e0f10')

  // ── Crypto output state ────────────────────────────────────────────────────
  const [ciphertextHex,       setCiphertextHex]       = useState('')
  const [ciphertextHex2,      setCiphertextHex2]      = useState('')
  const [decryptCiphertextHex, setDecryptCiphertextHex] = useState('')
  // tracks whether the user has manually typed in the decrypt field
  const [decryptHexEdited,    setDecryptHexEdited]    = useState(false)
  const [decryptedText,       setDecryptedText]       = useState('')
  const [encryptMeta,         setEncryptMeta]         = useState(null)
  const [encryptMeta2,        setEncryptMeta2]        = useState(null)
  const [decryptMeta,         setDecryptMeta]         = useState(null)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading,             setLoading]             = useState(false)
  const [error,               setError]               = useState('')
  const [selectedCipherBlock, setSelectedCipherBlock] = useState(0)
  const [lastFlip,            setLastFlip]            = useState(null)

  const autoEncryptTimerRef = useRef(null)

  // ── Mode change: wipe stale ciphertext so it is never fed to the wrong endpoint
  const handleModeChange = (newMode) => {
    setMode(newMode)
    setCiphertextHex('')
    setDecryptCiphertextHex('')
    setDecryptHexEdited(false)
    setEncryptMeta(null)
    setDecryptMeta(null)
    setDecryptedText('')
    setLastFlip(null)
    setError('')
    setSelectedCipherBlock(0)
  }

  // ── Plaintext derived values ───────────────────────────────────────────────
  const sourceBytes  = useMemo(() => toUtf8Bytes(message), [message])
  const isTooLong    = sourceBytes.length > MAX_BYTES

  const workingBytes = useMemo(() => {
    if (isTooLong) return new Uint8Array(0)
    return toUtf8Bytes(message)
  }, [message, isTooLong])

  // plaintext blocks — used only for the flow-graph demo display
  const plaintextBlocks = useMemo(() => splitBlocks(workingBytes), [workingBytes])

  // ── Ciphertext derived values (for the bit-flip grid) ─────────────────────
  const cipherBytes  = useMemo(() => hexToBytes(ciphertextHex), [ciphertextHex])
  const cipherBlocks = useMemo(() => splitBlocks(cipherBytes),  [cipherBytes])

  const safeSelectedCipherBlock = useMemo(() => {
    if (cipherBlocks.length === 0) return 0
    if (selectedCipherBlock >= cipherBlocks.length) return cipherBlocks.length - 1
    return selectedCipherBlock
  }, [cipherBlocks.length, selectedCipherBlock])

  const activeCipherBlock = useMemo(
    () => cipherBlocks[safeSelectedCipherBlock] || EMPTY_BLOCK,
    [cipherBlocks, safeSelectedCipherBlock],
  )

  // 128-cell grid for the selected CIPHERTEXT block (1 = amber, 0 = dim)
  const blockBitGrid = useMemo(() => {
    const padded = new Uint8Array(BLOCK_SIZE)
    padded.set(activeCipherBlock)
    const bits = []
    for (let byteIndex = 0; byteIndex < BLOCK_SIZE; byteIndex += 1) {
      const bitRow = byteToBits(padded[byteIndex])
      for (let bitInByte = 0; bitInByte < 8; bitInByte += 1) {
        bits.push({
          block:     safeSelectedCipherBlock,
          byteIndex,
          bitInByte,
          bitValue:  bitRow[bitInByte],
          bitIndex:  byteIndex * 8 + bitInByte,
          inRange:   byteIndex < activeCipherBlock.length,
        })
      }
    }
    return bits
  }, [activeCipherBlock, safeSelectedCipherBlock])

  // ── Flow graph data ────────────────────────────────────────────────────────
  const demoBlocks = useMemo(() => {
    const src = plaintextBlocks.length > 0 ? plaintextBlocks.slice(0, DEMO_BLOCK_CAP) : [EMPTY_BLOCK]
    return src.map((b, idx) => resolveDemoBlockHex(b, idx))
  }, [plaintextBlocks])

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
      return buildPa4BackendFlow(mode, 'decrypt', ivHex, decryptPlainBlocks, decryptCipherBlocks, encryptPlainBlocks)
    }
    return buildPa4BackendFlow(mode, 'encrypt', ivHex, encryptPlainBlocks, encryptCipherBlocks)
  }, [flowTab, mode, ivHex, encryptPlainBlocks, encryptCipherBlocks, decryptPlainBlocks, decryptCipherBlocks])

  const graphNodeTypes = useMemo(() => ({
    [FLOW_BLOCK_NODE_TYPE]: FlowBlockNode,
    [FLOW_XOR_NODE_TYPE]:   FlowXorNode,
    [FLOW_AES_NODE_TYPE]:   FlowAesNode,
  }), [])

  // ── Shared helper: encrypt then immediately decrypt the result ────────────
  //    `overrideCipher` lets flipBit reuse the decrypt leg without re-encrypting.
  const encryptThenDecrypt = async ({ skipEncrypt = false, cipherOverride = null } = {}) => {
    if (!skipEncrypt && (isTooLong || !message.trim())) return

    setLoading(true)
    setError('')
    try {
      let cipherHex = cipherOverride

      if (!skipEncrypt) {
        const encRes = await api.post('/api/pa4/encrypt', {
          mode,
          key_hex: keyHex,
          iv_hex:  ivHex,
          message,
        })
        const encData = encRes?.data || {}
        cipherHex = encData.ciphertext_hex || ''
        setCiphertextHex(cipherHex)
        setEncryptMeta({
          plaintextBlocks:  encData.plaintext_blocks  || [],
          ciphertextBlocks: encData.ciphertext_blocks || [],
          steps:            encData.steps             || [],
        })
        setDecryptCiphertextHex(cipherHex)
        setDecryptHexEdited(false)
        setLastFlip(null)
        setSelectedCipherBlock(0)

        // Encrypt message 2 if reuse mode is active
        if (isIvReuseMode && message2.trim()) {
          const encRes2 = await api.post('/api/pa4/encrypt', {
            mode,
            key_hex: keyHex,
            iv_hex:  ivHex,
            message: message2,
          })
          const encData2 = encRes2?.data || {}
          setCiphertextHex2(encData2.ciphertext_hex || '')
          setEncryptMeta2({
            plaintextBlocks:  encData2.plaintext_blocks  || [],
            ciphertextBlocks: encData2.ciphertext_blocks || [],
            steps:            encData2.steps             || [],
          })
        }
      }

      if (!cipherHex) return

      const decRes = await api.post('/api/pa4/decrypt', {
        mode,
        key_hex:        keyHex,
        iv_hex:         ivHex,
        ciphertext_hex: cipherHex,
      })
      const decData = decRes?.data || {}
      setDecryptedText(decData.plaintext || '')
      setDecryptMeta({
        plaintextBlocks:  decData.plaintext_blocks  || [],
        ciphertextBlocks: decData.ciphertext_blocks || [],
        steps:            decData.steps             || [],
      })
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  // ── Auto-encrypt + auto-decrypt: fires 800 ms after user stops typing ─────
  useEffect(() => {
    if (isTooLong || !message.trim()) return

    clearTimeout(autoEncryptTimerRef.current)
    autoEncryptTimerRef.current = setTimeout(() => encryptThenDecrypt(), AUTO_ENCRYPT_DELAY)

    return () => clearTimeout(autoEncryptTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, message2, isIvReuseMode, mode, keyHex, ivHex])

  // ── Manual encrypt + decrypt ───────────────────────────────────────────────
  const runEncrypt = () => {
    clearTimeout(autoEncryptTimerRef.current)
    encryptThenDecrypt()
  }

  // ── Manual decrypt ─────────────────────────────────────────────────────────
  const runDecrypt = async () => {
    const cipherToDecrypt = decryptCiphertextHex || ciphertextHex
    if (!cipherToDecrypt) return

    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa4/decrypt', {
        mode,
        key_hex:        keyHex,
        iv_hex:         ivHex,
        ciphertext_hex: cipherToDecrypt,
      })
      const data = res?.data || {}
      setDecryptedText(data.plaintext || '')
      setDecryptMeta({
        plaintextBlocks:  data.plaintext_blocks  || [],
        ciphertextBlocks: data.ciphertext_blocks || [],
        steps:            data.steps             || [],
      })
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  // -- Bit flip: flip a CIPHERTEXT bit and immediately decrypt ---------------
  const flipBit = (byteIndex, bitInByte) => {
    if (!ciphertextHex || loading) return

    const targetBit    = byteIndex * 8 + bitInByte
    const newCipherHex = flipCipherBit(ciphertextHex, safeSelectedCipherBlock, byteIndex, bitInByte)

    setLastFlip({
      block: safeSelectedCipherBlock,
      bit:   targetBit,
      byte:  byteIndex,
      from:  blockBitGrid[targetBit]?.bitValue,
      to:    blockBitGrid[targetBit]?.bitValue === '1' ? '0' : '1',
    })

    // Update ciphertext immediately so the grid re-renders the flipped bit
    setCiphertextHex(newCipherHex)
    setDecryptCiphertextHex(newCipherHex)
    setDecryptHexEdited(false)
    // Decrypt only (no re-encrypt needed)
    encryptThenDecrypt({ skipEncrypt: true, cipherOverride: newCipherHex })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--social-bg) px-3 py-2">
          <div className="flex items-center gap-2">
            <NavSidebar />
            <strong className="text-sm text-(--text-h)">
              CS8.401 Minicrypt Clique Explorer — PA4: Modes &amp; Bit-Flip Attack
            </strong>
          </div>
          
          <div className="flex items-center gap-1 rounded bg-black/40 p-1">
            <button
              onClick={() => setIsIvReuseMode(false)}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                !isIvReuseMode 
                  ? 'bg-(--accent-bg) text-(--text-h)' 
                  : 'text-(--text) hover:bg-(--social-bg)'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setIsIvReuseMode(true)}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                isIvReuseMode 
                  ? 'bg-(--accent-bg) text-(--text-h)' 
                  : 'text-(--text) hover:bg-(--social-bg)'
              }`}
            >
              Nonce / IV Reuse
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <InputPanel
            mode={mode}
            setMode={handleModeChange}
            message={message}
            setMessage={setMessage}
            keyHex={keyHex}
            setKeyHex={setKeyHex}
            ivHex={ivHex}
            setIvHex={setIvHex}
            sourceBytes={sourceBytes}
            MAX_BYTES={MAX_BYTES}
            loading={loading}
            isTooLong={isTooLong}
            error={error}
            isIvReuseMode={isIvReuseMode}
            message2={message2}
            setMessage2={setMessage2}
          />

          {isIvReuseMode ? (
            <IvReuseComparison
              ciphertextHex1={ciphertextHex}
              ciphertextHex2={ciphertextHex2}
              message1={message}
              message2={message2}
              mode={mode}
              loading={loading}
            />
          ) : (
            <BitGrid
              blockBitGrid={blockBitGrid}
              activeCipherBlock={activeCipherBlock}
              ciphertextHex={ciphertextHex}
              cipherBlockCount={cipherBlocks.length}
              selectedCipherBlock={safeSelectedCipherBlock}
              setSelectedCipherBlock={setSelectedCipherBlock}
              decryptedText={decryptedText}
              originalMessage={message}
              lastFlip={lastFlip}
              loading={loading}
              onFlipBit={flipBit}
            />
          )}
        </div>

        {!isIvReuseMode && (
          <FlowSection
            flowTab={flowTab}
            setFlowTab={setFlowTab}
            activeGraph={activeGraph}
            graphNodeTypes={graphNodeTypes}
            loading={loading}
            isTooLong={isTooLong}
            ciphertextHex={ciphertextHex}
            decryptCiphertextHex={decryptCiphertextHex}
            setDecryptCiphertextHex={(v) => {
              setDecryptCiphertextHex(v)
              setDecryptHexEdited(true)
            }}
            decryptedText={decryptedText}
            encryptMeta={encryptMeta}
            decryptMeta={decryptMeta}
            onEncrypt={runEncrypt}
            onDecrypt={runDecrypt}
          />
        )}
      </section>
    </main>
  )
}
