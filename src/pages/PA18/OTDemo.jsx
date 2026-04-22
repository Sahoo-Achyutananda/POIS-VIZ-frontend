import { useState, useCallback } from 'react'
import axios from 'axios'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'

const pa18api = axios.create({ baseURL: api.defaults.baseURL, timeout: 120_000 })

function cx(...c) { return c.filter(Boolean).join(' ') }
function hexOf(n) {
  if (!n && n !== 0) return '—'
  try { return '0x' + BigInt(n).toString(16).toUpperCase() } catch { return String(n) }
}
function short(s, n = 16) {
  const str = String(s || '—')
  return str.length <= n + 3 ? str : str.slice(0, n) + '…'
}

// ── UI primitives ──────────────────────────────────────────────────────────────

function Badge({ label, color = 'purple' }) {
  const cls = {
    green:  'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    red:    'bg-rose-500/20    border-rose-500/40    text-rose-300',
    amber:  'bg-amber-500/20   border-amber-500/40   text-amber-300',
    purple: 'bg-purple-500/20  border-purple-500/40  text-purple-300',
    blue:   'bg-blue-500/20    border-blue-500/40    text-blue-300',
    cyan:   'bg-cyan-500/20    border-cyan-500/40    text-cyan-300',
    gray:   'bg-zinc-500/20    border-zinc-500/40    text-zinc-400',
  }
  return (
    <span className={cx(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
      cls[color] ?? cls.purple
    )}>{label}</span>
  )
}

