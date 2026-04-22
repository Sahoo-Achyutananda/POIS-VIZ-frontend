import { useState, useCallback, useRef } from 'react'
import axios from 'axios'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'

const pa17api = axios.create({ baseURL: api.defaults.baseURL, timeout: 180_000 })

function cx(...c) { return c.filter(Boolean).join(' ') }
function hexOf(n) {
  if (!n && n !== 0) return '—'
  try { return '0x' + BigInt(n).toString(16).toUpperCase() } catch { return String(n) }
}
function trunc(s, max = 24) {
  const str = String(s || '—')
  if (str.length <= max + 4) return str
  return str.slice(0, Math.floor(max / 2) + 2) + '…' + str.slice(-Math.floor(max / 2))
}

// ── UI Primitives ──────────────────────────────────────────────────────────────

function Card({ title, children, className = '', accent = '' }) {
  const borderCls = accent ? `border-${accent}-500/40` : 'border-(--border)'
  const headCls   = accent ? `border-${accent}-500/30 bg-${accent}-500/8` : 'border-(--border) bg-(--code-bg)'
  return (
    <div className={cx('rounded-xl border overflow-hidden', borderCls, className)}>
      {title && (
        <div className={cx('border-b px-4 py-2.5', headCls)}>
          <h3 className="text-xs font-black uppercase tracking-widest text-white">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

function KV({ label, value, color = 'text-white', small = false, mono = true }) {
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
  }
  return (
    <span className={cx(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider',
      cls[color] ?? cls.purple
    )}>{label}</span>
  )
}

function Spinner() { return <span className="inline-block animate-spin mr-1.5">⟳</span> }
function Step({ n, label, active, done, blocked }) {
  return (
    <div className={cx(
      'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black transition-all',
      done    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' :
      blocked ? 'border-rose-500/50    bg-rose-500/10    text-rose-300'    :
      active  ? 'border-purple-500/50  bg-purple-500/10  text-purple-300'  :
               'border-(--border)      bg-(--code-bg)    text-(--text)/40'
    )}>
      <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">
        {done ? '✓' : blocked ? '✗' : n}
      </span>
      {label}
    </div>
  )
}

// ── Construction Overview ──────────────────────────────────────────────────────

function ConstructionOverview() {
  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-4">
      <p className="font-black text-white text-sm">🔗 Signcryption = Encrypt-then-Sign (full dependency chain)</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-300">Signcrypt (Sender)</p>
          {[
            { n: 1, label: 'CE = ElGamal_enc(pk_enc, m)  [PA#16 → PA#11, PA#13]' },
            { n: 2, label: 'σ = SHA256(CE)^d mod N       [PA#15 → PA#12, PA#13]' },
            { n: 3, label: 'Output: (CE, σ)' },
          ].map(s => (
            <div key={s.n} className="flex gap-2 text-xs text-(--text)/70">
              <span className="text-emerald-400 font-black font-mono">{s.n}.</span>{s.label}
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-blue-300">Unsigncrypt (Receiver)</p>
          {[
            { n: 1, label: 'Verify(vk_sign, CE, σ)  — FIRST!', crucial: true },
            { n: 2, label: 'if invalid: return ⊥  (abort)', crucial: true },
            { n: 3, label: 'else: return ElGamal_dec(sk_enc, CE)' },
          ].map(s => (
            <div key={s.n} className={cx('flex gap-2 text-xs', s.crucial ? 'text-rose-300' : 'text-(--text)/70')}>
              <span className={cx('font-black font-mono', s.crucial ? 'text-rose-400' : 'text-blue-400')}>{s.n}.</span>
              {s.label}
            </div>
          ))}
        </div>
      </div>
      {/* Dependency chain */}
      <div className="rounded-lg border border-purple-500/20 bg-(--code-bg) px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-purple-300 mb-1">Dependency Chain</p>
        <p className="text-xs font-mono text-(--text)/70">
          PA#17 → PA#15 (Sign/Verify) → PA#12 (RSA) + PA#13 (mod_exp) + sha256_pure
          <br />
          PA#17 → PA#16 (ElGamal) → PA#11 (DH group) + PA#13 (mod_exp)
        </p>
      </div>
    </div>
  )
}

// ── Main Demo Tab ──────────────────────────────────────────────────────────────

function MainDemoTab() {
  const [groupBits, setGroupBits] = useState(32)
  const [rsaBits,   setRsaBits]   = useState(256)
  const [message,   setMessage]   = useState('1234')
  const [keys,      setKeys]      = useState(null)
  const [ct,        setCT]        = useState(null)
  const [decOk,     setDecOk]     = useState(null)
  const [decTam,    setDecTam]    = useState(null)
  const [tampered,  setTampered]  = useState(false)
  const [loading,   setLoading]   = useState('')
  const [error,     setError]     = useState('')

  const setup = async () => {
    setLoading('setup'); setError(''); setKeys(null); setCT(null); setDecOk(null); setDecTam(null); setTampered(false)
    try {
      const r = await pa17api.post('/api/pa17/setup', { group_bits: groupBits, rsa_bits: rsaBits })
      setKeys(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Setup failed') }
    finally { setLoading('') }
  }

  const doSigncrypt = async () => {
    if (!keys) return
    setLoading('enc'); setError(''); setCT(null); setDecOk(null); setDecTam(null); setTampered(false)
    try {
      const r = await pa17api.post('/api/pa17/signcrypt', {
        p: keys.group.p, q: keys.group.q, g: keys.group.g,
        h: keys.elgamal.pub_h,
        N: keys.rsa.pub_N, d: keys.rsa.priv_d,
        m: message,
      })
      setCT(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Signcrypt failed') }
    finally { setLoading('') }
  }

  const doDecrypt = async (tamper = false) => {
    if (!keys || !ct) return
    setLoading(tamper ? 'dec_tam' : 'dec_ok')
    setError('')
    try {
      // tamper: flip low bits of c2
      const c2use = tamper
        ? String(BigInt(ct.c2) ^ 0xFFn)
        : ct.c2

      const r = await pa17api.post('/api/pa17/unsigncrypt', {
        p: keys.group.p, x: keys.elgamal.priv_x,
        N: keys.rsa.pub_N, e: keys.rsa.pub_e,
        c1: ct.c1, c2: c2use, sigma: ct.sigma,
      })
      if (tamper) { setDecTam(r.data); setTampered(true) }
      else        { setDecOk(r.data) }
    } catch (e) { setError(e?.response?.data?.detail || 'Decrypt failed') }
    finally { setLoading('') }
  }

  const GRP_SIZES = [16, 24, 32, 48]
  const RSA_SIZES = [128, 256, 512]

  return (
    <div className="space-y-4">
      {/* Key gen */}
      <Card title="🔑 Key Setup">
        <div className="space-y-3">
          <p className="text-sm text-(--text)/70">
            Generate an <strong className="text-white">ElGamal key pair</strong> (for encryption) and
            an <strong className="text-white">RSA key pair</strong> (for signing). The sender uses
            pk_enc + sk_sign; the receiver uses sk_enc + vk_sign.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">ElGamal group bits</p>
              <div className="flex gap-2">
                {GRP_SIZES.map(b => (
                  <button key={b} onClick={() => setGroupBits(b)}
                    className={cx('rounded-lg border px-2.5 py-1 text-xs font-black transition-all',
                      groupBits === b ? 'border-blue-500/60 bg-blue-500/20 text-white'
                                      : 'border-(--border) bg-(--code-bg) text-(--text)/60 hover:text-white'
                    )}>{b}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">RSA (signing) bits</p>
              <div className="flex gap-2">
                {RSA_SIZES.map(b => (
                  <button key={b} onClick={() => setRsaBits(b)}
                    className={cx('rounded-lg border px-2.5 py-1 text-xs font-black transition-all',
                      rsaBits === b ? 'border-purple-500/60 bg-purple-500/20 text-white'
                                    : 'border-(--border) bg-(--code-bg) text-(--text)/60 hover:text-white'
                    )}>{b}</button>
                ))}
              </div>
            </div>
          </div>
          <Btn onClick={setup} disabled={!!loading} id="pa17-setup-btn">
            {loading === 'setup' ? <><Spinner />Generating keys…</> : '⚡ Generate Keys'}
          </Btn>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}

          {keys && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 space-y-1.5">
                <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">ElGamal PK h = g^x</p>
                <KV label="h" value={trunc(hexOf(keys.elgamal?.pub_h), 20)} small />
                <KV label="p" value={trunc(hexOf(keys.group?.p), 20)} small />
              </div>
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 space-y-1.5">
                <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest">ElGamal SK x (private)</p>
                <KV label="x" value={trunc(hexOf(keys.elgamal?.priv_x), 20)} small color="text-rose-200" />
              </div>
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 space-y-1.5">
                <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest">RSA Sign Keys</p>
                <KV label="N" value={trunc(hexOf(keys.rsa?.pub_N), 20)} small />
                <KV label="e" value={keys.rsa?.pub_e} small color="text-purple-200" />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Signcrypt */}
      <Card title="🔒 Signcrypt (Encrypt-then-Sign)">
        <div className="space-y-3">
          {!keys && <p className="text-xs text-amber-400 italic">Generate keys first ↑</p>}
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Plaintext m (integer)</label>
              <input value={message} onChange={e => setMessage(e.target.value)}
                className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500/60 transition-all" />
            </div>
            <Btn onClick={doSigncrypt} disabled={!!loading || !keys} id="pa17-enc-btn">
              {loading === 'enc' ? <><Spinner />Encrypting & Signing…</> : '🔒 Signcrypt'}
            </Btn>
          </div>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}

          {/* Progress steps */}
          <div className="flex gap-2 flex-wrap">
            <Step n="1" label="ElGamal Encrypt (PA#16)" done={!!ct} active={loading === 'enc'} />
            <Step n="2" label="RSA Sign CE (PA#15)" done={!!ct} active={loading === 'enc'} />
          </div>
        </div>
      </Card>

      {/* Ciphertext display */}
      {ct && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-black text-sm text-emerald-300">Ciphertext (CE, σ)</span>
            <Badge label={`enc: ${ct.enc_ms}ms`} color="green" />
            <Badge label={`sign: ${ct.sign_ms}ms`} color="purple" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KV label="c₁ = g^r mod p" value={trunc(hexOf(ct.c1), 24)} small color="text-emerald-200" />
            <KV label="c₂ = m·h^r mod p" value={trunc(hexOf(ct.c2), 24)} small color="text-emerald-200" />
            <KV label="σ = SHA256(CE)^d mod N" value={trunc(ct.sigma_hex, 24)} small color="text-purple-300" />
          </div>
          <p className="text-[10px] text-(--text)/40 italic font-mono">
            The signature binds the ciphertext — any tamper invalidates σ
          </p>

          {/* Decrypt buttons */}
          <div className="flex gap-3 flex-wrap">
            <Btn onClick={() => doDecrypt(false)} disabled={!!loading} id="pa17-dec-btn">
              {loading === 'dec_ok' ? <><Spinner />Decrypting…</> : '🔓 Decrypt (untampered)'}
            </Btn>
            <Btn onClick={() => doDecrypt(true)} disabled={!!loading} variant="secondary" id="pa17-tamper-btn">
              {loading === 'dec_tam' ? <><Spinner />Submitting tampered…</> : '🔀 Tamper CE + Submit to Oracle'}
            </Btn>
          </div>
        </div>
      )}

      {/* Decrypt results */}
      {(decOk || decTam) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {decOk && (
            <div className={cx(
              'rounded-xl border-2 p-4 space-y-2',
              decOk.sig_valid ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5'
            )}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl">{decOk.sig_valid ? '✅' : '❌'}</span>
                <span className="font-black text-sm">Untampered (CE, σ)</span>
                <Badge label={`sig: ${decOk.ver_ms}ms`} color={decOk.sig_valid ? 'green' : 'red'} />
              </div>
              <div className="flex gap-2 flex-col">
                <Step n="1" label="Verify signature" done={decOk.sig_valid} blocked={!decOk.sig_valid} />
                <Step n="2" label={`Decrypt → m = ${decOk.decrypted}`} done={decOk.sig_valid} blocked={!decOk.sig_valid} />
              </div>
              <KV label="Result" value={decOk.sig_valid ? `m = ${decOk.decrypted}` : '⊥ — decryption aborted'} color={decOk.sig_valid ? 'text-emerald-300' : 'text-rose-300'} />
            </div>
          )}

          {decTam && (
            <div className="rounded-xl border-2 border-rose-500/50 bg-rose-500/6 p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl">🚫</span>
                <span className="font-black text-sm">Tampered CE' (1 byte flipped)</span>
                <Badge label="Attack blocked!" color="red" />
              </div>
              <div className="flex gap-2 flex-col">
                <Step n="1" label="Verify signature on CE'" done={false} blocked={!decTam.sig_valid} active={false} />
                <Step n="2" label="Decryption skipped (σ invalid)" done={false} blocked={true} />
              </div>
              <KV label="Oracle response" value="⊥  — Signature invalid, decryption aborted" color="text-rose-300" />
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 mt-1">
                The decryption oracle is useless to the adversary — cannot submit modified CE without breaking σ.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Contrast Tab ───────────────────────────────────────────────────────────────

function ContrastTab() {
  const [m,   setM]     = useState('42')
  const [lam, setLam]   = useState(2)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await pa17api.post('/api/pa17/malleability-contrast', {
        group_bits: 32, rsa_bits: 256, m: Number(m), lam,
      })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <Card title="⚔ PA#16 vs PA#17 — Malleability Attack Contrast">
        <div className="space-y-3">
          <p className="text-sm text-(--text)/70">
            The same λ·c₂ tamper is applied on both plain ElGamal (PA#16) and Signcryption (PA#17).
            <br/>
            <strong className="text-white">PA#16</strong> — malleability works: oracle returns λ·m.&ensp;
            <strong className="text-white">PA#17</strong> — signature check fires first: oracle returns ⊥.
          </p>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Message m</label>
              <input value={m} onChange={e => setM(e.target.value)}
                className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 text-sm text-white font-mono outline-none focus:border-rose-500/60 transition-all" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Multiplier λ</p>
              <input type="number" min={2} max={20} value={lam} onChange={e => setLam(Number(e.target.value))}
                className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 text-sm text-white font-mono outline-none focus:border-rose-500/60 transition-all" />
            </div>
          </div>
          <Btn onClick={run} disabled={loading} id="pa17-contrast-btn">
            {loading ? <><Spinner />Running contrast…</> : '⚔ Run Malleability Contrast'}
          </Btn>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plain ElGamal — broken */}
          <div className="rounded-xl border-2 border-rose-500/60 bg-rose-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">🔓</span>
              <span className="font-black text-sm">Plain ElGamal (PA#16)</span>
              <Badge label="Malleable — BROKEN" color="red" />
            </div>
            <div className="space-y-2">
              <KV label="Original m" value={result.message} small />
              <KV label="c₁" value={trunc(hexOf(result.plain_elgamal?.c1), 20)} small color="text-emerald-200" />
              <KV label="c₂ (original)" value={trunc(hexOf(result.plain_elgamal?.c2), 20)} small color="text-emerald-200" />
              <KV label={`c₂' = ${lam}·c₂ (tampered)`} value={trunc(hexOf(result.plain_elgamal?.c2_tampered), 20)} small color="text-rose-200" />
              <KV label="Oracle returns λ·m" value={String(result.plain_elgamal?.decrypted_tampered)} color="text-rose-300" />
            </div>
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {result.plain_elgamal?.attack_valid
                ? `✓ Attack succeeded: ${lam}·${result.message} = ${result.plain_elgamal?.decrypted_tampered}`
                : '✗ Attack failed (unexpected)'}
            </div>
          </div>

          {/* PA#17 Signcrypt — secure */}
          <div className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">🔒</span>
              <span className="font-black text-sm">Signcryption (PA#17)</span>
              <Badge label="CCA-Secure — BLOCKED" color="green" />
            </div>
            <div className="space-y-2">
              <KV label="Original m" value={result.message} small />
              <KV label="c₁" value={trunc(hexOf(result.signcrypt?.c1), 20)} small color="text-emerald-200" />
              <KV label="c₂ (original)" value={trunc(hexOf(result.signcrypt?.c2), 20)} small color="text-emerald-200" />
              <KV label={`c₂' = ${lam}·c₂ (tampered)`} value={trunc(hexOf(result.signcrypt?.c2_tampered), 20)} small color="text-rose-200" />
              <KV label="Oracle response" value="⊥ (signature invalid)" color="text-emerald-300" />
              <KV label="Untampered decrypt" value={String(result.signcrypt?.decrypted_original)} color="text-emerald-200" small />
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              {result.signcrypt?.attack_blocked
                ? `✓ Attack blocked: signature on C' is invalid → ⊥`
                : '✗ Unexpected: attack not blocked'}
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3 text-xs text-(--text)/70 leading-relaxed">
          <strong className="text-purple-300">Why the ordering matters:</strong> The signature check
          <em> precedes</em> decryption — this is not optional. If decrypt ran first,
          the oracle could still leak information about m before the signature check.
          Verify-then-Decrypt ensures any modification of CE invalidates σ before any computation on m occurs.
        </div>
      )}
    </div>
  )
}

// ── IND-CCA2 Tab ───────────────────────────────────────────────────────────────

function CCA2Tab() {
  const [rounds, setRounds] = useState(20)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)
  const [error, setError]   = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      const r = await pa17api.post('/api/pa17/ind-cca2-game', {
        n_rounds: rounds, group_bits: 32, rsa_bits: 128,
      })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Game failed') }
    finally { clearInterval(timerRef.current); setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <Card title="🎮 IND-CCA2 Security Game">
        <div className="space-y-3">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            Adversary has a <strong className="text-white">decryption oracle</strong> and receives a challenge
            ciphertext (CE*, σ*) encrypting m_b. They must guess b ∈ {"{0,1}"}.
            Both strategies win ≈ 50% — oracle is useless because tampered ciphertexts always return ⊥.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              {
                strat: 'Strategy 1: Tamper CE → Query Oracle',
                desc:  'Submit (c1*, λ·c2*, σ*) to oracle',
                outcome: 'Oracle returns ⊥ (σ* invalid on modified CE) → must guess randomly',
              },
              {
                strat: 'Strategy 2: Random guess',
                desc:  'Guess b=0 or b=1 without oracle',
                outcome: 'Pure coin flip → 50% win rate',
              },
            ].map(({ strat, desc, outcome }) => (
              <div key={strat} className="rounded-xl border border-(--border) bg-(--code-bg) p-3 space-y-1">
                <p className="font-black text-white">{strat}</p>
                <p className="text-(--text)/60 italic">{desc}</p>
                <p className="text-amber-300">{outcome}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-4 items-center flex-wrap">
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-widest text-white">
                Rounds: <span className="text-purple-300">{rounds}</span>
              </p>
              <input type="range" min={5} max={100} step={5} value={rounds}
                onChange={e => setRounds(Number(e.target.value))}
                className="w-48 accent-purple-500" />
            </div>
            <Btn onClick={run} disabled={loading} id="pa17-cca2-btn">
              {loading ? `Running… (${elapsed}s elapsed)` : '🎮 Run IND-CCA2 Game'}
            </Btn>
          </div>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(result.strategies || {}).map(([strat, data]) => {
              const wr = typeof data.win_rate === 'string' ? parseFloat(data.win_rate) : data.win_rate
              const isNear50 = Math.abs(wr - 0.5) < 0.20
              return (
                <div key={strat} className={cx(
                  'rounded-xl border-2 p-4 space-y-3',
                  isNear50 ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'
                )}>
                  <p className="font-black text-sm text-white capitalize">
                    {strat.replace(/_/g, ' ')}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-(--text)/50">Win rate</span>
                      <span className={cn(isNear50 ? 'text-emerald-300' : 'text-amber-300', 'font-black')}>
                        {(wr * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-(--border) overflow-hidden relative">
                      <div className="absolute inset-0 w-1/2 left-0 right-auto border-r-2 border-white/20 z-10" />
                      <div className={cx('h-full rounded-full transition-all duration-700',
                        isNear50 ? 'bg-emerald-500' : 'bg-amber-500'
                      )} style={{ width: `${wr * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-center text-(--text)/40">50% line ↑ (random guess baseline)</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-(--code-bg) border border-(--border) p-2">
                      <p className="text-[10px] text-(--text)/50 uppercase tracking-wider">Wins</p>
                      <p className="font-mono text-white">{data.wins}/{data.total}</p>
                    </div>
                    <div className="rounded-lg bg-(--code-bg) border border-(--border) p-2">
                      <p className="text-[10px] text-(--text)/50 uppercase tracking-wider">Oracle useful?</p>
                      <p className="font-mono text-rose-300 text-xs">No — returns ⊥</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 px-4 py-3">
            <p className="font-black text-purple-300 text-sm">🔒 IND-CCA2 Security Confirmed</p>
            <p className="text-xs text-(--text)/70 mt-1 leading-relaxed">{result.conclusion}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Full Pipeline Tab ──────────────────────────────────────────────────────────

function PipelineTab() {
  const [msg,   setMsg]     = useState(1234)
  const [bits,  setBits]    = useState(32)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)
  const [error,  setError]  = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      const r = await pa17api.post('/api/pa17/full-demo', {
        group_bits: bits, rsa_bits: 256, message_int: Number(msg),
      })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Demo failed') }
    finally { clearInterval(timerRef.current); setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <Card title="🔄 Full Signcryption Pipeline">
        <div className="space-y-3">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Message m</label>
              <input type="number" value={msg} onChange={e => setMsg(e.target.value)}
                className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 text-sm text-white font-mono outline-none focus:border-purple-500/60" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Group bits</p>
              <div className="flex gap-2">
                {[16, 24, 32, 48].map(b => (
                  <button key={b} onClick={() => setBits(b)}
                    className={cx('rounded-lg border px-2.5 py-1 text-xs font-black transition-all',
                      bits === b ? 'border-purple-500/60 bg-purple-500/20 text-white'
                                 : 'border-(--border) bg-(--code-bg) text-(--text)/60 hover:text-white'
                    )}>{b}</button>
                ))}
              </div>
            </div>
            <Btn onClick={run} disabled={loading} id="pa17-pipeline-btn">
              {loading ? `Running… (${elapsed}s)` : '▶ Run Full Pipeline'}
            </Btn>
          </div>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {result && (
        <div className="space-y-3">
          {/* Timing bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Setup (keygen)', val: `${result.setup_ms} ms`, color: 'text-blue-300' },
              { label: 'ElGamal enc', val: `${result.signcrypt?.enc_ms} ms`, color: 'text-emerald-300' },
              { label: 'RSA sign', val: `${result.signcrypt?.sign_ms} ms`, color: 'text-purple-300' },
              { label: 'Message mod p', val: String(result.message), mono: true, color: 'text-white' },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-xl border border-(--border) bg-(--code-bg) p-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">{label}</p>
                <p className={cx('font-mono text-sm font-black mt-1', color)}>{val}</p>
              </div>
            ))}
          </div>

          {/* Signcrypt output */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-300">🔒 Signcrypt Output (CE, σ)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <KV label="c₁ = g^r mod p" value={trunc(hexOf(result.signcrypt?.c1), 22)} small color="text-emerald-200" />
              <KV label="c₂ = m·h^r mod p" value={trunc(hexOf(result.signcrypt?.c2), 22)} small color="text-emerald-200" />
              <KV label="σ = H(CE)^d mod N" value={trunc(result.signcrypt?.sigma_hex, 22)} small color="text-purple-300" />
            </div>
          </div>

          {/* Decrypt correct */}
          <div className={cx('rounded-xl border-2 p-4 space-y-2',
            result.decrypt_ok?.correct ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'
          )}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{result.decrypt_ok?.correct ? '✅' : '❌'}</span>
              <span className="font-black text-sm">Verify & Decrypt (untampered CE)</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <KV label="Sig valid" value={String(result.decrypt_ok?.sig_valid)} color="text-emerald-300" small />
              <KV label="Decrypted m" value={String(result.decrypt_ok?.decrypted)} color="text-emerald-300" small />
              <KV label="Correct" value={String(result.decrypt_ok?.correct)} color="text-emerald-300" small />
            </div>
          </div>

          {/* Decrypt tampered */}
          <div className="rounded-xl border-2 border-rose-500/50 bg-rose-500/5 p-4 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xl">🚫</span>
              <span className="font-black text-sm">Oracle with tampered CE (1 byte XOR'd)</span>
              <Badge label="⊥ — decryption aborted" color="red" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <KV label="Sig valid on tampered" value="false" color="text-rose-300" small />
              <KV label="Oracle response" value="⊥ (null)" color="text-rose-300" small />
              <KV label="Attack blocked" value={String(result.decrypt_tampered?.blocked)} color="text-emerald-300" small />
            </div>
          </div>

          {/* Lineage */}
          <div className="rounded-xl border border-purple-500/20 bg-(--code-bg) px-4 py-3 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-300">✅ Full Dependency Lineage</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-(--text)/60">
              {[
                'PA#17 → signcrypt / unsigncrypt',
                'PA#15 → sign() / verify()  (hash-then-sign)',
                'PA#16 → elgamal_enc() / elgamal_dec()',
                'PA#12 → rsa_keygen() / mod_inverse()',
                'PA#11 → gen_dh_params() (safe prime)',
                'PA#13 → mod_exp() / miller_rabin()',
                'sha256_pure → PureSHA256 (no hashlib)',
              ].map(l => <p key={l}>{l}</p>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// fix typo
function cn(...c) { return c.filter(Boolean).join(' ') }

// ── Main Page ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'demo',     label: '🔒 Live Demo' },
  { key: 'contrast', label: '⚔ Malleability Contrast' },
  { key: 'cca2',     label: '🎮 IND-CCA2 Game' },
  { key: 'pipeline', label: '🔄 Full Pipeline' },
]

export default function SigncryptDemo() {
  const [tab, setTab] = useState('demo')

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer — PA#17: CCA-Secure PKC (Signcryption)" />

        {/* Theory banner */}
        <div className="mb-4 rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 space-y-1">
          <p className="text-[13px] font-black uppercase tracking-widest text-white">
            Encrypt-then-Sign = CCA-Secure PKC
          </p>
          <p className="text-sm text-(--text)/70 leading-relaxed">
            Plain ElGamal (PA#16) is <span className="text-rose-300 font-semibold">malleable</span>:
            submitting (c₁, λ·c₂) to the decryption oracle returns λ·m — IND-CCA2 is broken.
            &ensp;Adding a<span className="text-emerald-300 font-semibold"> signature over the ciphertext</span> blocks this:
            any modification of CE invalidates σ, and the oracle returns ⊥ before decrypting.
            &ensp;The ordering <em>Verify-then-Decrypt</em> is non-negotiable.
          </p>
        </div>

        <div className="mb-4">
          <ConstructionOverview />
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
            {tab === 'demo'     && <MainDemoTab />}
            {tab === 'contrast' && <ContrastTab />}
            {tab === 'cca2'     && <CCA2Tab />}
            {tab === 'pipeline' && <PipelineTab />}
          </div>
        </div>
      </section>
    </main>
  )
}
