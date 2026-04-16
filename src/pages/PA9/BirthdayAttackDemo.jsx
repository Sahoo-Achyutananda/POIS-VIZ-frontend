import { useState, useMemo, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'
import {
  theoreticalCDF, empiricalCDF, birthdayBound,
  md5Context, sha1Context,
} from '../../conversions/pa9/theory'

// ── constants ────────────────────────────────────────────────────────────────

const BIT_OPTIONS = [8, 10, 12, 14, 16]
const MODE_OPTIONS = [
  { key: 'naive', label: 'Naive (Dict)', desc: 'Hash random inputs into a dict; detect first repeated output. Uses O(2^n/2) space.' },
  { key: 'floyd', label: "Floyd's Cycle", desc: 'Tortoise-and-hare on f(x)=H(x). Detects cycle without storing all intermediates.' },
]

// ── small helpers ─────────────────────────────────────────────────────────────

function hex2(n) { return n !== undefined ? `0x${n.toString(16).padStart(4, '0')}` : '—' }
function pct(ratio) { return ratio !== undefined ? `${(ratio * 100).toFixed(1)}%` : '—' }

// ── sub-components ────────────────────────────────────────────────────────────

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:border-(--accent-border) hover:shadow-(--shadow) ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ children }) {
  return (
    <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
      {children}
    </h3>
  )
}

function InfoRow({ label, value, mono = true }) {
  return (
    <p className="my-1 text-xs text-(--text)">
      <strong className="text-(--text-h)">{label}:</strong>{' '}
      <span className={mono ? 'font-mono' : ''}>{value}</span>
    </p>
  )
}

// Collision set-diagram with SVG arrows (same as PA8 modal)
function SetDiagram({ msgA, msgB, hashVal, nBits }) {
  if (msgA === undefined || msgB === undefined) return null
  return (
    <div className="flex items-center gap-2 mt-3">
      {/* Inputs */}
      <div className="flex flex-col gap-2">
        <div className="rounded-md border border-(--accent-border) bg-(--accent-bg) px-3 py-1.5 font-mono text-xs text-(--text-h)">
          x₁ = {msgA}
        </div>
        <div className="rounded-md border border-(--accent-border) bg-(--accent-bg) px-3 py-1.5 font-mono text-xs text-(--text-h)">
          x₂ = {msgB}
        </div>
      </div>

      {/* SVG arrows */}
      <svg width="60" height="52" className="flex-shrink-0" aria-hidden>
        <defs>
          <marker id="arr9" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="currentColor" className="text-(--accent-border)" />
          </marker>
        </defs>
        <line x1="2"  y1="13" x2="52" y2="26" stroke="currentColor" strokeWidth="1.5"
              strokeDasharray="4 3" markerEnd="url(#arr9)" className="text-(--accent-border)" />
        <line x1="2"  y1="39" x2="52" y2="26" stroke="currentColor" strokeWidth="1.5"
              strokeDasharray="4 3" markerEnd="url(#arr9)" className="text-(--accent-border)" />
        <text x="8" y="29" fontSize="9" fill="currentColor" className="text-(--text)">H</text>
      </svg>

      {/* Shared output */}
      <div className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs text-emerald-300">
        H(x) = {hex2(hashVal)}{' '}
        <span className="text-[10px] text-emerald-400/70">({nBits}-bit)</span>
      </div>
    </div>
  )
}

// Progress bar toward birthday bound
function BoundBar({ iterations, bound }) {
  if (!bound || !iterations) return null
  const pctVal = Math.min(1, iterations / bound)
  const overBound = iterations > bound
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-[10px] text-(--text)">
        <span>0</span>
        <span className={overBound ? 'text-amber-400' : 'text-emerald-400'}>
          {iterations} iterations ({pct(pctVal)} of bound 2^(n/2)={bound})
        </span>
        <span>{bound}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-(--social-bg)">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${overBound ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${Math.min(100, pctVal * 100)}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-(--text)">
        {overBound ? '⚠ Took longer than expected — birthday attacks are probabilistic!' : '✓ Found within expected birthday bound'}
      </p>
    </div>
  )
}

// Recharts custom tooltip
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-(--border) bg-(--bg) px-3 py-2 text-xs shadow-(--shadow)">
      <p className="font-semibold text-(--text-h) mb-1">k = {label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {(entry.value * 100).toFixed(1)}%
        </p>
      ))}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────

