import { shortHex } from './utils'
import FlowCanvas from '../../components/flow/FlowCanvas'

/**
 * Conversion flow graph section with encrypt/decrypt tab switcher.
 *
 * @param {{
 *   flowTab: string,
 *   setFlowTab: function,
 *   activeGraph: { nodes: object[], edges: object[] },
 *   graphNodeTypes: object,
 *   loading: boolean,
 *   isTooLong: boolean,
 *   ciphertextHex: string,
 *   decryptCiphertextHex: string,
 *   setDecryptCiphertextHex: function,
 *   decryptedText: string,
 *   encryptMeta: object|null,
 *   decryptMeta: object|null,
 *   onEncrypt: function,
 *   onDecrypt: function,
 * }} props
 */
export default function FlowSection({
  flowTab,
  setFlowTab,
  activeGraph,
  graphNodeTypes,
  loading,
  isTooLong,
  ciphertextHex,
  decryptCiphertextHex,
  setDecryptCiphertextHex,
  decryptedText,
  encryptMeta,
  decryptMeta,
  onEncrypt,
  onDecrypt,
}) {
  return (
    <article className="mt-3 rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
      <div className="flex items-center justify-between gap-2 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2">
        <h3 className="m-0 text-left text-sm font-semibold text-(--text-h)">
          Conversion Flow Graph
        </h3>
        <div className="inline-flex rounded-md border border-(--border) bg-(--bg) p-1">
          <button
            type="button"
            onClick={() => setFlowTab('encrypt')}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
              flowTab === 'encrypt' ? 'bg-(--accent-bg) text-(--text-h)' : 'text-(--text) hover:bg-(--social-bg)'
            }`}
          >
            Encrypt
          </button>
          <button
            type="button"
            onClick={() => setFlowTab('decrypt')}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
              flowTab === 'decrypt' ? 'bg-(--accent-bg) text-(--text-h)' : 'text-(--text) hover:bg-(--social-bg)'
            }`}
          >
            Decrypt
          </button>
        </div>
      </div>

      <div className="grid gap-2 border-b border-dashed border-(--border) px-3 py-3 text-left">
        {flowTab === 'encrypt' ? (
          <>
            <p className="text-xs text-(--text)">
              Encrypt tab uses your current message and mode to generate ciphertext via backend.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onEncrypt}
                disabled={loading || isTooLong}
                className="rounded-md border border-(--accent-border) bg-(--accent-bg) px-3 py-1 text-xs font-semibold text-(--text-h) transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? 'Running...' : 'Encrypt'}
              </button>
              <span className="text-xs text-(--text)">Ciphertext: {shortHex(ciphertextHex)}</span>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-(--text)">
              Decrypt tab keeps encryption data intact and decrypts whichever ciphertext you provide.
            </p>
            <label className="flex items-center justify-between gap-3 text-xs font-semibold text-(--text-h)">
              Ciphertext (hex):
              <input
                className="w-120 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
                value={decryptCiphertextHex}
                onChange={(e) => setDecryptCiphertextHex(e.target.value.trim())}
                placeholder={ciphertextHex || 'Paste ciphertext to decrypt'}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onDecrypt}
                disabled={loading || !(decryptCiphertextHex || ciphertextHex)}
                className="rounded-md border border-(--accent-border) bg-(--accent-bg) px-3 py-1 text-xs font-semibold text-(--text-h) transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? 'Running...' : 'Decrypt'}
              </button>
              <span className="text-xs text-(--text)">Plaintext: {decryptedText || '[empty]'}</span>
            </div>
          </>
        )}
        {flowTab === 'encrypt' && encryptMeta ? (
          <p className="text-xs text-(--text)">
            Encrypt steps loaded: plaintext blocks {encryptMeta.plaintextBlocks.length}, ciphertext blocks {encryptMeta.ciphertextBlocks.length}, per-block steps {encryptMeta.steps.length}.
          </p>
        ) : null}
        {flowTab === 'decrypt' && decryptMeta ? (
          <p className="text-xs text-(--text)">
            Decrypt steps loaded: plaintext blocks {decryptMeta.plaintextBlocks.length}, ciphertext blocks {decryptMeta.ciphertextBlocks.length}, per-block steps {decryptMeta.steps.length}.
          </p>
        ) : null}
      </div>

      <FlowCanvas nodes={activeGraph.nodes} edges={activeGraph.edges} nodeTypes={graphNodeTypes} />
    </article>
  )
}
