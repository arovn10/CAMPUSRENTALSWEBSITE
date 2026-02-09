'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  BanknotesIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  BuildingOffice2Icon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

interface BankingStats {
  totalDistributions: number
  pendingDistributions: number
  totalInvested: number
  currentValue: number
}

interface DistributionRow {
  id: string
  amount: number
  distributionDate: string
  distributionType: string
  propertyName?: string
  propertyId?: string
}

export default function BankingDashboardPage() {
  const [stats, setStats] = useState<BankingStats | null>(null)
  const [distributions, setDistributions] = useState<DistributionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [yearFilter, setYearFilter] = useState<string>('all')

  useEffect(() => {
    const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token')
    if (!token) return

    const load = async () => {
      try {
        setLoading(true)
        const [statsRes, invRes] = await Promise.all([
          fetch('/api/investors/stats', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/investors/properties', { headers: { Authorization: `Bearer ${token}` } }),
        ])

        if (statsRes.ok) {
          const s = await statsRes.json()
          setStats({
            totalDistributions: s.totalDistributions ?? 0,
            pendingDistributions: s.pendingDistributions ?? 0,
            totalInvested: s.totalInvested ?? 0,
            currentValue: s.currentValue ?? 0,
          })
        }

        if (invRes.ok) {
          const invs = await invRes.json()
          const list: DistributionRow[] = []
          ;(invs || []).forEach((inv: any) => {
            const dists = inv.distributions ?? inv.entityDistributions ?? []
            dists.forEach((d: any) => {
              list.push({
                id: d.id,
                amount: d.amount ?? 0,
                distributionDate: d.distributionDate,
                distributionType: d.distributionType ?? 'RENTAL_INCOME',
                propertyName: inv.property?.name ?? inv.propertyName ?? '—',
                propertyId: inv.property?.id ?? inv.propertyId,
              })
            })
          })
          list.sort((a, b) => new Date(b.distributionDate).getTime() - new Date(a.distributionDate).getTime())
          setDistributions(list)
        }
      } catch (e) {
        setError('Failed to load banking data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  const currentYear = new Date().getFullYear()
  const availableYears = useMemo(() => {
    const years = new Set(distributions.map((d) => new Date(d.distributionDate).getFullYear()))
    return Array.from(years).sort((a, b) => b - a)
  }, [distributions])

  const filteredDistributions = useMemo(() => {
    if (yearFilter === 'all') return distributions
    const y = parseInt(yearFilter, 10)
    return distributions.filter((d) => new Date(d.distributionDate).getFullYear() === y)
  }, [distributions, yearFilter])

  const ytdTotal = useMemo(
    () =>
      distributions
        .filter((d) => new Date(d.distributionDate).getFullYear() === currentYear)
        .reduce((sum, d) => sum + d.amount, 0),
    [distributions, currentYear]
  )

  const byProperty = useMemo(() => {
    const map: Record<string, { name: string; total: number }> = {}
    filteredDistributions.forEach((d) => {
      const key = d.propertyId || d.propertyName || 'Other'
      if (!map[key]) map[key] = { name: d.propertyName || 'Other', total: 0 }
      map[key].total += d.amount
    })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [filteredDistributions])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8" style={{ fontFamily: 'var(--font-sans)' }}>
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
          Banking
        </h1>
        <p className="text-[15px] text-slate-500 mt-1">
          Cash flow, distributions, and pending activity
        </p>
      </header>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-[15px]">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <BanknotesIcon className="w-5 h-5 text-slate-400" />
            Total distributions
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            {stats ? formatCurrency(stats.totalDistributions) : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">All-time cash received</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <CalendarDaysIcon className="w-5 h-5 text-slate-400" />
            YTD distributions
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold text-emerald-700 tracking-tight">
            {formatCurrency(ytdTotal)}
          </p>
          <p className="text-xs text-slate-500 mt-1">{currentYear} year to date</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <ArrowTrendingUpIcon className="w-5 h-5 text-amber-500" />
            Pending / estimated
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold text-amber-700 tracking-tight">
            {stats ? formatCurrency(stats.pendingDistributions) : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Estimated upcoming</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <BuildingOffice2Icon className="w-5 h-5 text-slate-400" />
            Total invested
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            {stats ? formatCurrency(stats.totalInvested) : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Portfolio context</p>
        </div>
      </section>

      {/* Distributions by property (summary) */}
      {byProperty.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-200/80 flex items-center gap-2">
            <BuildingOffice2Icon className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
              Distributions by property
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px]">
              <thead>
                <tr className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200/80 bg-slate-50/50">
                  <th className="px-5 sm:px-6 py-3">Property</th>
                  <th className="px-5 sm:px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {byProperty.map(([key, { name, total }]) => (
                  <tr key={key} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-5 sm:px-6 py-3 text-slate-900 font-medium text-[15px]">{name}</td>
                    <td className="px-5 sm:px-6 py-3 text-right font-semibold text-emerald-600 text-[15px]">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Distribution history */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
              Distribution history
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Year</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-slate-300 focus:border-slate-400"
            >
              <option value="all">All years</option>
              {availableYears.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          {filteredDistributions.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500 text-[15px] font-medium">
              No distributions {yearFilter !== 'all' ? `in ${yearFilter}` : 'yet'}. They will appear here once recorded.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200/80 bg-slate-50/50">
                  <th className="px-5 sm:px-6 py-3">Date</th>
                  <th className="px-5 sm:px-6 py-3">Property</th>
                  <th className="px-5 sm:px-6 py-3">Type</th>
                  <th className="px-5 sm:px-6 py-3 text-right">Amount</th>
                  <th className="px-5 sm:px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDistributions.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-5 sm:px-6 py-3 text-slate-700 text-[15px]">
                      {formatDate(d.distributionDate)}
                    </td>
                    <td className="px-5 sm:px-6 py-3 text-slate-700 text-[15px]">
                      {d.propertyName ?? '—'}
                    </td>
                    <td className="px-5 sm:px-6 py-3 text-slate-600 text-[15px]">
                      {d.distributionType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-5 sm:px-6 py-3 text-right font-semibold text-emerald-600 text-[15px]">
                      {formatCurrency(d.amount)}
                    </td>
                    <td className="px-5 sm:px-6 py-3 text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Processed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
