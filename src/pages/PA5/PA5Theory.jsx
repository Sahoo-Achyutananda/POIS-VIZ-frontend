import { useState } from 'react'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'

function getErrorText(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (typeof error?.message === 'string') return error.message
  return 'Request failed'
}

export default function PA5Theory() {
  const [mode, setMode] = useState('cbc') // "prf" or "cbc" or "hmac"
  const [messageHex, setMessageHex] = useState('68656c6c6f20776f726c64') // "hello world"
  const [keyHex, setKeyHex] = useState('00112233445566778899aabbccddeeff')
  
  const [tagHex, setTagHex] = useState('')
  const [verifyTagHex, setVerifyTagHex] = useState('')
  const [isValid, setIsValid] = useState(null)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerateMac = async () => {
    if (!messageHex || !keyHex) return
    setLoading(true)
    setError('')
    setIsValid(null)
    try {
      const res = await api.post('/api/pa5/mac', {
        mode,
        key_hex: keyHex,
        message_hex: messageHex,
      })
      if (res.data.error) {
        setError(res.data.error)
        setTagHex('')
        setVerifyTagHex('')
      } else {
        setTagHex(res.data.tag_hex)
        setVerifyTagHex(res.data.tag_hex)
      }
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyMac = async () => {
    if (!verifyTagHex || !messageHex || !keyHex) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/pa5/vrfy', {
        mode,
        key_hex: keyHex,
        message_hex: messageHex,
        tag_hex: verifyTagHex,
      })
      if (res.data.error) {
        setError(res.data.error)
      } else {
        setIsValid(res.data.valid)
      }
    } catch (err) {
      setError(getErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer - PA5: MAC Basics" />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left panel */}
          <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
            <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
              Generation Parameters
            </h3>

            <div className="grid gap-4 p-3 text-left">
              <label className="flex items-center justify-between gap-3 text-sm font-semibold text-(--text-h)">
                Construction:
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-48 rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs outline-none focus:border-(--accent-border)"
                >
                  <option value="prf">PRF-MAC (Fixed len)</option>
                  <option value="cbc">CBC-MAC (Var len)</option>
                  <option value="hmac">HMAC (Stub PA10)</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm font-semibold text-(--text-h)">
                Message (Hex):
                <textarea
                  className="min-h-16 w-full rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs outline-none focus:border-(--accent-border)"
                  value={messageHex}
                  onChange={(e) => setMessageHex(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-semibold text-(--text-h)">
                Key (Hex):
                <input
                  className="w-full rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs outline-none focus:border-(--accent-border)"
                  value={keyHex}
                  onChange={(e) => setKeyHex(e.target.value)}
                />
              </label>

              <Btn onClick={handleGenerateMac} disabled={loading} className="mt-2">
                Generate Tag
              </Btn>

              {error && <p className="text-xs text-[#ff8aa1]">{error}</p>}
            </div>
          </article>

          {/* Right panel */}
          <article className="rounded-lg border border-(--border) bg-(--bg) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent-border) hover:shadow-(--shadow)">
            <h3 className="m-0 rounded-t-lg border-b border-(--border) bg-(--accent-bg) px-3 py-2 text-left text-sm font-semibold text-(--text-h)">
              Tag Synthesis & Verification
            </h3>

            <div className="grid gap-4 p-3 text-left">
              <div className="rounded-md border border-dashed border-(--border) bg-(--code-bg) p-3">
                <p className="mb-2 text-xs font-semibold text-(--text-h)">Generated MAC Tag:</p>
                <div className="break-all font-mono text-sm text-(--accent-color)">
                  {tagHex || '[No tag generated yet]'}
                </div>
              </div>

              <label className="mt-4 flex flex-col gap-1 text-sm font-semibold text-(--text-h)">
                Target Verification Tag (Hex):
                <input
                  className="w-full rounded-md border border-(--border) bg-(--bg) px-2 py-1 font-mono text-xs outline-none focus:border-(--accent-border)"
                  value={verifyTagHex}
                  onChange={(e) => setVerifyTagHex(e.target.value)}
                />
              </label>

              <Btn onClick={handleVerifyMac} disabled={loading || !verifyTagHex} className="mt-2">
                Verify Vrfy(k, m, tag)
              </Btn>

              {isValid !== null && (
                <div className={`mt-2 rounded border p-3 text-sm font-semibold ${isValid ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-rose-500 bg-rose-500/10 text-rose-400'}`}>
                  Verification {isValid ? 'SUCCEEDED. Tag is valid.' : 'FAILED. Tag is invalid or mismatched.'}
                </div>
              )}
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}
