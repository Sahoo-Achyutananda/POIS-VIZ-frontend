import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../lib/api'
import NavSidebar from '../../components/NavSidebar'

function getErrorText(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (typeof error?.message === 'string') return error.message
  return 'Request failed'
}

export default function PA5LengthExtension() {
  const navigate = useNavigate()
  const location = useLocation()
  const oracleChatRef = useRef(null)
  const extenderChatRef = useRef(null)
  const detectorChatRef = useRef(null)

  const [keyHex, setKeyHex] = useState('6b6579') // "key"
  const [originalMessage, setOriginalMessage] = useState('6d657373616765') // "message"
  const [suffixHex, setSuffixHex] = useState('737566666978') // "suffix"

  const [oracleChat, setOracleChat] = useState([
    {
      id: 'oracle-intro',
      role: 'oracle',
      text: 'Oracle ready. Query for a MAC tag H(k || m).',
    },
  ])

  const [extenderChat, setExtenderChat] = useState([
    {
      id: 'extender-intro',
      role: 'extender',
      text: 'Extension tool ready. If you have a tag, I can compute the extension for you.',
    },
  ])

  const [detectorChat, setDetectorChat] = useState([
    {
      id: 'detector-intro',
      role: 'challenger',
      text: 'Challenger ready. Submit a forged tag and message to verify.',
    },
  ])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPaddingModal, setShowPaddingModal] = useState(false)
  const [modalData, setModalData] = useState(null)

  // Track the last captured tag from Oracle
  const [lastCaptured, setLastCaptured] = useState(null)
  // Track the last forged tag from Extender
  const [lastForged, setLastForged] = useState(null)

  // Input fields for the 3rd window (Detector)
  const [forgedMsgInput, setForgedMsgInput] = useState('')
  const [forgedTagInput, setForgedTagInput] = useState('')

  const handleQueryOracle = async () => {
    if (!originalMessage.trim() || !keyHex.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa5/mac', {
        mode: 'naive',
        key_hex: keyHex.trim(),
        message_hex: originalMessage.trim(),
      })
      
      const tag = res.data.tag_hex
      setOracleChat((prev) => [
        ...prev,
        { id: `oa-${prev.length + 1}`, role: 'adversary', text: `Query m="${originalMessage}"` },
        { id: `oo-${prev.length + 2}`, role: 'oracle', text: `Tag t = ${tag}` },
      ])
      
      setLastCaptured({
        message: originalMessage.trim(),
        tag: tag,
        keyLen: keyHex.trim().length / 2,
        msgLen: originalMessage.trim().length / 2,
        keyHex: keyHex.trim()
      })
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  const handleExtend = async () => {
    if (!lastCaptured || !suffixHex.trim()) return
    setLoading(true)
    setError('')
    try {
      const payloadLen = lastCaptured.keyLen + lastCaptured.msgLen

      // 1. Get padding
      const padRes = await api.get('/api/pa5/length-extension/pad', {
        params: { original_payload_length: payloadLen }
      })
      const padding = padRes.data.padding_hex

      // 2. Perform extension
      const extRes = await api.post('/api/pa5/length-extension', {
        original_tag_hex: lastCaptured.tag,
        original_payload_length: payloadLen,
        suffix_hex: suffixHex.trim()
      })
      const forgedTag = extRes.data.extended_tag_hex
      const forgedFullMsg = lastCaptured.message + padding + suffixHex.trim()

      const currentModalData = {
        tag: lastCaptured.tag,
        keyHex: lastCaptured.keyHex,
        message: lastCaptured.message,
        padding,
        suffix: suffixHex.trim()
      }

      setExtenderChat((prev) => [
        ...prev,
        { id: `ea-${prev.length + 1}`, role: 'adversary', text: `Extend tag with suffix "${suffixHex}"` },
        { 
          id: `ee-${prev.length + 2}`, 
          role: 'extender', 
          text: `Forged Tag: ${forgedTag}\nFull Message: ${forgedFullMsg}`,
          modalData: currentModalData
        },
      ])

      setLastForged({ tag: forgedTag, message: forgedFullMsg })
      // Auto-fill Detector pane
      setForgedMsgInput(forgedFullMsg)
      setForgedTagInput(forgedTag)

    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!forgedMsgInput.trim() || !forgedTagInput.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa5/length-extension/verify', {
        key_hex: keyHex.trim(),
        full_message_hex: forgedMsgInput.trim(),
        forged_tag_hex: forgedTagInput.trim()
      })

      const success = res.data.success
      setDetectorChat((prev) => [
        ...prev,
        { id: `da-${prev.length + 1}`, role: 'adversary', text: `Verify Forgery:\nm*=${forgedMsgInput}\nt*=${forgedTagInput}` },
        { 
          id: `dc-${prev.length + 2}`, 
          role: 'challenger', 
          text: `Verdict: ${success ? 'ACCEPTED ✅ (Attack Successful!)' : 'REJECTED ❌ (Try again)'}` 
        },
      ])
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  // Pre-fill from PA10 navigation state
  useEffect(() => {
    if (location.state?.messageHex) setOriginalMessage(location.state.messageHex)
    if (location.state?.suffixHex)  setSuffixHex(location.state.suffixHex)
  }, [location.state])

  useEffect(() => {
    if (oracleChatRef.current) oracleChatRef.current.scrollTop = oracleChatRef.current.scrollHeight
  }, [oracleChat])
  useEffect(() => {
    if (extenderChatRef.current) extenderChatRef.current.scrollTop = extenderChatRef.current.scrollHeight
  }, [extenderChat])
  useEffect(() => {
    if (detectorChatRef.current) detectorChatRef.current.scrollTop = detectorChatRef.current.scrollHeight
  }, [detectorChat])

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        
        {/* Header with Key input */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--social-bg) px-3 py-2">
          <div className="flex items-center gap-2">
            <NavSidebar />
            <strong className="text-sm text-(--text-h)">PA5: Length Extension Pipeline (3-Window Attack)</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-(--text-h)">Secret Key (k) Hex:</span>
            <input
              className="w-48 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
              value={keyHex}
              onChange={(e) => setKeyHex(e.target.value)}
              placeholder="key hex"
            />
          </div>
        </div>

        {/* Info Banner */}
        {/* <section className="mb-3 rounded-lg border border-(--border) bg-(--code-bg) px-3 py-3 text-left">
          <p className="m-0 text-[11px] leading-relaxed text-(--text)/80">
            <strong className="text-(--text-h)">The Pipeline:</strong> 1. Query Oracle for a baseline tag. ⮕ 2. Use Extender to compute new state from tag + suffix. ⮕ 3. Submit forgery to Challenger.
          </p>
        </section> */}

        {/* ── Pre-fill hint (shown only when arriving from PA10) ── */}
        {location.state?.messageHex && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-(--accent-border) bg-(--accent-bg)/30 px-3 py-2">
            <p className="text-[11px] text-(--text-h)">
              Message and suffix pre-filled from PA10. Set your own key, then hit <strong>Query Oracle</strong> to start the attack.
            </p>
            <button
              type="button"
              onClick={() => navigate(location.pathname, { replace: true, state: null })}
              className="ml-3 shrink-0 text-[11px] text-(--text)/40 hover:text-(--text) transition-colors"
            >dismiss</button>
          </div>
        )}

        {/* ── Related page link ── */}
        {/* <div className="mb-3 flex items-center justify-between rounded-lg border border-(--border) bg-(--code-bg) px-3 py-2">
          <p className="text-[11px] text-(--text)/50">
            Want the visual side-by-side comparison of broken MAC vs HMAC?
          </p>
          <button
            type="button"
            onClick={() => navigate('/pa10/length-extension')}
            className="flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg) px-3 py-1 text-[11px] font-semibold text-(--text-h) transition-all hover:border-(--accent-border) hover:bg-(--accent-bg)"
          >
            PA10: MAC vs HMAC Demo
            <span className="text-(--accent)">→</span>
          </button>
        </div> */}

        {/* 3-Chat Display */}
        <section className="flex h-[73vh] min-h-0 flex-col overflow-hidden rounded-lg border border-(--border) bg-(--bg)">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 border-b border-dashed border-(--border) bg-(--code-bg) px-3 py-3 lg:grid-cols-3">
            
            {/* Window 1: Oracle */}
            <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-(--border) bg-(--bg)">
              <div className="border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-(--text-h)">
                Window 1: MAC Oracle
              </div>
              <div ref={oracleChatRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 scroll-smooth bg-(--bg)">
                {oracleChat.map((item) => (
                  <div key={item.id} className={`max-w-[90%] rounded-lg border px-3 py-2 text-left text-sm ${item.role === 'adversary' ? 'ml-auto border-(--accent-border) bg-(--accent-bg) text-(--text-h)' : 'mr-auto border-(--border) bg-(--bg) text-(--text)'}`}>
                    <p className="mb-1 text-[9px] font-semibold uppercase opacity-70">{item.role}</p>
                    <p className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-(--border) px-3 py-3 bg-(--bg) flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-(--text-h) uppercase opacity-70 whitespace-nowrap min-w-[80px]">Message (m):</span>
                  <input className="w-full rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none" value={originalMessage} onChange={(e) => setOriginalMessage(e.target.value)} placeholder="Hex" />
                </div>
                <button onClick={handleQueryOracle} disabled={loading} className="w-full rounded-md border border-(--accent-border) bg-(--accent-bg) py-1.5 text-xs font-bold text-(--text-h) transition-all hover:-translate-y-0.5">Query Oracle</button>
              </div>
            </article>

            {/* Window 2: Length Extender */}
            <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-(--border) bg-(--bg)">
              <div className="border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-(--text-h)">
                Window 2: Length Extender
              </div>
              <div ref={extenderChatRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 scroll-smooth bg-(--bg)">
                {extenderChat.map((item) => (
                  <div key={item.id} className={`relative max-w-[90%] rounded-lg border px-3 py-2 text-left text-sm ${item.role === 'adversary' ? 'ml-auto border-(--accent-border) bg-(--accent-bg) text-(--text-h)' : 'mr-auto border-(--border) bg-(--bg) text-(--text)'}`}>
                    <p className="mb-1 text-[9px] font-semibold uppercase opacity-70">{item.role}</p>
                    <p className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed">{item.text}</p>
                    {item.modalData && (
                      <button onClick={() => { setModalData(item.modalData); setShowPaddingModal(true); }} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-(--border) bg-(--bg) text-[10px] font-serif italic font-bold text-(--accent-color) hover:bg-(--social-bg)">i</button>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-(--border) px-3 py-3 bg-(--bg) flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-(--text-h) uppercase opacity-70 whitespace-nowrap min-w-[80px]">Suffix (s):</span>
                  <input className="w-full rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none" value={suffixHex} onChange={(e) => setSuffixHex(e.target.value)} placeholder="Hex" />
                </div>
                <button onClick={handleExtend} disabled={loading || !lastCaptured} className="w-full rounded-md border border-rose-500 bg-rose-500/10 py-1.5 text-xs font-bold text-rose-400 transition-all hover:-translate-y-0.5 disabled:opacity-30">Extend MAC</button>
              </div>
            </article>

            {/* Window 3: Forgery Detector */}
            <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-(--border) bg-(--bg)">
              <div className="border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-(--text-h)">
                Window 3: Forgery Detector
              </div>
              <div ref={detectorChatRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 scroll-smooth bg-(--bg)">
                {detectorChat.map((item) => (
                  <div key={item.id} className={`max-w-[90%] rounded-lg border px-3 py-2 text-left text-sm ${item.role === 'adversary' ? 'ml-auto border-(--accent-border) bg-(--accent-bg) text-(--text-h)' : 'mr-auto border-(--border) bg-(--bg) text-(--text)'}`}>
                    <p className="mb-1 text-[9px] font-semibold uppercase opacity-70">{item.role}</p>
                    <p className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed">{item.text}</p>
                  </div>
                ))}
                {error && <p className="text-xs text-rose-400 p-2">{error}</p>}
              </div>
              <div className="border-t border-dashed border-(--border) px-3 py-3 bg-(--bg)">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-(--text-h) uppercase opacity-70 whitespace-nowrap min-w-[80px]">Message (m*):</span>
                    <input className="w-full rounded border border-(--border) bg-(--bg) px-2 py-1 font-mono text-[10px] outline-none" placeholder="Hex" value={forgedMsgInput} onChange={(e) => setForgedMsgInput(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-(--text-h) uppercase opacity-70 whitespace-nowrap min-w-[80px]">Tag (t*):</span>
                    <input className="w-full rounded border border-(--border) bg-(--bg) px-2 py-1 font-mono text-[10px] outline-none" placeholder="Hex" value={forgedTagInput} onChange={(e) => setForgedTagInput(e.target.value)} />
                  </div>
                  <button onClick={handleVerify} disabled={loading} className="w-full rounded bg-emerald-500 py-1.5 text-xs font-bold text-black hover:bg-emerald-400 transition-colors mt-1">Verify Forgery</button>
                </div>
              </div>
            </article>

          </div>
        </section>
      </section>

      {/* Padding Modal */}
      {showPaddingModal && modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-(--border) bg-(--bg) p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-(--border) pb-3">
              <h3 className="text-lg font-bold text-(--text-h)">Construction Mechanics</h3>
              <button onClick={() => setShowPaddingModal(false)} className="text-(--text) hover:text-(--text-h) text-xl">✕</button>
            </div>
            <div className="space-y-4 text-left">
              <div>
                <p className="text-xs font-semibold uppercase text-rose-400 mb-1">State Captured</p>
                <div className="rounded bg-(--code-bg) p-2 font-mono text-[11px] break-all border border-(--border)">{modalData.tag}</div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-(--accent-color) mb-2">Message Breakdown</p>
                <div className="rounded border border-(--border) overflow-hidden">
                  <div className="flex bg-indigo-500/10 p-2 border-b border-(--border)">
                    <span className="w-16 text-[8px] font-bold text-indigo-400 uppercase">Secret k</span>
                    <span className="font-mono text-[10px] ml-2 opacity-50">{"•".repeat(modalData.keyHex.length)}</span>
                  </div>
                  <div className="flex bg-emerald-500/10 p-2 border-b border-(--border)">
                    <span className="w-16 text-[8px] font-bold text-emerald-400 uppercase">Msg m</span>
                    <span className="font-mono text-[10px] ml-2">{modalData.message}</span>
                  </div>
                  <div className="bg-amber-500/10 p-2 border-b border-(--border)">
                    <span className="block text-[8px] font-bold text-amber-400 uppercase mb-1">Padding</span>
                    <div className="flex gap-1 font-mono text-[10px] break-all leading-tight">
                      <span className="text-rose-400">{modalData.padding?.slice(0, 2)}</span>
                      <span className="text-amber-200">{modalData.padding?.slice(2, -16)}</span>
                      <span className="text-sky-400">{modalData.padding?.slice(-16)}</span>
                    </div>
                  </div>
                  <div className="bg-rose-500/10 p-2">
                    <span className="block text-[8px] font-bold text-rose-400 uppercase mb-1">Suffix s</span>
                    <span className="font-mono text-[10px]">{modalData.suffix}</span>
                  </div>
                </div>
              </div>
              <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-3 text-[11px] leading-relaxed">
                The hash state from <b>Window 1</b> effectively "absorbs" the secret, the message, and the padding. By resuming from that state, we can add the <b>Suffix</b> as if it were simply more user input.
              </div>
            </div>
            <button onClick={() => setShowPaddingModal(false)} className="mt-6 w-full rounded bg-(--accent-bg) py-2 font-bold text-(--text-h)">Close</button>
          </div>
        </div>
      )}
    </main>
  )
}
