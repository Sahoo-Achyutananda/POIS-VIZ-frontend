import { useState, useCallback } from 'react'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'

const GROUP_P = 23

function FieldRow({ label, value, mono = true, highlight = false }) {
  return (
    <div className="space-y-0.5">
      {label && (
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      )}
      <div className={`rounded-lg border px-3 py-2 text-[12px] leading-relaxed break-all ${
        mono ? 'font-mono' : ''
      } ${
        highlight
          ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h)'
          : 'border-(--border) bg-(--code-bg) text-(--text)'
      }`}>
        {value ?? <span className="opacity-30 italic">—</span>}
      </div>
    </div>
  )
}

function StepBadge({ step, label, done }) {
  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold ${
      done
        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
        : 'border-(--border) bg-(--code-bg) text-(--text)/40'
    }`}>
      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black ${
        done ? 'bg-emerald-500 text-black' : 'bg-(--border) text-(--text)/40'
      }`}>{step}</span>
      {label}
    </div>
  )
}

function PanelHeader({ title, subtitle, role }) {
  const colors = {
    alice: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
    bob:   'bg-pink-500/10   border-pink-500/30   text-pink-300',
  }
  return (
    <div className="flex items-start justify-between border-b border-(--border) bg-(--accent-bg) px-4 py-3 rounded-t-xl">
      <div className="flex flex-col items-start">
        <span className={`mb-1 rounded-sm border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${colors[role]}`}>
          {role === 'alice' ? 'Alice — Sender' : 'Bob — Receiver'}
        </span>
        <h3 className="text-sm font-bold text-(--text-h)">{title}</h3>
        <p className="text-[12px] text-white/60 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

function TranscriptEntry({ step, from, to, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--border) text-[10px] font-black text-(--text)/60">{step}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-(--text)/70">
          <span className="text-indigo-300">{from}</span>
          <span className="mx-1 text-(--text)/30">→</span>
          <span className="text-pink-300">{to}</span>
          <span className="mx-1.5 text-(--text)/30">·</span>
          <span className="text-(--text)/50">{label}</span>
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-(--text-h) break-all">{value}</p>
      </div>
    </div>
  )
}

export default function OTDemo() {
  const [m0, setM0] = useState('3')
  const [m1, setM1] = useState('7')
  const [choiceBit, setChoiceBit] = useState('0')

  const [setupData,   setSetupData]   = useState(null)
  const [receiverData, setReceiverData] = useState(null)
  const [encryptData, setEncryptData] = useState(null)
  const [decryptData, setDecryptData] = useState(null)
  const [cheatData,   setCheatData]   = useState(null)

  const [loadingSetup,   setLoadingSetup]   = useState(false)
  const [loadingKeys,    setLoadingKeys]    = useState(false)
  const [loadingEncrypt, setLoadingEncrypt] = useState(false)
  const [loadingDecrypt, setLoadingDecrypt] = useState(false)
  const [loadingCheat,   setLoadingCheat]   = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setSetupData(null); setReceiverData(null); setEncryptData(null)
    setDecryptData(null); setCheatData(null); setError('')
  }

  const handleSetup = useCallback(async () => {
    reset()
    setLoadingSetup(true)
    try {
      const res = await api.post('/api/pa18/sender-setup')
      setSetupData(res.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Setup failed')
    } finally {
      setLoadingSetup(false)
    }
  }, [])

  const handleReceiverKeys = useCallback(async () => {
    setReceiverData(null); setEncryptData(null); setDecryptData(null); setCheatData(null)
    setLoadingKeys(true)
    try {
      const res = await api.post('/api/pa18/receiver-keys', {
        c: setupData.c,
        b: parseInt(choiceBit, 10),
      })
      setReceiverData(res.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Key generation failed')
    } finally {
      setLoadingKeys(false)
    }
  }, [setupData, choiceBit])

  const handleEncrypt = useCallback(async () => {
    setEncryptData(null); setDecryptData(null); setCheatData(null)
    const m0int = parseInt(m0, 10)
    const m1int = parseInt(m1, 10)
    if (![m0int, m1int].every(v => v >= 1 && v < GROUP_P)) {
      setError(`Messages must be integers in [1, ${GROUP_P - 1}]`)
      return
    }
    setLoadingEncrypt(true)
    try {
      const res = await api.post('/api/pa18/sender-encrypt', {
        pk0: receiverData.pk0,
        pk1: receiverData.pk1,
        m0: m0int,
        m1: m1int,
      })
      setEncryptData(res.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Encryption failed')
    } finally {
      setLoadingEncrypt(false)
    }
  }, [receiverData, m0, m1])

  const handleDecrypt = useCallback(async () => {
    setDecryptData(null); setCheatData(null)
    setLoadingDecrypt(true)
    try {
      const res = await api.post('/api/pa18/receiver-decrypt', {
        k: receiverData.k_private,
        b: parseInt(choiceBit, 10),
        A0: encryptData.A0, B0: encryptData.B0,
        A1: encryptData.A1, B1: encryptData.B1,
      })
      setDecryptData(res.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Decryption failed')
    } finally {
      setLoadingDecrypt(false)
    }
  }, [receiverData, encryptData, choiceBit])

  const handleCheat = useCallback(async () => {
    setCheatData(null)
    setLoadingCheat(true)
    try {
      const res = await api.post('/api/pa18/cheat-attempt', {
        k: receiverData.k_private,
        A0: encryptData.A0, B0: encryptData.B0,
        A1: encryptData.A1, B1: encryptData.B1,
        m0_true: parseInt(m0, 10),
        m1_true: parseInt(m1, 10),
      })
      setCheatData(res.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Cheat attempt failed')
    } finally {
      setLoadingCheat(false)
    }
  }, [receiverData, encryptData, m0, m1])

  const b = parseInt(choiceBit, 10)

  return (
    <main className="min-h-screen w-full bg-(--bg) px-1 py-4 text-(--text)">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-1 shadow-(--shadow)">

        <PageHeader title="CS8.401 Minicrypt Clique Explorer — PA18: 1-out-of-2 Oblivious Transfer" />

        {/* Protocol overview */}
        <div className="mx-3 mb-3 rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-(--text-h) mb-2">Bellare-Micali OT Protocol</p>
          <p className="text-[12px] text-(--text)/70 leading-relaxed">
            Alice holds two messages <strong className="text-(--text-h)">m₀, m₁</strong>.
            Bob chooses a bit <strong className="text-(--text-h)">b</strong> and receives <strong className="text-(--text-h)">m_b</strong>
            — without Alice learning <strong className="text-(--text-h)">b</strong>,
            and without Bob learning <strong className="text-(--text-h)">m_{"{1−b}"}</strong>.
            Built on ElGamal over a toy DLP group (g=5, p=23) for visualization.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StepBadge step="1" label="Sender Setup (Alice)" done={!!setupData} />
            <StepBadge step="2" label="Receiver Keys (Bob)" done={!!receiverData} />
            <StepBadge step="3" label="Sender Encrypt (Alice)" done={!!encryptData} />
            <StepBadge step="4" label="Receiver Decrypt (Bob)" done={!!decryptData} />
          </div>
        </div>

        {/* Config row */}
        <div className="mb-4 border-b border-(--border) px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <p className="text-[12px] font-black uppercase tracking-widest text-indigo-300">Alice: Message m₀</p>
              <input
                type="number" min="1" max={GROUP_P - 1}
                value={m0}
                onChange={e => { setM0(e.target.value); reset() }}
                className="w-full rounded-xl border border-(--border) bg-(--code-bg) p-2.5 text-sm text-(--text-h) font-mono outline-none focus:border-(--accent-border)"
              />
              <p className="text-[11px] text-(--text)/40 italic">Integer in [1, {GROUP_P - 1}]</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[12px] font-black uppercase tracking-widest text-indigo-300">Alice: Message m₁</p>
              <input
                type="number" min="1" max={GROUP_P - 1}
                value={m1}
                onChange={e => { setM1(e.target.value); reset() }}
                className="w-full rounded-xl border border-(--border) bg-(--code-bg) p-2.5 text-sm text-(--text-h) font-mono outline-none focus:border-(--accent-border)"
              />
              <p className="text-[11px] text-(--text)/40 italic">Integer in [1, {GROUP_P - 1}]</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[12px] font-black uppercase tracking-widest text-pink-300">Bob: Choice bit b</p>
              <div className="flex gap-2">
                {[0, 1].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setChoiceBit(String(v)); setReceiverData(null); setDecryptData(null); setCheatData(null) }}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition-all ${
                      choiceBit === String(v)
                        ? 'border-pink-500/50 bg-pink-500/10 text-pink-300'
                        : 'border-(--border) bg-(--code-bg) text-(--text)/50 hover:border-pink-500/30'
                    }`}
                  >
                    b = {v}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-(--text)/40 italic">Bob wants m_{choiceBit}</p>
            </div>
          </div>

          {error && (
            <p className="text-[11px] font-mono font-bold uppercase text-rose-400">{error}</p>
          )}
        </div>

        {/* Two-column panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-3 pb-4">

          {/* Alice */}
          <div className="rounded-xl border border-(--border) bg-(--bg) overflow-hidden">
            <PanelHeader
              role="alice"
              title="Sender Protocol"
              subtitle="Alice runs setup, then encrypts both messages under Bob's public keys"
            />
            <div className="p-4 space-y-4">

              {/* Step 1 */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Step 1 — Sender Setup</p>
                <p className="text-[11px] text-(--text)/60">
                  Alice picks random <em>x</em>, publishes <strong>c = g<sup>x</sup> mod p</strong> to Bob.
                  Alice does not reveal <em>x</em>.
                </p>
                <Btn onClick={handleSetup} disabled={loadingSetup}>
                  {loadingSetup ? 'Generating…' : 'Run Setup'}
                </Btn>
                {setupData && (
                  <FieldRow label="Published c = gˣ mod p" value={String(setupData.c)} highlight />
                )}
              </div>

              {/* Step 3 */}
              {receiverData && (
                <div className="space-y-2 border-t border-(--border) pt-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Step 3 — Encrypt Both Messages</p>
                  <p className="text-[11px] text-(--text)/60">
                    Alice receives Bob's keys (PK₀, PK₁) and encrypts m₀ under PK₀, m₁ under PK₁.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <FieldRow label="Received PK₀" value={String(receiverData.pk0)} />
                    <FieldRow label="Received PK₁" value={String(receiverData.pk1)} />
                  </div>
                  <Btn onClick={handleEncrypt} disabled={loadingEncrypt}>
                    {loadingEncrypt ? 'Encrypting…' : 'Encrypt m₀ and m₁'}
                  </Btn>
                  {encryptData && (
                    <div className="grid grid-cols-2 gap-2">
                      <FieldRow label="C₀ = (A₀, B₀)" value={`(${encryptData.A0}, ${encryptData.B0})`} highlight />
                      <FieldRow label="C₁ = (A₁, B₁)" value={`(${encryptData.A1}, ${encryptData.B1})`} highlight />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bob */}
          <div className="rounded-xl border border-(--border) bg-(--bg) overflow-hidden">
            <PanelHeader
              role="bob"
              title="Receiver Protocol"
              subtitle="Bob generates keys hiding his choice bit, then decrypts only his chosen message"
            />
            <div className="p-4 space-y-4">

              {/* Step 2 */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Step 2 — Generate Key Pair</p>
                <p className="text-[11px] text-(--text)/60">
                  Bob picks random <em>k</em>.
                  Sets <strong>PK_b = g<sup>k</sup></strong>, <strong>PK_{'{1−b}'} = c / PK_b</strong>.
                  Sends (PK₀, PK₁) — Alice can't tell which is the real key.
                </p>
                <Btn onClick={handleReceiverKeys} disabled={loadingKeys || !setupData} variant="secondary">
                  {loadingKeys ? 'Generating…' : `Generate Keys (b = ${choiceBit})`}
                </Btn>
                {!setupData && (
                  <p className="text-[11px] italic text-(--text)/30">Waiting for Alice's setup…</p>
                )}
                {receiverData && (
                  <div className="grid grid-cols-2 gap-2">
                    <FieldRow
                      label={`PK₀${b === 0 ? ' ← real (g^k)' : ' ← decoy'}`}
                      value={String(receiverData.pk0)}
                      highlight={b === 0}
                    />
                    <FieldRow
                      label={`PK₁${b === 1 ? ' ← real (g^k)' : ' ← decoy'}`}
                      value={String(receiverData.pk1)}
                      highlight={b === 1}
                    />
                  </div>
                )}
              </div>

              {/* Step 4 */}
              {encryptData && (
                <div className="space-y-2 border-t border-(--border) pt-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Step 4 — Decrypt Chosen Message</p>
                  <p className="text-[11px] text-(--text)/60">
                    Bob computes <strong>m_b = B_b · (A_b<sup>k</sup>)⁻¹ mod p</strong>.
                    He can only decrypt the ciphertext encrypted under PK_b = g<sup>k</sup>.
                  </p>
                  <Btn onClick={handleDecrypt} disabled={loadingDecrypt} variant="secondary">
                    {loadingDecrypt ? 'Decrypting…' : `Decrypt m${choiceBit}`}
                  </Btn>
                  {decryptData && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Result</p>
                      <p className="font-mono text-xl font-black text-emerald-300">m_{choiceBit} = {decryptData.message}</p>
                      <p className="text-[11px] text-emerald-300/60">
                        {decryptData.message === parseInt(m0, 10) && b === 0 ? '✓ Matches Alice\'s m₀' : ''}
                        {decryptData.message === parseInt(m1, 10) && b === 1 ? '✓ Matches Alice\'s m₁' : ''}
                      </p>
                    </div>
                  )}

                  {/* Cheat attempt */}
                  {decryptData && (
                    <div className="border-t border-(--border) pt-3 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/70">Privacy Demonstration</p>
                      <p className="text-[11px] text-(--text)/60">
                        Can Bob use his private key <em>k</em> to also decrypt m_{1 - b}?
                      </p>
                      <Btn onClick={handleCheat} disabled={loadingCheat} variant="ghost">
                        {loadingCheat ? 'Attempting…' : 'Try Cheat — Get Both Messages'}
                      </Btn>
                      {cheatData && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">
                                m₀ attempt {cheatData.m0_correct ? '✓' : '✗'}
                              </p>
                              <p className={`font-mono font-black ${cheatData.m0_correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {cheatData.m0_attempt}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">
                                m₁ attempt {cheatData.m1_correct ? '✓' : '✗'}
                              </p>
                              <p className={`font-mono font-black ${cheatData.m1_correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {cheatData.m1_attempt}
                              </p>
                            </div>
                          </div>
                          <p className="text-[11px] text-(--text)/50 italic leading-relaxed">
                            {cheatData.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Protocol transcript */}
        {setupData && (
          <div className="mx-3 mb-4 rounded-xl border border-(--border) bg-(--code-bg) p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-(--text-h)">Protocol Transcript</p>
            <div className="space-y-3">
              <TranscriptEntry step="1" from="Alice" to="Bob" label="c = gˣ mod p" value={String(setupData.c)} />
              {receiverData && (
                <TranscriptEntry step="2" from="Bob" to="Alice" label="(PK₀, PK₁)" value={`(${receiverData.pk0}, ${receiverData.pk1})`} />
              )}
              {encryptData && (
                <TranscriptEntry step="3" from="Alice" to="Bob" label="(C₀, C₁) = ((A₀,B₀),(A₁,B₁))"
                  value={`C₀=(${encryptData.A0},${encryptData.B0})  C₁=(${encryptData.A1},${encryptData.B1})`} />
              )}
              {decryptData && (
                <TranscriptEntry step="4" from="Bob" to="" label={`locally: m${choiceBit} = B${choiceBit}·(A${choiceBit}^k)⁻¹ mod p`}
                  value={`m${choiceBit} = ${decryptData.message}`} />
              )}
            </div>
          </div>
        )}

      </section>
    </main>
  )
}
