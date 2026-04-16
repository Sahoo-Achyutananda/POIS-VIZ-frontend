import { useMemo, useState } from 'react'
import api from '../../lib/api'
import { useEffect, useRef } from 'react'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'

function getErrorText(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (typeof error?.message === 'string') return error.message
  return 'Request failed'
}

function CPAAttack() {
    const chatRef = useRef(null)
	const oracleChatRef = useRef(null)
	const [mode, setMode] = useState('secure')
	const [m0, setM0] = useState('attack-left-message')
	const [m1, setM1] = useState('attack-rght-message')
	const [oracleMessage, setOracleMessage] = useState('attack-left-message')
	const [rounds, setRounds] = useState(0)
	const [wins, setWins] = useState(0)
	const [chat, setChat] = useState([
		{
			id: 'intro',
			role: 'challenger',
			text: 'Welcome to IND-CPA game. Send m0 and m1 (equal length) to start a round.',
		},
	])
	const [oracleChat, setOracleChat] = useState([
		{
			id: 'oracle-intro',
			role: 'oracle',
			text: 'Encryption oracle is ready. Send a message query to get Enc(m).',
		},
	])

	const winRate = rounds > 0 ? wins / rounds : 0
	const runningAdvantage = Math.abs(winRate - 0.5)

	const statusTone = useMemo(() => {
		if (runningAdvantage <= 0.1) return 'text-emerald-300'
		if (runningAdvantage <= 0.25) return 'text-amber-300'
		return 'text-rose-300'
	}, [runningAdvantage])

    const [sessionId, setSessionId] = useState('')
    const [roundId, setRoundId] = useState('')
    const [awaitingGuess, setAwaitingGuess] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

	const handleSendChallengePair = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await api.post('/api/pa3/cpa/start', {
                session_id: sessionId || null,
                m0,
                m1,
                reuse_nonce: mode === 'broken',
            })

            const data = res.data
            setSessionId(data.session_id)
            setRoundId(data.round_id)
            setRounds(data.rounds_played)
            setWins(data.wins)
            setAwaitingGuess(true)

            setChat((prev) => [
            ...prev,
            { id: `a-${prev.length + 1}` , role: 'adversary', text: `m0="${m0}" | m1="${m1}"`},
            {
                id: `c-${prev.length + 2}`,
                role: 'challenger',
				text: `C*: r=${data.challenge.r}, c=${data.challenge.c}`,
            },
            ])
        } catch (err) {
            setError(getErrorText(err))
        } finally {
            setLoading(false)
        }
    }

	const handleGuess = async (guess) => {
        if (!sessionId || !roundId || !awaitingGuess) return
        setLoading(true)
        setError('')
        try {
            const res = await api.post('/api/pa3/cpa/guess', {
            session_id: sessionId,
            round_id: roundId,
            guess,
            })

            const data = res.data
            setRounds(data.rounds_played)
            setWins(data.wins)
            setAwaitingGuess(false)
            setRoundId('')

            setChat((prev) => [
            ...prev,
            { id: `a-${prev.length + 1}`, role: 'adversary', text: `Guess b' = ${guess}` },
            {
                id: `c-${prev.length + 2}`,
                role: 'challenger',
                text: `b=${data.revealed_b}, ${data.correct ? 'correct' : 'incorrect'}, adv=${data.advantage.toFixed(3)}`,
            },
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
		setOracleMessage('attack-left-message')
		setSessionId('')
		setRoundId('')
		setAwaitingGuess(false)
		setError('')
		setChat([
			{
				id: 'intro',
				role: 'challenger',
				text: 'Session reset. Send m0 and m1 to begin again.',
			},
		])
		setOracleChat([
			{
				id: 'oracle-intro',
				role: 'oracle',
				text: 'Session reset. Send a message query to the encryption oracle.',
			},
		])
	}

	const handleOracleQuery = async () => {
		if (!sessionId || !roundId || !awaitingGuess) return
		if (!oracleMessage || oracleMessage.length === 0) return

		setLoading(true)
		setError('')
		try {
			const res = await api.post('/api/pa3/cpa/oracle', {
				session_id: sessionId,
				round_id: roundId,
				message: oracleMessage,
			})

			const data = res.data
			setOracleChat((prev) => [
				...prev,
				{ id: `oa-${prev.length + 1}`, role: 'adversary', text: `Query m="${oracleMessage}"` },
				{
					id: `oo-${prev.length + 2}`,
					role: 'oracle',
					text: `Enc(m): r=${data.oracle.r}, c=${data.oracle.c}`,
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
				<PageHeader title="CS8.401 Minicrypt Clique Explorer - PA3: IND-CPA Chat Demo" />

				<section className="mb-3 rounded-lg border border-(--border) bg-(--code-bg) px-3 py-3 text-left">
					<div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
						<p className="font-mono text-(--text)"><strong className="text-(--text-h)">Mode:</strong> {mode}</p>
						<p className="font-mono text-(--text)"><strong className="text-(--text-h)">Rounds:</strong> {rounds}</p>
						<p className="font-mono text-(--text)"><strong className="text-(--text-h)">Wins:</strong> {wins}</p>
						<p className="font-mono text-(--text)"><strong className="text-(--text-h)">Win rate:</strong> {winRate.toFixed(3)}</p>
						<p className={`font-mono ${statusTone}`}><strong className="text-(--text-h)">Adv:</strong> {runningAdvantage.toFixed(3)}</p>
					</div>
				</section>

				<section className="flex h-[75vh] min-h-0 flex-col overflow-hidden rounded-lg border border-(--border) bg-(--bg)">
					<div className="grid min-h-0 flex-1 grid-cols-1 gap-3 border-b border-dashed border-(--border) bg-(--code-bg) px-3 py-3 lg:grid-cols-2">
						<article className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-(--border) bg-(--bg)">
							<div className="flex items-center justify-between gap-2 border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
								<span>Adversary / Challenger</span>
								<span
									className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
										awaitingGuess
											? 'border-emerald-300/80 bg-emerald-300/20 text-emerald-200'
											: 'border-yellow-300/80 bg-yellow-300/20 text-yellow-200'
									}`}
								>
									({awaitingGuess ? 'Guess' : 'Send Message'})
								</span>
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
										<p className="break-all font-mono text-xs leading-relaxed">{item.text}</p>
									</div>
								))}
								{error ? <p className="mt-3 text-left text-sm text-[#ff8aa1]">{error}</p> : null}
							</div>
							<div className="border-t border-dashed border-(--border) px-3 py-3">
								{!awaitingGuess ? (
									<div className="rounded-md border border-(--border) bg-(--bg) p-3">
										<h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">Send m0 and m1</h4>
										<div className="grid gap-2">
											<input
												className="rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
												value={m0}
												onChange={(e) => setM0(e.target.value)}
												placeholder="m0"
												disabled={loading || awaitingGuess}
											/>
											<input
												className="rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
												value={m1}
												onChange={(e) => setM1(e.target.value)}
												placeholder="m1"
												disabled={loading || awaitingGuess}
											/>
											<Btn onClick={handleSendChallengePair} disabled={loading || awaitingGuess}>
												Send Pair
											</Btn>
										</div>
									</div>
								) : (
									<div className="rounded-md border border-(--border) bg-(--bg) p-3">
										<h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">Guess b</h4>
										<div className="flex flex-wrap gap-2">
											<Btn onClick={() => handleGuess(0)} disabled={loading || !awaitingGuess}>
												Guess 0
											</Btn>
											<Btn onClick={() => handleGuess(1)} disabled={loading || !awaitingGuess}>
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

						<article className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-(--border) bg-(--bg)">
							<div className="border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
								Adversary / Encryption Oracle
							</div>
							<div
								ref={oracleChatRef}
								className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 scroll-smooth"
							>
								{oracleChat.map((item) => (
									<div
										key={item.id}
										className={`max-w-[85%] rounded-lg border px-3 py-2 text-left text-sm ${
											item.role === 'adversary'
												? 'ml-auto border-(--accent-border) bg-(--accent-bg) text-(--text-h)'
												: 'mr-auto border-(--border) bg-(--bg) text-(--text)'
										}`}
									>
										<p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">{item.role}</p>
										<p className="break-all font-mono text-xs leading-relaxed">{item.text}</p>
									</div>
								))}
							</div>
							<div className="border-t border-dashed border-(--border) px-3 py-3">
								<div className="flex flex-wrap items-center gap-2">
									<input
										className="w-64 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
										value={oracleMessage}
										onChange={(e) => setOracleMessage(e.target.value)}
										placeholder="oracle query message"
										disabled={loading || !awaitingGuess}
									/>
									<Btn onClick={handleOracleQuery} disabled={loading || !awaitingGuess}>
										Ask Oracle
									</Btn>
								</div>
							</div>
						</article>
					</div>
				</section>
			</section>
		</main>
	)
}

export default CPAAttack
