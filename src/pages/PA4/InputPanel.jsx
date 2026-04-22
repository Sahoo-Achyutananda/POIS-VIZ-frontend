/**
 * Left panel: mode/message/key/IV inputs + manual encrypt/decrypt buttons.
 *
 * Auto-encryption is handled by the parent via a debounced useEffect;
 * the buttons here serve as "force encrypt / force decrypt" overrides.
 */
export default function InputPanel({
  mode, setMode,
  message, setMessage,
  keyHex, setKeyHex,
  ivHex, setIvHex,
  sourceBytes,
  MAX_BYTES,
  loading,
  isTooLong,
  error,
  isIvReuseMode,
  message2,
  setMessage2,
}) {
  return (
    <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
      <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
        Input Parameters
      </h3>

      <div className="grid gap-2 p-3 text-left">
        <label className="flex items-center justify-between gap-3 text-sm font-semibold text-(--text-h)">
          Mode:
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-64 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
          >
            <option value="cbc">CBC</option>
            <option value="ofb">OFB</option>
            <option value="ctr">CTR</option>
          </select>
        </label>

        <div className="flex items-start gap-4">
          <label className="flex flex-1 flex-col justify-between gap-1 text-sm font-semibold text-(--text-h)">
            Message 1 (max 64 bytes):
            <textarea
              className="min-h-24 w-full rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type message here — encrypts automatically"
            />
          </label>

          {isIvReuseMode && (
            <label className="flex flex-1 flex-col justify-between gap-1 text-sm font-semibold text-(--text-h)">
              Message 2 (for IV Reuse):
              <textarea
                className="min-h-24 w-full rounded-md border border-[#f43f5e] bg-[#fff1f2]/10 px-2 py-1 font-mono text-xs text-[#be123c] outline-none transition-colors focus:border-[#be123c]"
                value={message2}
                onChange={(e) => setMessage2(e.target.value)}
                placeholder="Type second message"
              />
            </label>
          )}
        </div>

        <label className="flex items-center justify-between gap-3 text-sm font-semibold text-(--text-h)">
          Key (hex, 16 bytes):
          <input
            className="w-74 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
            value={keyHex}
            onChange={(e) => setKeyHex(e.target.value.trim())}
            placeholder="00112233445566778899aabbccddeeff"
          />
        </label>

        <label className="flex items-center justify-between gap-3 text-sm font-semibold text-(--text-h)">
          IV/nonce (hex, 16 bytes):
          <input
            className="w-74 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs text-(--text-h) outline-none transition-colors focus:border-(--accent-border)"
            value={ivHex}
            onChange={(e) => setIvHex(e.target.value.trim())}
            placeholder="0102030405060708090a0b0c0d0e0f10"
          />
        </label>

        {/* Stats */}
        <div className="rounded-md border border-dashed border-(--border) bg-(--code-bg) px-3 py-2 text-xs font-mono text-(--text)">
          <p>
            <strong className="text-(--text-h)">Byte length:</strong>{' '}
            <span className={isTooLong ? 'text-[#f87171]' : ''}>
              {sourceBytes.length} / {MAX_BYTES}
            </span>
          </p>
          {/* <p className="mt-1 text-(--text)/60">
            💡 Encrypts automatically 0.8 s after you stop typing.
            Use the buttons below to force an immediate update.
          </p> */}
        </div>

        {/* Manual action buttons */}
        {/* <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEncrypt}
            disabled={loading || isTooLong}
            className="rounded-md border border-(--accent-border) bg-(--accent-bg) px-3 py-1 text-xs font-semibold text-(--text-h) transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? 'Working…' : '↺ Encrypt now'}
          </button>
          <button
            type="button"
            onClick={onDecrypt}
            disabled={loading || !decryptCiphertextHex}
            className="rounded-md border border-(--border) bg-(--bg) px-3 py-1 text-xs font-semibold text-(--text-h) transition-all duration-200 hover:bg-(--social-bg) disabled:cursor-not-allowed disabled:opacity-60"
          >
            ↺ Decrypt now
          </button>
        </div> */}

        {error ? <p className="text-sm text-[#ff8aa1]">{error}</p> : null}

        {isTooLong ? (
          <p className="text-sm text-[#ff8aa1]">
            Message exceeds {MAX_BYTES} bytes. Please shorten it.
          </p>
        ) : null}
      </div>
    </article>
  )
}
