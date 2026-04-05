
import { useMemo, useState } from 'react'
import api from '../../lib/api'
import FlowCanvas from '../../components/flow/FlowCanvas'
import FlowBlockNode, { FLOW_BLOCK_NODE_TYPE } from '../../components/flow/FlowBlockNode'
import { buildPa3DecryptionFlow, buildPa3EncryptionFlow } from '../../conversions/pa3/flow'

function getErrorText(error) {
    const detail = error?.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (typeof error?.message === 'string') return error.message
    return 'Request failed'
}

function generateRandomKeyHex(bytes = 16) {
    const arr = new Uint8Array(bytes)
    if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(arr)
    } else {
        for (let i = 0; i < arr.length; i += 1) {
            arr[i] = Math.floor(Math.random() * 256)
        }
    }
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

function CPAViz() {
    const [encKey, setEncKey] = useState('00112233445566778899aabbccddeeff')
    const [encMessage, setEncMessage] = useState('hello world')
    const [decKey, setDecKey] = useState('00112233445566778899aabbccddeeff')
    const [decNonce, setDecNonce] = useState('1a')
    const [decCiphertext, setDecCiphertext] = useState('7f3a91c2...')
    const [encNonceOut, setEncNonceOut] = useState('')
    const [encCipherOut, setEncCipherOut] = useState('')
    const [decMessageOut, setDecMessageOut] = useState('')
    const [encLoading, setEncLoading] = useState(false)
    const [decLoading, setDecLoading] = useState(false)
    const [error, setError] = useState('')
    const [activeGraphTab, setActiveGraphTab] = useState('encryption')

    const encryptionFlowGraph = useMemo(
        () => buildPa3EncryptionFlow({
            keyHex: encKey,
            message: encMessage,
            nonce: encNonceOut || decNonce,
            ciphertext: encCipherOut || decCiphertext,
            blockSize: 16,
            queryBits: 8,
        }),
        [encKey, encMessage, encNonceOut, encCipherOut, decNonce, decCiphertext],
    )

    const decryptionFlowGraph = useMemo(
        () => buildPa3DecryptionFlow({
            keyHex: decKey,
            nonce: decNonce,
            ciphertext: decCiphertext,
            plaintext: decMessageOut,
            blockSize: 16,
            queryBits: 8,
        }),
        [decKey, decNonce, decCiphertext, decMessageOut],
    )

    const nodeTypes = useMemo(() => ({ [FLOW_BLOCK_NODE_TYPE]: FlowBlockNode }), [])

    const handleGenerateKey = () => {
        const newKey = generateRandomKeyHex(16)
        setEncKey(newKey)
    }

    // const handleUseEncryptKeyForDecrypt = () => {
    //     setDecKey(encKey)
    // }

    const runEncrypt = async () => {
        setEncLoading(true)
        setError('')
        try {
            const res = await api.post('/api/pa3/encrypt', {
                key_hex: encKey,
                message: encMessage,
            })

            const nonce = res?.data?.r || ''
            const cipher = res?.data?.c || ''
            setEncNonceOut(nonce)
            setEncCipherOut(cipher)

            // Convenience: auto-fill decrypt inputs from encrypt output.
            setDecKey(encKey)
            setDecNonce(nonce)
            setDecCiphertext(cipher)
        } catch (err) {
            setError(getErrorText(err))
        } finally {
            setEncLoading(false)
        }
    }

    const runDecrypt = async () => {
        setDecLoading(true)
        setError('')
        try {
            const res = await api.post('/api/pa3/decrypt', {
                key_hex: decKey,
                r: decNonce,
                c: decCiphertext,
            })
            setDecMessageOut(res?.data?.m || '')
        } catch (err) {
            setError(getErrorText(err))
        } finally {
            setDecLoading(false)
        }
    }

    return (
        <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
            <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--social-bg) px-3 py-2">
                    <strong className="text-sm text-(--text-h)">CS8.401 Minicrypt Clique Explorer - PA3: CPA Basics</strong>
                    <span className="text-xs font-semibold uppercase tracking-wide text-(--text)">Frontend wired for API calls</span>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
                        <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
                            Encryption: Enc(k, m) -&gt; (r, c)
                        </h3>

                        <div className="grid gap-2 p-3 text-left">
                            <label className="flex items-center justify-between gap-3 text-sm font-semibold text-(--text-h)">
                                Key k (hex):
                                <div className="flex items-center gap-2">
                                    <input
                                        className="w-64 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                                        value={encKey}
                                        onChange={(e) => setEncKey(e.target.value)}
                                        placeholder="00112233445566778899aabbccddeeff"
                                    />
                                    <button
                                        type="button"
                                        className="rounded-md border border-(--accent-border) bg-(--accent-bg) px-2 py-1 text-sm font-semibold text-(--text-h) transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow)"
                                        onClick={handleGenerateKey}
                                        title="Generate random key"
                                        aria-label="Generate random key"
                                    >
                                        ↻
                                    </button>
                                    {/* <button
                                        type="button"
                                        className="rounded-md border border-(--border) bg-(--bg) px-2 py-1 text-sm font-semibold text-(--text-h) transition-all duration-200 hover:bg-(--social-bg)"
                                        onClick={handleUseEncryptKeyForDecrypt}
                                        title="Use key in decrypt"
                                        aria-label="Use key in decrypt"
                                    >
                                        Use in Decryption
                                    </button> */}
                                </div>
                            </label>

                            <div className="flex">
                                
                            </div>

                            <label className="flex items-center justify-between gap-3 text-sm font-semibold text-(--text-h)">
                                Message m:
                                <textarea
                                    className="min-h-24 w-74 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                                    value={encMessage}
                                    onChange={(e) => setEncMessage(e.target.value)}
                                    placeholder="Type plaintext here"
                                />
                            </label>

                            <button
                                type="button"
                                className="w-fit rounded-md border border-(--accent-border) bg-(--accent-bg) px-3 py-2 text-sm font-semibold text-(--text-h) transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) disabled:cursor-wait disabled:opacity-60"
                                onClick={runEncrypt}
                                disabled={encLoading}
                            >
                                {encLoading ? 'Encrypting...' : 'Encrypt'}
                            </button>
                        </div>

                        <div className="border-t border-dashed border-(--border) px-3 py-3 text-left">
                            <p className="my-1 font-mono text-xs text-(--text)">
                                <strong className="text-(--text-h)">Input:</strong> k = {encKey || 'N/A'}
                            </p>
                            <p className="my-1 font-mono text-xs text-(--text)">
                                <strong className="text-(--text-h)">Input:</strong> m = {encMessage || 'N/A'}
                            </p>
                            <p className="my-1 font-mono text-xs text-(--text)">
                                <strong className="text-(--text-h)">Output:</strong> r = {encNonceOut || '[nonce will appear here]'}
                            </p>
                            <p className="my-1 font-mono text-xs text-(--text)">
                                <strong className="text-(--text-h)">Output:</strong> c = {encCipherOut || '[ciphertext will appear here]'}
                            </p>
                        </div>
                    </article>

                    <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
                        <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
                            Decryption: Dec(k, r, c) -&gt; m
                        </h3>

                        <div className="grid gap-2 p-3 text-left">
                            <label className="flex items-center justify-between gap-3 text-sm font-semibold text-(--text-h)">
                                Key k (hex):
                                <input
                                    className="w-64 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                                    value={decKey}
                                    onChange={(e) => setDecKey(e.target.value)}
                                    placeholder="00112233445566778899aabbccddeeff"
                                />
                            </label>

                            <label className="flex items-center justify-between gap-3 text-sm font-semibold text-(--text-h)">
                                Nonce r:
                                <input
                                    className="w-64 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                                    value={decNonce}
                                    onChange={(e) => setDecNonce(e.target.value)}
                                    placeholder="1a"
                                />
                            </label>

                            <label className="flex items-center justify-between gap-3 text-sm font-semibold text-(--text-h)">
                                Ciphertext c:
                                <textarea
                                    className="min-h-24 w-64 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                                    value={decCiphertext}
                                    onChange={(e) => setDecCiphertext(e.target.value)}
                                    placeholder="ciphertext hex"
                                />
                            </label>

                            <button
                                type="button"
                                className="w-fit rounded-md border border-(--accent-border) bg-(--accent-bg) px-3 py-2 text-sm font-semibold text-(--text-h) transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) disabled:cursor-wait disabled:opacity-60"
                                onClick={runDecrypt}
                                disabled={decLoading}
                            >
                                {decLoading ? 'Decrypting...' : 'Decrypt'}
                            </button>
                        </div>

                        <div className="border-t border-dashed border-(--border) px-3 py-3 text-left">
                            <p className="my-1 font-mono text-xs text-(--text)">
                                <strong className="text-(--text-h)">Input:</strong> k = {decKey || 'N/A'}
                            </p>
                            <p className="my-1 font-mono text-xs text-(--text)">
                                <strong className="text-(--text-h)">Input:</strong> r = {decNonce || 'N/A'}
                            </p>
                            <p className="my-1 font-mono text-xs text-(--text)">
                                <strong className="text-(--text-h)">Input:</strong> c = {decCiphertext || 'N/A'}
                            </p>
                            <p className="my-1 font-mono text-xs text-(--text)">
                                <strong className="text-(--text-h)">Output:</strong> m = {decMessageOut || '[plaintext will appear here]'}
                            </p>
                        </div>
                    </article>
                </div>

                {error ? <p className="mt-3 text-left text-sm text-[#ff8aa1]">{error}</p> : null}

                <section className="mt-3 overflow-hidden rounded-lg border border-(--border) bg-(--code-bg)">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border) bg-(--bg) px-3 py-2">
                        <h3 className="m-0 text-sm font-bold text-(--text-h)">Flow Visualization</h3>
                        <div className="inline-flex rounded-md border border-(--border) bg-(--bg) p-1">
                            <button
                                type="button"
                                onClick={() => setActiveGraphTab('encryption')}
                                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                                    activeGraphTab === 'encryption'
                                        ? 'bg-(--accent-bg) text-(--text-h)'
                                        : 'text-(--text) hover:bg-(--social-bg)'
                                }`}
                            >
                                Encryption
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveGraphTab('decryption')}
                                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                                    activeGraphTab === 'decryption'
                                        ? 'bg-(--accent-bg) text-(--text-h)'
                                        : 'text-(--text) hover:bg-(--social-bg)'
                                }`}
                            >
                                Decryption
                            </button>
                        </div>
                    </div>

                    {activeGraphTab === 'encryption' ? (
                        <FlowCanvas
                            nodes={encryptionFlowGraph.nodes}
                            edges={encryptionFlowGraph.edges}
                            nodeTypes={nodeTypes}
                        />
                    ) : (
                        <FlowCanvas
                            nodes={decryptionFlowGraph.nodes}
                            edges={decryptionFlowGraph.edges}
                            nodeTypes={nodeTypes}
                        />
                    )}
                </section>
            </section>
        </main>
    )
}

export default CPAViz
