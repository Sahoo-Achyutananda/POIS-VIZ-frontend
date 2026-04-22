import { useState, useCallback } from 'react'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'
import Tabs from '../../components/Tabs'
import FlowCanvas from '../../components/flow/FlowCanvas'
import { nodeTypes } from '../../components/flow/flowNodeFactory'
import { buildHmacFlow } from '../../conversions/pa10/flow'

const TABS = [
  { key: 'visual', label: 'Step Walkthrough' },
  { key: 'flow', label: 'Construction Flow' },
  { key: 'verify', label: 'Verify Tag' },
]

function HexBox({ label, value, accent = false, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <p className="text-[13px] font-black uppercase tracking-widest text-white">{label}</p>
      )}
      <div className={`font-mono text-[12px] break-all rounded-lg border px-3 py-2 leading-relaxed ${
        accent
          ? 'border-(--accent-border) bg-(--accent-bg) text-white'
          : 'border-(--border) bg-(--code-bg) text-white'
      }`}>
        {value || <span className="opacity-30 italic">—</span>}
      </div>
    </div>
  )
}

function ArrowRow({ label }) {
  return (
    <div className="flex items-center gap-2 py-1 px-1">
      <div className="flex-1 border-t border-dashed border-(--border)/50" />
      <span className="text-[12px] font-black text-(--text) uppercase tracking-widest whitespace-nowrap">{label}</span>
      <div className="flex-1 border-t border-dashed border-(--border)/50" />
    </div>
  )
}

