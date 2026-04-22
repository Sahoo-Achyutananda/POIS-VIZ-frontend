import { bytesToHex } from './utils'

/**
 * Ciphertext bit-flip attack grid.
 *
 * Shows the raw bits of the selected CIPHERTEXT block.
 * Clicking any bit flips it in the ciphertext and immediately
 * triggers a decrypt to demonstrate the attack effect.
 */
export default function BitGrid({
  blockBitGrid,
  activeCipherBlock,
  ciphertextHex,
  cipherBlockCount,
  selectedCipherBlock,
  setSelectedCipherBlock,
  decryptedText,
  originalMessage,
  lastFlip,
  loading,
  onFlipBit,
}) {
  const hasCipher = !!ciphertextHex
  const isCorrupted = hasCipher && decryptedText !== '' && decryptedText !== originalMessage

  return (
    <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
      <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
        Ciphertext Bit-Flip Attack Grid
      </h3>

      {!hasCipher ? (
        /* ── Empty state ── */
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
          <span className="text-4xl opacity-60">🔒</span>
          <p className="text-sm font-semibold text-(--text-h)">No ciphertext yet</p>
          <p className="max-w-xs text-xs text-(--text)/70">
            Type a message on the left — it encrypts automatically.
            Then click any bit here to flip it and watch the decryption change.
          </p>
        </div>
      ) : (
        <>
          {/* ── Cipher block selector ── */}
          <div className="border-b border-dashed border-(--border) px-3 py-2 text-left">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">
              Select ciphertext block to flip
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: cipherBlockCount }, (_, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setSelectedCipherBlock(idx)}
                  className={`rounded-md border px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                    idx === selectedCipherBlock
                      ? 'border-[#f59e0b] bg-[#78350f]/30 text-[#fbbf24]'
                      : 'border-(--border) bg-(--bg) text-(--text) hover:bg-(--social-bg)'
                  }`}
                >
                  C<sub>{idx}</sub>
                </button>
              ))}
            </div>
          </div>

          {/* ── 128-bit grid ── */}
          <div className="p-3">
            <p className="mb-2 text-xs text-(--text)/60">
              Click a bit to flip it in ciphertext block C<sub>{selectedCipherBlock}</sub> — decryption updates instantly.
            </p>
            <div className="grid grid-cols-16 gap-1">
              {blockBitGrid.map((cell, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => onFlipBit(cell.byteIndex, cell.bitInByte)}
                  disabled={!cell.inRange || loading}
                  title={`C_${cell.block}  byte=${cell.byteIndex}  bit=${cell.bitIndex}`}
                  className={`h-7 rounded border text-[10px] font-mono font-semibold transition-all duration-150 ${
                    !cell.inRange
                      ? 'cursor-not-allowed border-(--border) bg-(--social-bg) text-(--text)/20'
                      : loading
                        ? 'cursor-wait opacity-50'
                        : cell.bitValue === '1'
                          ? 'cursor-pointer border-[#f59e0b] bg-[#78350f]/40 text-[#fbbf24] hover:-translate-y-0.5 hover:shadow-sm'
                          : 'cursor-pointer border-(--border) bg-(--bg) text-(--text) hover:bg-(--social-bg) hover:-translate-y-0.5'
                  }`}
                >
                  {cell.bitValue}
                </button>
              ))}
            </div>
          </div>

          {/* ── Info panel ── */}
          <div className="space-y-1 border-t border-dashed border-(--border) px-3 py-3 text-left">
            <p className="my-1 break-all font-mono text-xs text-(--text)">
              <strong className="text-(--text-h)">Block C<sub>{selectedCipherBlock}</sub> (hex):</strong>{' '}
              {bytesToHex(activeCipherBlock) || '[empty]'}
            </p>
            <p className="my-1 break-all font-mono text-xs text-(--text)">
              <strong className="text-(--text-h)">Full ciphertext:</strong>{' '}
              {ciphertextHex}
            </p>
            <p className="my-1 font-mono text-xs text-(--text)">
              <strong className="text-(--text-h)">Original message:</strong>{' '}
              {originalMessage || '[empty]'}
            </p>
            <p className="my-1 font-mono text-xs">
              <strong className="text-(--text-h)">Decrypted result:</strong>{' '}
              <span className={
                !decryptedText
                  ? 'text-(--text)/50'
                  : isCorrupted
                    ? 'font-semibold text-[#f87171]'
                    : 'font-semibold text-[#34d399]'
              }>
                {decryptedText || '[not yet decrypted]'}
              </span>
              {isCorrupted && (
                <span className="ml-2 text-[10px] text-[#f87171]/80">⚠ corrupted by bit-flip</span>
              )}
            </p>
            {lastFlip ? (
              <p className="my-1 font-mono text-xs text-(--text)">
                <strong className="text-(--text-h)">Last flip:</strong>{' '}
                C<sub>{lastFlip.block}</sub> byte {lastFlip.byte} bit {lastFlip.bit}:{' '}
                <span className="text-[#f59e0b]">{lastFlip.from} → {lastFlip.to}</span>
              </p>
            ) : null}
          </div>
        </>
      )}
    </article>
  )
}
