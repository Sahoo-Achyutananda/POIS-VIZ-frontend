import { useEffect, useMemo, useState } from 'react'
import SummaryTabs from '../../components/summary/SummaryTabs'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'
import CliqueGraphModal from './CliqueGraphModal'

const PRIMITIVES = ['OWF', 'PRG', 'PRF', 'PRP', 'MAC', 'CRHF', 'HMAC']

const FORWARD_EDGES = [
  ['OWF', 'PRG', 'HILL construction'],
  ['PRG', 'OWF', 'PRG as OWF (truncation)'],
  ['PRG', 'PRF', 'GGM tree'],
  ['PRF', 'PRP', 'Luby-Rackoff'],
  ['PRP', 'PRF', 'Switching Lemma'],
  ['PRF', 'MAC', 'PRF-MAC'],
  ['MAC', 'CRHF', 'MAC to CRHF (toy)'],
  ['CRHF', 'HMAC', 'HMAC wrapper'],
]

function shortestPath(start, end) {
  if (start === end) return []
  const queue = [{ node: start, path: [] }]
  const seen = new Set([start])
  while (queue.length > 0) {
    const { node, path } = queue.shift()
    for (const [from, to, theorem] of FORWARD_EDGES) {
      if (from !== node || seen.has(to)) continue
      const nextPath = [...path, { from, to, theorem }]
      if (to === end) return nextPath
      seen.add(to)
      queue.push({ node: to, path: nextPath })
    }
  }
  return null
}

function toyStepValue(input, tag) {
  const base = `${input}|${tag}`
  let acc = 2166136261
  for (let i = 0; i < base.length; i++) {
    acc ^= base.charCodeAt(i)
    acc = Math.imul(acc, 16777619)
  }
  const out = (acc >>> 0).toString(16).padStart(8, '0')
  return `${out}${out}`
}

function shortHex(text, take = 10) {
  if (!text) return 'N/A'
  if (typeof text !== 'string') return String(text)
  return text.length > take * 2 ? `${text.slice(0, take)}...${text.slice(-take)}` : text
}

function getErrorText(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map(i => {
      if (typeof i === 'string') return i
      return `${(Array.isArray(i?.loc) ? i.loc.join('.') : 'field')}: ${i?.msg || 'invalid'}`
    }).join(' | ')
  }
  return error?.message || 'Request failed'
}

function needsExtension(src) { return src === 'PRG' }
function needsKey(src) { return ['PRF', 'PRP', 'MAC', 'HMAC'].includes(src) }
function needsQueryBits(src) { return src === 'PRF' }
function needsMessage(src) { return ['MAC', 'CRHF', 'HMAC'].includes(src) }

