import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'

function PanelHeader({ title, subtitle, status }) {
  const forged  = status === 'forged'
  const blocked = status === 'blocked'
  return (
    <div className="flex items-start justify-between border-b border-(--border) bg-(--accent-bg) px-4 py-3 rounded-t-xl">
      <div className='flex flex-col items-start'>
        <h3 className="text-m font-bold text-(--text-h)">{title}</h3>
        <p className="text-[13px] text-white mt-0.5">{subtitle}</p>
      </div>
      {status && (
        <div className={`shrink-0 ml-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
          forged
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            : blocked
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-(--border)/20 border-(--border) text-(--text)/40'
        }`}>
          {forged ? 'Forgery Succeeded' : blocked ? 'Forgery Blocked' : 'Pending'}
        </div>
      )}
    </div>
  )
}

function HexRow({ label, value, highlight = false }) {
  return (
    <div className="space-y-1">
      {label && (
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      )}
      <div className={`font-mono text-[11px] break-all rounded-lg border px-3 py-2 leading-relaxed ${
        highlight
          ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h)'
          : 'border-(--border) bg-(--code-bg) text-(--text)'
      }`}>
        {value ?? <span className="opacity-30 italic">—</span>}
      </div>
    </div>
  )
}

function ForgeResult({ data, side }) {
  if (!data) return null
  const isForged = side === 'broken'
  return (
    <div className="mt-3 rounded-xl border border-(--border) bg-(--code-bg) p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${isForged ? 'bg-rose-400' : 'bg-emerald-400'}`} />
        <p className={`text-[10px] font-black uppercase tracking-widest ${
          isForged ? 'text-rose-400' : 'text-emerald-400'
        }`}>
          {isForged ? 'Forgery Succeeded' : 'Forgery Blocked'}
        </p>
      </div>

      {isForged ? (
        <>
          <HexRow label="Forged tag (matches server)" value={data.forged_tag_hex} />
          <HexRow label="MD padding appended (hex, truncated)" value={`${data.padding_hex?.slice(0, 48)}…`} />
          <p className="text-[11px] text-(--text)/50 italic leading-relaxed">
            Attacker computed a valid tag for <strong className="text-(--text)/70">m ∥ pad ∥ suffix</strong> with no knowledge of key k.
          </p>
        </>
      ) : (
        <>
          <p className="text-[11px] text-(--text)/70 leading-relaxed">{data.reason}</p>
          <p className="text-[11px] text-(--text)/35 italic leading-relaxed">
            The outer H((k⊕opad) ∥ ·) re-invocation acts as a keyed IV — the adversary cannot continue the inner hash without restarting from scratch with the opad key.
          </p>
        </>
      )}
    </div>
  )
}

