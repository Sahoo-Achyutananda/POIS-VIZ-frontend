import { useState, useCallback, useEffect, useRef } from 'react'
import axios from 'axios'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'
import Tabs from '../../components/Tabs'

// PA13-specific axios instance with a 5-minute timeout for large prime generation
const pa13api = axios.create({
  baseURL: api.defaults.baseURL,
  timeout: 300_000, // 5 minutes — 2048-bit prime generation can take a while
})

// ── Utility helpers ────────────────────────────────────────────────────────────

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

function truncate(num, maxLen = 38) {
  const s = String(num)
  if (s.length <= maxLen) return s
  return `${s.slice(0, 16)}…${s.slice(-16)}`
}

function Badge({ label, variant = 'default' }) {
  const colors = {
    prime:     'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
    composite: 'bg-rose-500/20 border-rose-500/50 text-rose-300',
    default:   'bg-slate-500/20 border-slate-500/50 text-slate-300',
    warn:      'bg-amber-500/20 border-amber-500/50 text-amber-300',
  }
  return (
    <span className={cx(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider',
      colors[variant] || colors.default
    )}>
      {label}
    </span>
  )
}

function InfoBox({ children, accent = false }) {
  return (
    <div className={cx(
      'rounded-xl border px-3 py-2 font-mono text-xs break-all leading-relaxed',
      accent
        ? 'border-(--accent-border) bg-(--accent-bg) text-white'
        : 'border-(--border) bg-(--code-bg) text-(--text)'
    )}>
      {children}
    </div>
  )
}

