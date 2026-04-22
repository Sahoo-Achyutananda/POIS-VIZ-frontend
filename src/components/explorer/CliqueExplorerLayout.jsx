import { useEffect, useMemo, useState } from 'react'

import SummaryTabs from '../summary/SummaryTabs'
import api from '../../lib/api'
import PageHeader from '../PageHeader'
import Btn from '../Btn'
import Tabs from '../Tabs'

const FORWARD_EDGES = [
  ['OWF', 'PRG', 'HILL construction'],
  ['PRG', 'OWF', 'PRG as OWF (output truncation demo)'],
  ['PRG', 'PRF', 'GGM tree'],
  ['PRF', 'PRP', 'Luby-Rackoff'],
  ['PRF', 'MAC', 'PRF-MAC'],
  ['MAC', 'CRHF', 'MAC to CRHF (toy route)'],
  ['CRHF', 'HMAC', 'HMAC wrapper'],
]

function shortestPath(start, end) {
  if (start === end) return []

  const queue = [{ node: start, path: [] }]
  const seen = new Set([start])

  while (queue.length > 0) {
    const current = queue.shift()

    for (const [from, to, theorem] of FORWARD_EDGES) {
      if (from !== current.node) continue
      if (seen.has(to)) continue

      const nextPath = [...current.path, { from, to, theorem }]
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
  for (let i = 0; i < base.length; i += 1) {
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
    return detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const loc = Array.isArray(item.loc) ? item.loc.join('.') : 'field'
          return `${loc}: ${item.msg || 'invalid value'}`
        }
        return String(item)
      })
      .join(' | ')
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail)
  if (typeof error?.message === 'string') return error.message
  return 'Request failed'
}

