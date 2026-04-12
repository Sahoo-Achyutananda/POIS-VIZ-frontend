import { splitHexIntoBlocks } from '../../conversions/pa4/flow'

/**
 * Component to visualize the IV reuse vulnerability.
 * Displays the ciphertext blocks for two separate messages encrypted
 * with the exact same Key and IV.
 *
 * In CBC mode, identical message prefixes lead to identical ciphertext prefixes.
 * In OFB/CTR mode, the shared keystream means C1^C2 = P1^P2.
 */
export default function IvReuseComparison({
  ciphertextHex1,
  ciphertextHex2,
  message1,
  message2,
  mode,
  loading,
}) {
  const c1Blocks = splitHexIntoBlocks(ciphertextHex1 || '')
  const c2Blocks = splitHexIntoBlocks(ciphertextHex2 || '')

  const maxBlocks = Math.max(c1Blocks.length, c2Blocks.length)
  const isCbc = mode === 'cbc'

  return (
    <article className="flex min-h-64 flex-col rounded-lg border border-[#f43f5e] bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow)">
      <h3 className="m-0 flex items-center justify-between rounded-t-lg border-b border-[#fda4af] bg-[#fff1f2] px-3 py-2 text-left text-sm font-semibold text-[#881337]">
        <span>🚨 IV / Nonce Reuse Vulnerability</span>
        {loading && <span className="text-xs opacity-70">Computing...</span>}
      </h3>

      <div className="p-3">
        <p className="mb-4 text-xs text-(--text)/70">
          When two messages are encrypted with the <strong>exact same Key and IV</strong>, the cryptographic integrity is compromised. 
          {isCbc ? ' In CBC mode, matching plaintext prefixes emit identical ciphertext blocks.' : ' In OFB/CTR mode, the stream cipher collapses, allowing attackers to XOR the ciphertexts to recover plaintext relationships.'}
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Message 1 Column */}
          <div className="rounded-lg border border-(--border) bg-(--bg) p-2 shadow-sm">
            <h4 className="mb-2 border-b border-dashed border-(--border) pb-1 text-xs font-bold text-(--text-h)">
              Message 1 Ciphertext Blocks
            </h4>
            <div className="flex flex-col gap-2">
              {Array.from({ length: Math.max(1, c1Blocks.length) }, (_, i) => {
                const b1 = c1Blocks[i] || ''
                const b2 = c2Blocks[i] || ''
                const isMatch = b1 && b2 && b1 === b2
                const blockHex = b1 || 'No block'

                return (
                  <div
                    key={`c1-${i}`}
                    className={`rounded border p-2 text-center text-xs font-mono font-semibold transition-colors ${
                      isMatch
                        ? 'border-[#f43f5e] bg-[#ffe4e6] text-[#be123c]'
                        : 'border-(--border) bg-(--social-bg) text-(--text-h)'
                    }`}
                  >
                    <span className="mb-1 block text-[10px] opacity-60">Block C<sub>{i}</sub></span>
                    {blockHex}
                  </div>
                )
              })}
            </div>
            <p className="mt-3 truncate text-[10px] text-(--text)/60">M1: {message1 || '[empty]'}</p>
          </div>

          {/* Message 2 Column */}
          <div className="rounded-lg border border-(--border) bg-(--bg) p-2 shadow-sm">
            <h4 className="mb-2 border-b border-dashed border-(--border) pb-1 text-xs font-bold text-(--text-h)">
              Message 2 Ciphertext Blocks
            </h4>
            <div className="flex flex-col gap-2">
              {Array.from({ length: Math.max(1, c2Blocks.length) }, (_, i) => {
                const b1 = c1Blocks[i] || ''
                const b2 = c2Blocks[i] || ''
                const isMatch = b1 && b2 && b1 === b2
                const blockHex = b2 || 'No block'

                return (
                  <div
                    key={`c2-${i}`}
                    className={`rounded border p-2 text-center text-xs font-mono font-semibold transition-colors ${
                      isMatch
                        ? 'border-[#f43f5e] bg-[#ffe4e6] text-[#be123c]'
                        : 'border-(--border) bg-(--social-bg) text-(--text-h)'
                    }`}
                  >
                    <span className="mb-1 block text-[10px] opacity-60">Block C<sub>{i}</sub></span>
                    {blockHex}
                  </div>
                )
              })}
            </div>
            <p className="mt-3 truncate text-[10px] text-(--text)/60">M2: {message2 || '[empty]'}</p>
          </div>
        </div>

        <div className="mt-5 rounded border border-[#fca5a5] bg-[#fef2f2] p-3 text-xs text-[#991b1b]">
          <strong>Observation:</strong> Any highlighted blocks in red indicate a catastrophic collision caused by IV reuse.
        </div>
      </div>
    </article>
  )
}