function StepCard({ step, title, children, active = false }) {
  return (
    <div className={`rounded-xl border transition-all ${active ? 'border-(--accent-border) shadow-(--shadow)' : 'border-(--border)'}`}>
      <div className={`flex items-center gap-2 rounded-t-xl px-3 py-2 border-b border-(--border) ${active ? 'bg-(--accent-bg)' : 'bg-(--code-bg)'}`}>
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-black ${active ? 'bg-(--accent) text-white' : 'bg-(--border)/50 text-(--text)/60'}`}>{step}</span>
        <span className="text-s font-bold text-(--text-h)">{title}</span>
      </div>
      <div className="p-3 space-y-2">
        {children}
      </div>
    </div>
  )
}

export default function HMACDemo() {
  const [message, setMessage] = useState('Hello, HMAC!')
  const [keyHex, setKeyHex] = useState('')
  const [trace, setTrace] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('visual')

  // Verify tab
  const [verifyTag, setVerifyTag] = useState('')
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifying, setVerifying] = useState(false)

  const handleCompute = useCallback(async () => {
    setLoading(true)
    setError('')
    setTrace(null)
    try {
      const res = await api.post('/api/pa10/hmac-compute', {
        key_hex: keyHex || null,
        message,
      })
      setTrace(res.data)
      setActiveTab('visual')
    } catch (e) {
      setError(e?.response?.data?.detail || 'Computation failed')
    } finally {
      setLoading(false)
    }
  }, [message, keyHex])

  const handleVerify = useCallback(async () => {
    if (!trace || !verifyTag) return
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await api.post('/api/pa10/hmac-verify', {
        key_hex: keyHex || null,
        message,
        tag_hex: verifyTag,
      })
      setVerifyResult(res.data.valid)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Verify failed')
    } finally {
      setVerifying(false)
    }
  }, [trace, verifyTag, message, keyHex])

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">

        <PageHeader title="CS8.401 Minicrypt Clique Explorer - PA10: HMAC Construction" />

        {/* ── Section 1: Input ── */}
        <div className="mb-4 border-b border-(--border) p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Message */}
            <div className="space-y-2">
              <h4 className="text-[13px] font-black uppercase tracking-widest text-white">Message m</h4>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border border-(--border) bg-(--code-bg) p-3 text-xs text-(--text-h) outline-none resize-none font-mono focus:border-(--accent-border) transition-all"
                placeholder="Enter message to authenticate..."
              />
              <div className="flex justify-start mt-2">
                <Btn onClick={handleCompute} disabled={loading}>
                  {loading ? 'Computing...' : 'Compute HMAC'}
                </Btn>
              </div>
            </div>

            {/* Key (optional) */}
            <div className="space-y-2">
              <h4 className="text-[13px] font-black uppercase tracking-widest text-white">
                Secret Key k <span className="text-white normal-case font-normal">(hex, optional — random if blank)</span>
              </h4>
              <input
                value={keyHex}
                onChange={(e) => setKeyHex(e.target.value)}
                className="w-full rounded-xl border border-(--border) bg-(--code-bg) p-3 text-xs text-(--text-h) font-mono outline-none focus:border-(--accent-border) transition-all"
                placeholder="Leave blank for a random session key..."
              />
              <p className="text-[13px] text-white font-bold pl-1">
                HMAC_k(m) = H((k⊕opad) || H((k⊕ipad) || m)) &nbsp;·&nbsp; ipad=0x36×64 &nbsp;·&nbsp; opad=0x5C×64
              </p>
              
            </div>
          </div>
          {error && <p className="mt-2 text-[10px] font-mono text-rose-400 animate-pulse uppercase font-bold">{error}</p>}
        </div>

        {/* ── Section 2: Analysis ── */}
        <section className="overflow-hidden rounded-xl border border-(--border) bg-(--bg) shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border) bg-(--code-bg) px-4 py-3">
            <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          <div className="p-5 min-h-[420px] bg-(--bg)">
            {!trace ? (
              <div className="flex flex-col items-center justify-center h-72 opacity-30">
\                <p className="text-xs font-black uppercase tracking-widest">Enter a message and click Compute HMAC</p>
              </div>
            ) : activeTab === 'visual' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Step 1 — Key Padding */}
                <StepCard step="1" title="Key Padding" active>
                  <HexBox label="Key k (original)" value={trace.key_hex} />
                  <HexBox label="k padded to 64 bytes" value={`${trace.key_padded_hex.slice(0, 32)}…`} />
                </StepCard>

                {/* Step 2 — Inner Hash */}
                <StepCard step="2" title="Inner Hash  H((k⊕ipad) ∥ m)" active>
                  <HexBox label="k ⊕ ipad" value={`${trace.k_ipad_hex.slice(0, 32)}…`} />
                  <HexBox label="message m" value={trace.message_hex} />
                  <ArrowRow label="H(k⊕ipad ∥ m)" />
                  <HexBox label="inner hash" value={trace.inner_hash_hex} accent />
                </StepCard>

                {/* Step 3 — Outer Hash */}
                <StepCard step="3" title="Outer Hash  H((k⊕opad) ∥ inner)" active>
                  <HexBox label="k ⊕ opad" value={`${trace.k_opad_hex.slice(0, 32)}…`} />
                  <HexBox label="inner hash (prepended)" value={trace.inner_hash_hex} />
                  <ArrowRow label="H(k⊕opad ∥ inner)" />
                  <HexBox label="HMAC tag (final)" value={trace.tag_hex} accent />
                </StepCard>

                {/* Tag Output */}
                <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 p-5 flex flex-col justify-center gap-4 shadow-[0_0_30px_rgba(16,185,129,0.1)] group relative transition-all hover:border-emerald-500/60">
                  <p className="text-[12px] font-black uppercase tracking-[0.2em] text-emerald-400">HMAC_k(m) Output</p>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-emerald-950/40 rounded-xl p-4 border border-emerald-500/30 shadow-inner">
                      <div className="font-mono text-[14px] font-bold text-emerald-300 break-all leading-relaxed">
                        {trace.tag_hex}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        navigator.clipboard.writeText(trace.tag_hex)
                        const btn = e.currentTarget
                        const originalContent = btn.innerHTML
                        btn.innerHTML = '<span class="text-[9px] font-black scale-90">DONE!</span>'
                        btn.classList.add('bg-emerald-500/40')
                        setTimeout(() => { 
                          if (btn) {
                            btn.innerHTML = originalContent
                            btn.classList.remove('bg-emerald-500/40')
                          }
                        }, 1500)
                      }}
                      title="Copy Tag"
                      className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/40 hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </div>
                  
                  <p className="text-[13px] text-emerald-200/50 font-medium italic">
                    256-bit secure hmac authentication tag
                  </p>
                </div>

              </div>
            ) : activeTab === 'flow' ? (
              <div className="h-[520px] w-full">
                <FlowCanvas 
                  {...buildHmacFlow(trace)} 
                  nodeTypes={nodeTypes} 
                />
                <div className="mt-2 text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">
                     💡 Tip: Hover over the circular function nodes to see intermediate hex results
                  </p>
                </div>
              </div>
            ) : (
              /* Verify Tab */
              <div className="max-w-lg mx-auto space-y-5 py-4">
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Paste a tag to verify</h4>
                  <input
                    value={verifyTag}
                    onChange={(e) => { setVerifyTag(e.target.value); setVerifyResult(null) }}
                    className="w-full rounded-xl border border-(--border) bg-(--code-bg) p-3 text-xs text-(--text-h) font-mono outline-none focus:border-(--accent-border) transition-all"
                    placeholder="Paste HMAC tag hex here..."
                  />
                </div>
                <div className="p-3 rounded-xl border border-(--border) bg-(--code-bg) space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Verifying against</p>
                  <p className="font-mono text-xs text-(--text-h)">m = "{trace.message_text}"</p>
                </div>
                <Btn onClick={handleVerify} disabled={verifying || !verifyTag} fullWidth>
                  {verifying ? 'Verifying...' : 'Verify Tag'}
                </Btn>
                {verifyResult !== null && (
                  <div className={`rounded-xl border-2 p-5 text-center transition-all ${
                    verifyResult
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-rose-500/50 bg-rose-500/10'
                  }`}>
                    <p className={`text-xl font-black ${verifyResult ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {verifyResult ? 'Valid Tag' : 'Invalid Tag'}
                    </p>
                    <p className="text-[13px] mt-2 text-white font-bold italic">
                      {verifyResult
                        ? 'Tag matches — message is authentic and unmodified.'
                        : 'Tag mismatch — potential forgery or tampering detected.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  )
}
