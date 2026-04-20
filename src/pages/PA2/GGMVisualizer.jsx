import { useState, useCallback, useEffect, useRef } from 'react'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'
import SummaryTabs from '../../components/summary/SummaryTabs'

/* ── Bit-toggle input ── */
function BitToggle({ bits, onChange }) {
  const flip = (i) =>
    onChange(bits.slice(0, i) + (bits[i] === '0' ? '1' : '0') + bits.slice(i + 1))
  const add    = () => bits.length < 8 && onChange(bits + '0')
  const remove = () => bits.length > 1 && onChange(bits.slice(0, -1))

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button" onClick={remove} disabled={bits.length <= 1}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-(--border) text-sm font-bold text-(--text) transition-all hover:border-(--accent-border) hover:text-(--text-h) disabled:opacity-25"
      >−</button>

      {bits.split('').map((b, i) => (
        <button
          key={i} type="button" onClick={() => flip(i)}
          title={`bit ${i} = ${b} (click to flip)`}
          className={`h-8 w-8 rounded-md border font-mono text-sm font-bold transition-all duration-150 ${
            b === '1'
              ? 'border-purple-400/80 bg-purple-600/70 text-white hover:bg-purple-500/80'
              : 'border-slate-600 bg-slate-800/60 text-slate-400 hover:border-slate-400 hover:text-slate-200'
          }`}
        >{b}</button>
      ))}

      <button
        type="button" onClick={add} disabled={bits.length >= 8}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-(--border) text-sm font-bold text-(--text) transition-all hover:border-(--accent-border) hover:text-(--text-h) disabled:opacity-25"
      >+</button>

      <span className="ml-1 font-mono text-[11px] text-(--text)/40">
        n = {bits.length}
      </span>
    </div>
  )
}

/* ── Path trace bar ── */
function PathTrace({ bits, apiData }) {
  if (!apiData) return null
  return (
    <div className="flex flex-wrap items-center gap-1">
      {bits.split('').map((b, i) => (
        <span key={i} className="flex flex-col items-center gap-0.5">
          <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-black ${
            b === '1' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
          }`}>{b}</span>
          <span className="text-[8px] text-(--text)/30">{i}</span>
        </span>
      ))}
      <span className="ml-2 text-[11px] text-(--text)/40">→ leaf #{apiData?.leaf?.index}</span>
    </div>
  )
}

export default function GGMVisualizer() {
  const [keyHex,     setKeyHex]     = useState('a3f2c1b4d5e6f708')
  const [queryBits,  setQueryBits]  = useState('1011')
  const [foundation, setFoundation] = useState('AES')
  const [mode,       setMode]       = useState('ggm-aes')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [apiData,    setApiData]    = useState(null)
  const [activeSummaryTab, setActiveSummaryTab] = useState('visual')

  const abortRef = useRef(null)

  const evaluate = useCallback(async (key, bits, fnd, md) => {
    if (!bits || !key) return
    // Cancel any in-flight request
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError('')
    try {
      const res = await api.post(
        '/api/pa2/prf/evaluate',
        { key_hex: key, query_bits: bits, prf_mode: md, foundation: fnd },
        { signal: ctrl.signal },
      )
      setApiData(res.data)
    } catch (e) {
      if (e?.code === 'ERR_CANCELED') return
      setError(e?.response?.data?.detail || 'Evaluation failed')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-evaluate when bits / mode / foundation change
  useEffect(() => {
    evaluate(keyHex, queryBits, foundation, mode)
  }, [queryBits, foundation, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const leafHex = apiData?.leaf?.value_hex

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-8 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer — PA2: GGM PRF Tree Visualizer" />

        {/* ── Controls ── */}
        <div className="mb-4 space-y-4 border-b border-(--border) px-2 pb-5">

          {/* Row 1: Foundation + Mode */}
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Foundation:</span>
              {['AES', 'DLP'].map(f => (
                <button key={f} type="button" onClick={() => setFoundation(f)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-all hover:-translate-y-0.5 hover:shadow-(--shadow) ${
                    foundation === f
                      ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h)'
                      : 'border-(--border) bg-(--bg) text-(--text)'
                  }`}
                >{f === 'AES' ? 'AES-128 (PRP)' : 'DLP (g^x mod p)'}</button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">PRF Mode:</span>
              {[['ggm-aes', 'GGM-AES'], ['ggm-prg', 'GGM-PRG']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setMode(val)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-all hover:-translate-y-0.5 hover:shadow-(--shadow) ${
                    mode === val
                      ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h)'
                      : 'border-(--border) bg-(--bg) text-(--text)'
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Row 2: Key + Bits */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Key k (hex)</p>
              <div className="flex gap-2">
                <input
                  value={keyHex}
                  onChange={e => setKeyHex(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
                  className="flex-1 rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2 font-mono text-xs text-(--text-h) outline-none transition-all focus:border-(--accent-border)"
                  placeholder="hex key…"
                  spellCheck={false}
                />
                <Btn onClick={() => evaluate(keyHex, queryBits, foundation, mode)} disabled={loading}>
                  {loading ? '…' : 'Evaluate'}
                </Btn>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Query x &nbsp;<span className="normal-case font-normal text-(--text)/40">(click a bit to flip — auto re-evaluates)</span>
              </p>
              <BitToggle bits={queryBits} onChange={setQueryBits} />
            </div>
          </div>

          {error && (
            <p className="font-mono text-[11px] font-bold uppercase text-rose-400">{error}</p>
          )}
        </div>

        {/* ── Output ── */}
        {apiData ? (
          <div className="mx-2 mb-4 overflow-hidden rounded-xl border-2 border-(--accent-border) bg-(--accent-bg)/20">
            <div className="flex flex-wrap items-stretch gap-0 divide-x divide-(--border)">

              {/* F_k(x) result */}
              <div className="flex flex-1 flex-col justify-center gap-1 px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/40">PRF output</p>
                <p className="font-mono text-[11px] text-(--text)/50">
                  F<sub>k</sub>({queryBits}) =
                </p>
                <p className="break-all font-mono text-sm font-bold leading-relaxed text-(--accent)">
                  {leafHex}
                </p>
              </div>

              {/* Path trace */}
              <div className="flex flex-col justify-center gap-2 px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/40">Path bits (root → leaf)</p>
                <PathTrace bits={queryBits} apiData={apiData} />
              </div>

              {/* Stats */}
              <div className="flex flex-col items-center justify-center gap-1 px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/40">Depth</p>
                <p className="font-mono text-3xl font-black text-(--text-h)">n={apiData.depth}</p>
                <p className="text-[10px] text-(--text)/30">
                  {Math.pow(2, apiData.depth)} leaves · {apiData.nodes?.length ?? 0} nodes total
                </p>
              </div>

            </div>
          </div>
        ) : (
          <div className="mx-2 mb-4 flex h-20 items-center justify-center rounded-xl border border-(--border) bg-(--code-bg)">
            <p className="text-xs italic font-bold uppercase tracking-widest text-(--text)/20">
              {loading ? 'Evaluating…' : 'Enter key and query to evaluate'}
            </p>
          </div>
        )}

        {/* ── Summary / ReactFlow ── */}
        <SummaryTabs
          activeTab={activeSummaryTab}
          onTabChange={setActiveSummaryTab}
          conversionId="pa2-ggm"
          conversionContext={{
            foundation,
            sourcePrimitive: 'PRG',
            targetPrimitive: 'PRF',
            queryBits,
            col1Data: apiData,
            col2Data: null,
          }}
          testsData={null}
        />
      </section>
    </main>
  )
}