export default function LengthExtensionDemo() {
  const [message, setMessage] = useState('transfer?amount=100')
  const [suffix,  setSuffix]  = useState('&amount=9999')

  const [naiveData,   setNaiveData]   = useState(null)
  const [hmacData,    setHmacData]    = useState(null)
  const [forgeResult, setForgeResult] = useState(null)
  const [hmacResist,  setHmacResist]  = useState(null)

  const [loading, setLoading] = useState(false)
  const [forging, setForging] = useState(false)
  const [error,   setError]   = useState('')

  const handleSetup = useCallback(async () => {
    setLoading(true)
    setError('')
    setForgeResult(null)
    setHmacResist(null)
    try {
      const [naiveRes, hmacRes] = await Promise.all([
        api.post('/api/pa10/naive-mac',     { message }),
        api.post('/api/pa10/hmac-compute',  { message }),
      ])
      setNaiveData(naiveRes.data)
      setHmacData(hmacRes.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Setup failed')
    } finally {
      setLoading(false)
    }
  }, [message])

  const handleForge = useCallback(async () => {
    setForging(true)
    setError('')
    try {
      const [attackRes, resistRes] = await Promise.all([
        api.post('/api/pa10/length-extend', { message, suffix }),
        api.post('/api/pa10/hmac-resist',   { message, suffix }),
      ])
      setForgeResult(attackRes.data)
      setHmacResist(resistRes.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Forge attempt failed')
    } finally {
      setForging(false)
    }
  }, [message, suffix])

  const isSetup = !!naiveData && !!hmacData

  const navigate = useNavigate()

  return (
    <main className="min-h-screen w-full bg-(--bg) px-1 py-4 text-(--text)">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-1 shadow-(--shadow)">

        <PageHeader title="CS8.401 Minicrypt Clique Explorer — PA10: Length-Extension Attack vs HMAC" />

        {/* ── Related page link ── */}
        <div className="mx-3 mb-2 flex items-center justify-between rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2">
          <p className="text-[13px] text-white">
            Continue in PA5's interactive attack pipeline with the same message and suffix pre-filled.
          </p>
          <button
            type="button"
            onClick={() => navigate('/pa5/length_extension', {
              state: {
                messageHex: Array.from(message).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
                suffixHex:  Array.from(suffix).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
              }
            })}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-(--border) bg-(--bg) px-3 py-1 text-[11px] font-semibold text-(--text-h) transition-all hover:border-(--accent-border) hover:bg-(--accent-bg)"
          >
            Try in PA5 attack pipeline
            <span className="text-(--accent)">→</span>
          </button>
        </div>

        {/* ── Config ── */}
        <div className="mb-4 border-b border-(--border) px-4 py-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            <div className="space-y-1.5">
              <p className="text-[13px] font-black uppercase tracking-widest text-white">
                Original message m
              </p>
              <input
                value={message}
                onChange={e => {
                  setMessage(e.target.value)
                  setNaiveData(null); setHmacData(null)
                  setForgeResult(null); setHmacResist(null)
                }}
                className="w-full rounded-xl border border-(--border) bg-(--code-bg) p-3 text-xs text-(--text-h) font-mono outline-none focus:border-(--accent-border) transition-all"
                placeholder="e.g. transfer?amount=100"
              />
              <p className="text-[13px] text-white pl-1 italic">
                Simulates a request authenticated with a secret key k held by the server.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[13px] font-black uppercase tracking-widest text-white">
                Attacker suffix m'
              </p>
              <input
                value={suffix}
                onChange={e => {
                  setSuffix(e.target.value)
                  setForgeResult(null); setHmacResist(null)
                }}
                className="w-full rounded-xl border border-(--border) bg-(--code-bg) p-3 text-xs text-(--text-h) font-mono outline-none focus:border-(--accent-border) transition-all"
                placeholder="e.g. &amount=9999"
              />
              <p className="text-[13px] text-white pl-1 italic">
                Forge a valid tag for <strong className="text-(--text)/70">m ∥ pad ∥ m'</strong> without knowing k.
              </p>
            </div>

          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Btn onClick={handleSetup} disabled={loading}>
              {loading ? 'Computing tags…' : 'Compute Tags (Server Oracle)'}
            </Btn>
            {isSetup && (
              <Btn variant="secondary" onClick={handleForge} disabled={forging}>
                {forging ? 'Forging…' : 'Launch Forgery Attempt'}
              </Btn>
            )}
            {error && (
              <p className="text-[11px] font-mono font-bold uppercase text-rose-400">{error}</p>
            )}
          </div>
        </div>

        {/* ── Side-by-side panels ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 pb-4 px-2">

          {/* Left: Broken H(k||m) */}
          <div className="rounded-xl border border-(--border) bg-(--bg) overflow-hidden">
            <PanelHeader
              title="t = H(k ∥ m)"
              subtitle="Naive MAC — vulnerable to length extension"
              status={forgeResult ? 'forged' : undefined}
            />
            <div className="p-5 space-y-3">
              {naiveData ? (
                <>
                  <HexRow label="Original message m" value={message} />
                  <HexRow label="Tag  t = H(k ∥ m)" value={naiveData.tag_hex} highlight />
                </>
              ) : (
                <div className="flex h-36 items-center justify-center">
                  <p className="text-[11px] italic font-bold uppercase tracking-widest text-(--text)/20">
                    Oracle not queried yet
                  </p>
                </div>
              )}
              <ForgeResult data={forgeResult} side="broken" />
            </div>
          </div>

          {/* Right: HMAC */}
          <div className="rounded-xl border border-(--border) bg-(--bg) overflow-hidden">
            <PanelHeader
              title="t = HMAC_k(m)"
              subtitle="Double-keyed hash — length-extension immune"
              status={hmacResist ? 'blocked' : undefined}
            />
            <div className="p-5 space-y-3">
              {hmacData ? (
                <>
                  <HexRow label="Original message m" value={message} />
                  <HexRow label="HMAC tag t" value={hmacData.tag_hex} highlight />
                </>
              ) : (
                <div className="flex h-36 items-center justify-center">
                  <p className="text-[11px] italic font-bold uppercase tracking-widest text-(--text)/20">
                    Oracle not queried yet
                  </p>
                </div>
              )}
              <ForgeResult data={hmacResist} side="hmac" />
            </div>
          </div>

        </div>

        {/* ── Attack summary ── */}
        {/* {forgeResult && hmacResist && (
          <div className="mx-3 mt-1 mb-4 rounded-xl border border-(--border) bg-(--code-bg) p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-(--text-h) mb-4">
              Attack Summary
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Forged message</p>
                <p className="font-mono text-[11px] break-all text-rose-300/80">
                  {message} ∥ [pad] ∥ {suffix}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Forged tag valid?</p>
                <p className={`font-black text-sm ${forgeResult.verified ? 'text-rose-400' : 'text-amber-400'}`}>
                  {forgeResult.verified ? 'Yes — Forgery Confirmed' : 'Mismatch (check params)'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">HMAC blocked?</p>
                <p className="font-black text-sm text-emerald-400">Yes — Always</p>
              </div>
            </div>
          </div>
        )} */}

      </section>
    </main>
  )
}
