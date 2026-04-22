import { useMemo, useState } from 'react'

import api from '../lib/api'
import PageHeader from '../components/PageHeader'

function getErrorText(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (typeof error?.message === 'string') return error.message
  return 'Request failed'
}

function shortHex(text, take = 12) {
  if (!text) return 'N/A'
  if (typeof text !== 'string') return String(text)
  return text.length > take * 2 ? `${text.slice(0, take)}...${text.slice(-take)}` : text
}

export default function PA2() {
  const [keyHex, setKeyHex] = useState('00112233445566778899aabbccddeeff')
  const [queryBits, setQueryBits] = useState('1011')
  const [depth, setDepth] = useState('4')
  const [trials, setTrials] = useState('100')
  const [prfMode, setPrfMode] = useState('ggm-prg')
  const [foundation, setFoundation] = useState('AES')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [prfResult, setPrfResult] = useState(null)
  const [prgFromPrfResult, setPrgFromPrfResult] = useState(null)
  const [testsSummary, setTestsSummary] = useState(null)
  const [distinguishResult, setDistinguishResult] = useState(null)

  const nodesByLevel = useMemo(() => {
    const groups = new Map()
    if (!Array.isArray(prfResult?.nodes)) return groups
    prfResult.nodes.forEach((node) => {
      if (!groups.has(node.level)) groups.set(node.level, [])
      groups.get(node.level).push(node)
    })
    return groups
  }, [prfResult])

  const runPipeline = async () => {
    setLoading(true)
    setError('')
    try {
      const parsedDepth = Number.parseInt(depth, 10)
      const parsedTrials = Number.parseInt(trials, 10)

      const prfRes = await api.post('/api/pa2/prf/evaluate', {
        key_hex: keyHex,
        query_bits: queryBits,
        prf_mode: prfMode,
        foundation,
      })

      const prgRes = await api.post('/api/pa2/prg/from-prf', {
        key_hex: keyHex,
        depth: parsedDepth,
        prf_mode: prfMode,
        foundation,
      })

      const tests = await api.post('/api/prg/tests', {
        bits: prgRes.data.output_bits,
        alpha: 0.01,
      })

      const distRes = await api.post('/api/pa2/distinguish', {
        key_hex: keyHex,
        depth: parsedDepth,
        trials: parsedTrials,
        prf_mode: prfMode,
        foundation,
      })

      setPrfResult(prfRes.data)
      setPrgFromPrfResult(prgRes.data)
      setTestsSummary(tests.data?.summary || null)
      setDistinguishResult(distRes.data)
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-8 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer - PA2: GGM Pseudorandom Function" />
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--social-bg) px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-(--text-h)">Foundation:</span>
            <button
              type="button"
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) ${
                foundation === 'AES'
                  ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h)'
                  : 'border-(--border) bg-(--bg) text-(--text)'
              }`}
              onClick={() => setFoundation('AES')}
            >
              AES
            </button>
            <span className="text-(--text)">/</span>
            <button
              type="button"
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) ${
                foundation === 'DLP'
                  ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h)'
                  : 'border-(--border) bg-(--bg) text-(--text)'
              }`}
              onClick={() => setFoundation('DLP')}
            >
              DLP
            </button>
          </div>
          <strong className="text-sm text-(--text-h)">CS8.401 Minicrypt Clique Explorer - PA2</strong>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-(--text-h)">Modes</span>
          {[
            { key: 'ggm-prg', label: 'GGM from PRG' },
            { key: 'ggm-aes', label: 'GGM with AES' },
            { key: 'aes-direct', label: 'AES Direct F(k,x)' },
          ].map((mode) => (
            <button
              type="button"
              key={mode.key}
              onClick={() => setPrfMode(mode.key)}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
                prfMode === mode.key
                  ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h)'
                  : 'border-(--border) bg-(--bg) text-(--text) hover:bg-(--social-bg)'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
            <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">Column 1: Build Source Primitive and Evaluate PRF</h3>
            <div className="grid gap-2 p-3">
              <div className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                <span>Source primitive A:</span>
                <span className="rounded-md border border-(--border) bg-(--code-bg) px-2 py-1 font-mono text-xs">PRG / PRF seed chain</span>
              </div>

              <label className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                Key k (hex):
                <input className="w-52 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)" value={keyHex} onChange={(e) => setKeyHex(e.target.value)} />
              </label>

              <label className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                Query x:
                <input className="w-52 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)" value={queryBits} onChange={(e) => setQueryBits(e.target.value)} placeholder="1011" />
              </label>

              <label className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                Tree depth n (1-8):
                <input
                  className="w-52 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                  type="number"
                  min="1"
                  max="8"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                />
              </label>
            </div>

            <div className="border-t border-dashed border-(--border) px-3 py-3 text-left">
              <p className="my-1 font-mono text-xs text-(--text)"><strong className="text-(--text-h)">PRF mode:</strong> {prfMode}</p>
              <p className="my-1 font-mono text-xs text-(--text)"><strong className="text-(--text-h)">F(k, x):</strong> {shortHex(prfResult?.leaf?.value_hex || prfResult?.output_hex, 16)}</p>
              <p className="my-1 font-mono text-xs text-(--text)"><strong className="text-(--text-h)">G(s)=F(0^n)||F(1^n):</strong> {shortHex(prgFromPrfResult?.output_hex, 16)}</p>
            </div>
          </article>

          <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
            <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">Column 2: Reduce to Target Primitive and Test Security</h3>
            <div className="grid gap-2 p-3">
              <div className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                <span>Target primitive B:</span>
                <span className="rounded-md border border-(--border) bg-(--code-bg) px-2 py-1 font-mono text-xs">PRF / Random Function Indistinguishability</span>
              </div>

              <label className="flex items-center justify-between gap-2 text-sm font-semibold text-(--text-h)">
                Distinguishing queries q:
                <input
                  className="w-52 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                  type="number"
                  min="1"
                  max="1000"
                  value={trials}
                  onChange={(e) => setTrials(e.target.value)}
                />
              </label>
            </div>

            <div className="border-t border-dashed border-(--border) px-3 py-3 text-left">
              <p className="my-1 font-mono text-xs text-(--text)"><strong className="text-(--text-h)">NIST checks:</strong> {testsSummary ? `${testsSummary.passed}/${testsSummary.total_tests} passed` : 'N/A'}</p>
              <p className="my-1 font-mono text-xs text-(--text)"><strong className="text-(--text-h)">PRF ones ratio:</strong> {distinguishResult?.metrics?.prf_ones_ratio?.toFixed?.(4) ?? 'N/A'}</p>
              <p className="my-1 font-mono text-xs text-(--text)"><strong className="text-(--text-h)">Random ones ratio:</strong> {distinguishResult?.metrics?.random_ones_ratio?.toFixed?.(4) ?? 'N/A'}</p>
              <p className="my-1 font-mono text-xs text-(--text)"><strong className="text-(--text-h)">Gap:</strong> {distinguishResult?.metrics?.ratio_gap?.toFixed?.(4) ?? 'N/A'}</p>
              <p className="my-1 font-mono text-xs text-(--text)"><strong className="text-(--text-h)">Conclusion:</strong> {distinguishResult ? (distinguishResult.supports_indistinguishability ? 'No strong statistical gap observed' : 'Noticeable statistical gap observed') : 'N/A'}</p>
            </div>
          </article>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button type="button" className="rounded-md border border-(--accent-border) bg-(--accent-bg) px-3 py-2 text-sm font-semibold text-(--text-h) transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) disabled:cursor-wait disabled:opacity-60" onClick={runPipeline} disabled={loading}>
            {loading ? 'Computing...' : 'Recompute Live Values'}
          </button>
          {error ? <span className="text-sm text-[#ff8aa1]">{error}</span> : null}
        </div>

        <section className="mt-3 overflow-hidden rounded-lg border border-(--border)">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border) bg-(--code-bg) px-3 py-2">
            <h3 className="m-0 text-sm font-bold text-(--text-h)">Reduction Chain Summary</h3>
          </div>

          <div className="space-y-3 bg-(--code-bg) px-3 py-3 text-left">
            <section className="rounded-md border border-(--border) bg-(--bg) px-3 py-2">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">PA2 Notes</h4>
              <ul className="space-y-1 text-sm text-(--text)">
                <li>Step 1 computes F(k, x) using the selected PRF mode.</li>
                <li>Step 2 derives a PRG candidate from PRF outputs: G(s)=F(0^n)||F(1^n).</li>
                <li>Step 3 compares PRF outputs against a random function over q queries.</li>
              </ul>
            </section>

            {Array.isArray(distinguishResult?.sample) && distinguishResult.sample.length > 0 ? (
              <section className="rounded-md border border-(--border) bg-(--bg) px-3 py-2">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">Distinguishing Game Sample</h4>
                <div className="space-y-1">
                  {distinguishResult.sample.slice(0, 6).map((item) => (
                    <p key={`${item.query}-${item.prf}`} className="text-sm text-(--text)">
                      <span className="font-semibold text-(--text-h)">x={item.query}</span>
                      <span>{` | PRF: ${item.prf} | Random: ${item.random}`}</span>
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            {nodesByLevel.size > 0 ? (
              <section className="rounded-md border border-(--border) bg-(--bg) px-3 py-2">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">GGM Tree (Active Path)</h4>
                <div className="space-y-2 overflow-x-auto">
                  {Array.from(nodesByLevel.entries()).map(([level, nodes]) => (
                    <div className="flex min-w-max items-center gap-2" key={`level-${level}`}>
                      <span className="w-14 text-xs font-semibold text-(--text-h)">L{level}</span>
                      {nodes.map((node) => (
                        <div
                          key={node.id}
                          className={`rounded border px-2 py-1 font-mono text-[11px] ${node.active ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h)' : 'border-(--border) bg-(--bg) text-(--text)/70'}`}
                          title={node.value_hex}
                        >
                          {node.prefix || 'root'}: {node.value_preview}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  )
}