export default function CliqueExplorer() {
  const [sourcePrimitive, setSourcePrimitive] = useState('OWF')
  const [targetPrimitive, setTargetPrimitive] = useState('PRG')
  const [foundation, setFoundation] = useState('AES')
  const [seed, setSeed] = useState('a3f2c1b4d5e6f708')
  const [keyHex, setKeyHex] = useState('00112233445566778899aabbccddeeff')
  const [message, setMessage] = useState('hello')
  const [queryBits, setQueryBits] = useState('1011')
  const [extensionLength, setExtensionLength] = useState('128')
  const [activeSummaryTab, setActiveSummaryTab] = useState('concepts')
  const [graphModalOpen, setGraphModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [col1Data, setCol1Data] = useState(null)
  const [col2Data, setCol2Data] = useState(null)
  const [testsData, setTestsData] = useState(null)

  const route = useMemo(() => shortestPath(sourcePrimitive, targetPrimitive), [sourcePrimitive, targetPrimitive])

  useEffect(() => {
    setActiveSummaryTab('concepts')
    setCol1Data(null)
    setCol2Data(null)
    setTestsData(null)
    setError('')
  }, [sourcePrimitive, targetPrimitive])

  const runPipeline = async () => {
    setError('')
    setLoading(true)
    try {
      const parsedExt = Math.max(0, parseInt(extensionLength, 10) || 0)

      let owfData = null, prgData = null, prfData = null, sourceOutput = null

      if (sourcePrimitive === 'OWF') {
        const res = await api.post('/api/owf/evaluate', { x: seed, foundation })
        owfData = res.data
        sourceOutput = owfData.output
      } else if (sourcePrimitive === 'PRG') {
        const [owfRes, prgRes] = await Promise.all([
          api.post('/api/owf/evaluate', { x: seed, foundation }),
          api.post('/api/prg/extend', { seed, extension_length: parsedExt, foundation }),
        ])
        owfData = owfRes.data
        prgData = prgRes.data
        sourceOutput = prgData.output
      } else if (sourcePrimitive === 'PRF') {
        const [owfRes, prgRes, prfRes] = await Promise.all([
          api.post('/api/owf/evaluate', { x: seed, foundation }),
          api.post('/api/prg/extend', { seed, extension_length: parsedExt, foundation }),
          api.post('/api/pa2/prf/evaluate', { key_hex: keyHex, query_bits: queryBits, prf_mode: 'ggm-prg', foundation }),
        ])
        owfData = owfRes.data
        prgData = prgRes.data
        prfData = prfRes.data
        sourceOutput = prfData.output_hex || prfData.output
      } else {
        const res = await api.post('/api/owf/evaluate', { x: seed, foundation })
        owfData = res.data
        sourceOutput = owfData.output
      }

      let testsRes = null
      try {
        const seedBits = Math.max(1, seed.replace('0x', '').length * 4)
        testsRes = await api.post('/api/prg/tests', { seed, length: seedBits + parsedExt, foundation })
      } catch {}

      const newCol1 = { sourcePrimitive, foundation, seed, owf: owfData, prg: prgData, prf: prfData, sourceOutput }
      setCol1Data(newCol1)
      if (testsRes) setTestsData(testsRes.data)

      if (!route || route.length === 0) {
        setCol2Data({
          source: sourcePrimitive,
          target: targetPrimitive,
          steps: [],
          final: sourceOutput,
          note: sourcePrimitive === targetPrimitive ? 'Identity reduction.' : `No path from ${sourcePrimitive} to ${targetPrimitive}.`,
          ...(sourcePrimitive !== targetPrimitive ? { warning: `No reduction path from ${sourcePrimitive} to ${targetPrimitive}.` } : {}),
        })
      } else {
        const steps = []
        let rolling = sourceOutput || ''
        route.forEach((step, i) => {
          const value = toyStepValue(rolling, `${step.from}->${step.to}:${queryBits}:${i}`)
          steps.push({ ...step, value })
          rolling = value
        })
        setCol2Data({ source: sourcePrimitive, target: targetPrimitive, sourceOutput, steps, final: rolling })
      }
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  const routeLabel = useMemo(() => {
    if (route === null) return null
    if (route.length === 0) return 'identity'
    return route.map(s => `${s.from} → ${s.to}`).join(' ↝ ')
  }, [route])

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-8 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <div className="flex items-center justify-between px-1 pb-1">
          <PageHeader title="CS8.401 Minicrypt Clique Explorer — Unified Primitive Reduction Chain" />
          <button
            type="button"
            onClick={() => setGraphModalOpen(true)}
            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/8 px-3 py-1.5 text-[11px] font-bold text-violet-300 transition-all hover:border-violet-400/60 hover:bg-violet-500/15 hover:shadow-[0_0_14px_rgba(139,92,246,0.15)]"
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" className="shrink-0">
              <circle cx="4" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
              <circle cx="16" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
              <circle cx="16" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
              <line x1="6" y1="9" x2="14" y2="5" stroke="currentColor" strokeWidth="1.4"/>
              <line x1="6" y1="11" x2="14" y2="15" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
            Graph View
          </button>
        </div>

        {/* Foundation */}
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-(--border) bg-(--social-bg) px-3 py-2">
          <span className="text-sm font-bold text-(--text-h)">Foundation:</span>
          {['AES', 'DLP'].map(f => (
            <button
              key={f}
              type="button"
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) ${
                foundation === f
                  ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h)'
                  : 'border-(--border) bg-(--bg) text-(--text)'
              }`}
              onClick={() => setFoundation(f)}
            >
              {f === 'AES' ? 'AES-128 (PRP)' : 'DLP (g^x mod p)'}
            </button>
          ))}
        </div>

        {/* Primitive dropdowns + path display */}
        <div className="mb-3 flex flex-wrap items-center gap-4 rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-(--text-h)">Source A:</span>
            <select
              value={sourcePrimitive}
              onChange={e => setSourcePrimitive(e.target.value)}
              className="rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none focus:border-(--accent-border) cursor-pointer"
            >
              {PRIMITIVES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <span className="text-(--text) font-bold">→</span>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-(--text-h)">Target B:</span>
            <select
              value={targetPrimitive}
              onChange={e => setTargetPrimitive(e.target.value)}
              className="rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none focus:border-(--accent-border) cursor-pointer"
            >
              {PRIMITIVES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="ml-2 flex-1 min-w-0">
            {route !== null ? (
              <span className="text-[11px] text-emerald-400 font-mono break-all">
                Path: {routeLabel}
              </span>
            ) : (
              <span className="text-[11px] text-rose-400 font-mono">No reduction path found</span>
            )}
          </div>
        </div>

        {/* Two-column panels */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

          {/* Column 1: Build source from foundation */}
          <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
            <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
              Column 1: Build Source Primitive from Foundation
            </h3>
            <div className="grid gap-2 p-3">
              <div className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                <span>Source primitive A:</span>
                <span className="rounded-md border border-(--border) bg-(--code-bg) px-2 py-1 font-mono text-xs">{sourcePrimitive}</span>
              </div>

              <label className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                Input seed:
                <input
                  className="w-44 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                  value={seed}
                  onChange={e => setSeed(e.target.value)}
                  placeholder="hex seed..."
                />
              </label>

              {needsExtension(sourcePrimitive) && (
                <label className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                  Extension l (bits):
                  <input
                    type="number"
                    min="0"
                    className="w-44 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                    value={extensionLength}
                    onChange={e => setExtensionLength(e.target.value)}
                    placeholder="128"
                  />
                </label>
              )}

              {needsKey(sourcePrimitive) && (
                <label className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                  Key (hex):
                  <input
                    className="w-44 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                    value={keyHex}
                    onChange={e => setKeyHex(e.target.value)}
                    placeholder="hex key..."
                  />
                </label>
              )}

              {needsQueryBits(sourcePrimitive) && (
                <label className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                  Query bits:
                  <input
                    className="w-44 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                    value={queryBits}
                    onChange={e => setQueryBits(e.target.value)}
                    placeholder="1011"
                  />
                </label>
              )}

              {needsMessage(sourcePrimitive) && (
                <label className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                  Message:
                  <input
                    className="w-44 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="message..."
                  />
                </label>
              )}
            </div>

            <div className="border-t border-dashed border-(--border) px-3 py-3 text-left">
              <p className="my-1 font-mono text-xs text-(--text)">
                <strong className="text-(--text-h)">OWF(seed):</strong> {shortHex(col1Data?.owf?.output)}
              </p>
              {col1Data?.prg && (
                <p className="my-1 font-mono text-xs text-(--text)">
                  <strong className="text-(--text-h)">PRG(seed):</strong> {shortHex(col1Data.prg.output, 14)}
                </p>
              )}
              {col1Data?.prf && (
                <p className="my-1 font-mono text-xs text-(--text)">
                  <strong className="text-(--text-h)">PRF(key, x):</strong> {shortHex(col1Data.prf.output_hex || col1Data.prf.output, 14)}
                </p>
              )}
              <p className="my-1 font-mono text-xs text-(--text)">
                <strong className="text-(--text-h)">{sourcePrimitive}(seed):</strong> {shortHex(col1Data?.sourceOutput, 14)}
              </p>
            </div>
          </article>

          {/* Column 2: Reduce A → B */}
          <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
            <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
              Column 2: Reduce Source to Target Primitive
            </h3>
            <div className="grid gap-2 p-3">
              <div className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                <span>Target primitive B:</span>
                <span className="rounded-md border border-(--border) bg-(--code-bg) px-2 py-1 font-mono text-xs">{targetPrimitive}</span>
              </div>

              <label className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                Query x:
                <input
                  className="w-44 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                  value={queryBits}
                  onChange={e => setQueryBits(e.target.value)}
                  placeholder="1011"
                />
              </label>

              {/* {route !== null && route.length > 0 && (
                <div className="mt-1 space-y-1 rounded-md border border-(--border) bg-(--code-bg) px-2 py-2">
                  {route.map((s, i) => (
                    <p key={i} className="font-mono text-[10px] text-(--text)">
                      <strong className="text-(--text-h)">{i + 1}.</strong> {s.from} → {s.to}
                      <span className="text-(--text)/50 ml-1">via {s.theorem}</span>
                    </p>
                  ))}
                </div>
              )} */}
            </div>

            <div className="border-t border-dashed border-(--border) px-3 py-3 text-left">
              {col2Data?.warning && (
                <p className="my-1 font-mono text-xs text-rose-400">{col2Data.warning}</p>
              )}
              {Array.isArray(col2Data?.steps) && col2Data.steps.map((step, i) => (
                <p key={i} className="my-1 font-mono text-xs text-(--text)">
                  <strong className="text-(--text-h)">{step.from}→{step.to}:</strong> {shortHex(step.value, 14)}
                </p>
              ))}
              {col2Data?.final && (
                <p className="my-1 font-mono text-xs text-(--text)">
                  <strong className="text-(--text-h)">{targetPrimitive}(x):</strong> {shortHex(col2Data.final, 14)}
                </p>
              )}
              <p className="my-1 font-mono text-xs text-(--text)">
                <strong className="text-(--text-h)">Query bits:</strong> {queryBits}
              </p>
            </div>
          </article>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Btn onClick={runPipeline} disabled={loading || route === null}>
            {loading ? 'Computing...' : 'Recompute Live Values'}
          </Btn>
          {error && <span className="text-sm text-[#ff8aa1]">{error}</span>}
        </div>

        <SummaryTabs
          activeTab={activeSummaryTab}
          onTabChange={setActiveSummaryTab}
          conversionId="clique-explorer"
          conversionContext={{ foundation, sourcePrimitive, targetPrimitive, queryBits, col1Data, col2Data }}
          testsData={testsData}
        />
      </section>

      <CliqueGraphModal
        open={graphModalOpen}
        onClose={() => setGraphModalOpen(false)}
        initialSrc={sourcePrimitive}
        initialTgt={targetPrimitive}
        onSelect={(src, tgt) => {
          setSourcePrimitive(src)
          setTargetPrimitive(tgt)
        }}
      />
    </main>
  )
}
