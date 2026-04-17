import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'
import Tabs from '../../components/Tabs'
import {
  theoreticalCDF, empiricalCDF, birthdayBound,
  md5Context, sha1Context,
} from '../../conversions/pa9/theory'

// ── constants ────────────────────────────────────────────────────────────────

const BIT_VALUES = [8, 10, 12, 14, 16]
const SPEED_OPTIONS = [
  { label: '0.5x', value: 400 },
  { label: '1x', value: 200 },
  { label: '2x', value: 80 },
  { label: '5x', value: 20 },
]

const DEMO_TABS = [
  { key: 'player', label: 'Collision Hunter' },
  { key: 'graph', label: 'Birthday Curve' },
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
    <p className="my-1 text-[14px] text-(--text)">
      <strong className="text-(--text-h)">{label}:</strong>{' '}
      <span className={mono ? 'font-mono text-white' : 'text-white'}>{value}</span>
    </p>
  )
}

function SetDiagram({ msgA, msgB, hashVal, nBits }) {
  if (msgA === undefined || msgB === undefined) return null
  return (
    <div className="flex items-center gap-0">
      <div className="flex flex-col gap-6 flex-1">
        <div className="space-y-1">
          <p className="text-[13px] font-black uppercase tracking-widest text-slate-500 pl-1">Input A</p>
          <div className="rounded-lg border border-(--accent-border) bg-(--accent-bg) px-3 py-2 font-mono text-[13px] text-(--text-h) break-all leading-snug">
            {msgA}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[13px] font-black uppercase tracking-widest text-slate-500 pl-1">Input B</p>
          <div className="rounded-lg border border-(--accent-border) bg-(--accent-bg) px-3 py-2 font-mono text-[13px] text-(--text-h) break-all leading-snug">
            {msgB}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 w-24 h-24">
        <svg viewBox="0 0 110 110" width="100%" height="100%">
          <defs>
            <marker id="arr9-modal" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#6366f1" />
            </marker>
          </defs>
          <text x="55" y="56" textAnchor="middle" fill="#6366f1" fontSize="8" fontFamily="monospace" fontWeight="bold">H</text>
          <line x1="4" y1="28" x2="96" y2="55" stroke="#6366f1" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#arr9-modal)" />
          <line x1="4" y1="82" x2="96" y2="55" stroke="#6366f1" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#arr9-modal)" />
        </svg>
      </div>

      <div className="flex-1 space-y-1 self-center text-center">
        <p className="text-[11px] font-black uppercase tracking-widest text-emerald-500">Shared Hash</p>
        <div className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 px-3 py-3 font-mono text-[13px] font-black text-emerald-400 shadow-md">
          {hex2(hashVal)}
        </div>
        <p className="text-[13px] text-white/60 font-medium">{nBits}-bit hash collision</p>
      </div>
    </div>
  )
}

