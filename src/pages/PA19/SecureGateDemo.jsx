import { useState, useCallback } from 'react'
import axios from 'axios'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'

const pa19api = axios.create({ baseURL: api.defaults.baseURL, timeout: 120_000 })

function cx(...c) { return c.filter(Boolean).join(' ') }
function Spinner() { return <span className="inline-block animate-spin mr-1">⟳</span> }

function Badge({ label, color = 'purple' }) {
  const cls = {
    green:  'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    red:    'bg-rose-500/20    border-rose-500/40    text-rose-300',
    amber:  'bg-amber-500/20   border-amber-500/40   text-amber-300',
    purple: 'bg-purple-500/20  border-purple-500/40  text-purple-300',
    blue:   'bg-blue-500/20    border-blue-500/40    text-blue-300',
  }
  return (
    <span className={cx('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider', cls[color] ?? cls.purple)}>
      {label}
    </span>
  )
}

function LogRow({ step, from, to, content, type = 'normal' }) {
  return (
    <div className={cx(
      'flex gap-2 items-start rounded-lg border px-3 py-2 text-xs',
      type === 'send' ? 'border-blue-500/20 bg-blue-500/5' :
      type === 'recv' ? 'border-emerald-500/20 bg-emerald-500/5' :
      type === 'warn' ? 'border-amber-500/20 bg-amber-500/5' :
      type === 'key'  ? 'border-purple-500/20 bg-purple-500/5' :
                        'border-(--border) bg-(--code-bg)'
    )}>
      <span className="font-black text-[10px] shrink-0 text-(--text)/40 w-5">{step}</span>
      <span className={cx('font-black shrink-0 text-[10px]',
        type === 'send' ? 'text-blue-400' : type === 'recv' ? 'text-emerald-400' : 'text-purple-400'
      )}>{from} → {to}</span>
      <span className="text-(--text)/70 leading-relaxed flex-1">{content}</span>
    </div>
  )
}

