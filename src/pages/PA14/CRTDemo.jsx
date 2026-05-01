import { useState, useCallback, useRef } from 'react'
import axios from 'axios'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'

const pa14api = axios.create({ baseURL: api.defaults.baseURL, timeout: 600_000 })

function cx(...c) { return c.filter(Boolean).join(' ') }

function truncHex(h, maxChars = 28) {
  if (!h) return '—'
  const s = String(h)
  if (s.length <= maxChars + 2) return s
  return s.slice(0, Math.floor(maxChars / 2) + 2) + '…' + s.slice(-Math.floor(maxChars / 2))
}

function hexStr(n) {
  if (!n) return '—'
  try { return '0x' + BigInt(n).toString(16).toUpperCase() } catch { return String(n) }
}

// ── UI Primitives ──────────────────────────────────────────────────────────────

function Card({ title, children, className = '', accent = '' }) {
  return (
    <div className={cx(
      'rounded-xl border overflow-hidden',
      accent || 'border-(--border)',
      className
    )}>
      {title && (
        <div className={cx('border-b px-4 py-2.5', accent ? `${accent}/20` : 'bg-(--code-bg)', accent ? `border-${accent}/30` : 'border-(--border)')}>
          <h3 className="text-xs font-black uppercase tracking-widest text-white">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

function KV({ label, value, mono = true, color = 'text-white', small = false, wrap = true }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">{label}</span>
      <span className={cx(small ? 'text-[11px]' : 'text-xs', mono ? 'font-mono' : '', wrap ? 'break-all' : '', 'leading-relaxed', color)}>
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
    )}>
      {label}
    </span>
  )
}

function Spinner() {
  return <span className="inline-block animate-spin mr-1">⟳</span>
}

function Arrow({ label, dir = 'down', color = 'text-purple-400' }) {
  return (
    <div className={cx('flex flex-col items-center gap-1 my-1', color)}>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>
      <span className="text-xl">{dir === 'down' ? '↓' : '→'}</span>
    </div>
  )
}

// ── Algorithm Overview ─────────────────────────────────────────────────────────

function AlgoOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {[
        {
          icon: '🔢', title: 'Chinese Remainder Theorem',
          steps: [
            'Given x ≡ aᵢ (mod nᵢ) for coprime nᵢ',
            'N = n₁ · n₂ · … · nₖ',
            'x = Σ aᵢ · Mᵢ · (Mᵢ⁻¹ mod nᵢ)  mod N',
            'Mᵢ = N/nᵢ   [inverses via Ext. GCD]',
          ],
          color: 'border-blue-500/40 bg-blue-500/5',
        },
        {
          icon: '⚡', title: "Garner's Fast Decryption",
          steps: [
            'mp = C^dp mod p,  mq = C^dq mod q',
            'dp = d mod (p-1),  dq = d mod (q-1)',
            'h  = q_inv · (mp − mq) mod p',
            'm  = mq + h·q          (≈ 4× faster)',
          ],
          color: 'border-amber-500/40 bg-amber-500/5',
        },
        {
          icon: '🔓', title: "Håstad's Broadcast Attack",
          steps: [
            'e=3: encrypt same m to 3 recipients',
            'cᵢ = m³ mod Nᵢ  (same m, diff. Nᵢ)',
            'CRT recovers x = m³ exactly (as int)',
            '∛x = m   ← no factoring needed!',
          ],
          color: 'border-rose-500/40 bg-rose-500/5',
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

// ── CRT Solver Tab ─────────────────────────────────────────────────────────────

function CRTSolverTab() {
  const [rows, setRows] = useState([
    { a: '2', n: '3' },
    { a: '3', n: '5' },
    { a: '2', n: '7' },
  ])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const setRow = (i, field, val) => {
    setRows(r => r.map((row, j) => j === i ? { ...row, [field]: val } : row))
  }
  const addRow = () => setRows(r => [...r, { a: '0', n: '2' }])
  const removeRow = i => setRows(r => r.filter((_, j) => j !== i))

  const solve = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await pa14api.post('/api/pa14/crt-solve', {
        residues: rows.map(r => r.a),
        moduli:   rows.map(r => r.n),
      })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'CRT solve failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <Card title="🔢 CRT Solver — x ≡ aᵢ (mod nᵢ)">
        <div className="space-y-3">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            Enter a system of congruences. Moduli must be pairwise coprime.
            The solver uses the constructive formula with <strong className="text-white">modular inverses
            via the extended Euclidean algorithm</strong> (no library).
          </p>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[10px] font-black uppercase tracking-widest text-(--text)/50">
              <span>Residue aᵢ</span><span>Modulus nᵢ</span><span></span>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input value={row.a} onChange={e => setRow(i, 'a', e.target.value)}
                  className="rounded-lg border border-(--border) bg-(--code-bg) px-3 py-1.5 text-sm text-white font-mono outline-none focus:border-purple-500/60 transition-all" />
                <input value={row.n} onChange={e => setRow(i, 'n', e.target.value)}
                  className="rounded-lg border border-(--border) bg-(--code-bg) px-3 py-1.5 text-sm text-white font-mono outline-none focus:border-purple-500/60 transition-all" />
                <button onClick={() => removeRow(i)} disabled={rows.length <= 2}
                  className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 disabled:opacity-30 transition-all">
                  ✕
                </button>
              </div>
            ))}
            <button onClick={addRow}
              className="text-xs text-(--text)/60 hover:text-purple-300 transition-all font-black">
              + Add congruence
            </button>
          </div>

          <div className="flex gap-3">
            <Btn onClick={solve} disabled={loading} id="pa14-crt-solve-btn">
              {loading ? <><Spinner />Solving…</> : '⟳ Solve CRT'}
            </Btn>
          </div>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {result && (
        <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-black">✅ Solution Found</span>
            <Badge label="Unique mod N" color="green" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KV label="x (solution)" value={String(result.x)} color="text-emerald-300" />
            <KV label="N = Π nᵢ" value={String(result.N)} />
            <KV label="x mod N" value={String(result.x) + ' (unique)'} color="text-emerald-300" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">Verification</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {result.residues?.map((a, i) => {
                const check = Number(result.x) % Number(result.moduli[i])
                const ok = check === Number(a)
                return (
                  <div key={i} className={cx(
                    'rounded-lg border px-3 py-2 text-xs font-mono',
                    ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                       : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  )}>
                    {result.x} mod {result.moduli[i]} = <strong>{check}</strong>
                    {' '}{ok ? '✓' : '✗'} (expected {a})
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Garner Benchmark Tab ───────────────────────────────────────────────────────

function GarnerTab() {
  const [bits, setBits]     = useState(1024)
  const [trials, setTrials] = useState(1000)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const timerRef = useRef(null)
  const [elapsed, setElapsed] = useState(0)

  const SIZES = [256, 512, 1024, 2048]

  const run = async () => {
    setLoading(true); setError(''); setResult(null); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      const r = await pa14api.post('/api/pa14/benchmark', { bits, trials })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Benchmark failed') }
    finally { clearInterval(timerRef.current); setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <Card title="⚡ Garner's CRT Decryption — Performance Benchmark">
        <div className="space-y-4">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            Standard RSA decryption computes <code className="text-white">C^d mod N</code> where
            N ≈ 2<sup>bits</sup>. CRT decryption uses half-size exponents dp, dq over half-size moduli
            p, q — giving a <strong className="text-amber-300">≈ 3–4× speedup</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-white">Key bit-size</p>
              <div className="flex gap-2 flex-wrap">
                {SIZES.map(b => (
                  <button key={b} onClick={() => setBits(b)}
                    className={cx(
                      'rounded-lg border px-3 py-1 text-xs font-black transition-all hover:-translate-y-0.5',
                      bits === b
                        ? 'border-amber-500/60 bg-amber-500/20 text-white'
                        : 'border-(--border) bg-(--code-bg) text-(--text) hover:border-amber-500/40'
                    )}>{b}-bit</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-white">
                Trials: <span className="text-amber-300">{trials}</span>
              </p>
              <input type="range" min={100} max={1000} step={100} value={trials}
                onChange={e => setTrials(Number(e.target.value))}
                className="w-full accent-amber-500" />
              <p className="text-[11px] text-(--text)/40">
                1000 per spec. 2048-bit at 1000 trials may take 5–15 min.
              </p>
            </div>
          </div>

          <Btn onClick={run} disabled={loading} id="pa14-bench-btn">
            {loading ? `Running… (${elapsed}s)` : '🏃 Run Benchmark'}
          </Btn>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {result && (
        <div className="space-y-3">
          {/* Speedup hero */}
          <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-5 text-center">
            <p className="text-[11px] font-black uppercase tracking-widest text-(--text)/50 mb-1">CRT Speedup</p>
            <p className="text-6xl font-black text-amber-300">{result.speedup}×</p>
            <p className="text-xs text-(--text)/60 mt-1">
              {result.bits}-bit RSA · {result.trials} decryptions each
            </p>
            <Badge label={result.correctness_ok ? '✓ All results verified correct' : '✗ Correctness check failed'}
              color={result.correctness_ok ? 'green' : 'red'} />
          </div>

          {/* Side-by-side timings */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Standard C^d mod N', total: result.std_total_ms, per: result.std_per_dec_ms, color: 'rose' },
              { label: 'Garner CRT (mp, mq)', total: result.crt_total_ms, per: result.crt_per_dec_ms, color: 'emerald' },
            ].map(({ label, total, per, color }) => (
              <div key={label} className={cx(
                'rounded-xl border p-4 space-y-2',
                `border-${color}-500/30 bg-${color}-500/5`
              )}>
                <p className={cx('text-[11px] font-black uppercase tracking-widest', `text-${color}-300`)}>{label}</p>
                <KV label="Total time" value={`${total} ms`} mono={false} color={`text-${color}-200`} />
                <KV label="Per decryption" value={`${per} ms`} mono={false} color={`text-${color}-200`} />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 text-xs text-(--text)/70">
            <strong className="text-white">Why ≈ 4×:</strong> dp = d mod (p-1) and dq = d mod (q-1)
            are each ~half the bit-length of d. Modular exponentiation cost is
            O(log-exp · log-mod²) — halving both yields a 4× reduction in work.
            Garner's formula then combines mp and mq in O(1) multiplications.
          </div>
        </div>
      )}
    </div>
  )
}

// ── Garner's Algorithm Correctness Tab ─────────────────────────────────────

function GarnerAlgoTab() {
  const [bits, setBits]     = useState(512)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const timerRef = useRef(null)
  const [elapsed, setElapsed] = useState(0)

  const SIZES = [128, 256, 512, 1024]

  const run = async () => {
    setLoading(true); setError(''); setResult(null); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      const r = await pa14api.post('/api/pa14/garner-correctness', {
        bits, n_messages: 100,
      })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Correctness check failed') }
    finally { clearInterval(timerRef.current); setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <Card title="⚡ Garner's Algorithm — RSA CRT Decryption Correctness">
        <div className="space-y-4">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            Implements <code className="text-white">rsa_dec_crt(sk, c)</code> where sk = (p, q, dp, dq, q_inv).
            Computes <code className="text-white">mp = c^dp mod p</code>, <code className="text-white">mq = c^dq mod q</code>,
            then recombines via <strong className="text-white">Garner's formula</strong>:
            <span className="font-mono text-amber-300 ml-1">h = q_inv·(mp−mq) mod p, m = mq + h·q</span>.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-300">Assignment Requirement</p>
            <p className="text-xs text-(--text)/70 leading-relaxed">
              Verify <code className="text-white">rsa_dec_crt(sk, c) == rsa_dec(sk, c)</code> for
              <strong className="text-white"> 100 random messages</strong>. Each row below shows one random
              plaintext m, its ciphertext c, the Standard decryption result and the Garner CRT result,
              with a match indicator.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-white">Key bit-size</p>
            <div className="flex gap-2 flex-wrap">
              {SIZES.map(b => (
                <button key={b} onClick={() => setBits(b)}
                  className={cx(
                    'rounded-lg border px-3 py-1 text-xs font-black transition-all hover:-translate-y-0.5',
                    bits === b
                      ? 'border-amber-500/60 bg-amber-500/20 text-white'
                      : 'border-(--border) bg-(--code-bg) text-(--text) hover:border-amber-500/40'
                  )}>{b}-bit</button>
              ))}
            </div>
          </div>

          <Btn onClick={run} disabled={loading} id="pa14-garner-algo-btn">
            {loading ? `Running… (${elapsed}s)` : '⚡ Run 100-Message Correctness Check'}
          </Btn>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {result && (
        <div className="space-y-3">
          {/* Summary hero */}
          <div className={cx(
            'rounded-xl border-2 p-5 text-center space-y-1',
            result.all_match
              ? 'border-emerald-500/50 bg-emerald-500/8'
              : 'border-rose-500/50 bg-rose-500/8'
          )}>
            <p className={cx('text-4xl font-black', result.all_match ? 'text-emerald-400' : 'text-rose-400')}>
              {result.all_match ? '✓ ALL MATCH' : '✗ MISMATCH FOUND'}
            </p>
            <p className="text-xs text-(--text)/60">
              {result.passed} / {result.n_messages} messages: rsa_dec_crt == rsa_dec == m
            </p>
            <p className="text-xs text-(--text)/50">
              {result.bits}-bit RSA key · completed in {result.total_ms} ms
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {[
              { label: 'Key size',      val: `${result.bits} bits`,     color: 'text-white' },
              { label: 'Messages',      val: result.n_messages,          color: 'text-white' },
              { label: 'Passed',        val: result.passed,              color: 'text-emerald-400' },
              { label: 'Failed',        val: result.failed,              color: result.failed > 0 ? 'text-rose-400' : 'text-emerald-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-xl border border-(--border) bg-(--code-bg) p-3">
                <p className="text-[10px] uppercase tracking-widest text-(--text)/50 font-black">{label}</p>
                <p className={cx('font-black text-2xl mt-1', color)}>{val}</p>
              </div>
            ))}
          </div>

          {/* Per-row table: 100 rows */}
          <Card title={`📊 100-Row Comparison — Standard vs Garner's CRT`}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-(--border)">
                    {['#', 'Message m (hex)', 'Ciphertext c (hex)', 'Standard m_std', 'Garner m_crt', 'Time std (ms)', 'Time CRT (ms)', 'Match'].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-black uppercase tracking-wider text-(--text)/40 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border)/40">
                  {result.rows.map(r => (
                    <tr key={r.row} className={cx(
                      'transition-colors hover:bg-(--code-bg)/40',
                      !r.match && 'bg-rose-500/10'
                    )}>
                      <td className="px-2 py-1.5 font-black text-(--text)/50">{r.row}</td>
                      <td className="px-2 py-1.5 font-mono text-(--text)/70 max-w-[120px] truncate" title={r.m}>
                        {r.m.length > 20 ? r.m.slice(0, 10) + '…' + r.m.slice(-8) : r.m}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-(--text)/50 max-w-[120px] truncate" title={r.c}>
                        {r.c.length > 20 ? r.c.slice(0, 10) + '…' + r.c.slice(-8) : r.c}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-blue-300 max-w-[120px] truncate" title={r.m_std}>
                        {r.m_std.length > 20 ? r.m_std.slice(0, 10) + '…' + r.m_std.slice(-8) : r.m_std}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-amber-300 max-w-[120px] truncate" title={r.m_crt}>
                        {r.m_crt.length > 20 ? r.m_crt.slice(0, 10) + '…' + r.m_crt.slice(-8) : r.m_crt}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-(--text)/60 text-center">{r.std_ms}</td>
                      <td className="px-2 py-1.5 font-mono text-amber-300/80 text-center">{r.crt_ms}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={cx(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
                          r.match
                            ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                            : 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                        )}>
                          {r.match ? '✓ MATCH' : '✗ FAIL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {result.all_match && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center">
              <p className="text-emerald-300 font-black text-sm">
                ✓ Garner's CRT decryption matches standard decryption for all 100 random messages.
              </p>
              <p className="text-xs text-emerald-300/60 mt-1">
                mp = c^dp mod p · mq = c^dq mod q · h = q_inv·(mp−mq) mod p · m = mq + h·q
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Recipient Panel ─────────────────────────────────────────────────────────────

function RecipientPanel({ r, revealed, attackDone }) {
  const colors = ['blue', 'purple', 'cyan']
  const c = colors[(r.index - 1) % 3]
  const borderC  = `border-${c}-500/40`
  const bgC      = `bg-${c}-500/5`
  const textC    = `text-${c}-300`

  return (
    <div className={cx('rounded-xl border p-4 space-y-3 transition-all duration-500', borderC, bgC)}>
      <div className="flex items-center justify-between">
        <span className={cx('font-black text-sm', textC)}>👤 Recipient {r.index}</span>
        <Badge label={`e = ${r.e}`} color={c} />
      </div>

      <div className="space-y-2">
        <KV label={`N${r.index} (${r.N?.length > 12 ? '…' : ''} modulus)`}
          value={truncHex(r.N_hex, 20)} small color={textC} />
        <KV label={`c${r.index} = m${r.e === 3 ? '³' : `^${r.e}`} mod N${r.index}`}
          value={truncHex(r.c_hex, 20)} small />
      </div>

      {r.padded && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
          <p className="text-[10px] font-black text-amber-300">🛡 PKCS#1 v1.5 padding applied</p>
          <p className="text-[10px] text-(--text)/50">Random PS bytes — differs from other recipients</p>
        </div>
      )}

      {/* Little flow diagram inside */}
      <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono text-(--text)/50">
        <span className={cx('px-2 py-0.5 rounded', `bg-${c}-500/15 text-${c}-300`)}>m</span>
        <span>→ m³ mod N{r.index} →</span>
        <span className="px-2 py-0.5 rounded bg-(--code-bg) text-white">c{r.index}</span>
      </div>
    </div>
  )
}

// ── Hastad Attack Panel ────────────────────────────────────────────────────────

function HastadAttackPanel({ result, onCubeRoot, cubeRootDone, cubeRootLoading }) {
  if (!result) return null

  return (
    <div className="space-y-3">
      {/* CRT step */}
      <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="font-black text-sm text-purple-300">🔢 Attacker — Step 1: CRT</span>
          <Badge label="m³ = CRT(c₁, c₂, c₃)" color="purple" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono text-center">
          {result.recipients?.map((r, i) => (
            <div key={i} className="space-y-1">
              <div className="rounded border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-purple-300">
                c{r.index} mod N{r.index}
              </div>
              {i < 2 && (
                <div className="hidden md:flex items-center justify-center text-purple-400 text-lg">+</div>
              )}
            </div>
          ))}
        </div>

        <Arrow label="CRT reconstruct → m³ exact (as integer)" dir="down" color="text-purple-400" />

        <div className="space-y-2">
          <KV label="x = m³ (recovered via CRT)" value={truncHex(result.x_me, 32)} color="text-purple-200" />
          <KV label="CRT modulus bits" value={`${result.crt_product_bits} bits`} mono={false} color="text-purple-200" />
        </div>
      </div>

      {/* Cube root step */}
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="font-black text-sm text-rose-300">🧮 Attacker — Step 2: Integer Cube Root</span>
        </div>
        <p className="text-xs text-(--text)/60">
          Compute <code className="text-white">∛x</code> using Newton's method on integers.
          If the result is an exact perfect cube, the attack succeeds.
        </p>
        <Btn onClick={onCubeRoot} disabled={cubeRootLoading || cubeRootDone} id="pa14-cube-root-btn">
          {cubeRootLoading ? <><Spinner />Computing…</> : cubeRootDone ? '✅ Done' : '∛ Compute Cube Root'}
        </Btn>
      </div>
    </div>
  )
}

// ── Hastad Result Panel ────────────────────────────────────────────────────────

function HastadResultPanel({ result }) {
  if (!result) return null

  const succeeded = result.attack_succeeded
  const exact     = result.exact_root

  return (
    <div className={cx(
      'rounded-xl border-2 p-5 space-y-3 transition-all duration-700',
      succeeded
        ? 'border-rose-500/60 bg-rose-500/8'
        : 'border-emerald-500/50 bg-emerald-500/8'
    )}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-2xl font-black">
          {succeeded ? '🚨 Attack Succeeded!' : '🛡 Attack Failed'}
        </span>
        <Badge
          label={succeeded ? 'Plaintext Recovered' : exact ? 'Root found but ≠ m (padding!)' : 'Not a perfect cube'}
          color={succeeded ? 'red' : 'green'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <KV label="Original message" value={result.message} mono={false}
          color={succeeded ? 'text-rose-200' : 'text-emerald-200'} />
        <KV label="Recovered value" value={result.recovered_str}
          color={succeeded ? 'text-rose-200' : 'text-emerald-200'} />
        <KV label="Integer e-th root exact?" value={exact ? '✓ Yes — perfect cube' : '✗ No — not a cube (garbage)'} mono={false}
          color={exact ? 'text-rose-300' : 'text-emerald-300'} />
        <KV label="m_int = m as integer" value={result.m_int} small />
        <KV label="Recovered int" value={result.recovered_int} small />
      </div>

      {succeeded && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-3">
          <p className="text-rose-200 font-black text-sm">
            Plaintext "{result.message}" recovered without breaking any private key.
          </p>
          <p className="text-rose-200/70 text-xs mt-1">
            This attack requires <strong>no factoring</strong> and <strong>no private keys</strong>.
            It exploits the fact that m³ &lt; N₁·N₂·N₃ when m is short.
          </p>
        </div>
      )}

      {!succeeded && !exact && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3">
          <p className="text-emerald-200 font-black text-sm">
            PKCS#1 v1.5 padding randomises each plaintext — CRT recovers garbage, not m³.
          </p>
          <p className="text-emerald-200/70 text-xs mt-1">
            Each recipient's padded message is different, so the three ciphertexts no longer
            share a common underlying integer. The integer cube root fails.
          </p>
        </div>
      )}

      {/* Timings */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {[
          { label: 'Key generation', val: `${result.keygen_ms} ms` },
          { label: 'Encryption (×3)', val: `${result.enc_ms} ms` },
          { label: 'CRT + cube root', val: `${result.att_ms} ms` },
        ].map(({ label, val }) => (
          <div key={label} className="rounded-lg border border-(--border) bg-(--code-bg) p-2">
            <p className="text-[10px] uppercase tracking-widest text-(--text)/50">{label}</p>
            <p className="font-mono text-white mt-0.5">{val}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Hastad Visualizer Tab ─────────────────────────────────────────────────

function HastadTab() {
  const [message, setMessage]       = useState('Hi')
  const [nBits, setNBits]           = useState(64)
  const [usePad, setUsePad]         = useState(false)
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [cubeRootDone, setCRDone]   = useState(false)
  const [error, setError]           = useState('')

  const SIZES = [32, 48, 64]

  const runSetup = async () => {
    setLoading(true); setError(''); setResult(null); setCRDone(false)
    try {
      const r = await pa14api.post('/api/pa14/hastad-demo', {
        message, use_padding: usePad, n_bits: nBits
      })
      // Return result without revealing final answer until "cube root" click
      setResult(r.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Setup failed')
    }
    finally { setLoading(false) }
  }

  const revealCubeRoot = () => {
    // The cube root is already computed server-side; we just reveal it
    setCRDone(true)
  }

  return (
    <div className="space-y-5">
      {/* Setup card */}
      <Card title="🎯 Hastad Broadcast Attack Setup">
        <div className="space-y-4">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            Generate 3 independent RSA key pairs with <code className="text-white">e = 3</code> and
            encrypt the same message to all three recipients. The attacker ({'"'}Eve{'"'}) collects
            all three ciphertexts and runs CRT + cube root — without any private key.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 col-span-1 md:col-span-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Message</label>
              <input value={message} onChange={e => setMessage(e.target.value)}
                className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 text-sm text-white font-mono outline-none focus:border-purple-500/60 transition-all" />
              <p className="text-[10px] text-(--text)/40">
                Keep short for 64-bit mode (≤ 3 bytes)
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Modulus bits (toy)</p>
              <div className="flex gap-2 flex-wrap">
                {SIZES.map(b => (
                  <button key={b} onClick={() => setNBits(b)}
                    className={cx(
                      'rounded-lg border px-2.5 py-1 text-xs font-black transition-all',
                      nBits === b
                        ? 'border-purple-500/60 bg-purple-500/20 text-white'
                        : 'border-(--border) bg-(--code-bg) text-(--text)/60 hover:text-white'
                    )}>{b}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Padding mode</p>
              <div className="flex gap-2">
                {[false, true].map(p => (
                  <button key={String(p)} onClick={() => setUsePad(p)}
                    className={cx(
                      'rounded-lg border px-3 py-1.5 text-xs font-black transition-all',
                      usePad === p
                        ? p
                          ? 'border-emerald-500/60 bg-emerald-500/20 text-white'
                          : 'border-rose-500/60 bg-rose-500/20 text-white'
                        : 'border-(--border) bg-(--code-bg) text-(--text)/60 hover:text-white'
                    )}>
                    {p ? '🛡 PKCS Padding' : '📖 No Padding'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-(--text)/40 italic">
                {usePad
                  ? 'Padding randomises each plaintext — attack fails'
                  : 'No padding — same integer sent to all → attack works'}
              </p>
            </div>
          </div>

          <Btn onClick={runSetup} disabled={loading} id="pa14-hastad-setup-btn">
            {loading ? <><Spinner />Setting up keys & encrypting…</> : '🚀 Broadcast & Intercept'}
          </Btn>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {/* Three recipient panels */}
      {result && (
        <>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-(--text)/50 mb-2">
              📡 Broadcast — 3 recipients receive cᵢ = m³ mod Nᵢ
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {result.recipients?.map(r => (
                <RecipientPanel key={r.index} r={r} revealed={cubeRootDone} attackDone={false} />
              ))}
            </div>
          </div>

          <Arrow label="Attacker intercepts all 3 ciphertexts" dir="down" color="text-rose-400" />

          <HastadAttackPanel
            result={result}
            onCubeRoot={revealCubeRoot}
            cubeRootDone={cubeRootDone}
            cubeRootLoading={false}
          />

          {cubeRootDone && (
            <>
              <Arrow label="Reveal plaintext" dir="down" color="text-rose-400" />
              <HastadResultPanel result={result} />
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── Padding Compare Tab ────────────────────────────────────────────────────────

function PaddingTab() {
  const [message, setMessage] = useState('Hi')
  const [nBits, setNBits]     = useState(64)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await pa14api.post('/api/pa14/padding-compare', { message, n_bits: nBits })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Compare failed') }
    finally { setLoading(false) }
  }

  const renderSide = (side, padded) => {
    if (!side) return null
    const succeeded = side.attack_succeeded
    const bc  = padded ? 'emerald' : 'rose'
    return (
      <div className={cx(
        'rounded-xl border-2 p-4 space-y-3',
        `border-${bc}-500/40 bg-${bc}-500/5`
      )}>
        <div className="flex items-center gap-3">
          <span className="font-black text-sm">{padded ? '🛡 With PKCS#1 v1.5 Padding' : '📖 No Padding'}</span>
          <Badge label={succeeded ? '🚨 Attacked!' : '✅ Secure'} color={succeeded ? 'red' : 'green'} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <KV label="Exact cube root?" value={side.exact_root ? '✓ Yes' : '✗ No (garbage)'} mono={false}
            color={`text-${bc}-300`} />
          <KV label="Recovered" value={side.recovered_str} small />
        </div>
        <p className={cx('text-xs', `text-${bc}-300/80`)}>
          {padded
            ? 'Each recipient encrypted a different padded value — CRT gives garbage, cube root fails.'
            : 'Same integer m sent to all — CRT reconstructs m³ exactly. Cube root succeeds.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card title="🛡 Padding Defeats the Attack — Side-by-Side Comparison">
        <div className="space-y-3">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            Run Hastad's attack twice on the same message — with and without PKCS#1 v1.5 padding.
            Padding randomises the plaintexts, so the three ciphertexts no longer share a common
            underlying integer and the attack fails.
          </p>
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">Message</label>
              <input value={message} onChange={e => setMessage(e.target.value)}
                className="w-full rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 text-sm text-white font-mono outline-none focus:border-purple-500/60 transition-all" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/60">n_bits</p>
              <div className="flex gap-1">
                {[48, 64].map(b => (
                  <button key={b} onClick={() => setNBits(b)}
                    className={cx(
                      'rounded-lg border px-2 py-1 text-xs font-black transition-all',
                      nBits === b
                        ? 'border-purple-500/60 bg-purple-500/20 text-white'
                        : 'border-(--border) bg-(--code-bg) text-(--text)/60 hover:text-white'
                    )}>{b}</button>
                ))}
              </div>
            </div>
            <Btn onClick={run} disabled={loading} id="pa14-pad-compare-btn">
              {loading ? <><Spinner />Running…</> : '⚡ Compare Attack'}
            </Btn>
          </div>
          {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
        </div>
      </Card>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderSide(result.without_padding, false)}
          {renderSide(result.with_padding, true)}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 text-xs text-(--text)/70">
          <strong className="text-white">Conclusion:</strong> Hastad's attack is defeated by randomized
          padding. With OAEP (or any randomized encryption), broadcast attacks are impossible even
          for small exponents e. This motivates the transition to semantically-secure PKC (PA#17).
        </div>
      )}
    </div>
  )
}

// ── Attack Boundary Tab ────────────────────────────────────────────────────────

function BoundaryTab() {
  const [nBits, setNBits] = useState(1024)
  const [result, setResult] = useState(null)

  const compute = () => {
    // Compute locally — no network call needed
    const maxBits  = nBits
    const maxBytes = Math.floor(maxBits / 8)
    const e = 3
    setResult({ modulus_bits: nBits, e, max_msg_bits: maxBits, max_msg_bytes: maxBytes })
  }

  return (
    <div className="space-y-4">
      <Card title="📐 Attack Boundary — Maximum Safe Message Length">
        <div className="space-y-4">
          <p className="text-sm text-(--text)/70 leading-relaxed">
            Hastad's attack with <code className="text-white">e = 3</code> works only when
            <code className="text-white mx-1">m³ &lt; N₁·N₂·N₃</code>.
            Beyond that, CRT only recovers <code className="text-white">m³ mod (N₁N₂N₃)</code>,
            not <code className="text-white">m³</code> itself — and the integer cube root fails.
          </p>

          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-white">Modulus bit-size per recipient</p>
            <div className="flex gap-2 flex-wrap">
              {[64, 256, 512, 1024, 2048].map(b => (
                <button key={b} onClick={() => setNBits(b)}
                  className={cx(
                    'rounded-lg border px-3 py-1 text-xs font-black transition-all hover:-translate-y-0.5',
                    nBits === b
                      ? 'border-purple-500/60 bg-purple-500/20 text-white'
                      : 'border-(--border) bg-(--code-bg) text-(--text) hover:border-purple-500/40'
                  )}>{b}-bit</button>
              ))}
            </div>
          </div>

          <Btn onClick={compute} id="pa14-boundary-btn">📐 Compute Boundary</Btn>
        </div>
      </Card>

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Modulus bits (each Nᵢ)', val: `${result.modulus_bits} bits`, color: 'text-purple-300' },
              { label: 'CRT product bits (N₁N₂N₃)', val: `${result.modulus_bits * 3} bits`, color: 'text-blue-300' },
              { label: 'Max message bits', val: `${result.max_msg_bits} bits`, color: 'text-amber-300' },
              { label: 'Max message bytes', val: `${result.max_msg_bytes} bytes`, color: 'text-emerald-300' },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-xl border border-(--border) bg-(--code-bg) p-3 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/50">{label}</p>
                <p className={cx('font-mono text-lg font-black', color)}>{val}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 space-y-2">
            <p className="text-amber-300 font-black text-sm">
              Attack boundary: m must be &lt; 2<sup>{result.max_msg_bits}</sup> ({result.max_msg_bytes} bytes)
            </p>
            <p className="text-xs text-(--text)/70">
              With 3 × {result.modulus_bits}-bit moduli, the CRT modulus is {result.modulus_bits * 3} bits.
              Hastad succeeds iff m<sup>3</sup> &lt; 2<sup>{result.modulus_bits * 3}</sup>,
              i.e. m &lt; 2<sup>{result.modulus_bits}</sup> ≈ {result.max_msg_bytes} bytes.
              Longer messages wrap around modulo N₁N₂N₃ and the cube root step returns garbage.
              (Even then, textbook RSA is insecure for other reasons — padding is always required.)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'hastad',     label: '🔓 Hastad Attack'       },
  { key: 'padding',    label: '🛡 Padding Compare'     },
  { key: 'garneralgo', label: '⚡ Garner’s Algo'       },
  { key: 'crt',        label: '🔢 CRT Solver'          },
  { key: 'garner',     label: '📊 Garner Benchmark'    },
  { key: 'boundary',   label: '📐 Attack Boundary'     },
]

export default function CRTDemo() {
  const [tab, setTab] = useState('hastad')

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer — PA#14: CRT & Hastad's Broadcast Attack" />

        {/* Theory banner */}
        <div className="mb-4 rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 space-y-1">
          <p className="text-[13px] font-black uppercase tracking-widest text-white">
            Two Roles of CRT in RSA
          </p>
          <p className="text-sm text-(--text)/70 leading-relaxed">
            The <strong className="text-white">Chinese Remainder Theorem</strong> plays two opposite roles.
            As a <span className="text-amber-300 font-semibold">tool for honest parties</span>: Garner's CRT
            decryption is ≈ 4× faster than standard C<sup>d</sup> mod N.
            As a <span className="text-rose-300 font-semibold">weapon for adversaries</span>: Håstad's
            broadcast attack recovers a message encrypted to multiple recipients with e=3 — no private key needed.
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
            {tab === 'hastad'     && <HastadTab />}
            {tab === 'padding'    && <PaddingTab />}
            {tab === 'garneralgo' && <GarnerAlgoTab />}
            {tab === 'crt'        && <CRTSolverTab />}
            {tab === 'garner'     && <GarnerTab />}
            {tab === 'boundary'   && <BoundaryTab />}
          </div>
        </div>
      </section>
    </main>
  )
}