function SectionCard({ title, children, className = '' }) {
  return (
    <div className={cx('rounded-xl border border-(--border) overflow-hidden', className)}>
      <div className="border-b border-(--border) bg-(--code-bg) px-4 py-2.5">
        <h3 className="text-sm font-black uppercase tracking-widest text-white">{title}</h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}

// ── Round Trace Row ────────────────────────────────────────────────────────────

function RoundRow({ round, n }) {
  const [open, setOpen] = useState(false)
  const isComp = round.verdict === 'COMPOSITE'
  // n may be a string (big int), so compare as strings
  const nStr = String(n)
  return (
    <div className={cx(
      'rounded-lg border transition-all',
      isComp ? 'border-rose-500/40 bg-rose-500/5' : 'border-emerald-500/20 bg-emerald-500/3'
    )}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-white">Round {round.i}</span>
          <span className="font-mono text-[11px] text-(--text)/70">
            a = {truncate(round.a, 20)}
          </span>
          <span className="font-mono text-[11px] text-(--text)/70">
            x₀ = a^d mod n = {truncate(round.x_init, 20)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge label={round.verdict} variant={isComp ? 'composite' : 'prime'} />
          <span className="text-[11px] text-(--text)/50">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-(--border)/40 px-3 py-2 space-y-1">
          <p className="text-[11px] text-(--text)/60 uppercase tracking-widest font-black mb-1">
            x² mod n sequence:
          </p>
          {round.x_history.map((x, idx) => (
            <div key={idx} className="flex items-center gap-2 font-mono text-[11px]">
              <span className="w-8 text-(--text)/40">x{idx}</span>
              <span className="text-white">{truncate(x, 36)}</span>
              {x === '1' && <Badge label="≡ 1" variant="prime" />}
              {x === String(BigInt(nStr) - 1n) && <Badge label="≡ n−1" variant="prime" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Algorithm Steps Explainer ─────────────────────────────────────────────────

function AlgorithmCard({ s, d, n }) {
  return (
    <SectionCard title="Algorithm Decomposition">
      <div className="space-y-2 text-sm text-(--text)">
        <div className="flex items-start gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-(--accent-bg) border border-(--accent-border) text-[11px] font-black text-white flex items-center justify-center">1</span>
          <span>Write <span className="font-mono text-white">n−1 = 2<sup>s</sup> · d</span> with d odd.</span>
        </div>
        {s !== undefined && d !== undefined && (
          <div className="ml-7 rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 font-mono text-xs text-white">
            n−1 = 2<sup>{s}</sup> · {truncate(d)} &nbsp;&nbsp;→&nbsp; s={s}, d={truncate(d)}
          </div>
        )}
        <div className="flex items-start gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-(--accent-bg) border border-(--accent-border) text-[11px] font-black text-white flex items-center justify-center">2</span>
          <span>For each round: choose random <span className="font-mono text-white">a ∈ {'{2,…,n−2}'}</span>.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-(--accent-bg) border border-(--accent-border) text-[11px] font-black text-white flex items-center justify-center">3</span>
          <span>Compute <span className="font-mono text-white">x ← a<sup>d</sup> mod n</span>. If x=1 or x=n−1: continue.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-(--accent-bg) border border-(--accent-border) text-[11px] font-black text-white flex items-center justify-center">4</span>
          <span>For r = 1 to s−1: square x. If x=n−1: break. If x≠n−1 at end: <Badge label="COMPOSITE" variant="composite" />.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-black text-emerald-300 flex items-center justify-center">5</span>
          <span>All rounds pass → <Badge label="PROBABLY PRIME" variant="prime" />. Error ≤ 4<sup>−k</sup>.</span>
        </div>
      </div>
    </SectionCard>
  )
}

// ── Tab 1: Primality Tester ───────────────────────────────────────────────────

function PrimalityTester({ examples }) {
  const [input, setInput] = useState('561')
  const [rounds, setRounds] = useState(10)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = useCallback(async (nStr, k) => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await pa13api.post('/api/pa13/test', { n: nStr, k: Number(k) })
      setResult(res.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleTest = () => run(input, rounds)

  const isPrime = result?.result === 'PROBABLY_PRIME'

  return (
    <div className="space-y-5">
      {/* Input row */}
      <SectionCard title="Primality Input">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-white">
              Integer n (any integer up to 20 digits)
            </label>
            <input
              id="pa13-n-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTest()}
              className="w-full rounded-xl border border-(--border) bg-(--code-bg) p-3 font-mono text-sm text-white outline-none focus:border-(--accent-border) transition-all"
              placeholder="Enter any integer…"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-white">
              Rounds k (1–40) &nbsp;
              <span className="font-normal normal-case text-(--text)/60">
                error ≤ 4<sup>-k</sup>
              </span>
            </label>
            <input
              id="pa13-rounds-slider"
              type="range"
              min={1}
              max={40}
              value={rounds}
              onChange={e => setRounds(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
            <p className="text-center font-mono text-xs text-white">k = {rounds} &nbsp; (error ≈ {(4 ** -rounds).toExponential(1)})</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Btn onClick={handleTest} disabled={loading} id="pa13-test-btn">
            {loading ? 'Testing…' : 'Test'}
          </Btn>
          {error && <p className="text-xs text-rose-400 font-black self-center animate-pulse">{error}</p>}
        </div>
      </SectionCard>

      {/* Pre-loaded examples */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {examples.map(ex => (
          <button
            key={ex.nStr}
            type="button"
            onClick={() => { setInput(ex.nStr); run(ex.nStr, rounds) }}
            className={cx(
              'rounded-xl border px-3 py-2 text-left text-xs transition-all hover:-translate-y-0.5 hover:shadow-(--shadow)',
              ex.expected === 'PROBABLY_PRIME'
                ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
                : 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60'
            )}
          >
            <p className="font-black text-white mb-0.5">{ex.label}</p>
            <p className="text-(--text)/60 leading-tight">{ex.note}</p>
          </button>
        ))}
      </div>

      {/* Result */}
      {result && (
        <>
          {/* Verdict banner */}
          <div className={cx(
            'rounded-2xl border-2 p-5 flex flex-col items-center gap-2 transition-all',
            isPrime
              ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.1)]'
              : 'border-rose-500/50 bg-rose-500/10 shadow-[0_0_40px_rgba(244,63,94,0.1)]'
          )}>
            <p className={cx('text-4xl font-black tracking-tight', isPrime ? 'text-emerald-400' : 'text-rose-400')}>
              {isPrime ? 'PROBABLY PRIME' : 'COMPOSITE'}
            </p>
            <p className="font-mono text-sm text-(--text)/70 break-all text-center">
              n = {truncate(result.n, 48)}
            </p>
            <div className="flex gap-3 flex-wrap justify-center text-xs text-(--text)/60">
              <span>k = {result.k} rounds</span>
              <span>s = {result.s}</span>
              <span>d = {truncate(result.d)}</span>
              {isPrime && (
                <span className="text-emerald-400/70">
                  error probability ≤ 4<sup>-{result.k}</sup> ≈ {(4 ** -result.k).toExponential(1)}
                </span>
              )}
            </div>
          </div>

          {/* Algorithm decomposition */}
          <AlgorithmCard s={result.s} d={result.d} n={result.n} />

          {/* Per-round witness trace */}
          {result.rounds?.length > 0 && (
            <SectionCard title={`Witness Trace — ${result.rounds.length} Round${result.rounds.length > 1 ? 's' : ''}`}>
              <div className="space-y-2">
                {result.rounds.map(r => (
                  <RoundRow key={r.i} round={r} n={result.n} />
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}

// ── Tab 2: Prime Generator ────────────────────────────────────────────────────

function PrimeGenerator() {
  const [bits, setBits] = useState(512)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sanity, setSanity] = useState(null)
  const [sanityLoading, setSanityLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  const startTimer = () => {
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
  }
  const stopTimer = () => {
    clearInterval(timerRef.current)
    timerRef.current = null
  }

  const generate = useCallback(async () => {
    setLoading(true)
    setError('')
    setResult(null)
    startTimer()
    try {
      const res = await pa13api.post('/api/pa13/gen-prime', { bits, k: 40 })
      setResult(res.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Generation failed — try a smaller bit size or fewer rounds')
    } finally {
      stopTimer()
      setLoading(false)
    }
  }, [bits])

  const runSanity = useCallback(async (prime) => {
    if (!prime) return
    setSanityLoading(true)
    setSanity(null)
    try {
      const res = await pa13api.post('/api/pa13/sanity-check', {
        prime,           // the SAME prime from gen_prime
        sanity_rounds: 100,
      })
      setSanity(res.data)
    } catch (e) {
      setSanity({ error: e?.response?.data?.detail || 'Sanity check failed' })
    } finally {
      setSanityLoading(false)
    }
  }, [])

  return (
    <div className="space-y-5">
      <SectionCard title="Generate a Random Prime">
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-white">
            Bit length: {bits} bits
          </label>
          <input
            type="range"
            min={8}
            max={2048}
            step={8}
            value={bits}
            onChange={e => setBits(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
          <div className="flex gap-2 flex-wrap">
            {[64, 128, 256, 512, 1024, 2048].map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setBits(b)}
                className={cx(
                  'rounded-lg border px-3 py-1 text-xs font-black transition-all hover:-translate-y-0.5',
                  bits === b
                    ? 'border-(--accent-border) bg-(--accent-bg) text-white'
                    : 'border-(--border) bg-(--code-bg) text-(--text) hover:border-(--accent-border)'
                )}
              >
                {b}-bit
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 flex-wrap items-center mt-4">
          <Btn onClick={generate} disabled={loading} id="pa13-gen-btn">
            {loading ? `Generating… (${elapsed}s)` : `Generate ${bits}-bit Prime`}
          </Btn>
        </div>
        {bits >= 1024 && loading && (
          <p className="text-xs text-amber-400/80 italic mt-2">
            ⏳ {bits}-bit prime generation may take 30–120 seconds — please wait…
          </p>
        )}
        {error && <p className="text-xs text-rose-400 font-black animate-pulse mt-2">{error}</p>}
      </SectionCard>

      {/* Sanity check button — only shown once a prime is generated */}
      {result && (
        <div className="flex gap-3 flex-wrap items-center rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3">
          <Btn
            onClick={() => runSanity(result.prime)}
            disabled={sanityLoading}
            id="pa13-sanity-btn"
            variant="secondary"
          >
            {sanityLoading ? 'Checking…' : '✓ Sanity Check — re-test same prime with k=100'}
          </Btn>
          <span className="text-xs text-(--text)/50 italic">
            Generated with k=40 → verify passes k=100
          </span>
        </div>
      )}

      {result && (
        <SectionCard title="Generated Prime">
          <div className="space-y-2">
            <InfoBox accent>
              {result.prime_hex}
            </InfoBox>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              {[
                { label: 'Bit length', value: `${result.bits} bits` },
                { label: 'Candidates tried', value: result.candidates_tried },
                { label: 'Time taken', value: `${result.time_ms} ms` },
                { label: 'Sanity (100 rounds)', value: result.sanity_100_rounds ? '✓ PASS' : '✗ FAIL',
                  color: result.sanity_100_rounds ? 'text-emerald-400' : 'text-rose-400' },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-(--border) bg-(--code-bg) p-3">
                  <p className="text-[11px] uppercase tracking-widest text-(--text)/50 font-black">{s.label}</p>
                  <p className={cx('text-lg font-black mt-1', s.color || 'text-white')}>{s.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-(--text)/50 italic">
              Expected candidates ≈ ln(2) × {result.bits} ≈ {Math.round(Math.log(2) * result.bits)} (Prime Number Theorem).
              Actual: {result.candidates_tried}.
            </p>
          </div>
        </SectionCard>
      )}

      {sanity && !sanity.error && (
        <SectionCard title="Sanity Check — Same Prime Re-tested with k=100 Rounds">
          {/* Concept explanation */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 space-y-1 mb-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-blue-300">What is the Sanity Check?</p>
            <p className="text-xs text-(--text)/70 leading-relaxed">
              <span className="text-white font-semibold">gen_prime</span> found this prime using
              <span className="font-mono text-white"> k=40</span> Miller-Rabin rounds (error ≤ 4⁻⁴⁰ ≈ 10⁻²⁴).
              The sanity check re-runs the <em>same prime</em> through
              <span className="font-mono text-white"> k=100</span> independent rounds — a stricter test —
              to verify the output is correct. All 100 rounds must return PROBABLY_PRIME.
            </p>
          </div>

          {/* Verdict */}
          <div className={cx(
            'rounded-xl border-2 px-4 py-3 text-center space-y-1 mb-3',
            sanity.all_passed
              ? 'border-emerald-500/50 bg-emerald-500/10'
              : 'border-rose-500/50 bg-rose-500/10'
          )}>
            <p className={cx('text-2xl font-black', sanity.all_passed ? 'text-emerald-400' : 'text-rose-400')}>
              {sanity.all_passed ? '✓ SANITY PASSED' : '✗ SANITY FAILED'}
            </p>
            <p className="text-xs text-(--text)/60 font-mono break-all">
              prime = {truncate(sanity.prime, 40)}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-3">
            {[
              { label: 'Generation rounds', value: `k = ${sanity.generation_rounds}`, color: 'text-slate-300' },
              { label: 'Sanity rounds',     value: `k = ${sanity.sanity_rounds}`,     color: 'text-purple-300' },
              { label: 'Rounds passed',     value: `${sanity.passed_rounds} / ${sanity.sanity_rounds}`, color: 'text-emerald-400' },
              { label: 'Time (k=100)',      value: `${sanity.time_ms} ms`,            color: 'text-white' },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-(--border) bg-(--code-bg) p-3">
                <p className="text-[10px] uppercase tracking-widest text-(--text)/50 font-black">{s.label}</p>
                <p className={cx('font-black text-lg mt-1', s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Full witness trace — all 100 rounds via RoundRow, same as Primality Tester */}
          {sanity.rounds?.length > 0 && (
            <SectionCard title={`Witness Trace — All ${sanity.rounds.length} Sanity Rounds`}>
              <div className="space-y-2">
                {sanity.rounds.map(r => (
                  <RoundRow key={r.i} round={r} n={sanity.prime} />
                ))}
              </div>
            </SectionCard>
          )}

          {sanity.all_passed && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center mt-2">
              <p className="text-emerald-300 font-black text-sm">
                ✓ The prime generated with k=40 correctly passes all k=100 sanity rounds.
              </p>
              <p className="text-xs text-emerald-300/60 mt-1">
                Error probability for k=100: ≤ 4⁻¹⁰⁰ ≈ {(4 ** -100).toExponential(1)}
              </p>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  )
}

// ── Tab 3: Carmichael Demo ────────────────────────────────────────────────────

function CarmichaelDemo() {
  const [n, setN] = useState(561)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = useCallback(async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.post('/api/pa13/carmichael-demo', { n: Number(n), k: 20 })
      setResult(res.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [n])

  const KNOWN = [561, 1105, 1729, 2465, 2821]

  return (
    <div className="space-y-5">
      <SectionCard title="Carmichael Number Demo">
        <p className="text-sm text-(--text)/70 leading-relaxed">
          Carmichael numbers pass <strong className="text-white">all</strong> Fermat witnesses a<sup>n−1</sup> ≡ 1 (mod n)
          despite being composite. Miller-Rabin correctly identifies them.
        </p>
        <div className="flex gap-2 flex-wrap">
          {KNOWN.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setN(v)}
              className={cx(
                'rounded-lg border px-3 py-1 text-xs font-black transition-all hover:-translate-y-0.5',
                n === v
                  ? 'border-amber-500/60 bg-amber-500/20 text-amber-300'
                  : 'border-(--border) bg-(--code-bg) text-(--text)'
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={n}
          onChange={e => setN(e.target.value)}
          className="w-full rounded-xl border border-(--border) bg-(--code-bg) p-3 font-mono text-sm text-white outline-none focus:border-(--accent-border) transition-all"
          min={3}
        />
        <Btn onClick={run} disabled={loading} id="pa13-carmichael-btn">
          {loading ? 'Running…' : 'Run Carmichael Demo'}
        </Btn>
        {error && <p className="text-xs text-rose-400 font-black animate-pulse">{error}</p>}
      </SectionCard>

      {result && (
        <>
          <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xl font-black text-amber-300">n = {result.n}</p>
              <div className="flex gap-2">
                <Badge label={result.is_carmichael ? 'Carmichael' : 'Not Carmichael'} variant="warn" />
                <Badge label={result.miller_rabin_result} variant={result.miller_rabin_result === 'COMPOSITE' ? 'composite' : 'prime'} />
              </div>
            </div>
            <p className="font-mono text-xs text-(--text)/60">
              Factors: {result.factors.join(' × ')}
            </p>
            <p className="text-sm text-white font-bold">{result.message}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Fermat Test Results (sample bases)">
              <p className="text-xs text-(--text)/60 mb-2">
                a<sup>n−1</sup> mod n for a = 2 … 19 (coprime to n)
              </p>
              <div className="space-y-1">
                {result.fermat_witnesses_sample.map(w => (
                  <div key={w.a} className="flex items-center justify-between px-2 py-1 rounded-lg bg-(--code-bg) border border-(--border)">
                    <span className="font-mono text-xs text-(--text)/70">a = {w.a}</span>
                    <Badge
                      label={w.result}
                      variant={w.result === 'passes' ? 'prime' : 'composite'}
                    />
                  </div>
                ))}
              </div>
              {result.fermat_all_pass && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs font-black text-amber-300 mt-2">
                  ⚠ ALL Fermat witnesses pass — Naïve Fermat would call this PRIME!
                </div>
              )}
            </SectionCard>

            <SectionCard title="Miller-Rabin Witness Trace">
              <div className="flex gap-3 text-xs font-mono text-(--text)/60 mb-2">
                <span>s = {result.s}</span>
                <span>d = {truncate(result.d)}</span>
              </div>
              <div className="space-y-2">
                {result.miller_rabin_rounds?.map(r => (
                  <RoundRow key={r.i} round={r} n={result.n} />
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tab 4: Benchmark ──────────────────────────────────────────────────────────

function Benchmark() {
  const [bits, setBits] = useState([512, 1024, 2048])
  const [trials, setTrials] = useState(3)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  const SIZES = [64, 128, 256, 512, 1024, 2048]

  const toggleBit = b => {
    setBits(prev =>
      prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b].sort((a, z) => a - z)
    )
  }

  const run = useCallback(async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      const res = await pa13api.post('/api/pa13/benchmark', { bits_list: bits, trials, k: 40 })
      setResult(res.data.results)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Benchmark failed')
    } finally {
      clearInterval(timerRef.current)
      setLoading(false)
    }
  }, [bits, trials])

  return (
    <div className="space-y-5">
      <SectionCard title="Performance Benchmark">
        <p className="text-sm text-(--text)/70 leading-relaxed">
          Compare average candidates sampled before finding a probable prime at different bit lengths.
          Prime Number Theorem predicts O(ln n) = O(bits × ln 2) candidates.
        </p>

        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-white">Select bit sizes:</p>
          <div className="flex gap-2 flex-wrap">
            {SIZES.map(b => (
              <button
                key={b}
                type="button"
                onClick={() => toggleBit(b)}
                className={cx(
                  'rounded-lg border px-3 py-1 text-xs font-black transition-all hover:-translate-y-0.5',
                  bits.includes(b)
                    ? 'border-(--accent-border) bg-(--accent-bg) text-white'
                    : 'border-(--border) bg-(--code-bg) text-(--text)'
                )}
              >
                {b}-bit
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-widest text-white">
            Trials per size: {trials}
          </label>
          <input
            type="range" min={1} max={5} value={trials}
            onChange={e => setTrials(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
          <p className="text-[11px] text-(--text)/50">
            Max 5 trials per size. 2048-bit at trials=3 may take 3–5 minutes.
          </p>
        </div>

        <Btn onClick={run} disabled={loading || bits.length === 0} id="pa13-bench-btn">
          {loading ? `Benchmarking… (${elapsed}s)` : 'Run Benchmark'}
        </Btn>
        {error && <p className="text-xs text-rose-400 font-black animate-pulse">{error}</p>}
        {loading && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 space-y-1">
            <p className="text-xs text-amber-300 font-black animate-pulse">
              ⏳ Generating primes — elapsed: {elapsed}s
            </p>
            {bits.includes(2048) && (
              <p className="text-[11px] text-amber-300/70">
                2048-bit prime search is CPU-intensive. Each candidate requires k=40 rounds of
                modular exponentiation on 2048-bit numbers. Expected wait: 2–5 min.
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {result && (
        <SectionCard title="Benchmark Results">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-(--border)">
                  {['Bits', 'Avg Candidates', 'Theory O(ln n)', 'Avg Time (ms)', 'Total (ms)', 'Min', 'Max'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-black uppercase tracking-wider text-(--text)/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)/50">
                {result.map(r => (
                  <tr key={r.bits} className="hover:bg-(--code-bg)/30 transition-colors">
                    <td className="px-3 py-2 font-black text-white">{r.bits}</td>
                    <td className="px-3 py-2 font-mono text-white">{r.avg_candidates}</td>
                    <td className="px-3 py-2 font-mono text-(--text)/70">{r.theoretical_candidates}</td>
                    <td className="px-3 py-2 font-mono text-white">{r.avg_time_ms}</td>
                    <td className="px-3 py-2 font-mono text-(--text)/60">{r.total_time_ms}</td>
                    <td className="px-3 py-2 font-mono text-emerald-300">{r.min_time_ms}</td>
                    <td className="px-3 py-2 font-mono text-rose-300">{r.max_time_ms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-(--text)/50 italic">
            Theoretical O(ln n) = bits × ln(2). Actual candidates should be within a small constant factor of this,
            matching the Prime Number Theorem prediction.
          </p>
        </SectionCard>
      )}
    </div>
  )
}

// ── Main Page Component ───────────────────────────────────────────────────────

const TABS = [
  { key: 'tester',     label: '🔬 Primality Tester' },
  { key: 'generator',  label: '⚡ Prime Generator'   },
  { key: 'carmichael', label: '🎭 Carmichael Demo'   },
  { key: 'benchmark',  label: '📊 Benchmark'         },
]

const PRELOADED_EXAMPLES = [
  {
    label: '561 — Carmichael Number',
    nStr: '561',
    expected: 'COMPOSITE',
    note: 'Fooled by Fermat but caught by Miller-Rabin',
  },
  {
    label: 'Known 512-bit Prime',
    nStr: '7243413161848525865872445031533458308431753001951822396024145560658339833568164234371269626501458208870039666073351032235971413868885444122045066705058737',
    expected: 'PROBABLY_PRIME',
    note: 'True 512-bit prime — verified with 100 Miller-Rabin rounds',
  },
  {
    label: 'Known Composite',
    nStr: '99999999999999999990',
    expected: 'COMPOSITE',
    note: 'Even — definitely composite',
  },
]

export default function MillerRabinDemo() {
  const [activeTab, setActiveTab] = useState('tester')

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer — PA#13: Miller-Rabin Primality Testing" />

        {/* Theory Banner */}
        <div className="mb-4 rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 space-y-1">
          <p className="text-[13px] font-black uppercase tracking-widest text-white">Algorithm Overview</p>
          <p className="text-sm text-(--text)/70 leading-relaxed">
            Miller-Rabin is a <strong className="text-white">probabilistic</strong> test. It writes{' '}
            <span className="font-mono text-white">n−1 = 2<sup>s</sup>·d</span> then checks{' '}
            <span className="font-mono text-white">k</span> random witnesses{' '}
            <span className="font-mono text-white">a ∈ {'{2,…,n−2}'}</span>. If any witness exposes a failure
            the number is definitely <strong className="text-rose-400">COMPOSITE</strong>. Otherwise it is{' '}
            <strong className="text-emerald-400">PROBABLY PRIME</strong> with error probability ≤ 4<sup>−k</sup>.
            For k=40, error ≈ 10<sup>−24</sup>.
          </p>
        </div>

        {/* Tab bar */}
        <div className="mb-4 overflow-hidden rounded-xl border border-(--border)">
          <div className="border-b border-(--border) bg-(--code-bg) px-4 py-2.5">
            <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          <div className="p-4 min-h-[400px]">
            {activeTab === 'tester'     && <PrimalityTester examples={PRELOADED_EXAMPLES} />}
            {activeTab === 'generator'  && <PrimeGenerator />}
            {activeTab === 'carmichael' && <CarmichaelDemo />}
            {activeTab === 'benchmark'  && <Benchmark />}
          </div>
        </div>


      </section>
    </main>
  )
}