// ── Bit selector ──────────────────────────────────────────────────────────────
function BitSelector({ label, value, onChange, color = 'blue', disabled }) {
  return (
    <div className={cx('rounded-xl border-2 p-4 space-y-3', color === 'blue' ? 'border-blue-500/30 bg-blue-500/5' : 'border-emerald-500/30 bg-emerald-500/5')}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{color === 'blue' ? '👩' : '👨'}</span>
        <span className={cx('font-black text-sm', color === 'blue' ? 'text-blue-300' : 'text-emerald-300')}>{label}</span>
        <Badge label={color === 'blue' ? 'Alice' : 'Bob'} color={color === 'blue' ? 'blue' : 'green'} />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">Input bit {color === 'blue' ? 'a' : 'b'}</p>
        <div className="flex gap-2">
          {[0, 1].map(v => (
            <button key={v} onClick={() => !disabled && onChange(v)} disabled={disabled}
              className={cx(
                'flex-1 rounded-xl border-2 py-3 font-black text-xl transition-all hover:-translate-y-0.5 disabled:opacity-50',
                value === v
                  ? color === 'blue' ? 'border-blue-500/70 bg-blue-500/20 text-white' : 'border-emerald-500/70 bg-emerald-500/20 text-white'
                  : 'border-(--border) bg-(--code-bg) text-(--text)/40 hover:text-white'
              )}
            >{v}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Privacy summary ───────────────────────────────────────────────────────────
function PrivacySummary({ privacy }) {
  if (!privacy) return null
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[
        { who: '👩 What Alice learns', sees: privacy.alice_sees, learns: privacy.alice_learns, hidden: privacy.alice_hidden, color: 'blue' },
        { who: '👨 What Bob learns',   sees: privacy.bob_sees,   learns: privacy.bob_learns,   hidden: privacy.bob_hidden,   color: 'green' },
      ].map(({ who, sees, learns, hidden, color }) => (
        <div key={who} className={cx('rounded-xl border p-3 space-y-2', color === 'blue' ? 'border-blue-500/30 bg-blue-500/5' : 'border-emerald-500/30 bg-emerald-500/5')}>
          <p className={cx('text-xs font-black', color === 'blue' ? 'text-blue-300' : 'text-emerald-300')}>{who}</p>
          <div className="space-y-1 text-[11px]">
            <p><span className="text-(--text)/40">Sees: </span><span className="font-mono text-(--text)/70">{Array.isArray(sees) ? sees.join(', ') : sees}</span></p>
            <p><span className="text-(--text)/40">Learns: </span><span className="text-emerald-300 font-black">{learns}</span></p>
            <p><span className="text-(--text)/40">Hidden: </span><span className="text-rose-300/80 font-black">{hidden}</span></p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── AND Demo Tab ──────────────────────────────────────────────────────────────
function ANDDemoTab() {
  const [params, setParams] = useState(null)
  const [a, setA] = useState(1)
  const [b, setB] = useState(1)
  const [result, setResult] = useState(null)
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [error, setError] = useState('')

  const addLog = useCallback(e => setLog(prev => [...prev, e]), [])

  const genParams = async () => {
    setGenLoading(true); setError('')
    try {
      const r = await pa19api.post('/api/pa19/gen-params', { bits: 32 })
      setParams(r.data)
    } catch(e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { setGenLoading(false) }
  }

  const computeAND = async () => {
    if (!params) { setError('Generate group params first'); return }
    setLoading(true); setError(''); setLog([]); setResult(null)
    try {
      addLog({ step: 'setup', from: 'Alice', to: 'Alice', type: 'key',
        content: `Alice prepares OT messages: m0=0, m1=a=${a}.  Choice bit b=${b} is known only to Bob.` })
      addLog({ step: '1', from: 'Bob', to: 'Bob', type: 'key',
        content: `Bob generates pk_${b} (honest, keeps sk_${b}) and pk_${1-b} (no trapdoor — random h in Z*_p)` })
      addLog({ step: '1→', from: 'Bob', to: 'Alice', type: 'send',
        content: `(pk0, pk1) sent to Alice — Alice cannot tell which is "real" (DDH hardness)` })
      addLog({ step: '2', from: 'Alice', to: 'Alice', type: 'key',
        content: `Alice encrypts: C0=ElGamal(pk0, 0+1), C1=ElGamal(pk1, ${a}+1) with fresh randomness` })
      addLog({ step: '2→', from: 'Alice', to: 'Bob', type: 'send',
        content: `(C0, C1) sent to Bob` })

      const r = await pa19api.post('/api/pa19/secure-and', {
        p: params.p, q: params.q, g: params.g, a, b
      })

      addLog({ step: '3', from: 'Bob', to: 'Bob', type: 'recv',
        content: `Bob decrypts C${b} with sk${b} → m${b} = ${r.data.m_received} → result = m${b}-1 = ${r.data.result} = a∧b` })
      addLog({ step: '✓', from: 'Output', to: 'Both', type: 'recv',
        content: `a∧b = ${r.data.result}   (${a}∧${b} = ${a&b}) — correct: ${r.data.correct}` })

      setResult(r.data)
    } catch(e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {/* Group setup */}
      <div className="rounded-xl border border-(--border) bg-(--code-bg) p-3 flex items-center gap-3 flex-wrap">
        <Btn onClick={genParams} disabled={genLoading} id="pa19-gen-params-btn">
          {genLoading ? <><Spinner />Generating…</> : '⚡ Generate 32-bit Group'}
        </Btn>
        {params && <span className="text-xs text-emerald-300 font-black">✓ Group ready — p={String(params.p).slice(0,10)}…</span>}
        {error && <span className="text-xs text-rose-400 font-black">{error}</span>}
      </div>

      {/* Alice + Bob panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BitSelector label="Alice (Sender)" value={a} onChange={setA} color="blue"  disabled={loading} />
        <BitSelector label="Bob (Receiver)" value={b} onChange={setB} color="green" disabled={loading} />
      </div>

      {/* Compute */}
      <Btn onClick={computeAND} disabled={loading || !params} id="pa19-compute-and-btn">
        {loading ? <><Spinner />Computing AND…</> : `🔒 Compute Secure AND(${a}, ${b})`}
      </Btn>

      {/* Message log */}
      {log.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/40">📋 Protocol Transcript</p>
          {log.map((e, i) => <LogRow key={i} step={e.step} from={e.from} to={e.to} content={e.content} type={e.type} />)}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className={cx('rounded-2xl border-2 p-5 text-center', result.correct ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5')}>
            <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/40 mb-1">Secure AND Result</p>
            <p className="text-7xl font-black text-emerald-300">{result.result}</p>
            <p className="text-sm text-(--text)/60 mt-2">{a} ∧ {b} = {a & b}  —  {result.correct ? '✅ Correct' : '❌ Wrong'}</p>
            <p className="text-xs text-(--text)/40 mt-1">via OT in {result.total_ms}ms</p>
          </div>
          <PrivacySummary privacy={result.privacy} />
        </div>
      )}
    </div>
  )
}

// ── XOR & NOT Demo Tab ────────────────────────────────────────────────────────
function XORNOTTab() {
  const [aXor, setAXor] = useState(1)
  const [bXor, setBXor] = useState(0)
  const [aNot, setANot] = useState(1)
  const [xorResult, setXorResult] = useState(null)
  const [notResult, setNotResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const compute = async () => {
    setLoading(true)
    try {
      const [rx, rn] = await Promise.all([
        pa19api.post('/api/pa19/secure-xor', { a: aXor, b: bXor }),
        pa19api.post('/api/pa19/secure-not', { a: aNot }),
      ])
      setXorResult(rx.data); setNotResult(rn.data)
    } catch(e) {} finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* XOR */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <p className="font-black text-sm text-white">XOR Gate (Free — Additive Shares)</p>
          <p className="text-xs text-(--text)/60">No OT needed. Alice samples r, sends r to Bob. Output = (a⊕r) ⊕ (b⊕r) = a⊕b.</p>
          <div className="grid grid-cols-2 gap-2">
            {['a', 'b'].map((lbl, i) => (
              <div key={lbl} className="space-y-1">
                <p className="text-[10px] font-black uppercase text-amber-300">{lbl}</p>
                <div className="flex gap-1">
                  {[0,1].map(v => (
                    <button key={v} onClick={() => i === 0 ? setAXor(v) : setBXor(v)}
                      className={cx('flex-1 rounded-lg border py-2 font-black text-sm transition-all',
                        (i===0?aXor:bXor)===v ? 'border-amber-500/60 bg-amber-500/20 text-white' : 'border-(--border) bg-(--bg) text-(--text)/40 hover:text-white'
                      )}>{v}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {xorResult && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
              <div className="text-center">
                <p className="text-[10px] text-amber-300/60 uppercase tracking-widest">XOR Result</p>
                <p className="text-5xl font-black text-amber-300 mt-1">{xorResult.result}</p>
                <p className="text-xs text-(--text)/50 mt-1">{aXor} ⊕ {bXor} = {aXor^bXor}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div><p className="text-(--text)/40">r (mask)</p><p className="font-mono text-amber-300">{xorResult.trace?.r}</p></div>
                <div><p className="text-(--text)/40">s_A = a⊕r</p><p className="font-mono text-amber-300">{xorResult.trace?.s_A}</p></div>
                <div><p className="text-(--text)/40">s_B = b⊕r</p><p className="font-mono text-amber-300">{xorResult.trace?.s_B}</p></div>
              </div>
            </div>
          )}
        </div>

        {/* NOT */}
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
          <p className="font-black text-sm text-white">NOT Gate (Free — Local Flip)</p>
          <p className="text-xs text-(--text)/60">Alice locally flips her bit. Zero communication. No OT.</p>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-cyan-300">a</p>
            <div className="flex gap-2">
              {[0,1].map(v => (
                <button key={v} onClick={() => setANot(v)}
                  className={cx('flex-1 rounded-lg border py-2 font-black text-sm transition-all',
                    aNot===v ? 'border-cyan-500/60 bg-cyan-500/20 text-white' : 'border-(--border) bg-(--bg) text-(--text)/40 hover:text-white'
                  )}>{v}</button>
              ))}
            </div>
          </div>
          {notResult && (
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3 text-center">
              <p className="text-[10px] text-cyan-300/60 uppercase tracking-widest">NOT Result</p>
              <p className="text-5xl font-black text-cyan-300 mt-1">{notResult.result}</p>
              <p className="text-xs text-(--text)/50 mt-1">NOT({aNot}) = {1-aNot}</p>
            </div>
          )}
        </div>
      </div>
      <Btn onClick={compute} disabled={loading} id="pa19-xor-not-btn">
        {loading ? <><Spinner />Computing…</> : `▶ Compute XOR(${aXor},${bXor}) and NOT(${aNot})`}
      </Btn>
    </div>
  )
}

// ── Truth Table Tab ───────────────────────────────────────────────────────────
function TruthTableTab() {
  const [params, setParams] = useState(null)
  const [trials, setTrials] = useState(50)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError]    = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null); setElapsed(0)
    const timer = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      let p = params
      if (!p) {
        const pg = await pa19api.post('/api/pa19/gen-params', { bits: 32 })
        setParams(pg.data); p = pg.data
      }
      const r = await pa19api.post('/api/pa19/truth-table', {
        p: p.p, q: p.q, g: p.g, trials_per_combo: trials,
      })
      setResult(r.data)
    } catch(e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { clearInterval(timer); setLoading(false) }
  }

  const COMBO_LABELS = ['(0,0)', '(0,1)', '(1,0)', '(1,1)']

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-(--border) bg-(--code-bg) p-4 space-y-3">
        <p className="font-black text-sm text-white">Truth Table — All 4 Input Combinations, {trials} Trials Each</p>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-white">Trials: <span className="text-purple-300">{trials}</span></p>
            <input type="range" min={10} max={200} step={10} value={trials}
              onChange={e => setTrials(Number(e.target.value))} className="w-48 accent-purple-500" />
          </div>
          <Btn onClick={run} disabled={loading} id="pa19-truth-table-btn">
            {loading ? `Running… (${elapsed}s)` : '▶ Run All 4 Combinations'}
          </Btn>
        </div>
        {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
      </div>

      {result && (
        <div className="space-y-3">
          {/* Big pass/fail */}
          <div className={cx('rounded-2xl border-2 p-5 text-center', result.all_pass ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5')}>
            <p className="text-5xl font-black text-emerald-300">{result.all_pass ? '✅ All Pass' : '❌ Failures'}</p>
            <p className="text-sm text-(--text)/60 mt-2">{result.trials_per} trials per combo in {result.elapsed_ms}ms</p>
          </div>

          {/* Per-combo table */}
          <div className="overflow-x-auto rounded-xl border border-(--border)">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-(--border) bg-(--code-bg)">
                  {['(a,b)', 'a∧b', 'AND pass', 'a⊕b', 'XOR pass', 'NOT(a)', 'NOT ok'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-black text-(--text)/50 uppercase tracking-widest text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.combos.map((c, i) => (
                  <tr key={i} className={cx('border-b border-(--border)/50', c.ok ? 'bg-(--bg)' : 'bg-rose-500/5')}>
                    <td className="px-3 py-2 font-black text-white">{COMBO_LABELS[i]}</td>
                    <td className="px-3 py-2 font-mono text-amber-300">{c.and_expected}</td>
                    <td className="px-3 py-2">
                      <span className={cx('font-black', c.and_pass===c.trials ? 'text-emerald-300' : 'text-rose-400')}>
                        {c.and_pass}/{c.trials}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-amber-300">{c.xor_expected}</td>
                    <td className="px-3 py-2">
                      <span className={cx('font-black', c.xor_pass===c.trials ? 'text-emerald-300' : 'text-rose-400')}>
                        {c.xor_pass}/{c.trials}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-cyan-300">{c.not_a_expected}</td>
                    <td className="px-3 py-2">
                      <span className={cx('font-black', c.not_pass ? 'text-emerald-300' : 'text-rose-400')}>
                        {c.not_pass ? '✓' : '✗'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Privacy Proof Tab ─────────────────────────────────────────────────────────
function PrivacyProofTab() {
  const PROOF = [
    {
      title: 'Secure AND — Bob learns nothing about a',
      color: 'blue',
      icon: '👩',
      points: [
        'Bob receives m_b via OT where m0=0, m1=a.',
        'If b=0: Bob receives m0=0. He knows nothing about a (could be 0 or 1).',
        'If b=1: Bob receives m1=a. He learns a∧b=a (but only because b=1 forces a∧b=a).',
        'Bob sees only ONE ciphertext decrypted — OT receiver privacy guarantees pk_(1-b) reveals nothing.',
        'Formally: Bob\'s view is distributed as {0, a∧b} — which is exactly {0, a} only when b=1.',
        'This follows directly from PA#18 OT receiver privacy (DDH hardness).',
      ],
    },
    {
      title: 'Secure AND — Alice learns nothing about b',
      color: 'green',
      icon: '👨',
      points: [
        'Alice sends (C0, C1) and receives no response from Bob.',
        'The OT protocol guarantees Alice learns nothing about Bob\'s choice bit b.',
        'Alice sees (pk0, pk1) — but cannot distinguish which is "honest" (generated with sk) vs trapdoor-free.',
        'Under DDH hardness: pk_b = g^x mod p and pk_(1-b) = random h are computationally indistinguishable.',
        'This follows directly from PA#18 OT sender privacy.',
      ],
    },
    {
      title: 'Secure XOR — Additive Sharing Privacy',
      color: 'amber',
      icon: '⊕',
      points: [
        'r ← {0,1} is uniformly random. Alice\'s share s_A = a⊕r is uniform regardless of a.',
        'Bob sees r and s_B = b⊕r. He cannot determine a from these alone (s_A not sent to Bob).',
        'Alice sees s_A = a⊕r and r — she knows a but learns nothing about b (s_B not sent to Alice).',
        'Information-theoretic security: no computational assumption needed for XOR.',
      ],
    },
  ]

  return (
    <div className="space-y-3">
      {PROOF.map(({ title, color, icon, points }) => (
        <div key={title} className={cx('rounded-xl border p-4 space-y-2',
          color === 'blue'  ? 'border-blue-500/30 bg-blue-500/5' :
          color === 'green' ? 'border-emerald-500/30 bg-emerald-500/5' :
                              'border-amber-500/30 bg-amber-500/5'
        )}>
          <p className={cx('font-black text-sm', color === 'blue' ? 'text-blue-300' : color === 'green' ? 'text-emerald-300' : 'text-amber-300')}>
            {icon} {title}
          </p>
          <ul className="space-y-1">
            {points.map((pt, i) => (
              <li key={i} className="flex gap-2 text-xs text-(--text)/70">
                <span className="shrink-0 text-(--text)/30">{i+1}.</span>
                <span>{pt}</span>
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
  { key: 'and',     label: '🔒 Secure AND' },
  { key: 'xornot', label: '⊕ XOR & NOT' },
  { key: 'table',  label: '📊 Truth Table' },
  { key: 'proof',  label: '🔏 Privacy Proof' },
]

export default function SecureGateDemo() {
  const [tab, setTab] = useState('and')

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer — PA#19: Secure AND, XOR, NOT Gates" />

        {/* Theory */}
        <div className="mb-4 rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 space-y-2">
          <p className="text-[13px] font-black uppercase tracking-widest text-white">Secure Gates via OT</p>
          <p className="text-sm text-(--text)/70 leading-relaxed">
            <strong className="text-white">AND and XOR form a functionally complete basis</strong> — any boolean function can be computed from them.
            Secure AND uses <strong className="text-purple-300">PA#18 OT</strong> as a black box: Alice sends (m0=0, m1=a),
            Bob receives m_b = a·b = a∧b. XOR is free via additive shares. NOT is local.
          </p>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[
              { gate: 'AND', cost: '1 OT call', via: 'PA#18', color: 'border-purple-500/30 text-purple-300' },
              { gate: 'XOR', cost: 'Free (no OT)', via: 'Additive shares Z₂', color: 'border-amber-500/30 text-amber-300' },
              { gate: 'NOT', cost: 'Free (local)', via: 'Alice flips bit', color: 'border-cyan-500/30 text-cyan-300' },
            ].map(({ gate, cost, via, color }) => (
              <div key={gate} className={cx('rounded-lg border p-2 text-center', color)}>
                <p className="font-black text-sm">{gate}</p>
                <p className="text-[10px] text-(--text)/50">{cost}</p>
                <p className="text-[10px] font-mono mt-0.5">{via}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-mono text-(--text)/40">PA#19 → PA#18 (OT) → PA#16 (ElGamal) → PA#11 (DH) → PA#13 (mod_exp)</p>
        </div>

        {/* Tab bar */}
        <div className="overflow-hidden rounded-xl border border-(--border)">
          <div className="border-b border-(--border) bg-(--code-bg) px-3 py-2">
            <div className="flex gap-1 flex-wrap">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={cx('rounded-lg px-3 py-1.5 text-xs font-black transition-all',
                    tab === t.key ? 'bg-purple-500/20 border border-purple-500/50 text-white' : 'text-(--text)/60 hover:text-white hover:bg-(--code-bg)'
                  )}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="p-4 min-h-[480px]">
            {tab === 'and'     && <ANDDemoTab />}
            {tab === 'xornot' && <XORNOTTab />}
            {tab === 'table'  && <TruthTableTab />}
            {tab === 'proof'  && <PrivacyProofTab />}
          </div>
        </div>
      </section>
    </main>
  )
}
