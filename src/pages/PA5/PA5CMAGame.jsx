import { useMemo, useState, useEffect, useRef } from 'react'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'

function getErrorText(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (typeof error?.message === 'string') return error.message
  return 'Request failed'
}

export default function PA5CMAGame() {
  const chatRef = useRef(null)
  const oracleChatRef = useRef(null)
  
  const [forgeries, setForgeries] = useState(0)
  const [successes, setSuccesses] = useState(0)
  
  const [forgeMessage, setForgeMessage] = useState('')
  const [forgeTag, setForgeTag] = useState('')
  
  const [chat, setChat] = useState([
    {
      id: 'intro',
      role: 'challenger',
      text: 'Welcome to the EUF-CMA Game! The oracle has generated 50 random message/tag pairs using a hidden key. Produce a valid tag for a NEW message to win.',
    },
  ])
  const [oracleChat, setOracleChat] = useState([
    {
      id: 'oracle-intro',
      role: 'oracle',
      text: 'Fetching challenges...',
    },
  ])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchChallenges = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/pa5/euf-cma/challenge')
      const list = res.data.challenge_list || []
      
      const formatted = list.map((item, idx) => ({
        id: `c-${idx}`,
        role: 'oracle',
        text: `m_hex: ${item.message_hex}\nt_hex: ${item.tag_hex}`
      }))

      setOracleChat([
        { id: 'oracle-loaded', role: 'oracle', text: `Loaded ${list.length} signed messages under hidden key k.` },
        ...formatted
      ])
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChallenges()
  }, [])

  const handleForge = async () => {
    if (!forgeMessage.trim() || !forgeTag.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa5/euf-cma/forge', {
        message_hex: forgeMessage.trim(),
        tag_hex: forgeTag.trim(),
      })

      const data = res.data
      setForgeries(f => f + 1)
      if (data.success) {
        setSuccesses(s => s + 1)
      }

      setChat(prev => [
        ...prev,
        { id: `a-${prev.length + 1}`, role: 'adversary', text: `m*="${forgeMessage}"\nt*="${forgeTag}"` },
        {
          id: `c-${prev.length + 2}`,
          role: 'challenger',
          text: `Result: ${data.success ? 'FORGERY ACCEPTED! (Wow!)' : 'FORGERY REJECTED.'}\nIs New Message: ${data.is_new}\nValid Crypto Tag: ${data.valid_crypto}`,
        },
      ])
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [chat])

  useEffect(() => {
    if (oracleChatRef.current) {
      oracleChatRef.current.scrollTop = oracleChatRef.current.scrollHeight
    }
  }, [oracleChat])

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer - PA5: EUF-CMA Forgery Game" />

        <section className="mb-3 rounded-lg border border-(--border) bg-(--code-bg) px-3 py-3 text-left">
          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            <p className="font-mono text-(--text)"><strong className="text-(--text-h)">Target:</strong> CBC-MAC</p>
            <p className="font-mono text-(--text)"><strong className="text-(--text-h)">Mode:</strong> EUF-CMA Attack</p>
            <p className="font-mono text-(--text)"><strong className="text-(--text-h)">Attempts:</strong> {forgeries}</p>
            <p className={`font-mono ${successes > 0 ? "text-emerald-400" : "text-rose-400"}`}>
              <strong className="text-(--text-h)">Successes:</strong> {successes}
            </p>
          </div>
        </section>

        <section className="flex h-[75vh] min-h-0 flex-col overflow-hidden rounded-lg border border-(--border) bg-(--bg)">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 border-b border-dashed border-(--border) bg-(--code-bg) px-3 py-3 lg:grid-cols-2">
            
            {/* Left: Adversary Chat & Input */}
            <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-(--border) bg-(--bg)">
              <div className="flex items-center justify-between gap-2 border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
                <span>Adversary / Challenger</span>
              </div>
              <div
                ref={chatRef}
                className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 scroll-smooth"
              >
                {chat.map((item) => (
                  <div
                    key={item.id}
                    className={`max-w-[85%] rounded-lg border px-3 py-2 text-left text-sm ${
                      item.role === 'adversary'
                        ? 'ml-auto border-(--accent-border) bg-(--accent-bg) text-(--text-h)'
                        : 'mr-auto border-(--border) bg-(--bg) text-(--text)'
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">{item.role}</p>
                    <p className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">{item.text}</p>
                  </div>
                ))}
                {error ? <p className="mt-3 text-left text-sm text-[#ff8aa1]">{error}</p> : null}
              </div>
              <div className="border-t border-dashed border-(--border) px-3 py-3">
                <div className="rounded-md border border-(--border) bg-(--bg) p-3">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">Submit Forgery (m*, t*)</h4>
                  <div className="grid gap-2 text-left">
                    <input
                      className="rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                      value={forgeMessage}
                      onChange={(e) => setForgeMessage(e.target.value)}
                      placeholder="m_hex (must be new!)"
                      disabled={loading}
                    />
                    <input
                      className="rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                      value={forgeTag}
                      onChange={(e) => setForgeTag(e.target.value)}
                      placeholder="t_hex (forged tag)"
                      disabled={loading}
                    />
                    <Btn onClick={handleForge} disabled={loading}>
                      Submit Forgery
                    </Btn>
                  </div>
                </div>
              </div>
            </article>

            {/* Right: Oracle running log */}
            <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-(--border) bg-(--bg)">
              <div className="border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
                Encryption Oracle Log (50 points)
              </div>
              <div
                ref={oracleChatRef}
                className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 scroll-smooth"
              >
                {oracleChat.map((item) => (
                  <div
                    key={item.id}
                    className={`max-w-[85%] rounded-lg border px-3 py-2 text-left text-sm mr-auto border-(--border) bg-(--bg) text-(--text)`}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">{item.role}</p>
                    <p className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-[#34d399]">{item.text}</p>
                  </div>
                ))}
              </div>
            </article>

          </div>
        </section>
      </section>
    </main>
  )
}
