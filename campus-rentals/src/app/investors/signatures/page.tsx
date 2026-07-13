'use client'

import { useEffect, useState, useCallback } from 'react'

type SigRequest = {
  id: string
  documentId: string
  documentTitle: string
  status: 'PENDING' | 'SIGNED' | 'DECLINED'
  signerName: string | null
  signedAt: string | null
  createdAt: string
}

const dateFmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

function token() {
  if (typeof window === 'undefined') return ''
  return (
    sessionStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    ''
  )
}

export default function SignaturesPage() {
  const [requests, setRequests] = useState<SigRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signingId, setSigningId] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/investors/signatures', { headers: { Authorization: `Bearer ${token()}` } })
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch {
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sign = async (id: string) => {
    if (nameInput.trim().length < 2) {
      setError('Type your full legal name to sign.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/investors/signatures/${id}/sign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SIGN', signatureText: nameInput.trim() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Could not sign')
      }
      setSigningId(null)
      setNameInput('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const pending = requests.filter((r) => r.status === 'PENDING')
  const completed = requests.filter((r) => r.status !== 'PENDING')

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Documents to Sign</h1>
      <p className="mt-1 text-sm text-ink-500">Review and sign documents that require your signature.</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-ink-400">Awaiting your signature</h2>
      {pending.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-ink-500 shadow-soft ring-1 ring-ink-900/5">Nothing to sign right now.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ink-900/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">{r.documentTitle}</p>
                  <p className="text-xs text-ink-400">Requested {dateFmt(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/investors/documents/${r.documentId}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 transition-colors"
                  >
                    Review
                  </a>
                  <button
                    onClick={() => {
                      setSigningId(signingId === r.id ? null : r.id)
                      setNameInput('')
                      setError(null)
                    }}
                    className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-[#4b9ba2] transition-colors"
                  >
                    {signingId === r.id ? 'Cancel' : 'Sign'}
                  </button>
                </div>
              </div>
              {signingId === r.id && (
                <div className="mt-4 border-t border-ink-100 pt-4">
                  <label className="block text-sm font-medium text-ink-700">
                    Type your full legal name to sign
                  </label>
                  <p className="mb-2 text-xs text-ink-400">
                    By typing your name and clicking Sign, you agree this constitutes your electronic signature.
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Full legal name"
                      className="flex-1 rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                    <button
                      onClick={() => sign(r.id)}
                      disabled={busy}
                      className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-[#4b9ba2] transition-colors disabled:opacity-60"
                    >
                      {busy ? 'Signing…' : 'Sign'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-ink-400">History</h2>
          <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-ink-900/5">
            <table className="min-w-full divide-y divide-ink-100 text-sm">
              <tbody className="divide-y divide-ink-100">
                {completed.map((r) => (
                  <tr key={r.id} className="hover:bg-ink-50">
                    <td className="px-4 py-3 text-ink-900">{r.documentTitle}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${r.status === 'SIGNED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-ink-500">{dateFmt(r.signedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