function KV({ label, value, color = 'text-white', small = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-black uppercase tracking-widest text-(--text)/40">{label}</span>
      <span className={cx(small ? 'text-[10px]' : 'text-xs', 'font-mono break-all', color)}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function Spinner() { return <span className="inline-block animate-spin mr-1">⟳</span> }

// ── Log message row ────────────────────────────────────────────────────────────

function LogRow({ step, from, to, content, type = 'normal' }) {
  const arrowColor = type === 'send' ? 'text-blue-400' : type === 'recv' ? 'text-emerald-400' : 'text-purple-400'
  return (
    <div className={cx(
      'flex gap-2 items-start rounded-lg border px-3 py-2 text-xs animate-in fade-in duration-300',
      type === 'send'   ? 'border-blue-500/20   bg-blue-500/5'    :
      type === 'recv'   ? 'border-emerald-500/20 bg-emerald-500/5' :
      type === 'warn'   ? 'border-rose-500/20    bg-rose-500/5'    :
      type === 'key'    ? 'border-purple-500/20  bg-purple-500/5'  :
                          'border-(--border)      bg-(--code-bg)'
    )}>
      <span className="font-black text-[10px] shrink-0 mt-0.5 text-(--text)/40 w-4">{step}</span>
      <span className={cx('font-black shrink-0 text-[10px]', arrowColor)}>
        {from} → {to}
      </span>
      <span className="text-(--text)/70 leading-relaxed flex-1">{content}</span>
    </div>
  )
}

// ── Alice panel ────────────────────────────────────────────────────────────────

function AlicePanel({ m0, m1, setM0, setM1, revealed }) {
  return (
    <div className="rounded-xl border-2 border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">👩</span>
        <span className="font-black text-sm text-blue-300">Alice (Sender)</span>
        <Badge label="Sender" color="blue" />
      </div>
      <p className="text-xs text-(--text)/60 italic">
        Alice holds two secret messages. She never learns which one Bob chose.
      </p>
      <div className="space-y-2">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-blue-300/70">Message m₀</label>
          <input value={m0} onChange={e => setM0(e.target.value)}
            className="w-full rounded-lg border border-blue-500/30 bg-blue-500/8 px-3 py-2 text-sm text-white font-mono outline-none focus:border-blue-500/60 transition-all" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-blue-300/70">Message m₁</label>
          <input value={m1} onChange={e => setM1(e.target.value)}
            className="w-full rounded-lg border border-blue-500/30 bg-blue-500/8 px-3 py-2 text-sm text-white font-mono outline-none focus:border-blue-500/60 transition-all" />
        </div>
      </div>
      {revealed != null && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
          ✓ Alice sent both encrypted messages. She does not know Bob's choice bit b=?.
        </div>
      )}
    </div>
  )
}

// ── Bob panel ─────────────────────────────────────────────────────────────────

function BobPanel({ b, onChoose, loading, result, onCheat, cheatResult, cheatLoading }) {
  return (
    <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">👨</span>
        <span className="font-black text-sm text-emerald-300">Bob (Receiver)</span>
        <Badge label="You" color="green" />
      </div>
      <p className="text-xs text-(--text)/60 italic">
        Bob chooses which message to receive. Alice never learns his choice.
      </p>

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">Choose which message to receive:</p>
        <div className="flex gap-3">
          {[0, 1].map(choice => (
            <button key={choice}
              onClick={() => onChoose(choice)}
              disabled={!!loading}
              id={`pa18-choose-${choice}-btn`}
              className={cx(
                'flex-1 rounded-xl border-2 py-3 font-black text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed',
                b === choice
                  ? 'border-emerald-500/60 bg-emerald-500/20 text-white shadow-emerald-500/20'
                  : 'border-(--border) bg-(--code-bg) text-(--text)/60 hover:border-emerald-500/40 hover:text-white'
              )}
            >
              {loading === choice ? <Spinner /> : null}
              Choose {choice}
              <div className="text-[10px] font-normal opacity-60 mt-1">Receive m{choice}</div>
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="space-y-3">
          <div className={cx(
            'rounded-xl border-2 p-3 space-y-2',
            result.correct ? 'border-emerald-500/50 bg-emerald-500/8' : 'border-rose-500/50 bg-rose-500/8'
          )}>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
              📨 Bob receives:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-(--code-bg) border border-emerald-500/30 p-2 text-center">
                <p className="text-[9px] text-emerald-300/60 uppercase tracking-wider">m{result.b} (revealed ✓)</p>
                <p className="font-mono text-emerald-300 text-sm font-black mt-1">{result.m_received}</p>
              </div>
              <div className="rounded-lg bg-(--code-bg)/50 border border-(--border)/40 p-2 text-center opacity-50">
                <p className="text-[9px] text-(--text)/40 uppercase tracking-wider">m{1 - result.b} (hidden)</p>
                <p className="font-mono text-(--text)/30 text-sm font-black mt-1">??</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Btn onClick={onCheat} disabled={!!loading || !!cheatLoading}
              variant="secondary" id="pa18-cheat-btn">
              {cheatLoading ? <><Spinner />Attempting…</> : '🔓 Cheat: Try to Decrypt m' + (1 - result.b)}
            </Btn>
            {cheatResult && (
              <div className={cx(
                'rounded-xl border-2 p-3 text-xs space-y-1',
                cheatResult.dlp_solved ? 'border-rose-500/50 bg-rose-500/5' : 'border-emerald-500/40 bg-emerald-500/5'
              )}>
                <p className="font-black">
                  {cheatResult.dlp_solved ? '⚠ DLP solved (tiny group)' : '✅ Cheat failed — DLP not solved!'}
                </p>
                <p className="text-(--text)/60">{cheatResult.explanation}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── OT Demo Tab ────────────────────────────────────────────────────────────────

function OTDemoTab() {
  const [params, setParams]           = useState(null)
  const [groupBits, setGroupBits]     = useState(32)
  const [m0, setM0]                   = useState('42')
  const [m1, setM1]                   = useState('99')
  const [loading, setLoading]         = useState(null)
  const [log, setLog]                 = useState([])
  const [result, setResult]           = useState(null)
  const [cheatResult, setCheatResult] = useState(null)
  const [cheatLoading, setCheatLoading] = useState(false)
  const [genLoading, setGenLoading]   = useState(false)
  const [error, setError]             = useState('')

  const addLog = useCallback((entry) => setLog(prev => [...prev, entry]), [])

  const genParams = async () => {
    setGenLoading(true); setError(''); setLog([]); setResult(null); setCheatResult(null)
    try {
      const r = await pa18api.post('/api/pa18/gen-params', { bits: groupBits })
      setParams(r.data)
      addLog({ step: '⚙', from: 'System', to: 'Both', type: 'key',
        content: `Generated ${groupBits}-bit safe-prime group: p = ${short(hexOf(r.data.p))}, g = ${short(hexOf(r.data.g))}` })
    } catch (e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { setGenLoading(false) }
  }

  const runOT = async (b) => {
    if (!params) { setError('Generate group params first'); return }
    setLoading(b); setError(''); setLog([]); setResult(null); setCheatResult(null)
    try {
      addLog({ step: '1', from: 'Bob', to: 'Bob', type: 'key',
        content: `Bob generates key pair (pk${b}, sk${b}) honestly, and pk${1-b} without trapdoor (random h ← Z*_p)` })

      const r = await pa18api.post('/api/pa18/ot-run', {
        p: params.p, q: params.q, g: params.g, b, m0, m1,
      })
      const d = r.data

      addLog({ step: '1→', from: 'Bob', to: 'Alice', type: 'send',
        content: `(pk₀, pk₁) sent to Alice — pk${b} is honest, pk${1-b} has NO trapdoor. pk₀.h = ${short(hexOf(d.pk0_h))}, pk₁.h = ${short(hexOf(d.pk1_h))}` })

      addLog({ step: '2', from: 'Alice', to: 'Alice', type: 'key',
        content: `Alice encrypts: C₀ = ElGamal_enc(pk₀, m₀=${m0}), C₁ = ElGamal_enc(pk₁, m₁=${m1}) with fresh randomness each` })

      addLog({ step: '2→', from: 'Alice', to: 'Bob', type: 'send',
        content: `(C₀, C₁) sent to Bob — C${b}: c₁=${short(hexOf(d['C'+b]?.c1))}, c₂=${short(hexOf(d['C'+b]?.c2))}` })

      addLog({ step: '3', from: 'Bob', to: 'Bob', type: 'recv',
        content: `Bob decrypts C${b} using sk${b} → m${b} = ${d.m_received}. C${1-b} cannot be decrypted (no sk${1-b})` })

      addLog({ step: '✓', from: 'Result', to: 'Bob', type: 'recv',
        content: `Bob receives m${b} = ${d.m_received} ✓   |   m${1-b} = ?? (hidden, Alice's secret is safe)` })

      setResult(d)
    } catch (e) { setError(e?.response?.data?.detail || 'OT failed') }
    finally { setLoading(null) }
  }

  const runCheat = async () => {
    if (!params || !result) return
    setCheatLoading(true)
    try {
      const r = await pa18api.post('/api/pa18/sender-privacy', {
        p: params.p, q: params.q, g: params.g,
        m0, m1, b: result.b, max_brute: 500,
      })
      setCheatResult(r.data)
      addLog({ step: '🔓', from: 'Bob (cheating)', to: 'C' + (1-result.b), type: 'warn',
        content: r.data.dlp_solved
          ? `DLP solved in ${r.data.brute_ms}ms (tiny group!) — not secure at this size`
          : `Brute-force failed: DLP not solved in ${r.data.brute_ms}ms (tried ${r.data.brute_force_limit} values)` })
    } catch(e) { setError(e?.response?.data?.detail || 'Cheat failed') }
    finally { setCheatLoading(false) }
  }

  const SIZES = [16, 24, 32, 48]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-(--border) bg-(--code-bg) p-4 space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-white">⚙ Shared Group Parameters</p>
        <div className="flex gap-2 items-center flex-wrap">
          {SIZES.map(b => (
            <button key={b} onClick={() => setGroupBits(b)}
              className={cx('rounded-lg border px-2.5 py-1 text-xs font-black transition-all',
                groupBits === b ? 'border-purple-500/60 bg-purple-500/20 text-white'
                                : 'border-(--border) bg-(--bg) text-(--text)/50 hover:text-white'
              )}>{b}-bit</button>
          ))}
          <Btn onClick={genParams} disabled={genLoading} id="pa18-gen-params-btn">
            {genLoading ? <><Spinner />Generating…</> : `⚡ Generate ${groupBits}-bit Group`}
          </Btn>
        </div>
        {params && (
          <div className="grid grid-cols-3 gap-2">
            <KV label="p (safe prime)" value={short(hexOf(params.p), 20)} small />
            <KV label="q (order)"      value={short(hexOf(params.q), 20)} small />
            <KV label="g (generator)"  value={short(hexOf(params.g), 20)} small />
          </div>
        )}
        {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AlicePanel m0={m0} m1={m1} setM0={setM0} setM1={setM1} revealed={result?.b} />
        <BobPanel
          b={result?.b}
          onChoose={runOT}
          loading={loading}
          result={result}
          onCheat={runCheat}
          cheatResult={cheatResult}
          cheatLoading={cheatLoading}
        />
      </div>

      {log.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">📋 OT Protocol Message Log</p>
          <div className="space-y-1.5">
            {log.map((entry, i) => (
              <LogRow key={i} step={entry.step} from={entry.from} to={entry.to}
                content={entry.content} type={entry.type} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Correctness Tab ────────────────────────────────────────────────────────────

function CorrectnessTab() {
  const [trials, setTrials] = useState(100)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null); setElapsed(0)
    const timer = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      const pg = await pa18api.post('/api/pa18/gen-params', { bits: 32 })
      const r  = await pa18api.post('/api/pa18/correctness', {
        p: pg.data.p, q: pg.data.q, g: pg.data.g, n_trials: trials,
      })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { clearInterval(timer); setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="rounded-xl border border-(--border) bg-(--code-bg) p-4 space-y-3">
        <p className="font-black text-sm text-white">✅ Correctness Test</p>
        <p className="text-sm text-(--text)/70">
          Run <strong className="text-white">n</strong> OT trials with random b ∈ {'{ 0, 1 }'} and
          random (m₀, m₁). Each row shows the full step-by-step explanation of
          what Bob chose, what Alice encrypted, and whether the decryption matched.
        </p>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-white">
              Trials: <span className="text-purple-300">{trials}</span>
            </p>
            <input type="range" min={10} max={200} step={10} value={trials}
              onChange={e => setTrials(Number(e.target.value))}
              className="w-48 accent-purple-500" />
          </div>
          <Btn onClick={run} disabled={loading} id="pa18-correctness-btn">
            {loading ? `Running… (${elapsed}s)` : '▶ Run Correctness Test'}
          </Btn>
        </div>
        {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4">
          {/* Summary banner */}
          <div className={cx('rounded-xl border-2 p-6 text-center',
            result.success_rate === 1
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-amber-500/50 bg-amber-500/5'
          )}>
            <p className="text-6xl font-black text-emerald-300">
              {(result.success_rate * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-(--text)/70 mt-2">
              {result.correct}/{result.trials} trials correct — {result.elapsed_ms} ms total
            </p>
            <div className="mt-2">
              <Badge
                label={result.success_rate === 1 ? '✓ Perfect — Correctness verified!' : 'Some failures'}
                color={result.success_rate === 1 ? 'green' : 'amber'}
              />
            </div>
          </div>

          {/* Column legend */}
          <div className="rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-300 mb-2">Column Guide</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-[10px] text-(--text)/60">
              {[
                ['#',             'Trial number 1 – ' + result.trials],
                ['b',             "Bob's random choice bit (0 or 1)"],
                ['m₀ / m₁',      "Alice's two random plaintexts"],
                ['Expected (mᵦ)', 'm₀ if b=0, m₁ if b=1'],
                ['Received',      'Value Bob actually decrypted from Cᵦ'],
                ['ms',            'Wall-clock time for this single OT run'],
                ['Status',        'Pass = received equals expected'],
                ['Explanation',   'Narrative of every protocol step'],
              ].map(([col, desc]) => (
                <div key={col} className="flex gap-1">
                  <span className="font-black text-white shrink-0">{col}:</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-trial scrollable table */}
          {result.trial_rows?.length > 0 && (
            <div className="rounded-xl border border-(--border) overflow-hidden">
              <div className="bg-(--code-bg) border-b border-(--border) px-4 py-2 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-white">
                  📋 All {result.trials} Trial Rows
                </p>
                <div className="flex gap-3 text-[10px] text-(--text)/60">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Pass
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />Fail
                  </span>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[480px]">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-(--code-bg) border-b border-(--border)">
                    <tr>
                      {['#','b','m₀','m₁','Expected (mᵦ)','Received','ms','Status','Explanation'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[9px] font-black uppercase tracking-widest text-(--text)/50 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.trial_rows.map(row => (
                      <tr key={row.trial}
                        className={cx(
                          'border-b border-(--border)/30 transition-colors hover:brightness-110',
                          row.correct ? 'bg-emerald-500/[0.03]' : 'bg-rose-500/[0.06]'
                        )}
                      >
                        <td className="px-3 py-2 font-black text-(--text)/40 w-8">{row.trial}</td>
                        <td className="px-3 py-2">
                          <span className={cx(
                            'inline-flex items-center justify-center w-5 h-5 rounded font-black text-[10px]',
                            row.b === 0 ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                          )}>{row.b}</span>
                        </td>
                        <td className="px-3 py-2 font-mono text-(--text)/60">{row.m0}</td>
                        <td className="px-3 py-2 font-mono text-(--text)/60">{row.m1}</td>
                        <td className="px-3 py-2 font-mono font-black text-amber-300">{row.expected}</td>
                        <td className={cx('px-3 py-2 font-mono font-black',
                          row.correct ? 'text-emerald-300' : 'text-rose-300'
                        )}>{row.received}</td>
                        <td className="px-3 py-2 font-mono text-(--text)/35 text-[10px] whitespace-nowrap">{row.ms} ms</td>
                        <td className="px-3 py-2">
                          <Badge label={row.correct ? '✓ Pass' : '✗ Fail'} color={row.correct ? 'green' : 'red'} />
                        </td>
                        <td className="px-3 py-2 text-(--text)/55 leading-relaxed min-w-[260px] max-w-sm">
                          {row.desc}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Failures callout */}
          {result.failures?.length > 0 && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
              <p className="text-xs font-black text-rose-300 mb-2">❌ Failures ({result.failures.length}):</p>
              {result.failures.map((f, i) => (
                <p key={i} className="text-xs font-mono text-rose-300">
                  Trial {f.trial}: b={f.b}, expected={f.expected}, got={f.got}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Privacy Tab ────────────────────────────────────────────────────────────────

function PrivacyTab() {
  const [recvResult, setRecvResult]   = useState(null)
  const [recvLoading, setRecvLoading] = useState(false)
  const [sendResult, setSendResult]   = useState(null)
  const [sendLoading, setSendLoading] = useState(false)
  const [params, setParams]           = useState(null)
  const [error, setError]             = useState('')

  const ensureParams = async () => {
    if (params) return params
    const pg = await pa18api.post('/api/pa18/gen-params', { bits: 32 })
    setParams(pg.data)
    return pg.data
  }

  const runReceiverPrivacy = async () => {
    setRecvLoading(true); setError('')
    try {
      const p = await ensureParams()
      const r = await pa18api.post('/api/pa18/receiver-privacy', { p: p.p, q: p.q, g: p.g })
      setRecvResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { setRecvLoading(false) }
  }

  const runSenderPrivacy = async () => {
    setSendLoading(true); setError('')
    try {
      const p = await ensureParams()
      const r = await pa18api.post('/api/pa18/sender-privacy', {
        p: p.p, q: p.q, g: p.g, m0: '42', m1: '99', b: 0, max_brute: 1000,
      })
      setSendResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { setSendLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-rose-400 font-black">{error}</p>}

      <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
        <p className="font-black text-sm text-white">🔏 Receiver Privacy — Sender cannot learn b</p>
        <p className="text-sm text-(--text)/70 leading-relaxed">
          pk_(1-b) is a random element of Z*_p — no discrete-log known.
          Under <strong className="text-white">DDH hardness</strong>, both pk₀ and pk₁ are computationally
          indistinguishable from proper ElGamal public keys. We confirm this statistically.
        </p>
        <Btn onClick={runReceiverPrivacy} disabled={recvLoading} id="pa18-recv-priv-btn">
          {recvLoading ? <><Spinner />Running…</> : '🔏 Run Receiver Privacy Demo (500 samples)'}
        </Btn>
        {recvResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Honest key h = g^x mod p', data: recvResult.honest_key, color: 'border-blue-500/30 bg-blue-500/5' },
                { label: 'Trapdoor-free h ← Z*_p',   data: recvResult.random_key, color: 'border-amber-500/30 bg-amber-500/5' },
              ].map(({ label, data, color }) => (
                <div key={label} className={cx('rounded-xl border p-3 space-y-2', color)}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">{label}</p>
                  <KV label="mean mod q" value={String(data?.mean_mod_q)} small />
                  <KV label="std dev"    value={String(data?.std_mod_q)}  small />
                </div>
              ))}
            </div>
            <div className={cx('rounded-xl border-2 px-4 py-3',
              recvResult.indistinguishable ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'
            )}>
              <Badge label={recvResult.indistinguishable ? '✓ Statistically indistinguishable' : 'Distinguishable (unexpected)'}
                color={recvResult.indistinguishable ? 'green' : 'amber'} />
              <p className="text-xs text-(--text)/60 mt-2 leading-relaxed">{recvResult.explanation}</p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
        <p className="font-black text-sm text-white">🔒 Sender Privacy — Receiver cannot decrypt C_(1-b)</p>
        <p className="text-sm text-(--text)/70 leading-relaxed">
          The receiver has no sk_(1-b).
          Decrypting C_(1-b) requires computing the discrete log of h_(1-b) — solving ElGamal DLP.
          We demonstrate by attempting brute-force (fails for proper group sizes).
        </p>
        <Btn onClick={runSenderPrivacy} disabled={sendLoading} id="pa18-sender-priv-btn">
          {sendLoading ? <><Spinner />Attacking…</> : '🔓 Run Cheat Attempt (Brute-Force DLP)'}
        </Btn>
        {sendResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <KV label="Group bits"  value={`${sendResult.bits}-bit`}                    small />
              <KV label="DLP solved"  value={String(sendResult.dlp_solved)}
                color={sendResult.dlp_solved ? 'text-rose-300' : 'text-emerald-300'}      small />
              <KV label="Brute limit" value={String(sendResult.brute_force_limit)}        small />
              <KV label="Time"        value={`${sendResult.brute_ms}ms`}                  small />
            </div>
            <div className={cx('rounded-xl border-2 px-4 py-3',
              sendResult.dlp_solved ? 'border-amber-500/40 bg-amber-500/5' : 'border-emerald-500/40 bg-emerald-500/5'
            )}>
              <Badge label={sendResult.dlp_solved ? '⚠ DLP solved (group too small!)' : '✅ Cheat failed — DLP hard!'}
                color={sendResult.dlp_solved ? 'amber' : 'green'} />
              <p className="text-xs text-(--text)/60 mt-2 leading-relaxed">{sendResult.explanation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Full Pipeline Tab ──────────────────────────────────────────────────────────

function PipelineTab() {
  const [bits, setBits]     = useState(32)
  const [b, setB]           = useState(0)
  const [m0, setM0]         = useState('42')
  const [m1, setM1]         = useState('99')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError]   = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null); setElapsed(0)
    const timer = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      const r = await pa18api.post('/api/pa18/full-demo', {
        bits, b, m0: Number(m0), m1: Number(m1),
      })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { clearInterval(timer); setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-(--border) bg-(--code-bg) p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">m₀</label>
            <input value={m0} onChange={e => setM0(e.target.value)}
              className="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-1.5 text-sm text-white font-mono outline-none focus:border-purple-500/60" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">m₁</label>
            <input value={m1} onChange={e => setM1(e.target.value)}
              className="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-1.5 text-sm text-white font-mono outline-none focus:border-purple-500/60" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Choice bit b</p>
            <div className="flex gap-2">
              {[0, 1].map(v => (
                <button key={v} onClick={() => setB(v)}
                  className={cx('flex-1 rounded-lg border px-2 py-1.5 text-xs font-black transition-all',
                    b === v ? 'border-emerald-500/60 bg-emerald-500/20 text-white'
                            : 'border-(--border) bg-(--bg) text-(--text)/50 hover:text-white'
                  )}>{v}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Group bits</p>
            <div className="flex gap-1">
              {[16, 24, 32, 48].map(v => (
                <button key={v} onClick={() => setBits(v)}
                  className={cx('flex-1 rounded-lg border px-1 py-1.5 text-[10px] font-black transition-all',
                    bits === v ? 'border-purple-500/60 bg-purple-500/20 text-white'
                               : 'border-(--border) bg-(--bg) text-(--text)/50 hover:text-white'
                  )}>{v}</button>
              ))}
            </div>
          </div>
        </div>
        <Btn onClick={run} disabled={loading} id="pa18-pipeline-btn">
          {loading ? `Running… (${elapsed}s)` : '▶ Run Full OT Demo'}
        </Btn>
        {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
      </div>

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Group setup',      val: `${result.setup_ms}ms`,           color: 'text-blue-300'    },
              { label: 'Step 1 (keygen)',  val: `${result.ot_run?.step1_ms}ms`,   color: 'text-purple-300'  },
              { label: 'Step 2 (encrypt)', val: `${result.ot_run?.step2_ms}ms`,   color: 'text-amber-300'   },
              { label: 'Step 3 (decrypt)', val: `${result.ot_run?.step3_ms}ms`,   color: 'text-emerald-300' },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-xl border border-(--border) bg-(--code-bg) p-2 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-(--text)/40">{label}</p>
                <p className={cx('font-mono text-sm font-black mt-1', color)}>{val}</p>
              </div>
            ))}
          </div>

          <div className={cx('rounded-xl border-2 p-4 space-y-3',
            result.ot_run?.correct ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'
          )}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{result.ot_run?.correct ? '✅' : '❌'}</span>
              <span className="font-black text-sm">OT Result: Bob chose b={b}, received m{b}={result.ot_run?.m_received}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KV label="m₀ (Alice)"          value={String(result.ot_run?.m0)}         small />
              <KV label="m₁ (Alice)"          value={String(result.ot_run?.m1)}         small />
              <KV label={`m${b} received`}    value={String(result.ot_run?.m_received)} color="text-emerald-300" small />
              <KV label={`m${1-b} (hidden)`}  value="??"                                color="text-(--text)/30" small />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">50-Trial Correctness</p>
              <p className="text-3xl font-black text-emerald-300">
                {(parseFloat(result.correctness?.success_rate ?? 1) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-(--text)/60">
                {result.correctness?.correct}/{result.correctness?.trials} correct in {result.correctness?.elapsed_ms}ms
              </p>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-purple-300">Receiver Privacy</p>
              <Badge
                label={result.receiver_privacy?.indistinguishable ? '✓ Indistinguishable (DDH)' : 'Distinguishable'}
                color={result.receiver_privacy?.indistinguishable ? 'green' : 'red'}
              />
              <p className="text-xs text-(--text)/60">Sender cannot learn b from (pk₀, pk₁)</p>
            </div>
          </div>

          <div className="rounded-xl border border-purple-500/20 bg-(--code-bg) px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-300 mb-1">Full Dependency Lineage</p>
            <div className="text-xs font-mono text-(--text)/50 space-y-0.5">
              <p>PA#18 → ot_receiver_step1 / ot_sender_step / ot_receiver_step2</p>
              <p>PA#18 → PA#16 (elgamal_enc / elgamal_dec)</p>
              <p>PA#16 → PA#11 (gen_dh_params, safe prime p=2q+1)</p>
              <p>PA#16 → PA#13 (mod_exp)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'demo',        label: '🎭 Alice & Bob'    },
  { key: 'correctness', label: '✅ Correctness'     },
  { key: 'privacy',     label: '🔏 Privacy Proofs'  },
  { key: 'pipeline',    label: '🔄 Full Pipeline'   },
]

export default function OTDemo() {
  const [tab, setTab] = useState('demo')

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer — PA#18: Oblivious Transfer (1-out-of-2 OT)" />

        <div className="mb-4 rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 space-y-1">
          <p className="text-[13px] font-black uppercase tracking-widest text-white">
            Bellare-Micali OT from ElGamal PKC
          </p>
          <p className="text-sm text-(--text)/70 leading-relaxed">
            <strong className="text-white">1-out-of-2 OT</strong>: Sender Alice has (m₀, m₁). Receiver Bob has choice bit b.
            Bob learns m_b and <em>nothing</em> about m_(1-b). Alice learns <em>nothing</em> about b.
            Built entirely on <strong className="text-purple-300">PA#16 ElGamal</strong> (→PA#11→PA#13).
            The key insight: Bob generates pk_(1-b) without a trapdoor — Alice cannot tell which is "real"
            (DDH hardness), and Bob cannot decrypt with the unknown sk_(1-b) (DLP hardness).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            {[
              { title: 'Step 1 — Receiver', items: ['pk_b ← ElGamal keygen (honest)', 'pk_{1-b} ← random Z*_p (no DLog!)', 'Send (pk₀, pk₁) to sender'] },
              { title: 'Step 2 — Sender',   items: ['C₀ = ElGamal_enc(pk₀, m₀)',      'C₁ = ElGamal_enc(pk₁, m₁)',          'Send (C₀, C₁) to receiver'] },
              { title: 'Step 3 — Receiver', items: ['Decrypt: m_b = ElGamal_dec(sk_b, C_b)', 'C_{1-b} cannot be decrypted', '(No sk_{1-b} → DLP required)'] },
            ].map(({ title, items }) => (
              <div key={title} className="rounded-lg border border-(--border) p-2.5 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-300">{title}</p>
                {items.map(s => <p key={s} className="text-[11px] text-(--text)/60 font-mono">{s}</p>)}
              </div>
            ))}
          </div>
        </div>

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

          <div className="p-4 min-h-[520px]">
            {tab === 'demo'        && <OTDemoTab />}
            {tab === 'correctness' && <CorrectnessTab />}
            {tab === 'privacy'     && <PrivacyTab />}
            {tab === 'pipeline'    && <PipelineTab />}
          </div>
        </div>
      </section>
    </main>
  )
}