export default function BirthdayAttackDemo() {
  const [nBits, setNBits]     = useState(12)
  const [mode,  setMode]      = useState('naive')
  const [result, setResult]   = useState(null)
  const [trials, setTrials]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [trialsLoading, setTrialsLoading] = useState(false)
  const [error, setError]     = useState('')

  // Theoretical CDF — computed client-side
  const theoCDF = useMemo(() => theoreticalCDF(nBits), [nBits])
  const bound   = useMemo(() => birthdayBound(nBits), [nBits])
  const empCDF  = useMemo(
    () => trials ? empiricalCDF(trials.counts, nBits) : [],
    [trials, nBits]
  )

  // Merge theory + empirical into one dataset for Recharts
  const chartData = useMemo(() => {
    if (empCDF.length === 0) return theoCDF.map(p => ({ ...p, empirical: undefined }))
    // Zip by k — theoretical has more points so we left-join
    const empMap = new Map(empCDF.map(p => [p.k, p.probability]))
    return theoCDF.map(p => ({
      k: p.k,
      theoretical: p.probability,
      empirical: empMap.get(p.k),
    }))
  }, [theoCDF, empCDF])

  const md5  = useMemo(() => md5Context(),  [])
  const sha1 = useMemo(() => sha1Context(), [])

  const handleAttack = useCallback(async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.post('/api/pa9/attack', { n_bits: nBits, mode })
      setResult(res.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Attack failed')
    } finally {
      setLoading(false)
    }
  }, [nBits, mode])

  const handleTrials = useCallback(async () => {
    setTrialsLoading(true)
    setError('')
    setTrials(null)
    try {
      const res = await api.post('/api/pa9/trials', { n_bits: nBits, num_trials: 100 })
      setTrials(res.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Trials failed')
    } finally {
      setTrialsLoading(false)
    }
  }, [nBits])

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">

        {/* ── Header ── */}
        <PageHeader title="CS8.401 Minicrypt Clique Explorer - PA9: Birthday Attack & Collision Finding" />

        {/* ── Section 1: Parameters ── */}
        <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">

          {/* Output bit-length selector */}
          <Card>
            <CardHeader>Output Bit-Length n</CardHeader>
            <div className="flex flex-wrap gap-2 p-3">
              {BIT_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => { setNBits(n); setResult(null); setTrials(null) }}
                  className={`rounded-md border px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                    nBits === n
                      ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h) shadow-(--shadow)'
                      : 'border-(--border) bg-(--bg) text-(--text) hover:border-(--accent-border)'
                  }`}
                >
                  {n}-bit
                </button>
              ))}
            </div>
            <div className="border-t border-dashed border-(--border) px-3 py-2">
              <p className="text-xs text-(--text)">
                Hash space: <span className="font-mono text-(--text-h)">2^{nBits} = {(1 << nBits).toLocaleString()}</span>
                {' · '}Birthday bound: <span className="font-mono text-emerald-400">≈ {bound}</span> queries
              </p>
            </div>
          </Card>

          {/* Mode selector */}
          <Card>
            <CardHeader>Attack Mode</CardHeader>
            <div className="flex flex-col gap-2 p-3">
              {MODE_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setMode(opt.key); setResult(null) }}
                  className={`text-left rounded-md border p-3 transition-all duration-200 ${
                    mode === opt.key
                      ? 'border-(--accent-border) bg-(--accent-bg) shadow-(--shadow)'
                      : 'border-(--border) bg-(--bg) hover:border-(--accent-border) hover:-translate-y-0.5'
                  }`}
                >
                  <p className="text-xs font-semibold text-(--text-h)">{opt.label}</p>
                  <p className="text-xs mt-0.5 text-(--text)/80">{opt.desc}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Section 2: Runner + Result ── */}
        <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">

          {/* Left: Action buttons + quick info */}
          <Card>
            <CardHeader>Run Attack</CardHeader>
            <div className="p-3 space-y-3">
              <InfoRow label="Selected mode" value={MODE_OPTIONS.find(m => m.key === mode)?.label} mono={false} />
              <InfoRow label="Output bits"   value={`n = ${nBits}  →  2^${nBits} = ${(1 << nBits).toLocaleString()} buckets`} />
              <InfoRow label="Expected 1st collision" value={`≈ 2^(${nBits}/2) = ${bound} queries`} />

              <div className="flex flex-wrap gap-2 pt-1">
                <Btn onClick={handleAttack} disabled={loading}>
                  {loading ? 'Running...' : '▶ Run Attack'}
                </Btn>
                <Btn variant="secondary" onClick={handleTrials} disabled={trialsLoading}>
                  {trialsLoading ? 'Running 100 trials...' : '📊 Run 100 Trials'}
                </Btn>
              </div>

              {error && (
                <p className="text-xs text-rose-400 font-mono">{error}</p>
              )}

              {trials && !trialsLoading && (
                <div className="rounded-md border border-dashed border-(--border) bg-(--social-bg) px-3 py-2 mt-1">
                  <p className="text-xs font-semibold text-(--text-h) mb-1">Trial Summary (100 runs, n={trials.n_bits})</p>
                  <InfoRow label="Mean iterations" value={trials.mean} />
                  <InfoRow label="Expected bound"  value={trials.expected_bound} />
                  <InfoRow label="Empirical/Theory ratio" value={trials.ratio} />
                  <p className="text-[10px] text-(--text) mt-1 italic">Curve plotted below ↓</p>
                </div>
              )}
            </div>
          </Card>

          {/* Right: Collision result */}
          <Card>
            <CardHeader>
              {result?.found ? '🎉 Collision Found!' : 'Collision Result'}
            </CardHeader>
            <div className="p-3">
              {!result && !loading && (
                <p className="text-xs text-(--text) italic">
                  Click "Run Attack" to see the collision. For n={nBits} bits, expect a result in ≈ {bound} random hash evaluations.
                </p>
              )}
              {loading && (
                <p className="text-xs text-(--text) animate-pulse">Hashing random inputs… searching for collision…</p>
              )}
              {result && (
                <>
                  {result.found ? (
                    <>
                      <SetDiagram
                        msgA={result.msg_a}
                        msgB={result.msg_b}
                        hashVal={result.hash_val}
                        n_bits={nBits}
                      />
                      <BoundBar iterations={result.iterations} bound={result.birthday_bound} />
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <InfoRow label="Iterations"      value={result.iterations} />
                        <InfoRow label="Bound 2^(n/2)"   value={result.birthday_bound} />
                        <InfoRow label="Ratio"           value={result.ratio} />
                        <InfoRow label="Hash value"      value={hex2(result.hash_val)} />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-amber-400">
                      No collision found within {result.iterations} iterations. (Very rare — try again!)
                    </p>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>

        {/* ── Section 3: Birthday Curve Chart ── */}
        <Card className="mb-3">
          <CardHeader>Birthday Curve — P(collision within k queries) vs k</CardHeader>
          <div className="p-3">
            <p className="text-xs text-(--text) mb-3">
              Theoretical: <span className="font-mono text-(--text-h)">P(k) = 1 − e^(−k(k−1)/2^n)</span>
              {trials ? ' · Empirical from 100 trials shown in amber.' : ' · Run 100 Trials to see the empirical overlay.'}
            </p>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="k"
                  tick={{ fill: 'var(--text)', fontSize: 10 }}
                  label={{ value: 'Queries k', position: 'insideBottom', offset: -2, fill: 'var(--text)', fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                  tick={{ fill: 'var(--text)', fontSize: 10 }}
                  width={42}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: 'var(--text)' }}
                />

                {/* Birthday bound vertical marker */}
                <ReferenceLine
                  x={bound}
                  stroke="var(--accent-border)"
                  strokeDasharray="4 3"
                  label={{ value: `2^(n/2)=${bound}`, position: 'top', fill: 'var(--text)', fontSize: 9 }}
                />

                {/* 50% probability horizontal marker */}
                <ReferenceLine
                  y={0.5}
                  stroke="#888"
                  strokeDasharray="2 2"
                />

                <Line
                  type="monotone"
                  dataKey="theoretical"
                  name="Theoretical CDF"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                {trials && (
                  <Line
                    type="monotone"
                    dataKey="empirical"
                    name="Empirical CDF (100 trials)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ── Section 4: MD5 / SHA-1 Context ── */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {[md5, sha1].map(ctx => (
            <Card key={ctx.name}>
              <CardHeader>{ctx.name} Context (n = {ctx.n_bits} bits)</CardHeader>
              <div className="p-3 space-y-1.5">
                <InfoRow label="Birthday bound" value={ctx.boundLabel} />
                <InfoRow label="At 10⁹ hashes/s" value={`≈ ${ctx.years} years`} mono={false} />
                <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <p className="text-xs text-amber-300">{ctx.note}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

      </section>
    </main>
  )
}
