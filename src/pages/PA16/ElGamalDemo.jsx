import { useState, useCallback, useRef } from 'react'
import axios from 'axios'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'

const pa16api = axios.create({ baseURL: api.defaults.baseURL, timeout: 120_000 })

function cx(...c) { return c.filter(Boolean).join(' ') }
function hexOf(n) {
  if (!n && n !== 0) return '—'
  try { return '0x' + BigInt(n).toString(16).toUpperCase() } catch { return String(n) }
}
function trunc(h, max = 20) {
  const s = String(h || '—')
  if (s.length <= max + 4) return s
  return s.slice(0, Math.floor(max / 2) + 2) + '…' + s.slice(-Math.floor(max / 2))
}

// ── UI Primitives ──────────────────────────────────────────────────────────────

function Card({ title, children, className = '' }) {
  return (
    <div className={cx('rounded-xl border border-(--border) overflow-hidden', className)}>
      {title && (
        <div className="border-b border-(--border) bg-(--code-bg) px-4 py-2.5">
          <h3 className="text-xs font-black uppercase tracking-widest text-white">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

function KV({ label, value, color = 'text-white', mono = true, small = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">{label}</span>
      <span className={cx(small ? 'text-[11px]' : 'text-xs', mono && 'font-mono', 'break-all leading-relaxed', color)}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function Badge({ label, color = 'purple' }) {
  const cls = {
    green:  'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    red:    'bg-rose-500/20    border-rose-500/40    text-rose-300',
    amber:  'bg-amber-500/20   border-amber-500/40   text-amber-300',
    purple: 'bg-purple-500/20  border-purple-500/40  text-purple-300',
    blue:   'bg-blue-500/20    border-blue-500/40    text-blue-300',
    cyan:   'bg-cyan-500/20    border-cyan-500/40    text-cyan-300',
  }
  return (
    <span className={cx(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider',
      cls[color] ?? cls.purple
    )}>{label}</span>
  )
}

function Spinner() { return <span className="inline-block animate-spin mr-1">⟳</span> }

function Arrow({ label }) {
  return (
    <div className="flex flex-col items-center gap-1 my-0.5 text-purple-400">
      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>
      <span className="text-lg">↓</span>
    </div>
  )
}

// ── Algorithm Overview ─────────────────────────────────────────────────────────

function AlgoOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {[
        {
          icon: '🔑', title: 'Key Generation',
          steps: ['x ← Zq  (private key)', 'h = g^x mod p  (public key)', 'Public: (p, q, g, h)', 'Private: x'],
          color: 'border-blue-500/40 bg-blue-500/5',
        },
        {
          icon: '🔒', title: 'Encryption',
          steps: ['r ← Zq  (fresh randomness)', 'c₁ = g^r mod p', 'c₂ = m · h^r mod p', 'Ciphertext: C = (c₁, c₂)'],
          color: 'border-emerald-500/40 bg-emerald-500/5',
        },
        {
          icon: '🔓', title: 'Decryption',
          steps: ['s = c₁^x mod p  (= h^r)', 'm = c₂ · s⁻¹ mod p', '= m · h^r · (h^r)⁻¹', '= m  ✓'],
          color: 'border-purple-500/40 bg-purple-500/5',
        },
      ].map(({ icon, title, steps, color }) => (
        <div key={title} className={cx('rounded-xl border p-4 space-y-2', color)}>
          <p className="font-black text-white text-sm">{icon} {title}</p>
          <ul className="space-y-1">
            {steps.map((s, i) => (
              <li key={i} className="text-[11px] text-(--text)/70 font-mono leading-relaxed">
                <span className="text-(--text)/30 mr-1">{i + 1}.</span>{s}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// ── Params panel (shared across tabs) ─────────────────────────────────────────

function ParamsBar({ params, onGenerate, loading, bits, setBits }) {
  const SIZES = [16, 24, 32, 48, 64]
  return (
    <Card title="⚙ Safe-Prime Group Parameters">
      <div className="space-y-3">
        <p className="text-sm text-(--text)/70">
          ElGamal uses the same safe-prime group as PA#11 DH:&nbsp;
          <code className="text-white">p = 2q+1</code>, generator <code className="text-white">g</code> of
          order q. All arithmetic is mod p. <strong className="text-white">Security relies on DDH hardness</strong>.
        </p>
        <div className="flex gap-2 flex-wrap items-center">
          {SIZES.map(b => (
            <button key={b} onClick={() => setBits(b)}
              className={cx(
                'rounded-lg border px-3 py-1 text-xs font-black transition-all hover:-translate-y-0.5',
                bits === b
                  ? 'border-purple-500/60 bg-purple-500/20 text-white'
                  : 'border-(--border) bg-(--code-bg) text-(--text) hover:border-purple-500/40'
              )}>{b}-bit</button>
          ))}
          <Btn onClick={onGenerate} disabled={loading} id="pa16-gen-params-btn">
            {loading ? <><Spinner />Generating…</> : `⚡ Generate ${bits}-bit Group`}
          </Btn>
        </div>
        {params && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Safe prime p = 2q+1', val: hexOf(params.p) },
              { label: 'Subgroup order q', val: hexOf(params.q) },
              { label: 'Generator g', val: hexOf(params.g) },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-xl border border-(--border) bg-(--code-bg) p-3 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">{label}</p>
                <p className="font-mono text-xs text-white break-all">{val}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Full Lifecycle Tab ─────────────────────────────────────────────────────────

function LifecycleTab({ params }) {
  const [bits, setBits]       = useState(32)
  const [msgInt, setMsgInt]   = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [encResult, setEncResult] = useState(null)
  const [encLoading, setEncLoading] = useState(false)
  const [decResult, setDecResult]   = useState(null)
  const [decLoading, setDecLoading] = useState(false)
  const [error, setError]     = useState('')

  const runFullDemo = async () => {
    setLoading(true); setError(''); setResult(null); setEncResult(null); setDecResult(null)
    try {
      const r = await pa16api.post('/api/pa16/full-demo', {
        bits,
        message_int: msgInt || null,
      })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Demo failed') }
    finally { setLoading(false) }
  }

  // Manual re-encrypt with same params
  const reEncrypt = async () => {
    if (!result) return
    setEncLoading(true)
    try {
      const r = await pa16api.post('/api/pa16/encrypt', {
        p: result.params.p, q: result.params.q, g: result.params.g,
        h: result.public_h,
        m: result.message,
      })
      setEncResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Encrypt failed') }
    finally { setEncLoading(false) }
  }

  // Decrypt the re-encrypted ciphertext
  const reDecrypt = async () => {
    if (!result || !encResult) return
    setDecLoading(true)
    try {
      const r = await pa16api.post('/api/pa16/decrypt', {
        p: result.params.p, x: result.private_x,
        c1: encResult.c1, c2: encResult.c2,
      })
      setDecResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Decrypt failed') }
    finally { setDecLoading(false) }
  }

  const SIZES = [16, 24, 32, 48]

  return (
    <div className="space-y-4">
      <Card title="🔒 ElGamal Encrypt / Decrypt">
        <div className="space-y-3">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            One-shot: generate group params + key pair, encrypt a message, decrypt and verify.
            Notice that <strong className="text-white">re-encrypting the same m gives a different C</strong> each time
            (due to fresh randomness r) — this is the source of semantic security.
          </p>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1 flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Message (integer, blank = random)</label>
              <input value={msgInt} onChange={e => setMsgInt(e.target.value)} placeholder="e.g. 42"
                className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 text-sm text-white font-mono outline-none focus:border-purple-500/60 transition-all" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Group bits</p>
              <div className="flex gap-2">
                {SIZES.map(b => (
                  <button key={b} onClick={() => setBits(b)}
                    className={cx('rounded-lg border px-2.5 py-1 text-xs font-black transition-all',
                      bits === b ? 'border-emerald-500/60 bg-emerald-500/20 text-white'
                                 : 'border-(--border) bg-(--code-bg) text-(--text)/60 hover:text-white'
                    )}>{b}</button>
                ))}
              </div>
            </div>
            <Btn onClick={runFullDemo} disabled={loading} id="pa16-full-demo-btn">
              {loading ? <><Spinner />Running…</> : '▶ Run Demo'}
            </Btn>
          </div>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {result && (
        <div className="space-y-3">
          {/* Keys */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-blue-300">🔓 Public Key — vk</p>
              <KV label="h = g^x mod p" value={hexOf(result.public_h)} small color="text-blue-200" />
              <KV label="Generator g" value={hexOf(result.params?.g)} small />
              <KV label="Prime p" value={hexOf(result.params?.p)} small />
            </div>
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-rose-300">🔐 Private Key — sk</p>
              <KV label="x (private exponent)" value={hexOf(result.private_x)} small color="text-rose-200" />
              <KV label="Keygen time" value={`${result.keygen_ms} ms`} mono={false} color="text-amber-300" small />
            </div>
          </div>

          {/* Encrypt step */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="font-black text-sm text-emerald-300">🔒 Encryption: C = (c₁, c₂)</p>
              <Badge label={`m = ${result.message}`} color="cyan" />
              <Badge label={`enc: ${result.enc_ms} ms`} color="green" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {[
                { label: '① Message m', val: hexOf(result.message), color: 'text-white' },
                { label: '② c₁ = g^r mod p', val: hexOf(result.c1), color: 'text-emerald-200' },
                { label: '③ c₂ = m·h^r mod p', val: hexOf(result.c2), color: 'text-emerald-200' },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-lg border border-(--border) bg-(--code-bg) p-2.5 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">{label}</p>
                  <p className={cx('font-mono text-xs break-all', color)}>{val}</p>
                </div>
              ))}
            </div>

            {/* Randomness note */}
            <div className="flex gap-3 items-center flex-wrap">
              <Btn onClick={reEncrypt} disabled={encLoading} variant="secondary" id="pa16-re-enc-btn">
                {encLoading ? <><Spinner />Encrypting…</> : '🔄 Re-Encrypt Same m'}
              </Btn>
              <p className="text-[11px] text-(--text)/50 italic">
                Fresh r → different (c₁, c₂) even for same m — semantic security!
              </p>
            </div>
            {encResult && (
              <div className="grid grid-cols-2 gap-3">
                <KV label="New c₁ (different!)" value={hexOf(encResult.c1)} color="text-amber-300" small />
                <KV label="New c₂ (different!)" value={hexOf(encResult.c2)} color="text-amber-300" small />
              </div>
            )}
            {encResult && (
              <p className="text-[11px] text-emerald-300/70">
                Old c₁ = {trunc(hexOf(result.c1))} vs New c₁ = {trunc(hexOf(encResult.c1))} — completely different!
              </p>
            )}
          </div>

          {/* Decrypt step */}
          <Arrow label="Decrypt with private key x" />
          <div className={cx(
            'rounded-xl border-2 p-4 space-y-3',
            result.correct ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'
          )}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl">{result.correct ? '✅' : '❌'}</span>
              <span className="font-black text-sm">{result.correct ? 'Decryption Correct' : 'Decryption Failed'}</span>
              <Badge label={`dec: ${result.dec_ms} ms`} color={result.correct ? 'green' : 'red'} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <KV label="c₁^x mod p  (= h^r)" value={hexOf(result.c1)} small color="text-purple-300" />
              <KV label="m = c₂ · (c₁^x)⁻¹ mod p" value={hexOf(result.decrypted)} small color="text-emerald-300" />
              <KV label="Original m" value={hexOf(result.message)} small color="text-white" />
            </div>
            <p className="text-xs text-(--text)/60">
              m = c₂ · s⁻¹ mod p = m·h^r · (h^r)⁻¹ = m ✓
            </p>

            {encResult && (
              <>
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-300 mt-2">
                  Decrypt re-encrypted ciphertext:
                </p>
                <Btn onClick={reDecrypt} disabled={decLoading} variant="secondary" id="pa16-re-dec-btn">
                  {decLoading ? <><Spinner />Decrypting…</> : '🔓 Decrypt New C'}
                </Btn>
                {decResult && (
                  <KV label="Decrypted m (same original!)" value={hexOf(decResult.m)} color="text-emerald-300" />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Malleability Tab ──────────────────────────────────────────────────────────

function MalleabilityTab({ params }) {
  const [msg, setMsg]     = useState('42')
  const [lam, setLam]     = useState(2)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [localParams, setLocalParams] = useState(null)
  const [genLoading, setGenLoading]   = useState(false)

  const genAndRun = async () => {
    setLoading(true); setGenLoading(true); setError(''); setResult(null)
    try {
      // Generate fresh small params + key
      const pgr = await pa16api.post('/api/pa16/gen-params', { bits: 32 })
      setLocalParams(pgr.data)
      const { p, q, g } = pgr.data
      const kg = await pa16api.post('/api/pa16/keygen', { p, q, g })
      setGenLoading(false)

      const r = await pa16api.post('/api/pa16/malleability', {
        p, q, g, h: kg.data.h, x: kg.data.x,
        m: msg, lam,
      })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { setLoading(false); setGenLoading(false) }
  }

  return (
    <div className="space-y-4">
      <Card title="🦠 Malleability Attack — ElGamal is NOT IND-CCA">
        <div className="space-y-3">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            ElGamal ciphertexts are <strong className="text-white">malleable</strong>: given
            (c₁, c₂) encrypting m, anyone can produce (c₁, λ·c₂) which decrypts to
            λ·m — <em>without knowing the private key or m</em>. This proves ElGamal is NOT
            IND-CCA secure. Compare with CCA-secure schemes (PA#17).
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Message m (integer)</label>
              <input value={msg} onChange={e => setMsg(e.target.value)}
                className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 text-sm text-white font-mono outline-none focus:border-rose-500/60 transition-all" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">
                Scalar λ <span className="text-rose-300">(attacker's choice)</span>
              </p>
              <input type="number" min={2} max={100} value={lam} onChange={e => setLam(Number(e.target.value))}
                className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 text-sm text-white font-mono outline-none focus:border-rose-500/60 transition-all" />
            </div>
            <Btn onClick={genAndRun} disabled={loading} id="pa16-malleable-btn">
              {loading ? <><Spinner />{genLoading ? 'Generating…' : 'Attacking…'}</> : '⚡ Run Attack'}
            </Btn>
          </div>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {result && (
        <div className="space-y-3">
          {/* Attacker flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-emerald-300">Original Ciphertext C</p>
              <KV label={`m = ${result.message}`} value={hexOf(result.message)} small />
              <KV label="c₁ = g^r mod p" value={hexOf(result.c1)} small color="text-emerald-200" />
              <KV label="c₂ = m·h^r mod p" value={hexOf(result.c2)} small color="text-emerald-200" />
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-rose-300">
                Tampered Ciphertext C' <Badge label="No private key!" color="red" />
              </p>
              <KV label="c₁ unchanged" value={hexOf(result.c1)} small color="text-rose-200/60" />
              <KV label={`c₂' = λ·c₂ = ${result.lambda}·c₂`} value={hexOf(result.c2_prime)} small color="text-rose-200" />
              <p className="text-[11px] text-rose-300/70 italic">
                Attacker only multiplied c₂ by {result.lambda} — no key required
              </p>
            </div>
          </div>

          <Arrow label="Decrypt tampered ciphertext" />

          <div className={cx(
            'rounded-xl border-2 p-5 space-y-3',
            result.attack_valid ? 'border-rose-500/60 bg-rose-500/8' : 'border-emerald-500/40 bg-emerald-500/8'
          )}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-black">{result.attack_valid ? '🚨 Attack Succeeded!' : '❌ Attack Failed'}</span>
              <Badge label={result.attack_valid ? 'Malleable!' : 'Secure'} color={result.attack_valid ? 'red' : 'green'} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <KV label="Original m" value={String(result.message)} color="text-white" small />
              <KV label={`Expected λ·m = ${result.lambda}×${result.message}`} value={String(result.m_expected)} color="text-rose-300" small />
              <KV label="Decrypted from C'" value={String(result.m_decrypted)} color={result.attack_valid ? 'text-rose-300' : 'text-emerald-300'} small />
            </div>
            <p className="text-xs text-(--text)/60 leading-relaxed italic">{result.explanation}</p>
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
              <p className="text-rose-200 font-black text-sm">Why this matters:</p>
              <p className="text-xs text-rose-200/70 mt-1">
                An adversary can scale any ciphertext without detection. In a CCA2 game,
                they query the decryption oracle on C' = (c₁, 2c₂) ≠ C*, get 2·m_b,
                divide by 2, and learn m_b — breaking IND-CCA2 completely.
                CCA-secure constructions (PA#17) add integrity checks that block this.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── IND-CPA Game Tab ──────────────────────────────────────────────────────────

function INDCPATab({ params }) {
  const [rounds, setRounds]           = useState(50)
  const [result, setResult]           = useState(null)
  const [loading, setLoading]         = useState(false)
  const [localP, setLocalP]           = useState(null)
  const [genLoading, setGenLoading]   = useState(false)
  const [error, setError]             = useState('')
  const [smallRounds, setSmallRounds] = useState(30)
  const [smallResult, setSmallResult] = useState(null)
  const [smallLoading, setSmallLoading] = useState(false)
  const [smallError, setSmallError]   = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      let p = localP || params
      if (!p) {
        setGenLoading(true)
        const gr = await pa16api.post('/api/pa16/gen-params', { bits: 32 })
        setLocalP(gr.data); p = gr.data
        setGenLoading(false)
      }
      const r = await pa16api.post('/api/pa16/ind-cpa-game', { p: p.p, q: p.q, g: p.g, n_rounds: rounds })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Game failed') }
    finally { setLoading(false); setGenLoading(false) }
  }

  const runSmall = async () => {
    setSmallLoading(true); setSmallError(''); setSmallResult(null)
    try {
      const gr = await pa16api.post('/api/pa16/gen-params', { bits: 10 })
      const r  = await pa16api.post('/api/pa16/ind-cpa-small-attack', {
        p: gr.data.p, q: gr.data.q, g: gr.data.g, n_rounds: smallRounds
      })
      setSmallResult(r.data)
    } catch (e) { setSmallError(e?.response?.data?.detail || 'Attack failed') }
    finally { setSmallLoading(false) }
  }

  return (
    <div className="space-y-5">

      {/* ── Large group: IND-CPA secure ── */}
      <Card title="🎮 IND-CPA Security Game — Large Group (32-bit, DDH Hard)">
        <div className="space-y-3">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            <strong className="text-white">IND-CPA</strong>: adversary submits (m₀,m₁); challenger flips b,
            encrypts m_b; adversary guesses b. Under DDH,
            <strong className="text-emerald-300"> Adv = 2·|Pr[win]−0.5| ≈ 0</strong> (negligible).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              { name: 'Dumb',  desc: 'Always guess b=0',      exp: '≈ 50% — indistinguishable' },
              { name: 'Smart', desc: 'Use c₂ parity as hint', exp: 'Still ≈ 50% — leaks 0 bits' },
            ].map(({ name, desc, exp }) => (
              <div key={name} className="rounded-xl border border-(--border) bg-(--code-bg) p-3 space-y-1">
                <p className="font-black text-white">{name} strategy</p>
                <p className="text-(--text)/60 italic">{desc}</p>
                <p className="text-emerald-300">{exp}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-4 items-center flex-wrap">
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-widest text-white">Rounds: <span className="text-purple-300">{rounds}</span></p>
              <input type="range" min={10} max={200} step={10} value={rounds} onChange={e => setRounds(Number(e.target.value))} className="w-48 accent-purple-500" />
            </div>
            <Btn onClick={run} disabled={loading} id="pa16-ind-cpa-btn">
              {loading ? (genLoading ? 'Generating…' : 'Running…') : '🎮 Run IND-CPA Game'}
            </Btn>
          </div>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(result.strategies || {}).map(([strat, data]) => {
              const near50 = Math.abs(data.win_rate - 0.5) < 0.15
              const adv    = (Math.abs(data.win_rate - 0.5) * 2).toFixed(3)
              return (
                <div key={strat} className={cx('rounded-xl border-2 p-4 space-y-3',
                  near50 ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'
                )}>
                  <p className="font-black text-sm capitalize text-white">{strat} strategy</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-(--text)/50">Win rate</span>
                      <span className={near50 ? 'text-emerald-300 font-black' : 'text-amber-300 font-black'}>
                        {(data.win_rate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-(--border) overflow-hidden">
                      <div className={cx('h-full rounded-full transition-all duration-700', near50 ? 'bg-emerald-500' : 'bg-amber-500')}
                        style={{ width: `${data.win_rate * 100}%` }} />
                    </div>
                    <div className="relative h-3">
                      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 h-full bg-white/30 rounded" />
                      <span className="absolute left-1/2 -translate-x-1/2 -bottom-3 text-[9px] text-white/30">50%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mt-2">
                    <div className="rounded-lg bg-(--code-bg) border border-(--border) p-2">
                      <p className="text-[10px] text-(--text)/50 uppercase">Wins</p>
                      <p className="font-mono text-white">{data.wins}/{data.total}</p>
                    </div>
                    <div className="rounded-lg bg-(--code-bg) border border-(--border) p-2">
                      <p className="text-[10px] text-(--text)/50 uppercase">Expected</p>
                      <p className="font-mono text-white">50%</p>
                    </div>
                    <div className="rounded-lg bg-(--code-bg) border border-purple-500/30 p-2">
                      <p className="text-[10px] text-purple-300/60 uppercase">Adv</p>
                      <p className="font-mono text-purple-300 font-black">{adv}</p>
                    </div>
                  </div>
                  <Badge label={near50 ? '✓ Adv ≈ 0 — negligible' : 'Slight variance'} color={near50 ? 'green' : 'amber'} />
                </div>
              )
            })}
          </div>
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3">
            <p className="text-purple-300 font-black text-sm">🔒 IND-CPA Secure — Advantage is Negligible</p>
            <p className="text-xs text-(--text)/70 mt-1">{result.conclusion}</p>
            <p className="font-mono text-[11px] text-purple-300/60 mt-2">
              ε(λ) = |Pr[Adv wins] − ½| ≈ 0 ⟹ ElGamal IND-CPA secure under DDH
            </p>
          </div>
        </div>
      )}

      {/* ── Small group: breaks ── */}
      <Card title="💥 IND-CPA Distinguisher — Small Group (q ≈ 2^10, DDH Trivially False)">
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm space-y-2">
            <p className="font-black text-amber-300">⚠️ Security Completely Breaks for Tiny Groups</p>
            <p className="text-(--text)/70 leading-relaxed">
              When <code className="text-white">q ≈ 2^10</code> (~1024 elements), brute-forcing DLP
              takes &lt;1024 steps. Adversary recovers r, computes
              <code className="text-white"> m = c₂·(h^r)^-1</code>, wins{' '}
              <strong className="text-rose-300">~100% of the time</strong>.
              Advantage ≈ 1.0 vs ≈ 0 for large groups.
            </p>
            <p className="font-mono text-[11px] text-amber-300/70">
              Security param λ=10 bits: ε(λ)=1.0 — NOT negligible!
            </p>
          </div>
          <div className="flex gap-4 items-center flex-wrap">
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-widest text-white">Rounds: <span className="text-amber-300">{smallRounds}</span></p>
              <input type="range" min={5} max={100} step={5} value={smallRounds} onChange={e => setSmallRounds(Number(e.target.value))} className="w-48 accent-amber-500" />
            </div>
            <Btn onClick={runSmall} disabled={smallLoading} id="pa16-ind-cpa-small-btn">
              {smallLoading ? <><Spinner />Attacking…</> : '💥 Run Small-Group Attack'}
            </Btn>
          </div>
          {smallError && <p className="text-xs text-rose-400 font-black">{smallError}</p>}
        </div>
      </Card>

      {smallResult && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: 'Small group q ≈ 2^10 — this run', pct: smallResult.win_rate * 100, adv: smallResult.advantage, col: 'rose' },
              { label: 'Large group q ≈ 2^32 — theoretical',  pct: 50, adv: 0, col: 'emerald' },
            ].map(({ label, pct, adv, col }) => (
              <div key={label} className={cx('rounded-xl border-2 p-4 space-y-2',
                col === 'rose' ? 'border-rose-500/50 bg-rose-500/5' : 'border-emerald-500/40 bg-emerald-500/5'
              )}>
                <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">{label}</p>
                <div className="flex items-end gap-3">
                  <p className={cx('text-5xl font-black', col === 'rose' ? 'text-rose-300' : 'text-emerald-300')}>
                    {typeof pct === 'number' ? pct.toFixed(1) : pct}%
                  </p>
                  <div className="mb-1">
                    <p className="text-[10px] text-(--text)/50 uppercase">Advantage</p>
                    <p className={cx('font-mono font-black text-sm', col === 'rose' ? 'text-rose-300' : 'text-emerald-300')}>
                      {typeof adv === 'number' ? adv.toFixed(3) : adv}
                    </p>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-(--border) overflow-hidden">
                  <div className={cx('h-full rounded-full transition-all duration-700', col === 'rose' ? 'bg-rose-500' : 'bg-emerald-500')}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-(--code-bg) px-4 py-3 grid grid-cols-3 gap-3 text-center text-xs">
            <div><p className="text-(--text)/40 uppercase text-[9px]">Group order q</p><p className="font-mono text-amber-300 font-black">{smallResult.q_bits}-bit</p></div>
            <div><p className="text-(--text)/40 uppercase text-[9px]">DLP solved</p><p className="font-mono text-rose-300 font-black">{smallResult.dlp_found}/{smallResult.total}</p></div>
            <div><p className="text-(--text)/40 uppercase text-[9px]">Wins</p><p className="font-mono text-rose-300 font-black">{smallResult.wins}/{smallResult.total}</p></div>
          </div>

          {smallResult.details?.length > 0 && (
            <div className="rounded-xl border border-(--border) overflow-hidden">
              <div className="bg-(--code-bg) border-b border-(--border) px-4 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-white">First {smallResult.details.length} Rounds — Brute-Force DLP</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-(--code-bg) border-b border-(--border)">
                    <tr>{['#','b','m0','m1','m_b','r found','recovered','guess','result'].map(h => (
                      <th key={h} className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-(--text)/50 text-left">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {smallResult.details.map(row => (
                      <tr key={row.round} className={cx('border-b border-(--border)/30', row.won ? '' : 'bg-rose-500/[0.05]')}>
                        <td className="px-3 py-2 text-(--text)/40 font-black">{row.round}</td>
                        <td className="px-3 py-2"><span className={cx('inline-flex w-5 h-5 items-center justify-center rounded text-[10px] font-black', row.b===0?'bg-blue-500/20 text-blue-300':'bg-purple-500/20 text-purple-300')}>{row.b}</span></td>
                        <td className="px-3 py-2 font-mono">{row.m0}</td>
                        <td className="px-3 py-2 font-mono">{row.m1}</td>
                        <td className="px-3 py-2 font-mono font-black text-amber-300">{row.m_b}</td>
                        <td className="px-3 py-2 font-mono text-purple-300">{row.r_found ?? '—'}</td>
                        <td className="px-3 py-2 font-mono text-emerald-300">{row.m_recovered ?? '—'}</td>
                        <td className="px-3 py-2 font-mono font-black">{row.b_guess}</td>
                        <td className="px-3 py-2"><Badge label={row.won ? '✓ Win' : '✗ Loss'} color={row.won ? 'green' : 'red'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 px-4 py-3">
            <p className="text-rose-300 font-black text-sm">💥 IND-CPA BROKEN — Advantage = {smallResult.advantage}</p>
            <p className="text-xs text-(--text)/70 mt-1">{smallResult.conclusion}</p>
          </div>
        </div>
      )}
    </div>
  )
}



// ── IND-CCA Failure Tab ────────────────────────────────────────────────────────

function INDCCATab() {
  const [result, setResult]             = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [multiRounds, setMultiRounds]   = useState(20)
  const [multiResult, setMultiResult]   = useState(null)
  const [multiLoading, setMultiLoading] = useState(false)
  const [multiError, setMultiError]     = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const gr = await pa16api.post('/api/pa16/gen-params', { bits: 32 })
      const r  = await pa16api.post('/api/pa16/ind-cca-failure', { p: gr.data.p, q: gr.data.q, g: gr.data.g })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { setLoading(false) }
  }

  const runMulti = async () => {
    setMultiLoading(true); setMultiError(''); setMultiResult(null)
    try {
      const gr = await pa16api.post('/api/pa16/gen-params', { bits: 32 })
      const r  = await pa16api.post('/api/pa16/ind-cca-multi', {
        p: gr.data.p, q: gr.data.q, g: gr.data.g, n_rounds: multiRounds
      })
      setMultiResult(r.data)
    } catch (e) { setMultiError(e?.response?.data?.detail || 'Failed') }
    finally { setMultiLoading(false) }
  }

  return (
    <div className="space-y-4">
      <Card title="💥 IND-CCA2 Failure — Decryption Oracle Attack">
        <div className="space-y-3">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            ElGamal is <strong className="text-rose-300">malleable</strong>: adversary queries
            C′=(c₁*, 2·c₂*) to the decryption oracle, gets 2·m_b, recovers m_b by dividing
            by 2⁻¹ mod p, then guesses b with <strong className="text-rose-300">probability 1</strong>.
          </p>
          <ol className="space-y-1 text-sm text-(--text)/70 list-none ml-0">
            {[
              'Receive C* = (c₁*, c₂*) encrypting m_b',
              'Submit C′ = (c₁*, 2·c₂*) to oracle — gets 2·m_b',
              'Divide by 2 mod p to recover m_b exactly',
              'Compare with m₀, m₁ → learn b → win with Pr=1',
            ].map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-rose-400 font-black font-mono text-xs mt-0.5">{i+1}.</span>
                <span className="text-xs">{s}</span>
              </li>
            ))}
          </ol>
          <Btn onClick={run} disabled={loading} id="pa16-ind-cca-btn">
            {loading ? <><Spinner />Running…</> : '💥 Run CCA Attack (1 round)'}
          </Btn>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {result && (
        <div className="space-y-3">
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-purple-300">Challenge Setup</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KV label="m₀" value={String(result.m0)} small />
              <KV label="m₁" value={String(result.m1)} small />
              <KV label="True bit b" value={String(result.b)} small color="text-purple-300" />
              <KV label="m_b" value={String(result.m_b)} small color="text-purple-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KV label="c₁*" value={hexOf(result.c1_star)} small color="text-purple-200" />
              <KV label="c₂*" value={hexOf(result.c2_star)} small color="text-purple-200" />
            </div>
          </div>
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-rose-300">Adversary Attack</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <KV label="C′: c₂′=2·c₂*" value={hexOf(result.c2_tampered)} small color="text-rose-200" />
              <KV label="Oracle returns 2·m_b" value={String(result.two_mb_from_oracle)} small color="text-amber-300" />
              <KV label="2⁻¹ mod p" value={hexOf(result.inv2)} small />
            </div>
            <KV label="m_b recovered" value={String(result.m_b_recovered)} color="text-rose-300" small />
          </div>
          <div className={cx('rounded-xl border-2 p-5 flex items-center gap-3 flex-wrap',
            result.won ? 'border-rose-500/60 bg-rose-500/8' : 'border-emerald-500/40'
          )}>
            <span className="text-2xl">{result.won ? '🚨' : '✅'}</span>
            <span className="font-black text-sm">
              {result.won ? `Adversary wins! b_guess=${result.b_guess} === b=${result.b}` : 'Adversary failed'}
            </span>
            <Badge label={result.won ? 'NOT IND-CCA2' : 'Unexpected'} color={result.won ? 'red' : 'green'} />
          </div>
        </div>
      )}

      {/* Multi-round win counter */}
      <Card title="📊 Multi-Round Win Counter — Should be 100%">
        <div className="space-y-3">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            The CCA attack is <strong className="text-rose-300">deterministic</strong> — running it N times
            should show <strong className="text-rose-300">100% wins</strong>.
          </p>
          <div className="flex gap-4 items-center flex-wrap">
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-widest text-white">
                Rounds: <span className="text-rose-300">{multiRounds}</span>
              </p>
              <input type="range" min={5} max={50} step={5} value={multiRounds}
                onChange={e => setMultiRounds(Number(e.target.value))} className="w-48 accent-rose-500" />
            </div>
            <Btn onClick={runMulti} disabled={multiLoading} id="pa16-ind-cca-multi-btn">
              {multiLoading ? <><Spinner />Running {multiRounds} rounds…</> : `📊 Run ${multiRounds}-Round Counter`}
            </Btn>
          </div>
          {multiError && <p className="text-xs text-rose-400 font-black">{multiError}</p>}
        </div>
      </Card>

      {multiResult && (
        <div className="space-y-3">
          <div className={cx('rounded-xl border-2 p-6 text-center',
            multiResult.win_rate >= 0.99 ? 'border-rose-500/60 bg-rose-500/5' : 'border-amber-500/40'
          )}>
            <p className="text-7xl font-black text-rose-300">
              {(multiResult.win_rate * 100).toFixed(0)}%
            </p>
            <p className="font-black text-sm text-(--text)/70 mt-1">
              <span className="text-white">{multiResult.wins}</span> wins /
              <span className="text-white"> {multiResult.total}</span> rounds
            </p>
            <div className="mt-3">
              <Badge
                label={multiResult.wins === multiResult.total ? '🚨 100% — deterministic attack!' : `${multiResult.wins}/${multiResult.total} wins`}
                color={multiResult.wins === multiResult.total ? 'red' : 'amber'}
              />
            </div>
            <div className="mt-4 h-3 w-full rounded-full bg-(--border) overflow-hidden">
              <div className="h-full rounded-full bg-rose-500 transition-all duration-700"
                style={{ width: `${multiResult.win_rate * 100}%` }} />
            </div>
          </div>

          <div className="rounded-xl border border-(--border) overflow-hidden">
            <div className="bg-(--code-bg) border-b border-(--border) px-4 py-2 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-white">All {multiResult.total} Rounds</p>
              <div className="flex gap-3">
                <span className="flex items-center gap-1 text-[10px] text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Win</span>
                <span className="flex items-center gap-1 text-[10px] text-rose-400"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Loss</span>
              </div>
            </div>
            <div className="overflow-y-auto max-h-72">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-(--code-bg) border-b border-(--border)">
                  <tr>
                    {['#','m₀','m₁','True b','m_b','Recovered','Guess','Result'].map(h => (
                      <th key={h} className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-(--text)/50 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {multiResult.rows.map(row => (
                    <tr key={row.round} className={cx('border-b border-(--border)/30', !row.won && 'bg-rose-500/[0.06]')}>
                      <td className="px-3 py-2 text-(--text)/40 font-black">{row.round}</td>
                      <td className="px-3 py-2 font-mono">{row.m0}</td>
                      <td className="px-3 py-2 font-mono">{row.m1}</td>
                      <td className="px-3 py-2">
                        <span className={cx('inline-flex w-5 h-5 items-center justify-center rounded text-[10px] font-black',
                          (row.b===0||row.b==='0') ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                        )}>{row.b}</span>
                      </td>
                      <td className="px-3 py-2 font-mono font-black text-amber-300">{row.m_b}</td>
                      <td className="px-3 py-2 font-mono text-emerald-300">{row.m_recovered}</td>
                      <td className="px-3 py-2 font-mono font-black">{row.b_guess}</td>
                      <td className="px-3 py-2"><Badge label={row.won ? '✓ Win' : '✗ Loss'} color={row.won ? 'green' : 'red'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 px-4 py-3">
            <p className="text-rose-300 font-black text-sm">🚨 Conclusion</p>
            <p className="text-xs text-(--text)/70 mt-1">{multiResult.conclusion}</p>
            <p className="text-xs text-amber-300 mt-2">
              <strong>Lesson:</strong> Add Encrypt-then-MAC or OAEP to achieve CCA security (PA#17).
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'lifecycle', label: '🔒 Encrypt / Decrypt' },
  { key: 'malleable', label: '🦠 Malleability Attack' },
  { key: 'indcpa',    label: '🎮 IND-CPA Game' },
  { key: 'indcca',    label: '💥 IND-CCA Failure' },
]

export default function ElGamalDemo() {
  const [tab, setTab]         = useState('lifecycle')
  const [params, setParams]   = useState(null)
  const [bits, setBits]       = useState(32)
  const [genLoading, setGenLoading] = useState(false)

  const genParams = useCallback(async () => {
    setGenLoading(true)
    try {
      const r = await pa16api.post('/api/pa16/gen-params', { bits })
      setParams(r.data)
    } catch (e) { console.error(e) }
    finally { setGenLoading(false) }
  }, [bits])

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer — PA#16: ElGamal Public-Key Cryptosystem" />

        {/* Theory banner */}
        <div className="mb-4 rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 space-y-1">
          <p className="text-[13px] font-black uppercase tracking-widest text-white">ElGamal over a Safe-Prime Group</p>
          <p className="text-sm text-(--text)/70 leading-relaxed">
            ElGamal PKE is built over the same DH group as PA#11.&nbsp;
            <span className="text-emerald-300 font-semibold">IND-CPA secure</span> under the DDH assumption:
            ciphertexts are computationally indistinguishable.&nbsp;
            <span className="text-rose-300 font-semibold">NOT IND-CCA secure</span>: the scheme is malleable—
            (c₁, λ·c₂) decrypts to λ·m, enabling a decryption-oracle attack that wins with probability 1.
            Motivates CCA-secure constructions in PA#17.
          </p>
        </div>

        <div className="mb-4">
          <AlgoOverview />
        </div>

        {/* Optional shared group params bar */}
        <div className="mb-4">
          <ParamsBar params={params} onGenerate={genParams} loading={genLoading} bits={bits} setBits={setBits} />
        </div>

        {/* Tab bar */}
        <div className="overflow-hidden rounded-xl border border-(--border)">
          <div className="border-b border-(--border) bg-(--code-bg) px-3 py-2">
            <div className="flex gap-1 flex-wrap">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={cx(
                    'rounded-lg px-3 py-1.5 text-xs font-black transition-all',
                    tab === t.key
                      ? 'bg-purple-500/20 border border-purple-500/50 text-white'
                      : 'text-(--text)/60 hover:text-white hover:bg-(--code-bg)'
                  )}>{t.label}</button>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-5 min-h-[500px]">
            {tab === 'lifecycle' && <LifecycleTab params={params} />}
            {tab === 'malleable' && <MalleabilityTab params={params} />}
            {tab === 'indcpa'    && <INDCPATab params={params} />}
            {tab === 'indcca'    && <INDCCATab />}
          </div>
        </div>
      </section>
    </main>
  )
}
