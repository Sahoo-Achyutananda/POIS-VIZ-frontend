import { useState, useCallback, useRef } from 'react'
import axios from 'axios'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'
import { Loader2, Key, Lock, Unlock, Shield, AlertTriangle, CheckCircle2, XCircle, Check, X, Zap, Siren } from 'lucide-react'

const pa12api = axios.create({ baseURL: api.defaults.baseURL, timeout: 120_000 })

function cx(...c) { return c.filter(Boolean).join(' ') }

// Truncate a hex string: 0x1234...abcd
function truncHex(h, maxChars = 32) {
  if (!h) return '—'
  const s = String(h)
  if (s.length <= maxChars + 2) return s
  return s.slice(0, Math.floor(maxChars / 2) + 2) + '…' + s.slice(-Math.floor(maxChars / 2))
}

function hexStr(n) {
  if (!n) return '—'
  try { return '0x' + BigInt(n).toString(16).toUpperCase() } catch { return String(n) }
}

// ── Small UI primitives ───────────────────────────────────────────────────────

function Card({ title, children, className = '' }) {
  return (
    <div className={cx('rounded-xl border border-(--border) overflow-hidden', className)}>
      {title && (
        <div className="border-b border-(--border) bg-(--code-bg) px-4 py-2.5">
          <h3 className="text-sm font-black uppercase tracking-widest text-white">{title}</h3>
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
      <span className={cx(small ? 'text-[11px]' : 'text-xs', mono ? 'font-mono' : '', 'break-all leading-relaxed', color)}>{value || '—'}</span>
    </div>
  )
}

function Badge({ label, color = 'purple' }) {
  const cls = {
    green:  'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    red:    'bg-rose-500/20 border-rose-500/40 text-rose-300',
    amber:  'bg-amber-500/20 border-amber-500/40 text-amber-300',
    purple: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
    blue:   'bg-blue-500/20 border-blue-500/40 text-blue-300',
  }
  return (
    <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider', cls[color] ?? cls.purple)}>
      {label}
    </span>
  )
}

function Spinner() {
  return <Loader2 className="inline-block w-3 h-3 animate-spin mr-1" />
}

// ── PS Bytes Visualiser ───────────────────────────────────────────────────────

function PSBytesPanel({ psHex, label, color = '#a78bfa' }) {
  if (!psHex) return null
  const bytes = psHex.match(/.{2}/g) || []
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">{label}</p>
      <div className="flex flex-wrap gap-1">
        {bytes.map((b, i) => (
          <span
            key={i}
            className="rounded px-1.5 py-0.5 font-mono text-[11px] font-black"
            style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}
          >
            {b.toUpperCase()}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-(--text)/40">{bytes.length} random nonzero bytes</p>
    </div>
  )
}

// ── Key Panel ─────────────────────────────────────────────────────────────────

function KeyPanel({ keys, loading, onGenerate, bits, setBits }) {
  const SIZES = [64, 128, 256, 512, 1024]
  return (
    <Card title="RSA Key Generation">
      <div className="space-y-3">
        <p className="text-sm text-(--text)/70">
          Generates two <code className="text-white">bits/2</code>-bit primes using{' '}
          <span className="text-purple-300 font-semibold">PA#13 Miller-Rabin</span>, computes{' '}
          <code className="text-white">N = p·q</code>, φ(N) = (p-1)(q-1),{' '}
          <code className="text-white">e = 65537</code>,{' '}
          <code className="text-white">d = e⁻¹ mod φ(N)</code> via the extended Euclidean algorithm.
        </p>

        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-widest text-white">Bit size of N</p>
          <div className="flex gap-2 flex-wrap">
            {SIZES.map(b => (
              <button key={b} type="button" onClick={() => setBits(b)}
                className={cx(
                  'rounded-lg border px-3 py-1 text-xs font-black transition-all hover:-translate-y-0.5',
                  bits === b
                    ? 'border-purple-500/60 bg-purple-500/20 text-white'
                    : 'border-(--border) bg-(--code-bg) text-(--text) hover:border-purple-500/40'
                )}>{b}-bit</button>
            ))}
          </div>
        </div>

        <Btn onClick={onGenerate} disabled={loading} id="pa12-keygen-btn">
          {loading ? <><Spinner />Generating…</> : `Generate ${bits}-bit RSA Keys`}
        </Btn>

        {keys && (
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
                <p className="inline-flex items-center gap-1 text-[11px] font-black text-blue-300 uppercase tracking-widest"><Unlock className="w-4 h-4" /> Public Key (N, e)</p>
                <KV label="N (modulus)" value={truncHex(hexStr(keys.pk?.N))} small />
                <KV label="e (public exponent)" value={hexStr(keys.pk?.e)} />
                <KV label="Bit length" value={`${keys.aux?.bits} bits`} mono={false} />
              </div>
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 space-y-2">
                <p className="inline-flex items-center gap-1 text-[11px] font-black text-rose-300 uppercase tracking-widest"><Lock className="w-4 h-4" /> Private Key (N, d)</p>
                <KV label="d (private exponent)" value={truncHex(hexStr(keys.sk?.d))} small />
                <KV label="p (prime 1)" value={truncHex(hexStr(keys.aux?.p))} small />
                <KV label="q (prime 2)" value={truncHex(hexStr(keys.aux?.q))} small />
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              <KV label="dp = d mod (p-1)" value={truncHex(hexStr(keys.aux?.dp))} small />
              <KV label="dq = d mod (q-1)" value={truncHex(hexStr(keys.aux?.dq))} small />
              <KV label="q_inv = q⁻¹ mod p" value={truncHex(hexStr(keys.aux?.q_inv))} small />
              <KV label="Keygen time" value={`${keys.aux?.time_ms} ms`} mono={false} color="text-amber-300" />
            </div>
            <p className="text-[11px] text-(--text)/50 italic">
              CRT components (dp, dq, q_inv) are exported for PA#14 fast decryption.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Enc / Dec Panel ───────────────────────────────────────────────────────────

function EncDecPanel({ keys }) {
  const [mode, setMode] = useState('pkcs15')
  const [msg, setMsg]   = useState('Hello RSA!')
  const [cipher, setCipher]     = useState('')
  const [decResult, setDecResult] = useState('')
  const [encLoading, setEncLoading] = useState(false)
  const [decLoading, setDecLoading] = useState(false)
  const [error, setError] = useState('')

  const encrypt = async () => {
    if (!keys) return
    setEncLoading(true); setError(''); setDecResult('')
    try {
      const r = await pa12api.post('/api/pa12/encrypt', {
        N: keys.pk.N, e: keys.pk.e, message: msg, mode
      })
      setCipher(r.data.ciphertext)
    } catch (e) { setError(e?.response?.data?.detail || 'Encrypt failed') }
    finally { setEncLoading(false) }
  }

  const decrypt = async () => {
    if (!keys || !cipher) return
    setDecLoading(true); setError('')
    try {
      const r = await pa12api.post('/api/pa12/decrypt', {
        N: keys.sk.N, d: keys.sk.d, ciphertext: cipher, mode
      })
      setDecResult(r.data.plaintext)
    } catch (e) { setError(e?.response?.data?.detail || 'Decrypt failed') }
    finally { setDecLoading(false) }
  }

  return (
    <Card title="Encrypt / Decrypt">
      <div className="space-y-3">
        {!keys && <p className="text-xs text-amber-400 italic">Generate keys first (Key Generation tab)</p>}

        {/* Mode toggle */}
        <div className="flex gap-2">
          {['textbook', 'pkcs15'].map(m => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={cx(
                'rounded-lg border px-3 py-1.5 text-xs font-black transition-all',
                mode === m
                  ? 'border-purple-500/60 bg-purple-500/20 text-white'
                  : 'border-(--border) bg-(--code-bg) text-(--text)/60 hover:text-white'
              )}>
              {m === 'textbook' ? 'Textbook RSA' : <><Shield className="w-4 h-4 inline-block mr-1" />PKCS#1 v1.5</>}
            </button>
          ))}
        </div>
        {mode === 'textbook' && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
            <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> <strong>Textbook RSA is deterministic</strong> — the same plaintext always produces the same ciphertext.
            This breaks CPA security. See the Determinism tab for the full attack demo.</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Message</label>
          <input value={msg} onChange={e => setMsg(e.target.value)}
            className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 text-sm text-white font-mono outline-none focus:border-purple-500/60 transition-all" />
        </div>

        <div className="flex gap-3 flex-wrap">
          <Btn onClick={encrypt} disabled={encLoading || !keys} id="pa12-enc-btn">
            {encLoading ? <><Spinner />Encrypting…</> : 'Encrypt'}
          </Btn>
          <Btn onClick={decrypt} disabled={decLoading || !cipher || !keys} variant="secondary" id="pa12-dec-btn">
            {decLoading ? <><Spinner />Decrypting…</> : 'Decrypt'}
          </Btn>
        </div>
        {error && <p className="text-xs text-rose-400 font-black">{error}</p>}

        {cipher && (
          <div className="space-y-2">
            <KV label="Ciphertext C" value={truncHex(hexStr(cipher), 48)} />
            {decResult && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300/60">Decrypted</p>
                <p className="font-mono text-sm text-emerald-300 mt-0.5">{decResult}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Determinism Attack Tab ────────────────────────────────────────────────────

function DeterminismTab({ keys }) {
  const [msg, setMsg]   = useState('yes')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!keys) return
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await pa12api.post('/api/pa12/determinism-demo', {
        N: keys.pk.N, e: keys.pk.e, d: keys.sk.d, message: msg
      })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Demo failed') }
    finally { setLoading(false) }
  }

  const tb  = result?.textbook
  const pk  = result?.pkcs15

  return (
    <div className="space-y-4">
      <Card title="Textbook RSA Determinism Attack">
        <p className="text-sm text-(--text)/70 leading-relaxed mb-3">
          Textbook RSA is <strong className="text-white">deterministic</strong>: C = m<sup>e</sup> mod N produces the same
          C every time for the same m. An eavesdropper who captures two or more encryptions of
          the same short message (e.g. a vote: "yes" or "no") can trivially detect equality — 
          breaking CPA security. PKCS#1 v1.5 fixes this by prepending random PS bytes to m
          before encryption.
        </p>

        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Message (simulating a vote)</label>
            <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="yes"
              className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 text-sm text-white font-mono outline-none focus:border-purple-500/60 transition-all" />
          </div>
          <Btn onClick={run} disabled={loading || !keys} id="pa12-det-btn">
            {loading ? <><Spinner />Running…</> : <><Zap className="w-3.5 h-3.5 inline-block mr-1" />Encrypt Twice</>}
          </Btn>
        </div>
        {!keys && <p className="text-xs text-amber-400 italic mt-2">Generate keys first (Key Generation tab)</p>}
        {error && <p className="text-xs text-rose-400 font-black mt-2">{error}</p>}
      </Card>

      {result && (
        <>
          {/* Textbook side-by-side */}
          <div className={cx(
            'rounded-xl border-2 p-4 space-y-3 transition-all',
            tb?.identical ? 'border-rose-500/50 bg-rose-500/8' : 'border-emerald-500/50 bg-emerald-500/8'
          )}>
            <div className="flex items-center gap-3">
              <span className="text-lg font-black">Textbook RSA</span>
              {tb?.identical
                ? <Badge label="IDENTICAL — plaintext leaked!" color="red" />
                : <Badge label="Different" color="green" />}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <KV label="C₁ = Enc(m) first call" value={truncHex(tb?.c1_hex, 48)} />
              <KV label="C₂ = Enc(m) second call" value={truncHex(tb?.c2_hex, 48)} />
            </div>
            {tb?.identical && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center">
                <p className="inline-flex items-center gap-1 text-rose-300 font-black text-sm"><Siren className="w-3.5 h-3.5" /> C₁ = C₂ — An attacker observing both ciphertexts knows they encrypt the same plaintext!</p>
                <p className="text-rose-300/70 text-xs mt-1">
                  For a vote ("yes"/"no"), this means the encrypted ballots are publicly distinguishable — breaking ballot secrecy.
                </p>
              </div>
            )}
          </div>

          {/* PKCS side-by-side */}
          <div className={cx(
            'rounded-xl border-2 p-4 space-y-3 transition-all',
            pk?.identical ? 'border-rose-500/50 bg-rose-500/8' : 'border-emerald-500/50 bg-emerald-500/8'
          )}>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-lg font-black"><Shield className="w-4 h-4" /> PKCS#1 v1.5 RSA</span>
              {!pk?.identical
                ? <Badge label="Different — randomised!" color="green" />
                : <Badge label="IDENTICAL (bug!)" color="red" />}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <KV label="C₁ = Enc(m) with PS₁" value={truncHex(pk?.c1_hex, 48)} />
              <KV label="C₂ = Enc(m) with PS₂" value={truncHex(pk?.c2_hex, 48)} />
            </div>
            <div className="space-y-2 mt-1">
              <p className="text-[11px] font-black uppercase tracking-widest text-(--text)/50">Random PS bytes (differ each time):</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PSBytesPanel psHex={pk?.ps1_hex} label={`PS₁ (${pk?.ps1_len} bytes)`} color="#34d399" />
                <PSBytesPanel psHex={pk?.ps2_hex} label={`PS₂ (${pk?.ps2_len} bytes)`} color="#60a5fa" />
              </div>
            </div>
            {!pk?.identical && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center">
                <p className="inline-flex items-center gap-1 text-emerald-300 font-black text-sm"><CheckCircle2 className="w-3.5 h-3.5" /> C₁ ≠ C₂ — Random PS bytes make each encryption unique, achieving CPA security.</p>
                <p className="text-emerald-300/70 text-xs mt-1">
                  EM = 0x00 | 0x02 | PS (random, ≥8 bytes) | 0x00 | m — the random PS hides the plaintext.
                </p>
              </div>
            )}
          </div>

          {/* PKCS format explainer */}
          <Card title="PKCS#1 v1.5 Padded Message Format">
            <div className="flex flex-wrap gap-2 font-mono text-xs font-black items-center">
              {[
                { b: '00', label: 'leading 0', c: '#94a3b8' },
                { b: '02', label: 'type', c: '#f472b6' },
                { b: pk?.ps1_hex?.slice(0,6)+'…', label: `PS (${pk?.ps1_len} rand bytes)`, c: '#34d399' },
                { b: '00', label: 'separator', c: '#94a3b8' },
                { b: result?.message_hex, label: 'message', c: '#818cf8' },
              ].map(({ b, label, c }, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <span
                    className="rounded px-2 py-1"
                    style={{ background: c + '22', border: `1px solid ${c}55`, color: c }}
                  >{b}</span>
                  <span className="text-[9px] text-(--text)/40 uppercase tracking-widest">{label}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Bleichenbacher Tab ────────────────────────────────────────────────────────

function BleichenbacherTab() {
  const [bits, setBits] = useState(256)
  const [msg, setMsg]   = useState('vote:yes')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  const run = async () => {
    setLoading(true); setError(''); setResult(null); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      const r = await pa12api.post('/api/pa12/bleichenbacher-demo', { bits, message: msg })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Demo failed') }
    finally {
      clearInterval(timerRef.current)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Bleichenbacher PKCS#1 v1.5 Padding Oracle Attack (Simplified)">
        <div className="space-y-3">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            In 1998, Daniel Bleichenbacher showed that if an attacker can query a <strong className="text-white">padding
            oracle</strong> (a service that reveals whether a decrypted ciphertext is a valid PKCS#1 v1.5 message),
            they can decrypt any RSA ciphertext with ≈2<sup>20</sup> adaptive queries. This is an
            <span className="text-rose-300 font-semibold"> IND-CCA2 attack</span>.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300 space-y-1">
            <p className="font-black">Key mathematical insight: RSA is multiplicatively homomorphic.</p>
            <p className="text-(--text)/60">
              C' = C · s<sup>e</sup> mod N decrypts to m' = m · s mod N. If the oracle says m' is a valid
              PKCS#1 message (0x00 0x02 prefix), then 2B ≤ m·s mod N ≤ 3B-1 where B = 2<sup>8(k-2)</sup>.
              Repeated queries with different s values narrow the range of m until it collapses to a single value.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">RSA bits (for speed)</label>
              <div className="flex gap-2">
                {[64, 128, 256, 512].map(b => (
                  <button key={b} type="button" onClick={() => setBits(b)}
                    className={cx(
                      'rounded-lg border px-2.5 py-1 text-xs font-black transition-all',
                      bits === b ? 'border-purple-500/60 bg-purple-500/20 text-white'
                                : 'border-(--border) bg-(--code-bg) text-(--text)/60 hover:text-white'
                    )}>{b}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Target message</label>
              <input value={msg} onChange={e => setMsg(e.target.value)}
                className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-1.5 text-sm text-white font-mono outline-none focus:border-purple-500/60 transition-all" />
            </div>
            <Btn onClick={run} disabled={loading} id="pa12-bb-btn">
              {loading ? `Running… (${elapsed}s)` : <><Unlock className="w-4 h-4 inline-block mr-1" />Run Oracle Demo</>}
            </Btn>
          </div>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Target ciphertext C', value: truncHex(result.c_hex, 24) },
              { label: 'B = 2^(8·(k-2))', value: truncHex(result.B_hex, 24) },
              { label: 'Oracle queries run', value: result.total_queries },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-(--border) bg-(--code-bg) p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">{label}</p>
                <p className="font-mono text-xs text-white mt-1 break-all">{String(value)}</p>
              </div>
            ))}
          </div>

          <Card title="Oracle Query Trace">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-(--border)">
                    {['s (multiplier)', 'c · s^e mod N → decrypts to m·s', 'Oracle says'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-black uppercase tracking-wider text-(--text)/50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border)/40">
                  {result.oracle_queries.map((q, i) => (
                    <tr key={i} className={cx(
                      'transition-colors',
                      q.valid ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-(--code-bg)/50'
                    )}>
                      <td className="px-3 py-2 font-mono text-white font-black">{q.s}</td>
                      <td className="px-3 py-2 text-(--text)/60 font-mono">{q.note}</td>
                      <td className="px-3 py-2">
                        {q.valid
                          ? <Badge label="✓ VALID PADDING" color="green" />
                          : <Badge label="✗ Invalid" color="red" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-(--text)/50 italic mt-3">{result.key_insight}</p>
          </Card>

          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3">
            <p className="text-rose-300 font-black text-sm">Lesson: PKCS#1 v1.5 is CPA-secure but NOT CCA-secure.</p>
            <p className="text-rose-300/70 text-xs mt-1">
              The modern replacement is OAEP (Optimal Asymmetric Encryption Padding), which is CCA2-secure
              in the random oracle model. PA#17 addresses full IND-CCA2 security via Sign-then-Encrypt.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ── Algorithm Overview Cards ──────────────────────────────────────────────────

function AlgorithmOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {[
        {
          icon: <Key className="w-4 h-4 inline-block mr-1" />, title: 'Key Generation',
          steps: [
            'p, q ← gen_prime(bits/2) via PA#13 MR',
            'N = p·q,  φ(N) = (p−1)(q−1)',
            'e = 65537 with gcd(e, φ) = 1',
            'd = e⁻¹ mod φ(N)  [Extended Euclidean]',
          ],
          color: 'border-blue-500/40 bg-blue-500/5',
        },
        {
          icon: '🔒', title: 'Textbook RSA',
          steps: [
            'Enc(pk, m): C = mᵉ mod N',
            'Dec(sk, C): M = Cᵈ mod N',
            'Correct by Euler: Cᵈ = m^(ed) = m^(1+kφ) = m',
            '⚠ Deterministic — NOT CPA-secure',
          ],
          color: 'border-rose-500/40 bg-rose-500/5',
        },
        {
          icon: '🛡', title: 'PKCS#1 v1.5',
          steps: [
            'Pad: EM = 0x00│0x02│PS│0x00│m',
            'PS ≥ 8 random nonzero bytes',
            'Enc: C = EM_int^e mod N',
            'Dec: M = C^d → strip/validate EM',
          ],
          color: 'border-emerald-500/40 bg-emerald-500/5',
        },
      ].map(({ icon, title, steps, color }) => (
        <div key={title} className={cx('rounded-xl border p-4 space-y-2', color)}>
          <p className="font-black text-white text-sm">{icon} {title}</p>
          <ul className="space-y-1">
            {steps.map((s, i) => (
              <li key={i} className="text-[11px] text-(--text)/70 font-mono leading-relaxed">
                <span className="text-(--text)/30 mr-1">{i+1}.</span>{s}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'keygen',      label: 'Key Generation' },
  { key: 'enc',         label: 'Encrypt / Decrypt' },
  { key: 'determinism', label: 'Determinism Attack' },
  { key: 'bleich',      label: 'Bleichenbacher Oracle' },
]

export default function RSADemo() {
  const [tab, setTab]     = useState('keygen')
  const [keys, setKeys]   = useState(null)
  const [bits, setBits]   = useState(512)
  const [keyLoading, setKeyLoading] = useState(false)

  const generateKeys = useCallback(async () => {
    setKeyLoading(true)
    try {
      const r = await pa12api.post('/api/pa12/keygen', { bits })
      setKeys(r.data)
    } catch (e) {
      console.error(e)
    } finally {
      setKeyLoading(false)
    }
  }, [bits])

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer — PA#12: Textbook RSA & PKCS#1 v1.5" />

        {/* Theory banner */}
        <div className="mb-4 rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 space-y-1">
          <p className="text-[13px] font-black uppercase tracking-widest text-white">RSA Security Basis</p>
          <p className="text-sm text-(--text)/70 leading-relaxed">
            RSA security rests on the <strong className="text-white">integer factoring assumption</strong>: given{' '}
            <span className="font-mono text-white">N = p·q</span> for large primes p, q, recovering p and q is
            computationally infeasible (best: Number Field Sieve, sub-exponential).
            Textbook RSA is <span className="text-rose-300 font-semibold">deterministic</span> (not CPA-secure).
            PKCS#1 v1.5 adds randomness but is <span className="text-amber-300 font-semibold">not CCA-secure</span> (Bleichenbacher 1998).
          </p>
        </div>

        <div className="mb-4">
          <AlgorithmOverview />
        </div>

        {/* Tab bar */}
        <div className="overflow-hidden rounded-xl border border-(--border)">
          <div className="border-b border-(--border) bg-(--code-bg) px-3 py-2">
            <div className="flex gap-1 flex-wrap">
              {TABS.map(t => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)}
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
              <KeyPanel
                keys={keys}
                loading={keyLoading}
                onGenerate={generateKeys}
                bits={bits}
                setBits={setBits}
              />
            )}

            {tab === 'enc' && <EncDecPanel keys={keys} />}

            {tab === 'determinism' && <DeterminismTab keys={keys} />}

            {tab === 'bleich' && <BleichenbacherTab />}

          </div>
        </div>
      </section>
    </main>
  )
}
