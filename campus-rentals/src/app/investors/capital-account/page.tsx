'use client'

import { Fragment, useEffect, useState } from 'react'

// Campus Rentals brand accent (tailwind config: accent #54AAB1, primary #6F898B)
const ACCENT = '#54AAB1'

type Metrics = {
  totalContributed: number
  totalDistributed: number
  currentValue: number
  unreturnedCapital: number
  moic: number | null
  tvpi: number | null
  dpi: number | null
  rvpi: number | null
  irr: number | null
  cashOnCash: number | null
}
type LedgerEntry = { type: string; amount: number; date: string }
type Account = {
  propertyId: string
  propertyName: string
  address: string | null
  dealStatus: string | null
  ownershipPercent: number
  metrics: Metrics
  ledger: LedgerEntry[]
}
type Payload = { asOf: string; consolidated: Metrics; accounts: Account[] }

const usd = (n: number | null | undefined) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const pct = (n: number | null | undefined) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`)
const mult = (n: number | null | undefined) => (n == null ? '—' : `${n.toFixed(2)}x`)
const dateFmt = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

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

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export default function CapitalAccountPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const downloadStatement = async () => {
    setDownloading(true)
    try {
      const res = await fetch('/api/investors/statements/download', {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!res.ok) throw new Error(`Statement failed (${res.status})`)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      window.open(objectUrl, '_blank')
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate statement')
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/investors/capital-account', {
          headers: { Authorization: `Bearer ${token()}` },
        })
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const json = (await res.json()) as Payload
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load capital account')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <div className="p-8 text-gray-500">Loading your capital account…</div>
  }
  if (error) {
    return <div className="p-8 text-red-600">{error}</div>
  }
  if (!data || data.accounts.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">My Capital Account</h1>
        <p className="mt-2 text-gray-500">No investment positions found yet.</p>
      </div>
    )
  }

  const c = data.consolidated
  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Capital Account</h1>
          <span className="text-xs text-gray-400">as of {dateFmt(data.asOf)}</span>
        </div>
        <button
          onClick={downloadStatement}
          disabled={downloading}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          style={{ backgroundColor: ACCENT }}
        >
          {downloading ? 'Generating…' : 'Download statement (PDF)'}
        </button>
      </div>

      {/* Consolidated summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Contributed" value={usd(c.totalContributed)} />
        <Kpi label="Distributed" value={usd(c.totalDistributed)} />
        <Kpi label="Unreturned capital" value={usd(c.unreturnedCapital)} />
        <Kpi label="Current value" value={usd(c.currentValue)} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl p-5 text-white shadow-sm" style={{ backgroundColor: ACCENT }}>
          <p className="text-xs font-medium uppercase tracking-wider opacity-90">Net IRR</p>
          <p className="mt-1 text-2xl font-bold">{pct(c.irr)}</p>
        </div>
        <Kpi label="Equity multiple (TVPI)" value={mult(c.tvpi)} hint={`DPI ${mult(c.dpi)} · RVPI ${mult(c.rvpi)}`} />
        <Kpi label="DPI (realized)" value={mult(c.dpi)} />
        <Kpi label="Cash-on-cash (TTM)" value={pct(c.cashOnCash)} />
      </div>

      {/* Per-deal accounts */}
      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wider text-gray-500">
        Holdings ({data.accounts.length})
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3 text-right">Own %</th>
              <th className="px-4 py-3 text-right">Contributed</th>
              <th className="px-4 py-3 text-right">Distributed</th>
              <th className="px-4 py-3 text-right">Current value</th>
              <th className="px-4 py-3 text-right">IRR</th>
              <th className="px-4 py-3 text-right">Mult.</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.accounts.map((a) => (
              <>
                <tr key={a.propertyId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{a.propertyName}</div>
                    {a.address && <div className="text-xs text-gray-400">{a.address}</div>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{a.ownershipPercent}%</td>
                  <td className="px-4 py-3 text-right text-gray-700">{usd(a.metrics.totalContributed)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{usd(a.metrics.totalDistributed)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{usd(a.metrics.currentValue)}</td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: ACCENT }}>
                    {pct(a.metrics.irr)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{mult(a.metrics.tvpi)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setOpenId(openId === a.propertyId ? null : a.propertyId)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-800"
                    >
                      {openId === a.propertyId ? 'Hide' : 'Ledger'}
                    </button>
                  </td>
                </tr>
                {openId === a.propertyId && (
                  <tr key={`${a.propertyId}-ledger`} className="bg-gray-50">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="text-xs text-gray-500">
                        {a.ledger.length === 0 ? (
                          'No transactions recorded.'
                        ) : (
                          <table className="min-w-full">
                            <tbody>
                              {a.ledger.map((l, i) => (
                                <tr key={i}>
                                  <td className="py-1 pr-4 text-gray-400">{dateFmt(l.date)}</td>
                                  <td className="py-1 pr-4">
                                    <span
                                      className={
                                        l.type === 'DISTRIBUTION' ? 'text-green-700' : 'text-gray-700'
                                      }
                                    >
                                      {l.type === 'DISTRIBUTION' ? 'Distribution' : 'Contribution'}
                                    </span>
                                  </td>
                                  <td className="py-1 text-right font-medium text-gray-800">
                                    {l.type === 'DISTRIBUTION' ? '+' : '−'}
                                    {usd(l.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Figures derived from your recorded contributions, distributions, and current property
        valuations. IRR is a true XIRR over dated cash flows. Distributions are paid outside this
        portal; this is your statement of record.
      </p>
    </div>
  )
}
