import { useState, useEffect, useMemo, useRef } from 'react'
import { AlertTriangle, Check, CheckCircle2, XCircle } from 'lucide-react'
import api from '../../lib/api'
import {
  getErrorText,
  hexToBytes,
  bytesToHex,
  splitBlocks,
  byteToBits,
  flipCipherBit
} from '../PA4/utils'

const BLOCK_SIZE = 16
const EMPTY_BLOCK = new Uint8Array(0)

export default function PA6Malleability() {
  const [keHex, setKeHex] = useState('00112233445566778899aabbccddeeff')
  const [kmHex, setKmHex] = useState('ffeeddccbbaa99887766554433221100')
  const [message, setMessage] = useState('Attack at Dawn!')
  
  const [ciphertext, setCiphertext] = useState({ r_hex: '', c_hex: '', tag_hex: '' })
  const [modifiedC, setModifiedC] = useState('')
  const [selectedBlock, setSelectedBlock] = useState(0)
  
  const [cpaResult, setCpaResult] = useState({ plaintext: '', status: '' })
  const [ccaResult, setCcaResult] = useState({ plaintext: '', status: '' })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 1. Initial Encryption
  const handleEncrypt = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa6/encrypt', {
        ke_hex: keHex,
        km_hex: kmHex,
        message: message
      })
      setCiphertext(res.data)
      setModifiedC(res.data.c_hex)
      setSelectedBlock(0)
      
      // Get initial results
      const mRes = await api.post('/api/pa6/malleability', {
        ke_hex: keHex,
        km_hex: kmHex,
        message: message,
        flip_bit_index: -1 // -1 means no flip
      })
      setCpaResult(mRes.data.cpa)
      setCcaResult(mRes.data.cca)
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  const autoEncryptTimerRef = useRef(null)

  useEffect(() => {
    if (!message.trim() || !keHex.trim() || !kmHex.trim()) return;
    
    clearTimeout(autoEncryptTimerRef.current)
    autoEncryptTimerRef.current = setTimeout(() => {
        handleEncrypt()
    }, 800)

    return () => clearTimeout(autoEncryptTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, keHex, kmHex])

  // 2. Bit Flip Logic
  const handleFlipBit = async (byteIndex, bitInByte) => {
    if (!ciphertext.c_hex || loading) return
    const newCHex = flipCipherBit(modifiedC, selectedBlock, byteIndex, bitInByte)
    setModifiedC(newCHex)
  }

  // 3. Query Oracles
  const queryOracles = async () => {
    setLoading(true)
    try {
        const cpaRes = await api.post('/api/pa3/decrypt', {
            key_hex: keHex,
            r: ciphertext.r_hex,
            c: modifiedC,
            strict: false
        }).catch(() => ({ data: { m: '[Decryption Error]', status: 'Error' }}))

        const ccaRes = await api.post('/api/pa6/decrypt', {
            ke_hex: keHex,
            km_hex: kmHex,
            r_hex: ciphertext.r_hex,
            c_hex: modifiedC,
            tag_hex: ciphertext.tag_hex
        })

        setCpaResult({ plaintext: cpaRes.data.m || '[Error]', status: cpaRes.data.status || 'Decrypted' })
        setCcaResult({ plaintext: ccaRes.data.plaintext === null ? '⊥ (Rejected)' : ccaRes.data.plaintext, status: ccaRes.data.status })
    } catch (err) {
        setError(getErrorText(err))
    } finally {
        setLoading(false)
    }
  }

  // 3. Grid Prep
  const cipherBytes = useMemo(() => hexToBytes(modifiedC), [modifiedC])
  const cipherBlocks = useMemo(() => splitBlocks(cipherBytes), [cipherBytes])
  
  const activeBlock = useMemo(
    () => cipherBlocks[selectedBlock] || EMPTY_BLOCK,
    [cipherBlocks, selectedBlock]
  )

  const blockBitGrid = useMemo(() => {
    const padded = new Uint8Array(BLOCK_SIZE)
    padded.set(activeBlock)
    const bits = []
    for (let i = 0; i < BLOCK_SIZE; i++) {
      const row = byteToBits(padded[i])
      for (let j = 0; j < 8; j++) {
        bits.push({ byteIndex: i, bitInByte: j, bitValue: row[j], inRange: i < activeBlock.length })
      }
    }
    return bits
  }, [activeBlock])

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="mx-auto w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--social-bg) px-3 py-2" style={{ marginBottom: '1rem' }}>
            <strong className="text-sm text-(--text-h)">PA #6: Malleability Attack - CPA-only vs CCA-Secure (Encrypt-then-MAC)</strong>
            <button onClick={handleEncrypt} className="rounded-md border border-(--accent-border) bg-(--accent-bg) px-3 py-1 text-xs font-semibold text-(--text-h) hover:brightness-110 shadow-sm transition-all">
                Reset & Re-encrypt
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '1rem' }}>
            
            {/* Left Half: Inputs + Bit Grid */}
            <div className="flex flex-col" style={{ gap: '1.5rem' }}>
                
                {/* Inputs */}
                <div className="rounded-lg border border-(--border) bg-(--social-bg) p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex flex-col text-left">
                        <label className="text-[10px] font-bold uppercase opacity-60 mb-1 tracking-wider">Encryption Key (kE)</label>
                        <input value={keHex} onChange={e => setKeHex(e.target.value)} className="rounded border border-(--border) bg-(--bg) px-2 py-1.5 font-mono text-xs w-full shadow-inner focus:outline-none focus:border-(--accent-border)" />
                    </div>
                    <div className="flex flex-col text-left">
                        <label className="text-[10px] font-bold uppercase opacity-60 mb-1 tracking-wider">MAC Key (kM)</label>
                        <input value={kmHex} onChange={e => setKmHex(e.target.value)} className="rounded border border-(--border) bg-(--bg) px-2 py-1.5 font-mono text-xs w-full shadow-inner focus:outline-none focus:border-(--accent-border)" />
                    </div>
                    <div className="flex flex-col text-left">
                        <label className="text-[10px] font-bold uppercase opacity-60 mb-1 tracking-wider">Message</label>
                        <input value={message} onChange={e => setMessage(e.target.value)} className="rounded border border-(--border) bg-(--bg) px-2 py-1.5 font-mono text-xs w-full shadow-inner focus:outline-none focus:border-(--accent-border)" />
                    </div>
                </div>

                {/* Bit Grid */}
                <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:border-(--accent-border) hover:shadow-(--shadow)">
              <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
                Ciphertext Bit-Flip Attack Grid
              </h3>
              
              <div className="border-b border-dashed border-(--border) px-3 py-3 text-left">
                  <p className="my-1 break-all font-mono text-xs text-(--text)">
                      <strong className="text-(--text-h)">C_hex (Ciphertext):</strong> {modifiedC ? modifiedC : <span className="opacity-50">[empty]</span>}
                  </p>
                  <p className="my-1 font-mono text-xs text-(--text)">
                      <strong className="text-(--text-h)">Tag_hex (MAC):</strong> {ciphertext.tag_hex ? ciphertext.tag_hex : <span className="opacity-50">[empty]</span>}
                  </p>
              </div>

              <div className="border-b border-dashed border-(--border) px-3 py-2 text-left">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">
                  Select ciphertext block to flip
                </p>
                <div className="flex flex-wrap gap-2">
                    {cipherBlocks.map((_, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => setSelectedBlock(idx)} 
                            className={`rounded-md border px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                                idx === selectedBlock
                                ? 'border-[#f59e0b] bg-[#78350f]/30 text-[#fbbf24]'
                                : 'border-(--border) bg-(--bg) text-(--text) hover:bg-(--social-bg)'
                            }`}>
                            C<sub>{idx}</sub>
                        </button>
                    ))}
                </div>
              </div>

              <div className="p-3 text-left">
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-(--text)/60 text-left">
                    Click bits to craft a modified payload, then submit to the oracles!
                    </p>
                </div>
                <div className="grid grid-cols-16 gap-1">
                    {blockBitGrid.map((cell, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleFlipBit(cell.byteIndex, cell.bitInByte)}
                            disabled={!cell.inRange || loading}
                            title={`C_${selectedBlock} byte=${cell.byteIndex}`}
                            className={`h-7 rounded border text-[10px] font-mono font-semibold transition-all duration-150 ${
                                !cell.inRange
                                ? 'cursor-not-allowed border-(--border) bg-(--social-bg) text-(--text)/20'
                                : loading
                                    ? 'cursor-wait opacity-50'
                                    : cell.bitValue === '1'
                                    ? 'cursor-pointer border-[#f59e0b] bg-[#78350f]/40 text-[#fbbf24] hover:-translate-y-0.5 hover:shadow-sm'
                                    : 'cursor-pointer border-(--border) bg-(--bg) text-(--text) hover:bg-(--social-bg) hover:-translate-y-0.5'
                            }`}
                        >
                            {cell.bitValue}
                        </button>
                    ))}
                </div>
                <div className="mt-4 pt-3 border-t border-(--border) border-dashed flex justify-center">
                    <button onClick={queryOracles} disabled={loading} className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-6 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors w-full">
                        {loading ? 'Processing...' : 'Query Decryption Oracles'}
                    </button>
                </div>
              </div>
            </article>
            </div> {/* End Left Half */}

            {/* Right: Results Comparison */}
            <div className="flex flex-col gap-4 h-full">
                
                <div className="flex flex-col gap-4">
                    {/* CPA Results */}
                    <article className="rounded-lg border border-(--border) bg-(--bg) p-4 text-left shadow-sm transition-all hover:shadow-(--shadow)">
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-(--text-h)">CPA Only (Standard Enc)</h3>
                        <div className="space-y-2">
                            <p className="text-[11px] opacity-60 italic mb-2">Attacker can flip bits to change plaintext.</p>
                            <div className="rounded border border-(--border) bg-(--social-bg) p-3 font-mono text-xs text-(--text-h) break-all min-h-[44px] flex items-center">
                                {cpaResult.plaintext ? `Result: ${cpaResult.plaintext}` : <span className="opacity-50 text-xs text-(--text)">[Waiting...]</span>}
                            </div>
                            <p className={`text-[10px] font-bold inline-flex items-center gap-1 ${cpaResult.plaintext !== message ? 'text-[#f87171]' : 'text-[#34d399]'}`}>
                                {cpaResult.plaintext !== message ? <><AlertTriangle className="w-3 h-3" /> MALLEABILITY DETECTED</> : <><Check className="w-3 h-3" /> Unchanged / Correct</>}
                            </p>
                        </div>
                    </article>

                    {/* CCA Results */}
                    <article className="rounded-lg border border-(--border) bg-(--bg) p-4 text-left shadow-sm transition-all hover:shadow-(--shadow)">
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-(--text-h)">CCA Secure (Encrypt-then-MAC)</h3>
                        <div className="space-y-2">
                            <p className="text-[11px] opacity-60 italic mb-2">Vrfy(km, c, t) fails if 'c' is tampered with.</p>
                            <div className="rounded border border-(--border) bg-(--social-bg) p-3 font-mono text-xs text-(--text-h) break-all min-h-[44px] flex items-center">
                                {ccaResult.plaintext ? `Result: ${ccaResult.plaintext}` : <span className="opacity-50 text-xs text-(--text)">[Waiting...]</span>}
                            </div>
                            <p className={`text-[10px] font-bold inline-flex items-center gap-1 ${ccaResult.plaintext === '⊥ (Rejected)' ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                                {ccaResult.plaintext === '⊥ (Rejected)' ? <><CheckCircle2 className="w-3 h-3" /> TAMPER DETECTED & REJECTED</> : <><XCircle className="w-3 h-3" /> VULNERABLE</>}
                            </p>
                        </div>
                    </article>
                </div>

                {/* Filler space pushes Analysis to bottom if height allows, else just nice margin */}
                <div className="flex-1"></div>

                <section className="rounded-lg border border-(--border) bg-(--social-bg) p-4 text-left transition-all mt-auto mb-1">
                    <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-(--text-h)">Attack Analysis</h4>
                    <p className="text-[11px] leading-relaxed text-(--text)">
                        In the <strong>CPA</strong> scheme, the ciphertext is simply <code style={{background:'transparent', padding:0}}>C = (r, F_k(r) ⊕ m)</code>. Flipping a bit in C results in the same bit being flipped in m after decryption. 
                        In the <strong>CCA</strong> scheme, we add a Tag <code style={{background:'transparent', padding:0}}>t = MAC(k<sub>M</sub>, c)</code>. Even a single bit-flip in the ciphertext c causes the MAC verification to fail, so the system rejects the input before it is ever decrypted.
                    </p>
                </section>

            </div>
            {/* End Right Half */}

        </div>
      </section>
    </main>
  );
}