function CollisionModal({ isOpen, result, nBits, onBlur }) {
  if (!isOpen || !result) return null
  const bound = birthdayBound(nBits)
  const ratio = result.iterations / bound

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onBlur}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl border border-(--accent-border) bg-(--bg) shadow-[0_0_50px_rgba(99,101,241,0.2)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-(--border) bg-(--accent-bg) px-5 py-2">
          <h3 className="m-0 text-sm font-bold uppercase text-(--text-h)">Collision Isolated</h3>
          <Btn onClick={onBlur} size="sm" className="text-[13px] font-bold uppercase">X</Btn>
        </div>

        <div className="p-8 space-y-8">
          <SetDiagram msgA={result.msg_a} msgB={result.msg_b} hashVal={result.hash_val} nBits={nBits} />

          <div className="border-t border-(--border) pt-6 space-y-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
              <span className="text-(--text-h)">Search Statistics</span>
              <span className={ratio <= 1.2 ? 'text-emerald-500' : 'text-amber-500'}>
                {result.iterations} / {bound} expected
              </span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-slate-800 overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${ratio <= 1.2 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min((result.iterations / bound) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[14px] text-center text-(--text) italic leading-relaxed">
              Found after <span className="text-(--text-h) font-bold">{result.iterations}</span> random hash evaluations. <br />
              The theoretical birthday bound for {nBits}-bit space is ≈ {bound} queries.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function DiscreteSlider({ label, value, options, onChange }) {
  const currentIndex = options.indexOf(value)
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-xs">
        <span className="font-bold text-white uppercase tracking-tight">{label}</span>
        <span className="font-mono text-(--accent) text-sm font-bold">{value}-bit</span>
      </div>
      <div className="relative px-2">
        <input
          type="range"
          min="0"
          max={options.length - 1}
          step="1"
          value={currentIndex}
          onChange={(e) => onChange(options[parseInt(e.target.value)])}
          className="w-full h-1.5 bg-(--social-bg) rounded-lg appearance-none cursor-pointer accent-(--accent) border border-(--border)/30"
        />
        <div className="flex justify-between mt-2 px-1">
          {options.map((opt) => (
            <div key={opt} className="flex flex-col items-center">
              <div className={`w-1 h-1 rounded-full mb-1 ${value === opt ? 'bg-(--accent)' : 'bg-(--border)'}`} />
              <span className={`text-[13px] font-mono ${value === opt ? 'text-(--text-h) font-bold' : 'opacity-90' }`}>{opt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const MODE_OPTIONS = [
  { key: 'naive', label: 'Naive (Dictionary)', desc: 'Hash random inputs into a dict; detect first repeated output. Supports sequential playback.' },
  { key: 'floyd', label: "Floyd's Cycle Finding", desc: 'Tortoise-and-hare on f(x)=H(x). Detects cycle without storing all intermediates.' },
]

function ModeSelector({ mode, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {MODE_OPTIONS.map(opt => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`text-left p-3 rounded-md border transition-all duration-200 ${
            mode === opt.key
              ? 'border-(--accent-border) bg-(--accent-bg) shadow-(--shadow)'
              : 'border-(--border) bg-(--bg) hover:border-(--accent-border) hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-semibold text-white">{opt.label}</p>
            {mode === opt.key && (
              <div className="w-1.5 h-1.5 rounded-full bg-(--accent) animate-pulse flex-shrink-0 mt-0.5" />
            )}
          </div>
          <p className="text-[14px] mt-1 text-white leading-normal">{opt.desc}</p>
        </button>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BirthdayAttackDemo() {
  const [nBits, setNBits] = useState(12)
  const [mode, setMode] = useState('naive')
  const [result, setResult] = useState(null)
  const [trials, setTrials] = useState(null)
  const [loading, setLoading] = useState(false)
  const [trialsLoading, setTrialsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('graph')
  const [showModal, setShowModal] = useState(false)

  // Playback state
  const [playIndex, setPlayIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(200)
  const timerRef = useRef(null)

  const bound = useMemo(() => birthdayBound(nBits), [nBits])
  const history = useMemo(() => result?.history || [], [result])
  const currentStep = useMemo(() => history[playIndex], [history, playIndex])

  const theoCDF = useMemo(() => theoreticalCDF(nBits), [nBits])
  const empCDF = useMemo(() => trials ? empiricalCDF(trials.counts, nBits) : [], [trials, nBits])

  const chartData = useMemo(() => {
    const empMap = new Map(empCDF.map(p => [p.k, p.probability]))
    return theoCDF.map(p => ({
      k: p.k,
      theoretical: p.probability,
      empirical: empMap.get(p.k),
    }))
  }, [theoCDF, empCDF])

  const md5 = useMemo(() => md5Context(), [])
  const sha1 = useMemo(() => sha1Context(), [])

  useEffect(() => {
    if (isPlaying && history.length > 0 && playIndex < history.length - 1) {
      timerRef.current = setTimeout(() => { setPlayIndex(prev => prev + 1) }, speed)
    } else if (playIndex >= history.length - 1) {
      setIsPlaying(false)
    }
    return () => clearTimeout(timerRef.current)
  }, [isPlaying, playIndex, history.length, speed])

  // Automatic Modal Trigger: only when reaching the collision point (end of history)
  useEffect(() => {
    if (result?.found && history.length > 0 && playIndex === history.length - 1) {
      const timer = setTimeout(() => setShowModal(true), 500)
      return () => clearTimeout(timer)
    }
  }, [playIndex, history.length, result?.found])

  const handleAttack = useCallback(async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setPlayIndex(0)
    setIsPlaying(false)
    setShowModal(false)
    setTrials(false)
    try {
      const endpoint = mode === 'naive' ? '/api/pa9/attack-history' : '/api/pa9/attack'
      const res = await api.post(endpoint, { n_bits: nBits, mode })
      const data = res.data
      if (mode === 'naive' && data.collision) {
        setResult({ ...data.collision, found: data.found, history: data.history, birthday_bound: data.birthday_bound })
        setActiveTab('player')
        setIsPlaying(true)
        // Note: Modal is now triggered via useEffect when playIndex reaches the end
      } else {
        setResult(data)
        setActiveTab('graph')
        if (data.found && mode !== 'naive') setShowModal(true) // Floyd's triggers immediately as it has no history player
      }
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
      setActiveTab('graph')
    } catch (e) {
      setError(e?.response?.data?.detail || 'Trials failed')
    } finally {
      setTrialsLoading(false)
    }
  }, [nBits])

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">

        <PageHeader title="CS8.401 Minicrypt Clique Explorer - PA9: Birthday Attack & Collision Finding" />

        {/* ── Section 1: Unified Configuration ── */}
        <div className="mb-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Slider */}
              <DiscreteSlider
                label="Output Space Size"
                value={nBits}
                options={BIT_VALUES}
                onChange={(n) => { setNBits(n); setResult(null); setTrials(null); }}
              />
              {/* Mode Selector */}
              <div>
                <span className="text-[14px] font-bold text-white uppercase  pl-1 block mb-2">Attack Algorithm</span>
                <ModeSelector
                  mode={mode}
                  onChange={(m) => { setMode(m); setResult(null); }}
                />
              </div>
            </div>
            {error && <p className="mt-3 text-[10px] font-mono text-rose-400 animate-pulse uppercase font-bold tracking-tighter">{error}</p>}
          </Card>
        </div>

        {/* ── Section 2: Benchmarks Summary ── */}
        {trials && !trialsLoading && (
          <Card className="mb-4 border-amber-500/20 bg-amber-500/5">
            <div className="flex flex-wrap items-center justify-between gap-4 p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <h4 className="text-[13px] font-black text-amber-500 uppercase tracking-widest">Aggregate Results (100 Runs)</h4>
              </div>
              <div className="flex gap-6">
                <InfoRow label="Mean" value={trials.mean} />
                <InfoRow label="Bound" value={trials.expected_bound} />
                <InfoRow label="Efficiency" value={`${((1 / trials.ratio) * 100).toFixed(1)}%`} mono={false} />
              </div>
            </div>
          </Card>
        )}

        {/* ── Section 3: Analysis Area ── */}
        <section className="overflow-hidden rounded-xl border border-(--border) bg-(--bg) shadow-sm">
          {/* Tab bar with contextual action button */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border) bg-(--code-bg) px-4 py-3">
            <Tabs tabs={DEMO_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="flex items-center gap-3">
              {activeTab === 'player' ? (
                <Btn onClick={handleAttack} disabled={loading} className="text-sm h-9">
                  {loading ? 'Running Attack...' : 'Launch Attack'}
                </Btn>
              ) : (
                <Btn variant="secondary" onClick={handleTrials} disabled={trialsLoading} className="text-sm h-9">
                  {trialsLoading ? 'Benchmarking...' : '📊 100 Trials'}
                </Btn>
              )}
            </div>
          </div>

          <div className="p-5 bg-(--bg) min-h-[460px]">
            {activeTab === 'graph' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-l-2 border-(--accent) pl-3 py-1">
                  <p className="text-[11px] font-bold text-(--text)/70 uppercase tracking-widest">Collision Probability CDF Curve</p>
                  <div className="flex gap-4 text-[13px] font-mono opacity-60">
                    <span>$P(k) = 1 − e^{"{-k(k-1)/2^n}"}$</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                    <XAxis dataKey="k" tick={{ fill: 'var(--text)', fontSize: 10 }} label={{ value: 'Queries k', position: 'insideBottom', offset: -5, fill: 'var(--text)', fontSize: 10 }} />
                    <YAxis domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fill: 'var(--text)', fontSize: 10 }} width={45} />
                    <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                      <div className="rounded-xl border border-(--border) bg-(--bg)/95 p-3 text-[11px] shadow-2xl backdrop-blur-md">
                        <p className="font-black text-(--accent) mb-2 uppercase tracking-tighter">Query Batch k={label}</p>
                        {payload.map((e) => <div key={e.name} className="flex justify-between gap-6 py-0.5"><span className="opacity-70">{e.name}:</span><span className="font-mono font-bold" style={{ color: e.color }}>{(e.value * 100).toFixed(2)}%</span></div>)}
                      </div>
                    ) : null} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} verticalAlign="bottom" />
                    <ReferenceLine x={bound} stroke="var(--accent)" strokeDasharray="4 4" label={{ value: '2^(n/2)', position: 'top', fill: 'var(--text-h)', fontSize: 10, fontWeight: 'bold' }} strokeWidth={2} />
                    <ReferenceLine y={0.5} stroke="var(--border)" strokeDasharray="2 2" label={{ value: '50%', position: 'right', fill: 'var(--text)', fontSize: 9 }} />
                    <Line type="monotone" dataKey="theoretical" name="Theoret. Distribution" stroke="#818cf8" strokeWidth={3} dot={false} isAnimationActive={false} />
                    {trials && <Line type="monotone" dataKey="empirical" name="Trial Set (100 runs)" stroke="#f59e0b" strokeWidth={3} dot={false} connectNulls isAnimationActive={false} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {history.length > 0 ? (
                  <div className="rounded-xl border border-(--border) bg-(--social-bg)/40 p-5 flex items-center gap-8 shadow-inner">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPlayIndex(p => Math.max(0, p - 1))} className="w-10 h-10 rounded-lg border border-(--border) bg-(--bg) flex items-center justify-center hover:border-(--accent-border) text-lg transition-all" disabled={playIndex <= 0}>⏮</button>
                      <Btn onClick={() => setIsPlaying(!isPlaying)} 
                          disabled={loading} 
                          className="text-sm h-9">
                        {isPlaying ? "⏸" : "▶"}
                      </Btn>
                      <button onClick={() => setPlayIndex(p => Math.min(history.length - 1, p + 1))} className="w-10 h-10 rounded-lg border border-(--border) bg-(--bg) flex items-center justify-center hover:border-(--accent-border) text-lg transition-all" disabled={playIndex >= history.length - 1}>⏭</button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <input type="range" min="0" max={history.length - 1} value={playIndex} onChange={(e) => setPlayIndex(parseInt(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-(--border) accent-(--accent)" />
                      {/* <div className="flex justify-between text-[13px] font-black text-(--text)/50 uppercase tracking-[0.2em]">
                        <span>Start Sequence</span>
                        <span className="text-(--accent) opacity-100">Evaluated Query {playIndex + 1} of {history.length}</span>
                        <span className={playIndex === history.length - 1 ? 'text-emerald-400' : ''}>Collision Point</span>
                      </div> */}
                    </div>
                    <div className="flex gap-1 border border-(--border) rounded-lg p-1 bg-(--bg)">
                      {SPEED_OPTIONS.map(opt => (
                        <Btn
                          key={opt.value}
                          onClick={() => setSpeed(opt.value)}
                          variant={speed === opt.value ? "primary" : "ghost"}
                          size="sm"
                          className={`px-3 py-1.5 text-[13px] font-black transition-all ${speed === opt.value ? 'shadow-sm' : 'text-(--text)/40 hover:text-(--text)'}`}
                        >
                          {opt.label}
                        </Btn>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="">
                    {/* <div className="text-3xl mb-4">🔍</div>
                    */}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                  <div className="flex flex-col items-center justify-center p-8 bg-black/10 rounded-2xl border border-(--border)/50 relative overflow-hidden h-[360px]">
                    {!currentStep ? (
                      <p className="text-xs font-black uppercase opacity-20 tracking-[0.5em]">Awaiting Data Stream</p>
                    ) : (
                      <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col items-center gap-6">
                          <div className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.3em] bg-indigo-500/10 px-4 py-1.5 rounded-[10px] border border-indigo-500/20">Evaluation Cycle #{currentStep.i}</div>
                          <div className="flex items-center gap-10">
                            <div className="text-center group">
                              <p className="text-[13px] font-bold mb-3 group-hover:opacity-100 transition-opacity">Input x</p>
                              <div className="px-6 py-3 bg-(--accent-bg) border border-(--accent-border) rounded-xl font-mono text-sm text-(--text-h) shadow-sm group-hover:shadow-(--shadow) transition-all">{currentStep.x}</div>
                            </div>
                            <div className="flex flex-col items-center gap-1 opacity-100 pt-8">
                              <span className="text-s">→</span>
                              <span className="text-[13px] font-mono">Hash</span>
                            </div>
                            <div className="text-center group">
                              <p className="text-[13px] font-bold mb-3 group-hover:opacity-100 transition-opacity">Result H(x)</p>
                              <div className="px-6 py-3 bg-(--accent-bg) border border-(--accent-border) rounded-xl font-mono text-sm text-(--text-h) shadow-sm group-hover:shadow-(--shadow) transition-all">{hex2(currentStep.h)}</div>
                            </div>
                          </div>
                        </div>

                        <div className="max-w-md mx-auto w-full">
                          <div className="flex justify-between text-[13px] font-black uppercase tracking-widest text-emerald-400/70 mb-2 px-1">
                            <span>Query Load</span>
                            <span>{currentStep.i} / {bound} threshold</span>
                          </div>
                          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5 relative">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${currentStep.i > bound ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'}`}
                              style={{ width: `${Math.min((currentStep.i / bound) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col h-[360px] w-[380px] bg-(--bg) rounded-xl border border-(--border) shadow-inner overflow-hidden">
                    <div className="bg-(--accent-bg) border-b border-(--border) px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[13px] font-black uppercase tracking-widest text-white">Iteration Log</span>
                      <span className="text-[13px] text-white">x → H(x)</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin scrollbar-thumb-(--border) scrollbar-track-transparent">
                      {history.slice(0, playIndex + 1).reverse().map((step, idx) => (
                        <div key={step.i} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${idx === 0 ? 'bg-(--accent-bg) border border-(--accent-border) text-(--text-h) scale-[1.02] shadow-sm' : 'opacity-40 hover:opacity-100'}`}>
                          <span className="text-[13px] font-black">#{step.i.toString().padStart(3, '0')}</span>
                          <div className="flex-1 flex justify-between font-mono text-[13px]">
                            <span className="truncate max-w-[80px]">{step.x}</span>
                            <span className={idx === 0 ? 'text-(--accent) font-bold' : 'font-medium'}>{hex2(step.h)}</span>
                          </div>
                        </div>
                      ))}
                      {history.length === 0 && <div className="text-center py-16 text-[10px] opacity-30 italic font-medium">Stream Inactive</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 4: Pedagogical Context ── */}
        {/* <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {[md5, sha1].map(ctx => (
            <div key={ctx.name} className="p-4 rounded-xl border border-(--border) bg-(--bg)/40 relative group overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24  opacity-5 -translate-y-1/2 translate-x-1/2 rounded-full border-8 transition-transform group-hover:scale-110 duration-700 ${ctx.name === 'MD5' ? 'border-indigo-500' : 'border-emerald-500'}`} />
              <div className="flex items-center justify-between mb-3 border-b border-(--border)/40 pb-2">
                <h5 className="text-[11px] font-black text-(--text-h) uppercase tracking-[0.2em]">{ctx.name} Protocol</h5>
                <span className="text-[10px] font-mono opacity-50">n = {ctx.n_bits} bits</span>
              </div>
              <InfoRow label="Theoretical Bound" value={ctx.boundLabel} />
              <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-[10px] text-amber-200/70 leading-relaxed italic">{ctx.note}</p>
              </div>
            </div>
          ))}
        </div> */}

      </section>

      {/* Result Modal */}
      <CollisionModal
        isOpen={showModal}
        result={result}
        nBits={nBits}
        onBlur={() => setShowModal(false)}
      />
    </main>
  )
}
