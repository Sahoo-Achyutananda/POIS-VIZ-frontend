import { useState, useCallback, useRef } from 'react'
import axios from 'axios'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'
import { User, Dices, AlertTriangle, Check, X, Zap, Lock } from 'lucide-react'

// Long-timeout axios instance for param generation
const pa11api = axios.create({ baseURL: api.defaults.baseURL, timeout: 120_000 })

function cx(...c) { return c.filter(Boolean).join(' ') }

function truncHex(n, maxLen = 16) {
  if (!n) return '—'
  const h = typeof n === 'bigint' ? n.toString(16) : BigInt(n).toString(16)
  if (h.length <= maxLen) return '0x' + h
  return `0x${h.slice(0, 8)}…${h.slice(-8)}`
}

function hexOf(n) {
  if (!n) return '—'
  return '0x' + BigInt(n).toString(16).toUpperCase()
}

// ── Small UI primitives ────────────────────────────────────────────────────────

function Card({ title, children, className = '', accent = false }) {
  return (
    <div className={cx(
      'rounded-xl border overflow-hidden',
      accent ? 'border-purple-500/40' : 'border-(--border)',
      className
    )}>
      {title && (
        <div className={cx(
          'border-b px-4 py-2.5',
          accent ? 'border-purple-500/30 bg-purple-500/10' : 'border-(--border) bg-(--code-bg)'
        )}>
          <h3 className="text-sm font-black uppercase tracking-widest text-white">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

function KV({ label, value, mono = true, accent = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">{label}</span>
      <span className={cx(
        'break-all text-xs leading-relaxed',
        mono ? 'font-mono' : '',
        accent ? 'text-purple-300' : 'text-white'
      )}>{value}</span>
    </div>
  )
}

function Badge({ label, color = 'default' }) {
  const colors = {
    green:   'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    red:     'bg-rose-500/20 border-rose-500/40 text-rose-300',
    amber:   'bg-amber-500/20 border-amber-500/40 text-amber-300',
    purple:  'bg-purple-500/20 border-purple-500/40 text-purple-300',
    default: 'bg-slate-500/20 border-slate-500/40 text-slate-300',
  }
  return (
    <span className={cx(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider',
      colors[color] ?? colors.default
    )}>{label}</span>
  )
}

// ── Party Panel (Alice or Bob) ─────────────────────────────────────────────────

function PartyPanel({ name, color, exponent, pubValue, sharedKey, label, onRandomise, onChange, params }) {
  const isAlice = name === 'Alice'
  const borderColor = isAlice ? 'border-blue-500/40' : 'border-emerald-500/40'
  const bgColor     = isAlice ? 'bg-blue-500/5'      : 'bg-emerald-500/5'
  const accentText  = isAlice ? 'text-blue-300'      : 'text-emerald-300'
  const accentBg    = isAlice ? 'bg-blue-500/20 border-blue-500/40'   : 'bg-emerald-500/20 border-emerald-500/40'

  return (
    <div className={cx('rounded-2xl border-2 p-4 space-y-3 flex-1', borderColor, bgColor)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-6 h-6" />
          <span className={cx('text-xl font-black', accentText)}>{name}</span>
        </div>
        <Badge label={name} color={isAlice ? 'default' : 'green'} />
      </div>

      {/* Private exponent input */}
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">
          Private exponent {isAlice ? 'a' : 'b'} (blank = random)
        </label>
        <div className="flex gap-2">
          <input
            value={exponent}
            onChange={e => onChange(e.target.value)}
            placeholder="Random"
            className="flex-1 rounded-lg border border-(--border) bg-(--code-bg) px-3 py-1.5 font-mono text-xs text-white outline-none focus:border-purple-500/60 transition-all"
          />
          <Btn size="sm" variant="secondary" onClick={onRandomise}><Dices className="w-3 h-3" /></Btn>
        </div>
      </div>

      {/* Public value */}
      <div className={cx('rounded-xl border px-3 py-2.5 space-y-1', accentBg)}>
        <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">
          Public value g^{isAlice ? 'a' : 'b'} mod p
        </p>
        <p className={cx('font-mono text-xs break-all', accentText)}>
          {pubValue ? hexOf(pubValue) : <span className="text-(--text)/30 italic">run exchange first</span>}
        </p>
      </div>

      {/* Shared key */}
      {sharedKey && (
        <div className="rounded-xl border border-purple-500/40 bg-purple-500/10 px-3 py-2.5 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">
            Shared secret K = g^(ab) mod p
          </p>
          <p className="font-mono text-xs break-all text-purple-300">{hexOf(sharedKey)}</p>
        </div>
      )}
    </div>
  )
}

// ── Eve's MITM Panel ──────────────────────────────────────────────────────────

function EveMITMPanel({ mitm }) {
  if (!mitm) return null
  return (
    <Card title="Eve — Man-in-the-Middle" accent className="border-rose-500/40">
      <div className="space-y-3">
        <p className="text-xs text-(--text)/70 leading-relaxed">
          Eve intercepts A = g<sup>a</sup> and B = g<sup>b</sup>, substitutes her own
          value <span className="font-mono text-rose-300">E = g<sup>e</sup></span> in both directions.
          Alice and Bob each compute a different shared key — and Eve holds both.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-300/60">Eve's public E = g^e</p>
            <p className="font-mono text-xs text-rose-300 break-all">{hexOf(mitm.eve?.E)}</p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/60">K with Alice (g^ae)</p>
            <p className="font-mono text-xs text-amber-300 break-all">{hexOf(mitm.eve?.K_with_alice)}</p>
            <Badge label={mitm.eve_sees_alice ? 'matches Alice' : 'mismatch'} color={mitm.eve_sees_alice ? 'amber' : 'red'} />
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/60">K with Bob (g^be)</p>
            <p className="font-mono text-xs text-amber-300 break-all">{hexOf(mitm.eve?.K_with_bob)}</p>
            <Badge label={mitm.eve_sees_bob ? 'matches Bob' : 'mismatch'} color={mitm.eve_sees_bob ? 'amber' : 'red'} />
          </div>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center space-y-1">
          <p className="inline-flex items-center gap-1 text-rose-300 font-black text-sm"><AlertTriangle className="w-3.5 h-3.5" /> MITM Active — Alice &amp; Bob do NOT share a key!</p>
          <p className="text-[11px] text-(--text)/60">
            Alice's K = {hexOf(mitm.alice?.K)} &nbsp;|&nbsp; Bob's K = {hexOf(mitm.bob?.K)}
          </p>
          <p className="text-[11px] text-rose-300/70 italic">
            Basic DH has no authentication — this requires digital signatures (PA#15).
          </p>
        </div>
      </div>
    </Card>
  )
}

// ── CDH Brute Force Panel ─────────────────────────────────────────────────────

function CDHBrutePanel({ params, exchange, onRun, loading, result, error }) {
  return (
    <Card title="CDH Hardness Demo — Brute-Force Discrete Log">
      <div className="space-y-3">
        <p className="text-sm text-(--text)/70 leading-relaxed">
          Given g<sup>a</sup> mod p and g<sup>b</sup> mod p, can Eve compute g<sup>ab</sup>
          without knowing a or b? For small parameters (q ≤ 2<sup>20</sup>) we demonstrate
          a brute-force search — scanning candidates until g<sup>x</sup> = A.
        </p>

        {exchange && (
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <KV label="g^a mod p (A)" value={hexOf(exchange.A)} />
            <KV label="g^b mod p (B)" value={hexOf(exchange.B)} />
          </div>
        )}

        <div className="flex gap-3 items-center flex-wrap">
          <Btn onClick={onRun} disabled={loading || !exchange} id="pa11-cdh-btn">
            {loading ? 'Searching…' : 'Run CDH Brute Force'}
          </Btn>
          {!exchange && (
            <span className="text-xs text-(--text)/50 italic">Run Exchange first (use small params)</span>
          )}
        </div>
        {error && <p className="text-xs text-rose-400 font-black">{error}</p>}

        {result && (
          <div className={cx(
            'rounded-xl border px-4 py-3 space-y-3',
            result.found && result.a_recovered != null
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : 'border-rose-500/40 bg-rose-500/10'
          )}>
            {result.found && result.a_recovered != null ? (
              <>
                {/* ── Success: a recovered, CDH broken ── */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-300">
                    <Check className="w-3 h-3" /> Discrete Log Recovered
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5" /> CDH Broken (small group)
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  {[
                    { label: 'a recovered', value: result.a_recovered },
                    { label: 'Steps taken', value: result.steps?.toLocaleString() },
                    { label: 'Time elapsed', value: `${result.time_ms} ms` },
                    { label: 'K = g^ab recovered', value: hexOf(result.K_recovered) },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg border border-(--border) bg-(--code-bg) p-2">
                      <p className="text-[10px] uppercase tracking-widest text-(--text)/50 font-black">{s.label}</p>
                      <p className="font-mono text-xs text-white mt-1 break-all">{String(s.value)}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-emerald-300/70 italic">
                  Eve computed g<sup>ab</sup> = {hexOf(result.K_recovered)} — CDH broken for this small group!
                  For 2048-bit groups, this takes 2<sup>1024</sup> steps — computationally infeasible.
                </p>
              </>
            ) : (
              <>
                {/* ── Failure: a not found, CDH holds ── */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/40 bg-slate-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-300">
                    <X className="w-3 h-3" /> Discrete Log NOT Recovered
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-300">
                    <Check className="w-3 h-3" /> CDH NOT Broken
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  {[
                    { label: 'Steps searched', value: result.steps?.toLocaleString() },
                    { label: 'Time elapsed',   value: `${result.time_ms} ms` },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg border border-(--border) bg-(--code-bg) p-2">
                      <p className="text-[10px] uppercase tracking-widest text-(--text)/50 font-black">{s.label}</p>
                      <p className="font-mono text-xs text-white mt-1 break-all">{String(s.value)}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-rose-300/70 italic">
                  {result.note ?? `Brute-force exhausted ${result.steps?.toLocaleString()} candidates — discrete log not found. CDH remains hard for this group size.`}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Params Panel ───────────────────────────────────────────────────────────────

function ParamsPanel({ params, onGenerate, loading, bits, setBits }) {
  const SIZES = [16, 24, 32, 40, 48, 64]
  return (
    <Card title="Group Parameters (Safe Prime p = 2q+1)">
      <div className="space-y-3">
        <p className="text-sm text-(--text)/70 leading-relaxed">
          Generate a safe prime <span className="font-mono text-white">p = 2q+1</span> (both prime)
          and a generator <span className="font-mono text-white">g</span> of the prime-order
          subgroup of order <span className="font-mono text-white">q</span>.
          Uses <span className="text-purple-300 font-semibold">PA #13 Miller-Rabin</span> for primality testing.
        </p>

        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-widest text-white">Bit size of p</p>
          <div className="flex gap-2 flex-wrap">
            {SIZES.map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setBits(b)}
                className={cx(
                  'rounded-lg border px-3 py-1 text-xs font-black transition-all hover:-translate-y-0.5',
                  bits === b
                    ? 'border-purple-500/60 bg-purple-500/20 text-white'
                    : 'border-(--border) bg-(--code-bg) text-(--text) hover:border-purple-500/40'
                )}
              >{b}-bit</button>
            ))}
          </div>
          {bits > 32 && (
            <p className="inline-flex items-center gap-1 text-[11px] text-amber-400/70 italic">
              <AlertTriangle className="w-3.5 h-3.5" /> Larger primes mean slower CDH brute force demo — stick to 16–32 for CDH tab.
            </p>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <Btn onClick={onGenerate} disabled={loading} id="pa11-gen-params-btn">
            {loading ? 'Generating…' : `Generate ${bits}-bit Safe Prime`}
          </Btn>
          <Btn
            variant="secondary"
            onClick={() => onGenerate('toy')}
            disabled={loading}
            id="pa11-toy-params-btn"
          >
            <Zap className="w-3.5 h-3.5" /> Load Toy Params (instant)
          </Btn>
        </div>

        {params && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            {[
              { label: 'Safe prime p = 2q+1', value: hexOf(params.p) },
              { label: 'Group order q = (p−1)/2', value: hexOf(params.q) },
              { label: 'Generator g (order q)', value: hexOf(params.g) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-(--border) bg-(--code-bg) px-3 py-2.5 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">{label}</p>
                <p className="font-mono text-xs text-white break-all">{value}</p>
              </div>
            ))}
          </div>
        )}
        {params && (
          <p className="text-xs text-(--text)/50 italic">
            p is {params.bits}-bit. q = (p−1)/2 is also prime (Sophie Germain prime).
            g<sup>q</sup> ≡ 1 (mod p) — g generates a cyclic subgroup of prime order q.
          </p>
        )}
      </div>
    </Card>
  )
}

// ── Animation Arrow ────────────────────────────────────────────────────────────

function Arrow({ label, dir = 'right', highlight = false }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
      <span className="text-[10px] font-mono text-(--text)/60 text-center leading-tight">{label}</span>
      <div className={cx(
        'h-0.5 w-full rounded transition-all duration-500',
        highlight ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-(--border)'
      )} />
      <span className="text-xs text-(--text)/40">{dir === 'right' ? '→' : '←'}</span>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'exchange',  label: 'DH Exchange'     },
  { key: 'mitm',      label: 'MITM Attack'      },
  { key: 'cdh',       label: 'CDH Hardness'    },
  { key: 'params',    label: 'Group Params'     },
]

export default function DHDemo() {
  const [tab, setTab] = useState('exchange')

  // Shared group params
  const [params, setParams] = useState(null)
  const [paramsLoading, setParamsLoading] = useState(false)
  const [paramsBits, setParamsBits] = useState(32)

  // Exchange state
  const [aliceExp, setAliceExp] = useState('')
  const [bobExp,   setBobExp]   = useState('')
  const [exchange, setExchange] = useState(null)
  const [exchLoading, setExchLoading] = useState(false)
  const [exchError, setExchError] = useState('')
  const [animated, setAnimated] = useState(false)

  // MITM state
  const [mitm, setMitm] = useState(null)
  const [mitmLoading, setMitmLoading] = useState(false)
  const [mitmError, setMitmError] = useState('')

  // CDH state
  const [cdhResult, setCdhResult] = useState(null)
  const [cdhLoading, setCdhLoading] = useState(false)
  const [cdhError, setCdhError] = useState('')

  // ── Param generation ────────────────────────────────────────────────────────

  const loadParams = useCallback(async (mode) => {
    setParamsLoading(true)
    try {
      let res
      if (mode === 'toy') {
        res = await pa11api.get('/api/pa11/toy-params')
      } else {
        res = await pa11api.post('/api/pa11/gen-params', { bits: paramsBits })
      }
      setParams(res.data)
      // Reset all results when params change
      setExchange(null); setMitm(null); setCdhResult(null)
      setAliceExp(''); setBobExp('')
    } catch (e) {
      console.error(e)
    } finally {
      setParamsLoading(false)
    }
  }, [paramsBits])

  // Load toy params on first visit
  const loadedRef = useRef(false)
  if (!loadedRef.current) {
    loadedRef.current = true
    pa11api.get('/api/pa11/toy-params').then(r => setParams(r.data)).catch(() => {})
  }

  // ── DH Exchange ─────────────────────────────────────────────────────────────

  const runExchange = useCallback(async () => {
    if (!params) return
    setExchLoading(true)
    setExchError('')
    setExchange(null)
    setAnimated(false)
    try {
      const res = await pa11api.post('/api/pa11/exchange', {
        p: params.p, q: params.q, g: params.g,
        a: aliceExp || null,
        b: bobExp   || null,
      })
      setExchange(res.data)
      setTimeout(() => setAnimated(true), 100)
    } catch (e) {
      setExchError(e?.response?.data?.detail || 'Exchange failed')
    } finally {
      setExchLoading(false)
    }
  }, [params, aliceExp, bobExp])

  // ── MITM ────────────────────────────────────────────────────────────────────

  const runMITM = useCallback(async () => {
    if (!params) return
    setMitmLoading(true)
    setMitmError('')
    setMitm(null)
    try {
      const res = await pa11api.post('/api/pa11/mitm', {
        p: params.p, q: params.q, g: params.g,
        a: aliceExp || null,
        b: bobExp   || null,
      })
      setMitm(res.data)
    } catch (e) {
      setMitmError(e?.response?.data?.detail || 'MITM failed')
    } finally {
      setMitmLoading(false)
    }
  }, [params, aliceExp, bobExp])

  // ── CDH Brute Force ─────────────────────────────────────────────────────────

  const runCDH = useCallback(async () => {
    if (!params || !exchange) return
    setCdhLoading(true)
    setCdhError('')
    setCdhResult(null)
    try {
      const res = await pa11api.post('/api/pa11/cdh-brute', {
        p: params.p, q: params.q, g: params.g,
        A: exchange.A,
        B: exchange.B,
        max_steps: 1048576,
      })
      setCdhResult(res.data)
    } catch (e) {
      setCdhError(e?.response?.data?.detail || 'CDH brute force failed')
    } finally {
      setCdhLoading(false)
    }
  }, [params, exchange])

  // ────────────────────────────────────────────────────────────────────────────

  const match = exchange?.match === true || exchange?.match === 'True'
  const mitmActive = mitm !== null

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer — PA#11: Diffie-Hellman Key Exchange" />

        {/* Theory banner */}
        <div className="mb-4 rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 space-y-1">
          <p className="text-[13px] font-black uppercase tracking-widest text-white">Protocol Overview</p>
          <p className="text-sm text-(--text)/70 leading-relaxed">
            Public params: safe prime <span className="font-mono text-white">p = 2q+1</span>,
            generator <span className="font-mono text-white">g</span> of order q in Z*<sub>p</sub>.
            &nbsp; Alice samples <span className="font-mono text-white">a ← Z<sub>q</sub></span>,
            sends <span className="font-mono text-white">A = g<sup>a</sup> mod p</span>.
            &nbsp; Bob samples <span className="font-mono text-white">b ← Z<sub>q</sub></span>,
            sends <span className="font-mono text-white">B = g<sup>b</sup> mod p</span>.
            &nbsp; Shared secret: <span className="font-mono text-purple-300">K = g<sup>ab</sup> mod p</span>.
            Security relies on CDH hardness. Without authentication this is vulnerable to MITM (PA#15 adds signatures).
          </p>
        </div>

        {/* Params bar */}
        {params && (
          <div className="mb-3 rounded-xl border border-(--border) bg-(--code-bg) px-4 py-2 flex flex-wrap gap-4 items-center text-xs">
            <span className="font-black text-white uppercase tracking-widest text-[10px]">Active params:</span>
            <span className="font-mono text-(--text)/70">p = {hexOf(params.p)}</span>
            <span className="font-mono text-(--text)/70">q = {hexOf(params.q)}</span>
            <span className="font-mono text-(--text)/70">g = {hexOf(params.g)}</span>
            <span className="text-(--text)/40">|p| = {params.bits} bits</span>
            <button
              type="button"
              onClick={() => setTab('params')}
              className="ml-auto text-purple-400 text-[11px] underline underline-offset-2 hover:text-purple-300"
            >Change params →</button>
          </div>
        )}

        {/* Tab bar */}
        <div className="mb-4 overflow-hidden rounded-xl border border-(--border)">
          <div className="border-b border-(--border) bg-(--code-bg) px-3 py-2">
            <div className="flex gap-1 flex-wrap">
              {TABS.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cx(
                    'rounded-lg px-3 py-1.5 text-xs font-black transition-all',
                    tab === t.key
                      ? 'bg-purple-500/20 border border-purple-500/50 text-white'
                      : 'text-(--text)/60 hover:text-white hover:bg-(--code-bg)'
                  )}
                >{t.label}</button>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-5 min-h-[500px]">

            {/* ── Exchange Tab ──────────────────────────────────────────────── */}
            {tab === 'exchange' && (
              <div className="space-y-5">
                {/* Alice & Bob panels */}
                <div className="flex flex-col lg:flex-row gap-4 items-stretch">
                  <PartyPanel
                    name="Alice"
                    exponent={aliceExp}
                    onChange={setAliceExp}
                    onRandomise={() => setAliceExp('')}
                    pubValue={exchange?.A}
                    sharedKey={exchange?.K_alice}
                    params={params}
                  />

                  {/* Channel visualisation */}
                  <div className="flex flex-col items-center justify-center gap-3 px-2 py-4 min-w-[110px]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-(--text)/40 mb-1">
                      Public Channel
                    </div>
                    <Arrow
                      label={`A = g^a${exchange ? '\n' + hexOf(exchange.A) : ''}`}
                      dir="right"
                      highlight={animated && !!exchange}
                    />
                    <Arrow
                      label={`B = g^b${exchange ? '\n' + hexOf(exchange.B) : ''}`}
                      dir="left"
                      highlight={animated && !!exchange}
                    />
                    {exchange && (
                      <div className={cx(
                        'mt-2 rounded-xl border-2 px-3 py-2 text-center transition-all duration-700',
                        match
                          ? 'border-purple-500/50 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                          : 'border-rose-500/50 bg-rose-500/10'
                      )}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-(--text)/50">
                          Shared K
                        </p>
                        <p className={cx(
                          'inline-flex items-center gap-1 font-mono text-[10px] font-black mt-0.5',
                          match ? 'text-purple-300' : 'text-rose-300'
                        )}>{match ? <><Check className="w-3 h-3" /> MATCH</> : <><X className="w-3 h-3" /> NO MATCH</>}</p>
                      </div>
                    )}
                  </div>

                  <PartyPanel
                    name="Bob"
                    exponent={bobExp}
                    onChange={setBobExp}
                    onRandomise={() => setBobExp('')}
                    pubValue={exchange?.B}
                    sharedKey={exchange?.K_bob}
                    params={params}
                  />
                </div>

                {/* Run button */}
                <div className="flex gap-3 items-center flex-wrap">
                  <Btn
                    onClick={runExchange}
                    disabled={exchLoading || !params}
                    size="lg"
                    id="pa11-exchange-btn"
                  >
                    {exchLoading ? 'Exchanging…' : 'Run Exchange'}
                  </Btn>
                  {!params && <span className="text-xs text-amber-400">Load params first (Group Params tab)</span>}
                  {exchError && <p className="text-xs text-rose-400 font-black">{exchError}</p>}
                </div>

                {/* Result detail */}
                {exchange && (
                  <Card title="Exchange Transcript">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Alice's exponent a", value: hexOf(exchange.a) },
                        { label: "Alice's public A = g^a", value: hexOf(exchange.A) },
                        { label: "Bob's exponent b", value: hexOf(exchange.b) },
                        { label: "Bob's public B = g^b", value: hexOf(exchange.B) },
                        { label: 'Alice computes K = B^a', value: hexOf(exchange.K_alice) },
                        { label: 'Bob computes K = A^b', value: hexOf(exchange.K_bob) },
                        { label: 'Keys match', value: match ? 'YES' : 'NO' },
                        { label: 'Error prob (k=40)', value: '≤ 4⁻⁴⁰ ≈ 10⁻²⁴' },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg border border-(--border) bg-(--code-bg) p-3 space-y-0.5">
                          <p className="text-[10px] uppercase tracking-widest text-(--text)/50 font-black">{label}</p>
                          <p className="font-mono text-xs text-white break-all">{value}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* ── MITM Tab ──────────────────────────────────────────────────── */}
            {tab === 'mitm' && (
              <div className="space-y-5">
                <Card title="Man-in-the-Middle Attack Setup">
                  <div className="space-y-3">
                    <p className="text-sm text-(--text)/70 leading-relaxed">
                      Basic DH is <strong className="text-white">unauthenticated</strong>.
                      Eve can sit between Alice and Bob, intercept their public values, and
                      substitute her own <span className="font-mono text-rose-300">E = g<sup>e</sup></span>.
                      Alice and Bob each think they're talking to each other — but both share
                      secrets with Eve.
                    </p>
                    <div className="flex gap-4 items-center flex-wrap">
                      <Btn
                        onClick={runMITM}
                        disabled={mitmLoading || !params}
                        id="pa11-mitm-btn"
                      >
                        {mitmLoading ? 'Attacking…' : 'Enable MITM Attack'}
                      </Btn>
                      {mitmError && <p className="text-xs text-rose-400 font-black">{mitmError}</p>}
                    </div>
                  </div>
                </Card>

                {mitm && (
                  <>
                    {/* Alice and Bob with MITM data */}
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1 rounded-2xl border-2 border-blue-500/40 bg-blue-500/5 p-4 space-y-2">
                        <p className="inline-flex items-center gap-2 text-blue-300 font-black text-lg"><User className="w-6 h-6" /> Alice</p>
                        <KV label="Her private a" value={hexOf(mitm.alice?.a)} />
                        <KV label="Her real A = g^a (sent)" value={hexOf(mitm.alice?.A_sent)} />
                        <KV label="What she received (Eve's E)" value={hexOf(mitm.alice?.A_received)} accent />
                        <KV label="Alice's 'shared' key K" value={hexOf(mitm.alice?.K)} />
                      </div>

                      <div className="flex flex-col items-center justify-center gap-2 text-center px-2 py-4 min-w-[100px]">
                        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2">
                          <p className="text-[9px] font-black uppercase text-rose-300/60">Eve</p>
                          <p className="font-mono text-[10px] text-rose-300">E = g^e</p>
                          <p className="font-mono text-[10px] text-rose-300">{hexOf(mitm.eve?.E)}</p>
                        </div>
                        <p className="text-[9px] text-rose-400/60 font-black uppercase">intercepts both</p>
                      </div>

                      <div className="flex-1 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-4 space-y-2">
                        <p className="inline-flex items-center gap-2 text-emerald-300 font-black text-lg"><User className="w-6 h-6" /> Bob</p>
                        <KV label="His private b" value={hexOf(mitm.bob?.b)} />
                        <KV label="His real B = g^b (sent)" value={hexOf(mitm.bob?.B_sent)} />
                        <KV label="What he received (Eve's E)" value={hexOf(mitm.bob?.B_received)} accent />
                        <KV label="Bob's 'shared' key K" value={hexOf(mitm.bob?.K)} />
                      </div>
                    </div>

                    <EveMITMPanel mitm={mitm} />
                  </>
                )}
              </div>
            )}

            {/* ── CDH Hardness Tab ──────────────────────────────────────────── */}
            {tab === 'cdh' && (
              <div className="space-y-5">
                <Card title="How CDH Hardness Protects DH">
                  <p className="text-sm text-(--text)/70 leading-relaxed">
                    Security of DH relies on the <strong className="text-white">Computational
                    Diffie-Hellman (CDH)</strong> problem: given g<sup>a</sup> mod p and
                    g<sup>b</sup> mod p, computing g<sup>ab</sup> mod p without knowing a or b.
                    &nbsp; For small q (≤ 2<sup>20</sup>) we can brute-force the discrete log
                    of A to recover a, then compute K = B<sup>a</sup>.
                    &nbsp; For 2048-bit groups this would require 2<sup>1024</sup> operations.
                  </p>
                  <p className="text-xs text-amber-400/80 italic mt-2">
                    Use the toy params (16–32 bit) or Group Params tab to generate small params for a fast demo.
                    First run an Exchange in the DH Exchange tab to get A and B values.
                  </p>
                </Card>

                <CDHBrutePanel
                  params={params}
                  exchange={exchange}
                  onRun={runCDH}
                  loading={cdhLoading}
                  result={cdhResult}
                  error={cdhError}
                />
              </div>
            )}

            {/* ── Params Tab ────────────────────────────────────────────────── */}
            {tab === 'params' && (
              <ParamsPanel
                params={params}
                onGenerate={loadParams}
                loading={paramsLoading}
                bits={paramsBits}
                setBits={setParamsBits}
              />
            )}

          </div>
        </div>
      </section>
    </main>
  )
}