export default function CliqueExplorerLayout({
  conversionId,
  pageTitle,
  conversionOptions,
  defaultConversionKey,
}) {
  const [foundation, setFoundation] = useState('AES')
  const [seed, setSeed] = useState('a3f2c1b4d5e6f708')
  const [extensionLength, setExtensionLength] = useState('128')
  const [query, setQuery] = useState('1011')
  const [activeSummaryTab, setActiveSummaryTab] = useState('concepts')
  const [activeConversionKey, setActiveConversionKey] = useState(defaultConversionKey || conversionOptions?.[0]?.key)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [col1Data, setCol1Data] = useState(null)
  const [col2Data, setCol2Data] = useState(null)
  const [testsData, setTestsData] = useState(null)

  const activeConversion = useMemo(
    () => conversionOptions.find((option) => option.key === activeConversionKey) || conversionOptions[0],
    [activeConversionKey, conversionOptions],
  )

  const sourcePrimitive = activeConversion?.sourcePrimitive || 'OWF'
  const targetPrimitive = activeConversion?.targetPrimitive || 'PRG'
  const route = useMemo(() => shortestPath(sourcePrimitive, targetPrimitive), [sourcePrimitive, targetPrimitive])
  const queryBits = query.trim() || '0'

  useEffect(() => {
    setActiveSummaryTab('concepts')
    setCol1Data(null)
    setCol2Data(null)
    setTestsData(null)
    setError('')
  }, [activeConversionKey])

  const runPipeline = async () => {
    setError('')
    setLoading(true)

    try {
      const parsedExtensionLength = Number.parseInt(extensionLength, 10)
      const safeExtensionLength = Number.isNaN(parsedExtensionLength) || parsedExtensionLength < 0 ? 0 : parsedExtensionLength
      const seedBitLength = Math.max(1, (seed.toLowerCase().replace('0x', '') || '0').length * 4)
      const totalLength = seedBitLength + safeExtensionLength

      const [owfRes, prgRes, testsRes] = await Promise.all([
        api.post('/api/owf/evaluate', { x: seed, foundation }),
        api.post('/api/prg/extend', {
          seed,
          extension_length: safeExtensionLength,
          foundation,
        }),
        api.post('/api/prg/tests', {
          seed,
          length: totalLength,
          foundation,
        }),
      ])

      const buildData = {
        sourcePrimitive,
        foundation,
        seed,
        owf: owfRes.data,
        prg: prgRes.data,
      }

      const sourceInstance = sourcePrimitive === 'OWF' ? owfRes.data.output : prgRes.data.output || owfRes.data.output

      let reduceData
      if (!route || route.length === 0) {
        reduceData = {
          warning: `No known reduction path from ${sourcePrimitive} to ${targetPrimitive}.`,
        }
      } else {
        const steps = []
        let rolling = sourceInstance

        route.forEach((step, i) => {
          const value = toyStepValue(rolling, `${step.from}->${step.to}:${queryBits}:${i}`)
          steps.push({ ...step, value })
          rolling = value
        })

        reduceData = {
          source: sourcePrimitive,
          target: targetPrimitive,
          sourceInstance,
          steps,
          final: rolling,
          note: 'Column 2 consumes only the concrete source instance built in Column 1.',
        }
      }

      setCol1Data(buildData)
      setCol2Data(reduceData)
      setTestsData(testsRes.data)
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-8 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title={pageTitle} />
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-(--border) bg-(--social-bg) px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-(--text-h)">Foundation:</span>
            <button
              type="button"
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) ${foundation === 'AES'
                  ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h)'
                  : 'border-(--border) bg-(--bg) text-(--text)'
                }`}
              onClick={() => setFoundation('AES')}
            >
              AES-128 (PRP)
            </button>
            <span className="text-(--text)">/</span>
            <button
              type="button"
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) ${foundation === 'DLP'
                  ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h)'
                  : 'border-(--border) bg-(--bg) text-(--text)'
                }`}
              onClick={() => setFoundation('DLP')}
            >
              DLP (g^x mod p)
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-(--text-h)">Conversions</span>
          <Tabs
            tabs={conversionOptions.map(opt => ({ key: opt.key, label: opt.label }))}
            activeTab={activeConversionKey}
            onTabChange={setActiveConversionKey}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
            <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">Column 1: Build Source Primitive from Foundation</h3>
            <div className="grid gap-2 p-3">
              <div className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                <span>Source primitive A:</span>
                <span className="rounded-md border border-(--border) bg-(--code-bg) px-2 py-1 font-mono text-xs">{sourcePrimitive}</span>
              </div>

              <label className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                Input seed:
                <input className="w-44 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="a3f2..." />
              </label>

              <label className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                Extension l (bits):
                <input
                  className="w-44 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                  type="number"
                  min="0"
                  value={extensionLength}
                  onChange={(e) => setExtensionLength(e.target.value)}
                  placeholder="128"
                />
              </label>
            </div>

            <div className="border-t border-dashed border-(--border) px-3 py-3 text-left">
              <p className="my-1 font-mono text-xs text-(--text)"><strong className="text-(--text-h)">OWF(seed):</strong> {shortHex(col1Data?.owf?.output)}</p>
              <p className="my-1 font-mono text-xs text-(--text)"><strong className="text-(--text-h)">PRG(seed):</strong> {shortHex(col1Data?.prg?.output, 14)}</p>
              <p className="my-1 font-mono text-xs text-(--text)"><strong className="text-(--text-h)">{sourcePrimitive}(seed):</strong> {shortHex(sourcePrimitive === 'OWF' ? col1Data?.owf?.output : col1Data?.prg?.output, 14)}</p>
            </div>
          </article>

          <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
            <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">Column 2: Reduce Source to Target Primitive</h3>
            <div className="grid gap-2 p-3">
              <div className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                <span>Target primitive B:</span>
                <span className="rounded-md border border-(--border) bg-(--code-bg) px-2 py-1 font-mono text-xs">{targetPrimitive}</span>
              </div>

              <label className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                Query x:
                <input className="w-44 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="1011" />
              </label>
            </div>

            <div className="border-t border-dashed border-(--border) px-3 py-3 text-left">
              {col2Data?.warning ? <p className="my-1 font-mono text-xs text-(--text)"><strong className="text-(--text-h)">Route:</strong> {col2Data.warning}</p> : null}
              {Array.isArray(col2Data?.steps)
                ? col2Data.steps.map((step) => (
                  <p className="my-1 font-mono text-xs text-(--text)" key={`${step.from}-${step.to}-${step.theorem}`}>
                    <strong className="text-(--text-h)">{step.from} to {step.to}:</strong> {shortHex(step.value, 14)}
                  </p>
                ))
                : null}
              {col2Data?.final ? <p className="my-1 font-mono text-xs text-(--text)"><strong className="text-(--text-h)">{targetPrimitive}(x):</strong> {shortHex(col2Data.final, 14)}</p> : null}
              <p className="my-1 font-mono text-xs text-(--text)"><strong className="text-(--text-h)">Query bits:</strong> {queryBits}</p>
            </div>
          </article>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Btn onClick={runPipeline} disabled={loading}>
            {loading ? 'Computing...' : 'Recompute Live Values'}
          </Btn>
          {error ? <span className="text-sm text-[#ff8aa1]">{error}</span> : null}
        </div>

        <SummaryTabs
          activeTab={activeSummaryTab}
          onTabChange={setActiveSummaryTab}
          conversionId={conversionId}
          conversionContext={{
            foundation,
            sourcePrimitive,
            targetPrimitive,
            queryBits,
            col1Data,
            col2Data,
          }}
          testsData={testsData}
        />
      </section>
    </main>
  )
}
