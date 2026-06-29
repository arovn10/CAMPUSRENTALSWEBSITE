'use client'

import { useEffect, useState, useCallback } from 'react'

const ACCENT = '#54AAB1'

type Commitment = {
  id: string
  amount: number
  committedAt: string
  status: string
  dealName: string | null
  note: string | null
}
type Call = {
  responseId: string
  capitalCallId: string
  dealName: string
  amountCalled: number
  status: string
  dueDate: string | null
  issuedAt: string
  description: string | null
  acknowledgedAt: string | null
  fundedAt: string | null
}

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
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

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACKNOWLEDGED: 'bg-sky-100 text-sky-700',
  FUNDED: 'bg-emerald-100 text-emerald-700',
  DECLINED: 'bg-rose-100 text-rose-700',
}

export default function CapitalCallsPage() {
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [totalCommitted, setTotalCommitted] = useState(0)
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${token()}` }
      const [cRes, kRes] = await Promise.all([
        fetch('/api/investors/commitments', { headers }),
        fetch('/api/investors/capital-calls', { headers }),
      ])
      if (cRes.ok) {
        const c = await cRes.json()
        setCommitments(c.commitments || [])
        setTotalCommitted(c.totalCommitted || 0)
      }
      if (kRes.ok) {
        const k = await kRes.json()
        setCalls(k.calls || [])
      }
    } catch {
      setError('Failed to load commitments and capital calls')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const respond = async (call: Call, action: 'ACKNOWLEDGE' | 'FUND') => {
    setBusy(call.responseId)
    try {
      const res = await fetch(`/api/investors/capital-calls/${call.capitalCallId}/respond`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error()
      await load()
    } catch {
      setError('Could not update the capital call')
    } finally {
      setBusy(null)
    }
  }

  const totalCalled = calls.reduce((s, c) => s + c.amountCalled, 0)
  const totalFunded = calls.filter((c) => c.status === 'FUNDED').reduce((s, c) => s + c.amountCalled, 0)

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-gray-900">Commitments &amp; Capital Calls</h1>
      <p className="mt-1 text-sm text-gray-500">Your committed capital, what has been called, and what you’ve funded.</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total committed</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{usd(totalCommitted)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total called</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{usd(totalCalled)}</p>
        </div>
        <div className="rounded-2xl p-5 text-white shadow-sm" style={{ backgroundColor: ACCENT }}>
          <p className="text-xs font-medium uppercase tracking-wider opacity-90">Total funded</p>
          <p className="mt-1 text-2xl font-bold">{usd(totalFunded)}</p>
        </div>
      </div>

      {/* Capital calls */}
      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wider text-gray-500">Capital calls</h2>
      {calls.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No capital calls.</p>
      ) : (
        <div className="space-y-3">
          {calls.map((c) => (
            <div key={c.responseId} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{c.dealName}</span>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[c.status] || 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Called {usd(c.amountCalled)} · issued {dateFmt(c.issuedAt)} · due {dateFmt(c.dueDate)}
                  </p>
                  {c.description && <p className="mt-1 text-sm text-gray-600">{c.description}</p>}
                </div>
                <div className="flex gap-2">
                  {c.status === 'PENDING' && (
                    <button
                      onClick={() => respond(c, 'ACKNOWLEDGE')}
                      disabled={busy === c.responseId}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Acknowledge
                    </button>
                  )}
                  {c.status !== 'FUNDED' && c.status !== 'DECLINED' && (
                    <button
                      onClick={() => respond(c, 'FUND')}
                      disabled={busy === c.responseId}
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      style={{ backgroundColor: ACCENT }}
                    >
                      I’ve funded this
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Commitments */}
      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wider text-gray-500">Commitments</h2>
      {commitments.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No commitments recorded.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Deal</th>
                <th className="px-4 py-3 text-right">Committed</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {commitments.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-gray-900">{c.dealName ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{usd(c.amount)}</td>
                  <td className="px-4 py-3 text-gray-500">{dateFmt(c.committedAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${c.status === 'ACTIVE' ? 'bg-sky-100 text-sky-700' : c.status === 'FULFILLED' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
