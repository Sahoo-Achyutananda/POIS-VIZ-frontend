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

export default function PA6CCAGame() {
  const challengerChatRef = useRef(null)
  const encOracleChatRef = useRef(null)
  const decOracleChatRef = useRef(null)

  const [sessionId, setSessionId] = useState('')
  const [rounds, setRounds] = useState(0)
  const [wins, setWins] = useState(0)
  const [awaitingGuess, setAwaitingGuess] = useState(false)

  const [m0, setM0] = useState('attack-left-message')
  const [m1, setM1] = useState('attack-rght-message')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [challengerChat, setChallengerChat] = useState([
    {
      id: 'intro',
      role: 'challenger',
      text: 'Welcome to IND-CCA2 game. Send m0 and m1 (equal length) to start a round. Session securely tracked.',
    },
  ])
  
  const [encOracleChat, setEncOracleChat] = useState([
    {
      id: 'e-intro',
      role: 'oracle',
      text: 'Encryption Oracle ready. Start a session to generate Secure keys.',
    },
  ])

  const [decOracleChat, setDecOracleChat] = useState([
    {
      id: 'd-intro',
      role: 'oracle',
      text: 'Decryption Oracle ready. You cannot query the challenge ciphertext.',
    },
  ])

  // Input states
  const [encQueryMsg, setEncQueryMsg] = useState('attack-payload')
  const [decQueryR, setDecQueryR] = useState('')
  const [decQueryC, setDecQueryC] = useState('')
  const [decQueryTag, setDecQueryTag] = useState('')

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
        try {
            const res = await api.post('/api/pa6/cca-game/init')
            setSessionId(res.data.session_id)
        } catch (err) {
            setError('Failed to initialize connection to Oracles.')
        }
    }
    initSession()
  }, [])

  const winRate = rounds > 0 ? wins / rounds : 0
  const runningAdvantage = Math.abs(winRate - 0.5)

  const statusTone = useMemo(() => {
    if (runningAdvantage <= 0.1) return 'text-emerald-300'
    if (runningAdvantage <= 0.25) return 'text-amber-300'
    return 'text-rose-300'
  }, [runningAdvantage])

  const handleSendChallengePair = async () => {
    if (!m0 || !m1) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa6/cca-game/start', {
        session_id: sessionId || null,
        m0,
        m1
      })
      const data = res.data
      setSessionId(data.session_id)
      setRounds(data.rounds_played)
      setWins(data.wins)
      setAwaitingGuess(true)
      
      setChallengerChat(prev => [
        ...prev,
        { id: `a-${prev.length + 1}`, role: 'adversary', text: `m0="${m0}" | m1="${m1}"` },
        {
          id: `c-${prev.length + 2}`,
          role: 'challenger',
          text: `C*: r=${data.challenge.r_hex}, c=${data.challenge.c_hex}, t=${data.challenge.tag_hex}`,
        },
      ])
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  const handleEncQuery = async () => {
    if (!encQueryMsg.trim() || !sessionId) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa6/cca-game/encrypt-oracle', {
        session_id: sessionId,
        message: encQueryMsg.trim()
      })
      const { r_hex, c_hex, tag_hex } = res.data
      setEncOracleChat(prev => [
        ...prev,
        { id: `aq-${prev.length}`, role: 'adversary', text: `Query m="${encQueryMsg}"` },
        { id: `ao-${prev.length + 1}`, role: 'oracle', text: `r: ${r_hex}\nc: ${c_hex}\nt: ${tag_hex}` },
      ])
    } catch (err) {
      setEncOracleChat(prev => [...prev, { id: `err-${prev.length}`, role: 'oracle', text: `[Error: ${getErrorText(err)}]` }])
    } finally {
      setLoading(false)
    }
  }

  const handleDecQuery = async () => {
    if (!decQueryR || !decQueryC || !decQueryTag || !sessionId) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa6/cca-game/decrypt-oracle', {
        session_id: sessionId,
        r_hex: decQueryR.trim(),
        c_hex: decQueryC.trim(),
        tag_hex: decQueryTag.trim(),
      })
      
      setDecOracleChat(prev => [
        ...prev,
        { id: `aq-${prev.length}`, role: 'adversary', text: `r: ${decQueryR}\nc: ${decQueryC}\nt: ${decQueryTag}` },
        { id: `ao-${prev.length + 1}`, role: 'oracle', text: `Dec(C): ${res.data.plaintext || '⊥ (REJECTED)'}` },
      ])
    } catch (err) {
      setDecOracleChat(prev => [...prev, { id: `err-${prev.length}`, role: 'oracle', text: `[Error: ${getErrorText(err)}]` }])
    } finally {
      setLoading(false)
    }
  }

  const handleGuess = async (bit) => {
    if (!sessionId || !awaitingGuess) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa6/cca-game/guess', {
        session_id: sessionId,
        guess: bit
      })
      const data = res.data
      setRounds(data.rounds_played)
      setWins(data.wins)
      setAwaitingGuess(false)

      setChallengerChat(prev => [
        ...prev,
        { id: `g-${prev.length}`, role: 'adversary', text: `Guess b' = ${bit}` },
        { id: `r-${prev.length + 1}`, role: 'challenger', text: `b=${data.revealed_b}, ${data.correct ? 'correct' : 'incorrect'}, adv=${data.advantage.toFixed(3)}` },
      ])
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setRounds(0)
    setWins(0)
    setSessionId('')
    setRoundId('')
    setAwaitingGuess(false)
    setError('')
    setChallengerChat([{ id: 'intro', role: 'challenger', text: 'Session reset. Send m0 and m1 to begin again.' }])
    setEncOracleChat([{ id: 'e-intro', role: 'oracle', text: 'Session reset. Awaiting challenge generation...' }])
    setDecOracleChat([{ id: 'd-intro', role: 'oracle', text: 'Session reset. Awaiting challenge generation...' }])
  }

  // Auto-scroll hooks
  useEffect(() => {
    if (challengerChatRef.current) challengerChatRef.current.scrollTop = challengerChatRef.current.scrollHeight
  }, [challengerChat])
  
  useEffect(() => {
    if (encOracleChatRef.current) encOracleChatRef.current.scrollTop = encOracleChatRef.current.scrollHeight
  }, [encOracleChat])

  useEffect(() => {
    if (decOracleChatRef.current) decOracleChatRef.current.scrollTop = decOracleChatRef.current.scrollHeight
  }, [decOracleChat])

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        
        <PageHeader title="CS8.401 Minicrypt Clique Explorer - PA6: IND-CCA2 Encryption Demo" />

        <section className="mb-3 rounded-lg border border-(--border) bg-(--code-bg) px-3 py-3 text-left">
          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            <p className="font-mono text-(--text)"><strong className="text-(--text-h)">Rounds:</strong> {rounds}</p>
            <p className="font-mono text-(--text)"><strong className="text-(--text-h)">Wins:</strong> {wins}</p>
            <p className="font-mono text-(--text)"><strong className="text-(--text-h)">Win rate:</strong> {winRate.toFixed(3)}</p>
            <p className={`font-mono ${statusTone}`}><strong className="text-(--text-h)">Adv:</strong> {runningAdvantage.toFixed(3)}</p>
          </div>
        </section>

        {error && <p className="mb-3 text-rose-400 font-bold text-xs">{error}</p>}

        <section className="flex h-[75vh] min-h-0 flex-col overflow-hidden rounded-lg border border-(--border) bg-(--bg)">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 border-b border-dashed border-(--border) bg-(--code-bg) px-3 py-3 lg:grid-cols-3">
            
            {/* Column 1: Challenger */}
            <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-(--border) bg-(--bg)">
              <div className="flex items-center justify-between gap-2 border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
                <span>Adversary / Challenger</span>
                <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${awaitingGuess ? 'border-emerald-300/80 bg-emerald-300/20 text-emerald-200' : 'border-yellow-300/80 bg-yellow-300/20 text-yellow-200'}`}>
                  ({awaitingGuess ? 'Guess' : 'Send Message'})
                </span>
              </div>
              <div ref={challengerChatRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 scroll-smooth">
                 {challengerChat.map((msg, i) => (
                    <div key={i} className={`max-w-[90%] rounded-lg border px-3 py-2 text-left text-sm ${msg.role === 'adversary' ? 'ml-auto border-(--accent-border) bg-(--accent-bg) text-(--text-h)' : 'mr-auto border-(--border) bg-(--bg) text-(--text)'}`}>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest opacity-60">{msg.role}</p>
                        <p className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">{msg.text}</p>
                    </div>
                 ))}
              </div>
              
              <div className="border-t border-dashed border-(--border) px-3 py-3">
                 {!awaitingGuess ? (
                    <div className="rounded-md border border-(--border) bg-(--bg) p-3 text-left">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">Send m0 and m1</h4>
                        <div className="grid gap-2">
                            <input
                                className="rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                                value={m0} onChange={(e) => setM0(e.target.value)} placeholder="m0" disabled={loading}
                            />
                            <input
                                className="rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                                value={m1} onChange={(e) => setM1(e.target.value)} placeholder="m1" disabled={loading}
                            />
                            <Btn onClick={handleSendChallengePair} disabled={loading}>
                                Send Pair
                            </Btn>
                        </div>
                    </div>
                 ) : (
                    <div className="rounded-md border border-(--border) bg-(--bg) p-3 text-left">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">Guess b</h4>
                        <div className="flex flex-wrap gap-2">
                            <Btn onClick={() => handleGuess(0)} disabled={loading}>
                                Guess 0
                            </Btn>
                            <Btn onClick={() => handleGuess(1)} disabled={loading}>
                                Guess 1
                            </Btn>
                            <Btn variant="secondary" onClick={handleReset} disabled={loading}>
                                Reset
                            </Btn>
                        </div>
                    </div>
                 )}
              </div>
            </article>

            {/* Column 2: Encryption Oracle */}
            <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-(--border) bg-(--bg)">
              <div className="flex items-center justify-between gap-2 border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
                <span>Adversary / Enc Oracle</span>
              </div>
              <div ref={encOracleChatRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 scroll-smooth">
                 {encOracleChat.map((msg, i) => (
                    <div key={i} className={`max-w-[85%] rounded-lg border px-3 py-2 text-left text-sm ${msg.role === 'adversary' ? 'ml-auto border-(--accent-border) bg-(--accent-bg) text-(--text-h)' : 'mr-auto border-(--border) bg-(--bg) text-(--text)'}`}>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">{msg.role}</p>
                        <p className={`whitespace-pre-wrap break-all font-mono text-xs leading-relaxed ${msg.text.includes('Error') ? 'text-rose-400' : ''}`}>{msg.text}</p>
                    </div>
                 ))}
              </div>
              
              <div className="border-t border-dashed border-(--border) px-3 py-3">
                 <div className="rounded-md border border-(--border) bg-(--bg) p-3 text-left">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">Submit Encryption Query</h4>
                    <div className="flex flex-col gap-2">
                        <input
                            className="rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                            value={encQueryMsg}
                            onChange={(e) => setEncQueryMsg(e.target.value)}
                            placeholder="m_query"
                            disabled={loading || !sessionId}
                        />
                        <Btn onClick={handleEncQuery} disabled={loading || !sessionId}>
                            Ask Enc Oracle
                        </Btn>
                    </div>
                 </div>
              </div>
            </article>

            {/* Column 3: Decryption Oracle */}
            <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-(--border) bg-(--bg)">
              <div className="flex items-center justify-between gap-2 border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
                <span>Adversary / Dec Oracle</span>
              </div>
              <div ref={decOracleChatRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 scroll-smooth">
                 {decOracleChat.map((msg, i) => (
                    <div key={i} className={`max-w-[85%] rounded-lg border px-3 py-2 text-left text-sm ${msg.role === 'adversary' ? 'ml-auto border-(--accent-border) bg-(--accent-bg) text-(--text-h)' : 'mr-auto border-(--border) bg-(--bg) text-(--text)'}`}>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">{msg.role}</p>
                        <p className={`whitespace-pre-wrap break-all font-mono text-xs leading-relaxed ${msg.text.includes('Error') || msg.text.includes('REJECTED') ? 'text-rose-400' : ''}`}>{msg.text}</p>
                    </div>
                 ))}
              </div>
              
              <div className="border-t border-dashed border-(--border) px-3 py-3">
                 <div className="rounded-md border border-(--border) bg-(--bg) p-3 text-left flex flex-col justify-end h-full">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">Submit Decryption Query</h4>
                    <div className="flex flex-col gap-2">
                        <input
                            className="rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none focus:border-(--accent-border)"
                            value={decQueryR} onChange={(e) => setDecQueryR(e.target.value)} placeholder="r_hex" disabled={loading || !sessionId}
                        />
                        <input
                            className="rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none focus:border-(--accent-border)"
                            value={decQueryC} onChange={(e) => setDecQueryC(e.target.value)} placeholder="c_hex" disabled={loading || !sessionId}
                        />
                        <input
                            className="rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none focus:border-(--accent-border)"
                            value={decQueryTag} onChange={(e) => setDecQueryTag(e.target.value)} placeholder="tag_hex" disabled={loading || !sessionId}
                        />
                        <Btn onClick={handleDecQuery} disabled={loading || !sessionId}>
                            Ask Dec Oracle
                        </Btn>
                    </div>
                 </div>
              </div>
            </article>

          </div>
        </section>
      </section>
    </main>
  )
}
