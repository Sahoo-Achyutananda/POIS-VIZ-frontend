import { useState, useCallback, useRef } from 'react'
import axios from 'axios'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'

const pa15api = axios.create({ baseURL: api.defaults.baseURL, timeout: 120_000 })

function cx(...c) { return c.filter(Boolean).join(' ') }

function truncHex(h, maxChars = 28) {
  if (!h) return '—'
  const s = String(h)
  if (s.length <= maxChars + 2) return s
  return s.slice(0, Math.floor(maxChars / 2) + 2) + '…' + s.slice(-Math.floor(maxChars / 2))
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

function KV({ label, value, mono = true, color = 'text-white', small = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">{label}</span>
      <span className={cx(small ? 'text-[11px]' : 'text-xs', mono ? 'font-mono' : '', 'break-all leading-relaxed', color)}>
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
  }
  return (
    <span className={cx(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider',
      cls[color] ?? cls.purple
    )}>{label}</span>
  )
}

function Spinner() { return <span className="inline-block animate-spin mr-1">⟳</span> }

// ── Algorithm Overview ─────────────────────────────────────────────────────────

function AlgoOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {[
        {
          icon: '🔏', title: 'Hash-then-Sign (Secure)',
          steps: [
            'σ = SHA256(m)^d  mod N',
            'Verify: σ^e mod N == SHA256(m)',
            'Hash collapses message to fixed 256 bits',
            'EUF-CMA secure (CRHF assumption)',
          ],
          color: 'border-emerald-500/40 bg-emerald-500/5',
        },
        {
          icon: '⚠', title: 'Raw RSA Sign (Broken)',
          steps: [
            'σ = m^d mod N  (no hash)',
            'Verify: σ^e == m',
            'Multiplicative: (σ₁·σ₂)^e = m₁·m₂',
            'Existential forgery without secret key!',
          ],
          color: 'border-rose-500/40 bg-rose-500/5',
        },
        {
          icon: '🎮', title: 'EUF-CMA Security',
          steps: [
            'Adversary gets signing oracle (≤50 queries)',
            'Must forge (m*, σ*) for any new m*',
            'Hash-then-sign: all strategies fail',
            'Raw RSA: multiplicative forgery succeeds',
          ],
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

// ── Key Panel ──────────────────────────────────────────────────────────────────

function KeyPanel({ keys, loading, onGenerate, bits, setBits }) {
  const SIZES = [64, 128, 256, 512, 1024]
  return (
    <Card title="🔑 RSA Key Generation for Signing">
      <div className="space-y-3">
        <p className="text-sm text-(--text)/70">
          Generate an RSA key pair. The <span className="text-white font-semibold">private key d</span> is
          used to sign (via SHA-256 hash), the <span className="text-white font-semibold">public key e, N</span> to verify.
        </p>
        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-widest text-white">Modulus bit-size</p>
          <div className="flex gap-2 flex-wrap">
            {SIZES.map(b => (
              <button key={b} onClick={() => setBits(b)}
                className={cx(
                  'rounded-lg border px-3 py-1 text-xs font-black transition-all hover:-translate-y-0.5',
                  bits === b
                    ? 'border-purple-500/60 bg-purple-500/20 text-white'
                    : 'border-(--border) bg-(--code-bg) text-(--text) hover:border-purple-500/40'
                )}>{b}-bit</button>
            ))}
          </div>
        </div>
        <Btn onClick={onGenerate} disabled={loading} id="pa15-keygen-btn">
          {loading ? <><Spinner />Generating…</> : `Generate ${bits}-bit Signing Keys`}
        </Btn>
        {keys && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
              <p className="text-[11px] font-black text-blue-300 uppercase tracking-widest">🔓 Verification Key (vk)</p>
              <KV label="N (modulus)" value={truncHex('0x' + BigInt(keys.pk?.N ?? 0).toString(16).toUpperCase(), 24)} small />
              <KV label="e (public exponent)" value={keys.pk?.e} small />
              <KV label="Bit length" value={`${keys.aux?.bits} bits`} mono={false} />
            </div>
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 space-y-2">
              <p className="text-[11px] font-black text-rose-300 uppercase tracking-widest">🔐 Signing Key (sk)</p>
              <KV label="d (private exp)" value={truncHex('0x' + BigInt(keys.sk?.d ?? 0).toString(16).toUpperCase(), 24)} small />
              <KV label="Keygen time" value={`${keys.aux?.time_ms} ms`} mono={false} color="text-amber-300" />
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Sign / Verify / Tamper Tab ────────────────────────────────────────────────

function SignVerifyTab({ keys }) {
  const [msg, setMsg]           = useState('Hello, RSA Signatures!')
  const [mode, setMode]         = useState('hash')
  const [signData, setSignData] = useState(null)
  const [verData,  setVerData]  = useState(null)
  const [tampResult, setTampResult] = useState(null)
  const [signLoading, setSignLoading] = useState(false)
  const [verLoading,  setVerLoading]  = useState(false)
  const [tampLoading, setTampLoading] = useState(false)
  const [error, setError] = useState('')

  const doSign = async () => {
    if (!keys) return
    setSignLoading(true); setError(''); setVerData(null); setTampResult(null); setSignData(null)
    try {
      const r = await pa15api.post('/api/pa15/sign', {
        N: keys.sk.N, d: keys.sk.d, message: msg, mode
      })
      setSignData(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Sign failed') }
    finally { setSignLoading(false) }
  }

  const doVerify = async () => {
    if (!keys || !signData) return
    setVerLoading(true); setError(''); setVerData(null)
    try {
      const r = await pa15api.post('/api/pa15/verify', {
        N: keys.pk.N, e: keys.pk.e, message: msg, sigma: signData.sigma, mode
      })
      setVerData(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Verify failed') }
    finally { setVerLoading(false) }
  }

  const doTamper = async () => {
    if (!keys || !signData) return
    setTampLoading(true); setError('')
    try {
      const r = await pa15api.post('/api/pa15/tamper-demo', {
        N: keys.pk.N, e: keys.pk.e, message: msg, sigma: signData.sigma
      })
      setTampResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Tamper failed') }
    finally { setTampLoading(false) }
  }

  const Step = ({ num, label, value, color = 'purple', note }) => (
    <div className={cx('rounded-xl border p-3 space-y-1.5', `border-${color}-500/30 bg-${color}-500/5`)}>
      <div className="flex items-center gap-2">
        <span className={cx(
          'rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shrink-0',
          `bg-${color}-500/30 text-${color}-200`
        )}>{num}</span>
        <p className={cx('text-[10px] font-black uppercase tracking-widest', `text-${color}-300`)}>{label}</p>
      </div>
      <p className="font-mono text-[11px] text-white break-all leading-relaxed">{value}</p>
      {note && <p className="text-[10px] text-(--text)/40 italic">{note}</p>}
    </div>
  )

  const StepArrow = ({ label }) => (
    <div className="flex flex-col items-center gap-0.5 py-1">
      <span className="text-[9px] font-black uppercase tracking-widest text-(--text)/30">{label}</span>
      <span className="text-purple-400 text-lg leading-none">↓</span>
    </div>
  )

  return (
    <div className="space-y-4">
      <Card title="🔏 Sign & Verify — with Intermediate Values">
        <div className="space-y-3">
          {!keys && <p className="text-xs text-amber-400 italic">Generate keys first (🔑 tab)</p>}

          <div className="flex gap-2">
            {[['hash', '🔒 Hash-then-Sign (Secure)'], ['raw', '⚠ Raw RSA (Insecure)']].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setSignData(null); setVerData(null); setTampResult(null) }}
                className={cx(
                  'rounded-lg border px-3 py-1.5 text-xs font-black transition-all',
                  mode === m
                    ? m === 'hash'
                      ? 'border-emerald-500/60 bg-emerald-500/20 text-white'
                      : 'border-rose-500/60 bg-rose-500/20 text-white'
                    : 'border-(--border) bg-(--code-bg) text-(--text)/60 hover:text-white'
                )}>{label}</button>
            ))}
          </div>

          {mode === 'raw' && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
              ⚠ <strong>Raw RSA is insecure</strong> — no hashing means multiplicative forgery is possible. See the <em>Forgery Attack</em> tab.
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Message</label>
            <input value={msg} onChange={e => setMsg(e.target.value)}
              className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 text-sm text-white font-mono outline-none focus:border-purple-500/60 transition-all" />
          </div>

          <div className="flex gap-3 flex-wrap">
            <Btn onClick={doSign} disabled={signLoading || !keys} id="pa15-sign-btn">
              {signLoading ? <><Spinner />Signing…</> : '✍ Sign'}
            </Btn>
            <Btn onClick={doVerify} disabled={verLoading || !signData || !keys} variant="secondary" id="pa15-verify-btn">
              {verLoading ? <><Spinner />Verifying…</> : '✓ Verify'}
            </Btn>
            <Btn onClick={doTamper} disabled={tampLoading || !signData || !keys} variant="secondary" id="pa15-tamper-btn">
              {tampLoading ? <><Spinner />Tampering…</> : '🔀 Tamper Message'}
            </Btn>
          </div>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {/* ── SIGNING pipeline */}
      {signData && (
        <Card title={`✍ Signing Pipeline — ${mode === 'hash' ? 'Hash-then-Sign' : 'Raw RSA (no hash)'}`}>
          <div className="space-y-2">
            {mode === 'hash' ? (
              <>
                <Step num={1} label="Message m — UTF-8 bytes" color="blue"
                  value={signData.m_bytes_hex}
                  note={`«${msg}» → ${(signData.m_bytes_hex?.length ?? 0) / 2} bytes`} />
                <StepArrow label="SHA-256 →" />
                <Step num={2} label="SHA256(m)  [256-bit digest, before mod N]" color="amber"
                  value={signData.hash_raw_hex}
                  note="Full 256-bit SHA-256 output" />
                <StepArrow label="mod N →" />
                <Step num={3} label="h = SHA256(m) mod N  [value to be signed]" color="amber"
                  value={signData.hash_hex}
                  note="Reduced to [0, N) — this is the integer the private key operates on" />
                <StepArrow label="h^d mod N →" />
                <Step num={4} label="σ = h^d mod N  [final signature]" color="purple"
                  value={signData.sigma_hex}
                  note="Private exponent d applied via modular exponentiation" />
              </>
            ) : (
              <>
                <Step num={1} label="Message m — UTF-8 bytes" color="blue"
                  value={signData.m_bytes_hex} />
                <StepArrow label="int(m_bytes) mod N →" />
                <Step num={2} label="m_int = int(m_bytes) mod N  (no hashing)" color="amber"
                  value={signData.m_int_hex}
                  note="Direct integer — no hash so multiplicative forgery is possible" />
                <StepArrow label="m^d mod N →" />
                <Step num={3} label="σ = m_int^d mod N  [RAW signature — INSECURE]" color="rose"
                  value={signData.sigma_hex}
                  note="Multiplicatively homomorphic → existential forgery without private key" />
              </>
            )}
          </div>
        </Card>
      )}

      {/* ── VERIFICATION pipeline */}
      {verData && (
        <Card title="✓ Verification Pipeline — Intermediate Values">
          <div className="space-y-2">
            {mode === 'hash' ? (
              <Step num={1} label="Verifier — recompute SHA256(m) mod N from message" color="amber"
                value={verData.hash_of_msg}
                note="Verifier independently hashes the received message with the same SHA-256" />
            ) : (
              <Step num={1} label="Verifier — m_int = int(m_bytes) mod N  (message side)" color="amber"
                value={verData.m_int_hex} />
            )}
            <StepArrow label="(message path)" />

            <Step num={2} label="σ^e mod N  — signature opened with public key e" color="blue"
              value={verData.recovered}
              note="Public exponent e applied to the signature — recovers the signed value" />
            <StepArrow label="equality check →" />

            <div className={cx(
              'rounded-xl border-2 p-4 space-y-3',
              verData.match ? 'border-emerald-500/50 bg-emerald-500/8' : 'border-rose-500/50 bg-rose-500/8'
            )}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-2xl">{verData.match ? '✅' : '❌'}</span>
                <span className="font-black text-sm">
                  {verData.match ? 'MATCH — Signature Valid' : 'MISMATCH — Signature Invalid'}
                </span>
                <Badge
                  label={verData.match
                    ? (mode === 'hash' ? 'SHA256(m) == σ^e' : 'm_int == σ^e')
                    : 'Mismatch'}
                  color={verData.match ? 'green' : 'red'}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="rounded-lg border border-(--border) bg-(--code-bg) p-3 space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-(--text)/40">
                    {mode === 'hash' ? 'SHA256(m) mod N  [from message]' : 'm_int mod N  [from message]'}
                  </p>
                  <p className="font-mono text-[11px] break-all text-amber-300">
                    {mode === 'hash' ? verData.hash_of_msg : verData.m_int_hex}
                  </p>
                </div>
                <div className="rounded-lg border border-(--border) bg-(--code-bg) p-3 space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-(--text)/40">
                    σ^e mod N  [from signature]
                  </p>
                  <p className={cx('font-mono text-[11px] break-all',
                    verData.match ? 'text-emerald-300' : 'text-rose-300'
                  )}>
                    {verData.recovered}
                  </p>
                </div>
              </div>

              <p className="text-xs text-(--text)/60">
                {verData.match
                  ? mode === 'hash'
                    ? 'σ^e mod N equals SHA256(m) mod N — the signature is authentic and unmodified.'
                    : 'σ^e mod N equals m_int — raw signature is authentic (but still forgeable!).'
                  : 'σ^e mod N does NOT equal the expected hash — signature rejected.'}
              </p>
            </div>

            <div className="rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 text-[11px] space-y-1.5 mt-1">
              <p className="font-black uppercase tracking-widest text-(--text)/40 text-[10px] mb-2">All intermediate hex values</p>
              <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 font-mono text-[11px]">
                <span className="text-(--text)/50 whitespace-nowrap">m (bytes):</span>
                <span className="text-white break-all">{truncHex(verData.m_bytes_hex, 40)}</span>
                {mode === 'hash' && <>
                  <span className="text-(--text)/50 whitespace-nowrap">SHA256(m) raw:</span>
                  <span className="text-amber-300/70 break-all">{truncHex(verData.hash_raw_hex, 40)}</span>
                  <span className="text-(--text)/50 whitespace-nowrap">SHA256(m) mod N:</span>
                  <span className="text-amber-300 break-all">{truncHex(verData.hash_of_msg, 40)}</span>
                </>}
                {mode === 'raw' && <>
                  <span className="text-(--text)/50 whitespace-nowrap">m_int mod N:</span>
                  <span className="text-amber-300 break-all">{truncHex(verData.m_int_hex, 40)}</span>
                </>}
                <span className="text-(--text)/50 whitespace-nowrap">σ^e mod N:</span>
                <span className={cx('break-all', verData.match ? 'text-emerald-300' : 'text-rose-300')}>
                  {truncHex(verData.recovered, 40)}
                </span>
                <span className="text-(--text)/50 whitespace-nowrap">Match:</span>
                <span className={cx('font-black', verData.match ? 'text-emerald-400' : 'text-rose-400')}>
                  {String(verData.match)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Tamper result */}
      {tampResult && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: 'Original Message', msg: tampResult.original_message, valid: tampResult.original_valid },
              { label: 'Tampered Message (1 bit flipped)', msg: tampResult.tampered_message, valid: tampResult.tampered_valid },
            ].map(({ label, msg: m, valid }) => (
              <div key={label} className={cx(
                'rounded-xl border-2 p-3 space-y-2',
                valid ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'
              )}>
                <p className="text-[11px] font-black uppercase tracking-widest text-(--text)/60">{label}</p>
                <p className="font-mono text-sm text-white break-all">&ldquo;{m}&rdquo;</p>
                <Badge label={valid ? '✓ Valid' : '✗ Invalid (tamper detected!)'} color={valid ? 'green' : 'red'} />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300">
            <strong>Integrity protection:</strong> Flipping even 1 bit completely changes SHA-256(m),
            so σ^e mod N no longer matches — tamper is immediately detected.
          </div>
        </div>
      )}
    </div>
  )
}

// ── Forgery Attack Tab ─────────────────────────────────────────────────────────

function ForgeryTab({ keys }) {
  const [m1, setM1] = useState('Alice')
  const [m2, setM2] = useState('Bob')
  const [step, setStep] = useState(0)  // 0=idle, 1=signed, 2=forged
  const [sig1, setSig1] = useState('')
  const [sig2, setSig2] = useState('')
  const [forgery, setForgery] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getOracleSigs = async () => {
    if (!keys) return
    setLoading(true); setError(''); setForgery(null)
    try {
      const [r1, r2] = await Promise.all([
        pa15api.post('/api/pa15/sign', { N: keys.sk.N, d: keys.sk.d, message: m1, mode: 'raw' }),
        pa15api.post('/api/pa15/sign', { N: keys.sk.N, d: keys.sk.d, message: m2, mode: 'raw' }),
      ])
      setSig1(r1.data.sigma)
      setSig2(r2.data.sigma)
      setStep(1)
    } catch (e) { setError(e?.response?.data?.detail || 'Sign failed') }
    finally { setLoading(false) }
  }

  const forge = async () => {
    if (!keys || !sig1 || !sig2) return
    setLoading(true); setError('')
    try {
      const r = await pa15api.post('/api/pa15/forgery-demo', {
        N: keys.pk.N, e: keys.pk.e,
        m1, m2, sig1, sig2,
      })
      setForgery(r.data)
      setStep(2)
    } catch (e) { setError(e?.response?.data?.detail || 'Forgery failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <Card title="🔓 Multiplicative Forgery on Raw RSA (No Hash)">
        <div className="space-y-3">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            Raw RSA is <strong className="text-white">multiplicatively homomorphic</strong>: if σ₁ = m₁^d mod N
            and σ₂ = m₂^d mod N, then (σ₁·σ₂) mod N = (m₁·m₂)^d mod N — a valid signature on
            m₁·m₂ <em>without the private key</em>. The hash-then-sign scheme blocks this because
            SHA-256 is <strong className="text-white">not multiplicative</strong>.
          </p>

          {!keys && <p className="text-xs text-amber-400 italic">Generate keys first (🔑 tab)</p>}

          <div className="grid grid-cols-2 gap-3">
            {[['m1', m1, setM1, 'Message m₁'], ['m2', m2, setM2, 'Message m₂']].map(([k, v, s, lbl]) => (
              <div key={k} className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">{lbl}</label>
                <input value={v} onChange={e => { s(e.target.value); setStep(0); setSig1(''); setSig2(''); setForgery(null) }}
                  className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 text-sm text-white font-mono outline-none focus:border-rose-500/60 transition-all" />
              </div>
            ))}
          </div>

          <Btn onClick={getOracleSigs} disabled={loading || !keys} id="pa15-oracle-btn">
            {loading && step === 0 ? <><Spinner />Querying oracle…</> : '1️⃣ Query Signing Oracle (get σ₁, σ₂)'}
          </Btn>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {/* Step 1: Oracle gave us sigs */}
      {step >= 1 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-300">
            Oracle Signatures Obtained (Raw RSA — no hash)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <KV label={`σ₁ = "${m1}"^d mod N`} value={truncHex('0x' + BigInt(sig1 || 0).toString(16).toUpperCase(), 28)} color="text-amber-200" small />
            <KV label={`σ₂ = "${m2}"^d mod N`} value={truncHex('0x' + BigInt(sig2 || 0).toString(16).toUpperCase(), 28)} color="text-amber-200" small />
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Attacker has σ₁ and σ₂. Now computes σ_forged = (σ₁ · σ₂) mod N — <strong>no private key needed</strong>.
          </div>
          <Btn onClick={forge} disabled={loading || step >= 2} id="pa15-forge-btn">
            {loading && step === 1 ? <><Spinner />Forging…</> : '2️⃣ Forge Signature on m₁·m₂'}
          </Btn>
        </div>
      )}

      {/* Step 2: Forgery result */}
      {forgery && step >= 2 && (
        <div className="rounded-xl border-2 border-rose-500/60 bg-rose-500/8 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black">🚨 Forgery Succeeded!</span>
            <Badge label="No private key used" color="red" />
          </div>

          {/* Step flow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-center">
            {[
              { label: 'm₁ int', val: truncHex('0x' + BigInt(forgery.m1_int || 0).toString(16), 16), color: 'blue' },
              { label: '×  m₂ int', val: truncHex('0x' + BigInt(forgery.m2_int || 0).toString(16), 16), color: 'purple' },
              { label: '=  m₁·m₂ mod N', val: truncHex('0x' + BigInt(forgery.m_forged_int || 0).toString(16), 16), color: 'rose' },
            ].map(({ label, val, color }) => (
              <div key={label} className={cx(
                'rounded-xl border p-3',
                `border-${color}-500/30 bg-${color}-500/5`
              )}>
                <p className={cx('text-[10px] font-black uppercase tracking-widest mb-1', `text-${color}-300`)}>{label}</p>
                <p className="font-mono">{val}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <KV label="σ_forged = (σ₁·σ₂) mod N" value={truncHex(forgery.sig_forged_hex, 40)} color="text-rose-300" />
            <KV label="Verification: (σ_forged)^e mod N == m₁·m₂ mod N?" value={String(forgery.forgery_valid)} color={forgery.forgery_valid ? 'text-rose-300' : 'text-emerald-300'} mono={false} />
          </div>

          {forgery.forgery_valid && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-3">
              <p className="text-rose-200 font-black text-sm">Raw RSA is completely broken by existential forgery.</p>
              <p className="text-rose-200/70 text-xs mt-1">
                The hash-then-sign scheme blocks this because SHA-256(m₁·m₂) ≠ SHA-256(m₁)·SHA-256(m₂) mod N.
                The hash destroys the multiplicative structure.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── EUF-CMA Game Tab ───────────────────────────────────────────────────────────

function EUFCMATab() {
  const [bits, setBits]     = useState(256)
  const [queries, setQueries] = useState(20)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)
  const [error, setError]   = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      const r = await pa15api.post('/api/pa15/euf-cma-game', {
        bits, n_sign_queries: queries
      })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Game failed') }
    finally { clearInterval(timerRef.current); setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <Card title="🎮 EUF-CMA Security Game">
        <div className="space-y-4">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            The adversary gets access to a <strong className="text-white">signing oracle</strong> for up to
            {' '}<em>n</em> queries, then must produce a valid (m*, σ*) for any message NOT in the query set.
            We simulate three adversary strategies — all fail against hash-then-sign.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-white">Key bit-size</p>
              <div className="flex gap-2">
                {[128, 256, 512].map(b => (
                  <button key={b} onClick={() => setBits(b)}
                    className={cx(
                      'rounded-lg border px-3 py-1 text-xs font-black transition-all',
                      bits === b
                        ? 'border-purple-500/60 bg-purple-500/20 text-white'
                        : 'border-(--border) bg-(--code-bg) text-(--text)/60 hover:text-white'
                    )}>{b}-bit</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-white">
                Sign queries: <span className="text-purple-300">{queries}</span>
              </p>
              <input type="range" min={5} max={50} step={5} value={queries}
                onChange={e => setQueries(Number(e.target.value))}
                className="w-full accent-purple-500" />
            </div>
          </div>
          <Btn onClick={run} disabled={loading} id="pa15-euf-cma-btn">
            {loading ? `Running game… (${elapsed}s)` : '🎮 Run EUF-CMA Game'}
          </Btn>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {result && (
        <div className="space-y-3">
          {/* Sample of signed messages */}
          <Card title="📋 Oracle Query Log (first 10)">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-(--border)">
                    {['Message', 'σ = SHA256(m)^d mod N'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-black uppercase tracking-wider text-(--text)/50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border)/40">
                  {result.signed_sample?.map((row, i) => (
                    <tr key={i} className="hover:bg-(--code-bg)/50 transition-colors">
                      <td className="px-3 py-2 font-mono text-white">{row.message}</td>
                      <td className="px-3 py-2 font-mono text-(--text)/60">{truncHex(row.sigma_hex, 32)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-(--text)/40 italic mt-2">
              {result.n_sign_queries} messages signed total. Adversary now attempts to forge…
            </p>
          </Card>

          {/* Adversary attempts */}
          <div className="space-y-3">
            {result.attempts?.map((attempt, i) => {
              const failed = !attempt.valid && attempt.valid_hash_scheme === false || attempt.valid === false
              const rawBroken = attempt.valid_raw_scheme === true

              return (
                <div key={i} className={cx(
                  'rounded-xl border-2 p-4 space-y-2',
                  rawBroken
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : 'border-emerald-500/30 bg-emerald-500/5'
                )}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-black text-white">
                      Strategy {i + 1}: {attempt.strategy}
                    </span>
                    {attempt.valid === false && (
                      <Badge label="✓ Hash-then-Sign: SECURE" color="green" />
                    )}
                    {rawBroken && (
                      <Badge label="⚠ Raw RSA: BROKEN" color="red" />
                    )}
                  </div>
                  <p className="text-[11px] text-(--text)/60 leading-relaxed">{attempt.explanation}</p>
                  {attempt.valid !== undefined && (
                    <p className={cx(
                      'text-xs font-black font-mono',
                      attempt.valid ? 'text-rose-300' : 'text-emerald-300'
                    )}>
                      Forgery valid (hash scheme): {String(attempt.valid)}
                    </p>
                  )}
                  {attempt.valid_hash_scheme !== undefined && (
                    <p className="text-xs font-mono text-emerald-300">
                      Forgery valid (hash scheme): {String(attempt.valid_hash_scheme)} |{' '}
                      Forgery valid (raw scheme): <span className="text-rose-300">{String(attempt.valid_raw_scheme)}</span>
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Conclusion */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 px-4 py-3">
            <p className="text-purple-300 font-black text-sm">🔒 Conclusion</p>
            <p className="text-xs text-(--text)/70 mt-1 leading-relaxed">{result.conclusion}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Full Pipeline Tab ──────────────────────────────────────────────────────────

function PipelineTab() {
  const [bits, setBits] = useState(512)
  const [msg, setMsg]   = useState('Hello, RSA Signatures!')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      const r = await pa15api.post('/api/pa15/full-demo', { bits, message: msg })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Demo failed') }
    finally { clearInterval(timerRef.current); setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <Card title="🔄 Full Signature Pipeline">
        <div className="space-y-3">
          <p className="text-sm text-(--text)/70">
            One-shot: generate keys, sign, verify, tamper, and compare raw vs hash-then-sign —
            showing all intermediate values.
          </p>
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Message</label>
              <input value={msg} onChange={e => setMsg(e.target.value)}
                className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 text-sm text-white font-mono outline-none focus:border-purple-500/60 transition-all" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Bits</p>
              <div className="flex gap-2">
                {[128, 256, 512].map(b => (
                  <button key={b} onClick={() => setBits(b)}
                    className={cx(
                      'rounded-lg border px-2 py-1 text-xs font-black transition-all',
                      bits === b ? 'border-purple-500/60 bg-purple-500/20 text-white'
                                 : 'border-(--border) bg-(--code-bg) text-(--text)/60 hover:text-white'
                    )}>{b}</button>
                ))}
              </div>
            </div>
            <Btn onClick={run} disabled={loading} id="pa15-pipeline-btn">
              {loading ? `Running… (${elapsed}s)` : '▶ Run Full Pipeline'}
            </Btn>
          </div>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {result && (
        <div className="space-y-3">
          {/* Sign flow */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-purple-300">
              🔏 Hash-then-Sign Flow
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-(--border) bg-(--code-bg) p-3 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">1. Message</p>
                <p className="font-mono text-xs text-white break-all">&ldquo;{result.message}&rdquo;</p>
                <p className="text-[10px] text-(--text)/40">{result.m_bytes_hex}</p>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">2. SHA256(m) mod N</p>
                <p className="font-mono text-xs text-amber-200 break-all">{truncHex(result.hash_hex, 32)}</p>
              </div>
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-300">3. σ = hash^d mod N</p>
                <p className="font-mono text-xs text-purple-200 break-all">{truncHex(result.sigma_hex, 32)}</p>
              </div>
            </div>

            {/* Verification */}
            <div className={cx(
              'rounded-xl border-2 p-3 flex items-center gap-4',
              result.verified ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'
            )}>
              <span className="text-3xl">{result.verified ? '✅' : '❌'}</span>
              <div>
                <p className="font-black text-sm">{result.verified ? 'Verification Passed' : 'Verification Failed'}</p>
                <p className="text-xs text-(--text)/60">σ^e mod N == SHA256(m) mod N: <strong>{String(result.verified)}</strong></p>
              </div>
            </div>
          </div>

          {/* Tamper */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-rose-300">🔀 Tamper Detection</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Original', msg: result.message, valid: result.verified },
                { label: 'Tampered (1 bit flipped)', msg: result.tampered_message, valid: result.tampered_valid },
              ].map(({ label, msg: m, valid }) => (
                <div key={label} className={cx(
                  'rounded-xl border-2 p-3',
                  valid ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/8'
                )}>
                  <p className="text-[10px] uppercase tracking-widest text-(--text)/50 mb-1">{label}</p>
                  <p className="font-mono text-xs text-white break-all">&ldquo;{m}&rdquo;</p>
                  <Badge label={valid ? '✓ Valid' : '✗ Tamper detected'} color={valid ? 'green' : 'red'} />
                </div>
              ))}
            </div>
          </div>

          {/* Raw vs Hash comparison */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-300">
              ⚠ Raw RSA vs Hash-then-Sign
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Hash-then-Sign</p>
                <KV label="σ_hash = SHA256(m)^d mod N" value={truncHex(result.sigma_hex, 28)} small />
                <KV label="Verified" value="✓ True" mono={false} color="text-emerald-300" small />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-300">Raw RSA (no hash)</p>
                <KV label="σ_raw = m^d mod N" value={truncHex(result.raw?.sigma_raw_hex, 28)} small />
                <KV label="Verified" value="✓ True (but forgeable!)" mono={false} color="text-rose-300" small />
              </div>
            </div>
            <p className="text-xs text-(--text)/60">
              Both verify, but raw RSA is forgeable via σ₁·σ₂ (multiplicative attack). See the <em>Forgery Attack</em> tab.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'keygen',   label: '🔑 Keys' },
  { key: 'signver',  label: '🔏 Sign / Verify' },
  { key: 'forgery',  label: '🔓 Forgery Attack' },
  { key: 'eufcma',   label: '🎮 EUF-CMA Game' },
  { key: 'pipeline', label: '🔄 Full Pipeline' },
]

export default function SignatureDemo() {
  const [tab, setTab]         = useState('keygen')
  const [keys, setKeys]       = useState(null)
  const [bits, setBits]       = useState(512)
  const [keyLoading, setKeyLoading] = useState(false)

  const generateKeys = useCallback(async () => {
    setKeyLoading(true)
    try {
      const r = await pa15api.post('/api/pa15/keygen', { bits })
      setKeys(r.data)
    } catch (e) { console.error(e) }
    finally { setKeyLoading(false) }
  }, [bits])

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer — PA#15: Digital Signatures" />

        {/* Theory banner */}
        <div className="mb-4 rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 space-y-1">
          <p className="text-[13px] font-black uppercase tracking-widest text-white">Digital Signature Scheme</p>
          <p className="text-sm text-(--text)/70 leading-relaxed">
            A signature scheme (Gen, Sign, Vrfy) satisfies{' '}
            <span className="text-white font-semibold">EUF-CMA security</span>: no PPT adversary with
            access to a signing oracle can forge (m*, σ*) for any m* not previously signed.
            RSA hash-then-sign: <code className="text-purple-300">σ = SHA256(m)^d mod N</code>,
            verify: <code className="text-emerald-300">σ^e mod N == SHA256(m)</code>.
            Raw RSA (no hash) is broken by{' '}
            <span className="text-rose-300 font-semibold">multiplicative existential forgery</span>.
          </p>
        </div>

        <div className="mb-4">
          <AlgoOverview />
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
            {tab === 'keygen' && (
              <KeyPanel keys={keys} loading={keyLoading} onGenerate={generateKeys} bits={bits} setBits={setBits} />
            )}
            {tab === 'signver'  && <SignVerifyTab keys={keys} />}
            {tab === 'forgery'  && <ForgeryTab keys={keys} />}
            {tab === 'eufcma'   && <EUFCMATab />}
            {tab === 'pipeline' && <PipelineTab />}
          </div>
        </div>
      </section>
    </main>
  )
}
