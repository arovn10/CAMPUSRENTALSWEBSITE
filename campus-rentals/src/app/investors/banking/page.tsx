'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  BanknotesIcon,
  BuildingOffice2Icon,
  DocumentArrowDownIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'

interface AccountMetrics {
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

interface LedgerEntry {
  type: 'CONTRIBUTION' | 'DISTRIBUTION'
  amount: number
  date: string
}

interface Account {
  propertyId: string
  propertyName: string
  address: string | null
  dealStatus: string | null
  ownershipPercent: number
  metrics: AccountMetrics
  ledger: LedgerEntry[]
}

interface Payload {
  asOf: string
  consolidated: AccountMetrics
  accounts: Account[]
}

interface Txn {
  id: string
  propertyId: string
  propertyName: string
  type: 'CONTRIBUTION' | 'DISTRIBUTION'
  amount: number
  date: string
  /** Signed cash flow from the investor's perspective: distributions +, contributions −. */
  signed: number
  /** Cumulative net cash position after this transaction (oldest → newest). */
  balance: number
}

type TypeFilter = 'all' | 'CONTRIBUTION' | 'DISTRIBUTION'

const usd = (n: number | null | undefined) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(n)

const usdSigned = (n: number) =>
  `${n < 0 ? '−' : '+'}${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(n))}`

const usdBalance = (n: number) =>
  `${n < 0 ? '−' : ''}${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(n))}`

const dateFmt = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

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

function Kpi({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string
  value: string
  hint?: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-soft ring-1 ring-ink-900/5">
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-ink-400">{label}</p>
      <p
        className={`mt-2 text-2xl md:text-3xl font-semibold tracking-tight ${
          valueClassName ?? 'text-ink-900'
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  )
}

function TypeChip({ type }: { type: 'CONTRIBUTION' | 'DISTRIBUTION' }) {
  if (type === 'DISTRIBUTION') {
    return (
      <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
        Distribution
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-lg bg-accent/10 px-2 py-1 text-xs font-medium text-ink-700">
      Contribution
    </span>
  )
}

export default function BankingDashboardPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [dealFilter, setDealFilter] = useState<string>('all')
  const [downloading, setDownloading] = useState(false)

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
        if (!cancelled) setError('Failed to load banking data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Flatten every deal's ledger, oldest → newest, and compute the running net
  // cash position (distributions +, contributions −). The balance is a property
  // of the FULL account, so it is computed before any filtering.
  const txns = useMemo<Txn[]>(() => {
    if (!data) return []
    const all = data.accounts.flatMap((a) =>
      a.ledger.map((e, i) => ({
        id: `${a.propertyId}-${e.type}-${e.date}-${i}`,
        propertyId: a.propertyId,
        propertyName: a.propertyName,
        type: e.type,
        amount: e.amount,
        date: e.date,
      }))
    )
    all.sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime())
    let balance = 0
    const withBalance = all.map((t) => {
      const signed = t.type === 'DISTRIBUTION' ? t.amount : -t.amount
      balance += signed
      return { ...t, signed, balance }
    })
    return withBalance.reverse() // newest first for display
  }, [data])

  const visibleTxns = useMemo(
    () =>
      txns.filter(
        (t) =>
          (typeFilter === 'all' || t.type === typeFilter) &&
          (dealFilter === 'all' || t.propertyId === dealFilter)
      ),
    [txns, typeFilter, dealFilter]
  )

  const distributionsByProperty = useMemo(() => {
    if (!data) return []
    return data.accounts
      .filter((a) => a.metrics.totalDistributed > 0)
      .map((a) => ({ id: a.propertyId, name: a.propertyName, total: a.metrics.totalDistributed }))
      .sort((a, b) => b.total - a.total)
  }, [data])

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

  // Client-side CSV of the currently visible ledger (the admin-only
  // /api/investors/export-csv endpoint is a different, portfolio-wide report).
  const exportCsv = () => {
    const rows = [
      ['Date', 'Property', 'Type', 'Amount', 'Running Balance'],
      ...visibleTxns.map((t) => [
        new Date(t.date).toISOString().slice(0, 10),
        t.propertyName,
        t.type === 'DISTRIBUTION' ? 'Distribution' : 'Contribution',
        t.signed.toFixed(2),
        t.balance.toFixed(2),
      ]),
    ]
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'campus-rentals-transactions.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const m = data?.consolidated
  const netPosition = m ? m.totalDistributed - m.totalContributed : 0

  return (
    <div className="mx-auto max-w-6xl space-y-8" style={{ fontFamily: 'var(--font-sans)' }}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink-900">Banking</h1>
          <p className="mt-1 text-[15px] text-ink-500">
            Account overview and transaction history
            {data && <span className="text-ink-400"> · as of {dateFmt(data.asOf)}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={visibleTxns.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-ink-100 px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={downloadStatement}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4b9ba2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            {downloading ? 'Preparing…' : 'Download statement'}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-[15px] text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {/* Account overview — KPI balance strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Total Contributed"
          value={usd(m?.totalContributed ?? 0)}
          hint="Capital invested to date"
        />
        <Kpi
          label="Total Distributed"
          value={usd(m?.totalDistributed ?? 0)}
          valueClassName="text-emerald-600"
          hint="All-time cash received"
        />
        <Kpi
          label="Net Cash Position"
          value={usdBalance(netPosition)}
          valueClassName={netPosition >= 0 ? 'text-emerald-600' : 'text-red-600'}
          hint="Distributed − contributed"
        />
        <Kpi
          label="Current Value"
          value={usd(m?.currentValue ?? 0)}
          hint={m?.dpi != null ? `DPI ${m.dpi.toFixed(2)}x` : 'Unrealized position value'}
        />
      </section>

      {/* Transactions ledger */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-ink-900/5">
        <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <BanknotesIcon className="h-5 w-5 text-ink-400" />
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">Transactions</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['all', 'All'],
                ['CONTRIBUTION', 'Contributions'],
                ['DISTRIBUTION', 'Distributions'],
              ] as [TypeFilter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  typeFilter === value
                    ? 'bg-accent text-white'
                    : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
                }`}
              >
                {label}
              </button>
            ))}
            <select
              value={dealFilter}
              onChange={(e) => setDealFilter(e.target.value)}
              className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-800 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              aria-label="Filter by deal"
            >
              <option value="all">All deals</option>
              {(data?.accounts ?? []).map((a) => (
                <option key={a.propertyId} value={a.propertyId}>
                  {a.propertyName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          {visibleTxns.length === 0 ? (
            <div className="px-6 py-12 text-center text-[15px] font-medium text-ink-500">
              No transactions match this filter. Contributions and distributions will appear here
              once recorded.
            </div>
          ) : (
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-400">
                  <th className="px-5 py-3 font-semibold sm:px-6">Date</th>
                  <th className="px-5 py-3 font-semibold sm:px-6">Property</th>
                  <th className="px-5 py-3 font-semibold sm:px-6">Type</th>
                  <th className="px-5 py-3 text-right font-semibold sm:px-6">Amount</th>
                  <th className="px-5 py-3 text-right font-semibold sm:px-6">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {visibleTxns.map((t) => (
                  <tr key={t.id} className="hover:bg-ink-50">
                    <td className="px-5 py-3 text-[15px] text-ink-700 sm:px-6">{dateFmt(t.date)}</td>
                    <td className="px-5 py-3 text-[15px] font-medium text-ink-900 sm:px-6">
                      {t.propertyName}
                    </td>
                    <td className="px-5 py-3 sm:px-6">
                      <TypeChip type={t.type} />
                    </td>
                    <td
                      className={`px-5 py-3 text-right text-[15px] font-semibold sm:px-6 ${
                        t.type === 'DISTRIBUTION' ? 'text-emerald-600' : 'text-ink-800'
                      }`}
                    >
                      {usdSigned(t.signed)}
                    </td>
                    <td
                      className={`px-5 py-3 text-right text-[15px] font-medium sm:px-6 ${
                        t.balance < 0 ? 'text-red-600' : 'text-ink-900'
                      }`}
                    >
                      {usdBalance(t.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Distributions by property (summary) */}
      {distributionsByProperty.length > 0 && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-ink-900/5">
          <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-4 sm:px-6">
            <BuildingOffice2Icon className="h-5 w-5 text-ink-400" />
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">
              Distributions by property
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px]">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-400">
                  <th className="px-5 py-3 font-semibold sm:px-6">Property</th>
                  <th className="px-5 py-3 text-right font-semibold sm:px-6">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {distributionsByProperty.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50">
                    <td className="px-5 py-3 text-[15px] font-medium text-ink-900 sm:px-6">
                      {p.name}
                    </td>
                    <td className="px-5 py-3 text-right text-[15px] font-semibold text-emerald-600 sm:px-6">
                      {usd(p.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
