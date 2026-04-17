import { useState, useCallback } from 'react'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'

function PanelHeader({ side, title, subtitle, status }) {
  const isSuccess = status === 'forged'
  const isFailure = status === 'blocked'
  return (
    <div className={`flex items-center justify-between border-b border-(--border) px-4 py-3 rounded-t-xl ${
      side === 'broken' ? 'bg-rose-500/5' : 'bg-emerald-500/5'
    }`}>
      <div>
        <p className={`text-[10px] font-black uppercase tracking-widest ${side === 'broken' ? 'text-rose-400' : 'text-emerald-400'}`}>
          {side === 'broken' ? '⚠ Broken MAC' : '✓ HMAC'}
        </p>
        <h3 className="text-sm font-bold text-(--text-h)">{title}</h3>
        <p className="text-[10px] text-(--text)/50 font-mono">{subtitle}</p>
      </div>
      {status && (
        <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
          isSuccess
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
            : isFailure
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
            : 'bg-(--border)/20 border-(--border) text-(--text)/40'
        }`}>
          {isSuccess ? 'Forgery Succeeded!' : isFailure ? 'Forgery Blocked!' : 'Pending'}
        </div>
      )}
    </div>
  )
}

function HexField({ label, value, highlight = false }) {
  return (
    <div className="space-y-1">
      {label && <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>}
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
    <div className={`mt-3 rounded-xl border-2 p-4 space-y-3 ${
      isForged
        ? 'border-rose-500/40 bg-rose-500/5'
        : 'border-emerald-500/40 bg-emerald-500/5'
    }`}>
      {isForged ? (
        <>
          <div className="flex items-center gap-2">
            <span className="text-rose-400 text-lg">💀</span>
            <p className="text-xs font-black text-rose-400 uppercase tracking-widest">Forgery Succeeded</p>
          </div>
          <HexField label="Forged tag (matches server!)" value={data.forged_tag_hex} />
          <HexField label="Appended MD padding (hex)" value={`${data.padding_hex?.slice(0, 48)}…`} />
          <p className="text-[10px] text-rose-300/60 italic leading-relaxed">
            Attacker computed a valid tag for <strong className="text-rose-300">m ∥ pad ∥ suffix</strong> entirely without knowing the key k.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-lg">🛡️</span>
            <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Forgery Blocked</p>
          </div>
          <p className="text-[11px] text-emerald-300/70 leading-relaxed">{data.reason}</p>
          <p className="text-[10px] text-(--text)/40 italic">
            The outer H((k⊕opad) ∥ ·) re-invocation acts as a keyed IV — the adversary cannot continue the inner hash without restarting it with opad.
          </p>
        </>
      )}
    </div>
  )
}

export default function LengthExtensionDemo() {
  const [message, setMessage] = useState('transfer?amount=100')
  const [suffix, setSuffix] = useState('&amount=9999')

  const [naiveData, setNaiveData] = useState(null)
  const [hmacData, setHmacData] = useState(null)
  const [forgeResult, setForgeResult] = useState(null)
  const [hmacResist, setHmacResist] = useState(null)

  const [loading, setLoading] = useState(false)
  const [forging, setForging] = useState(false)
  const [error, setError] = useState('')

  // Step 1: compute both tags for the original message
  const handleSetup = useCallback(async () => {
    setLoading(true)
    setError('')
    setForgeResult(null)
    setHmacResist(null)
    try {
      const [naiveRes, hmacRes] = await Promise.all([
        api.post('/api/pa10/naive-mac', { message }),
        api.post('/api/pa10/hmac-compute', { message }),
      ])
      setNaiveData(naiveRes.data)
      setHmacData(hmacRes.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Setup failed')
    } finally {
      setLoading(false)
    }
  }, [message])

  // Step 2: perform forgery attempts
  const handleForge = useCallback(async () => {
    setForging(true)
    setError('')
    try {
      const [attackRes, resistRes] = await Promise.all([
        api.post('/api/pa10/length-extend', { message, suffix }),
        api.post('/api/pa10/hmac-resist', { message, suffix }),
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

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">

        <PageHeader title="CS8.401 Minicrypt Clique Explorer - PA10: Length-Extension Attack vs HMAC" />

        {/* ── Config ── */}
        <div className="mb-4 border-b border-(--border) p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <div className="space-y-2">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Original message m</h4>
              <input
                value={message}
                onChange={(e) => { setMessage(e.target.value); setNaiveData(null); setHmacData(null); setForgeResult(null); setHmacResist(null) }}
                className="w-full rounded-xl border border-(--border) bg-(--code-bg) p-3 text-xs text-(--text-h) font-mono outline-none focus:border-(--accent-border) transition-all"
                placeholder="e.g. transfer?amount=100"
              />
              <p className="text-[10px] text-(--text)/40 pl-1 italic">
                Simulates a request authenticated with a secret key k held by the server.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Attacker's suffix m'</h4>
              <input
                value={suffix}
                onChange={(e) => { setSuffix(e.target.value); setForgeResult(null); setHmacResist(null) }}
                className="w-full rounded-xl border border-(--border) bg-(--code-bg) p-3 text-xs text-(--text-h) font-mono outline-none focus:border-(--accent-border) transition-all"
                placeholder="e.g. &amount=9999"
              />
              <p className="text-[10px] text-(--text)/40 pl-1 italic">
                The adversary wants to forge a valid tag for <strong>m ∥ pad ∥ m'</strong> without knowing k.
              </p>
            </div>

          </div>

          <div className="flex items-center gap-3 mt-4">
            <Btn onClick={handleSetup} disabled={loading}>
              {loading ? 'Computing tags...' : '① Compute Tags (Server Oracle)'}
            </Btn>
            {isSetup && (
              <Btn variant="secondary" onClick={handleForge} disabled={forging}>
                {forging ? 'Forging...' : '② Launch Forgery Attempt'}
              </Btn>
            )}
            {error && <p className="text-[10px] font-mono text-rose-400 animate-pulse uppercase font-bold">{error}</p>}
          </div>
        </div>

        {/* ── Side-by-side demo ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-3">

          {/* Left: Broken H(k||m) */}
          <div className="rounded-xl border border-rose-500/20 bg-(--bg) overflow-hidden">
            <PanelHeader
              side="broken"
              title="t = H(k ∥ m)"
              subtitle="Naive MAC — vulnerable to length extension"
              status={forgeResult ? 'forged' : undefined}
            />
            <div className="p-4 space-y-3">
              {naiveData ? (
                <>
                  <HexField label="Original message m" value={message} />
                  <HexField label="Tag t = H(k ∥ m)" value={naiveData.tag_hex} highlight />
                  <HexField label="Payload length |k ∥ m|" value={`${naiveData.payload_len} bytes`} />
                  <div className="mt-2 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
                    <p className="text-[10px] text-rose-300/70 leading-relaxed italic">
                      An adversary who sees <strong className="text-rose-300">(m, t)</strong> can compute a valid tag for 
                      <strong className="text-rose-300"> m ∥ pad ∥ m'</strong> for any m' — without knowing k.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-40 opacity-20">
                  <p className="text-xs italic font-bold uppercase tracking-widest">Oracle not queried yet</p>
                </div>
              )}
              <ForgeResult data={forgeResult} side="broken" />
            </div>
          </div>

          {/* Right: HMAC */}
          <div className="rounded-xl border border-emerald-500/20 bg-(--bg) overflow-hidden">
            <PanelHeader
              side="hmac"
              title="t = HMAC_k(m)"
              subtitle="Double-keyed hash — length-extension immune"
              status={hmacResist ? 'blocked' : undefined}
            />
            <div className="p-4 space-y-3">
              {hmacData ? (
                <>
                  <HexField label="Original message m" value={message} />
                  <HexField label="Inner hash H((k⊕ipad) ∥ m)" value={hmacData.inner_hash_hex} />
                  <HexField label="HMAC tag t" value={hmacData.tag_hex} highlight />
                  <div className="mt-2 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-[10px] text-emerald-300/70 leading-relaxed italic">
                      The outer H re-invocation with <strong className="text-emerald-300">k⊕opad</strong> acts as a fresh keyed IV. 
                      Any extension attempt changes the inner hash, invalidating the outer one.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-40 opacity-20">
                  <p className="text-xs italic font-bold uppercase tracking-widest">Oracle not queried yet</p>
                </div>
              )}
              <ForgeResult data={hmacResist} side="hmac" />
            </div>
          </div>

        </div>

        {/* ── Summary after attack ── */}
        {forgeResult && hmacResist && (
          <div className="mx-3 mt-1 mb-3 rounded-xl border border-(--border) bg-(--code-bg) p-5">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-(--text-h) mb-4">Attack Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Forged message</p>
                <p className="font-mono text-[11px] break-all text-rose-300">{message} ∥ [pad] ∥ {suffix}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Forged tag valid?</p>
                <p className={`font-black text-sm ${forgeResult.verified ? 'text-rose-400' : 'text-amber-400'}`}>
                  {forgeResult.verified ? '✓ Yes — Forgery Confirmed' : '? Mismatch (check params)'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">HMAC blocked?</p>
                <p className="font-black text-sm text-emerald-400">✓ Yes — Always</p>
              </div>
            </div>
          </div>
        )}

      </section>
    </main>
  )
}
