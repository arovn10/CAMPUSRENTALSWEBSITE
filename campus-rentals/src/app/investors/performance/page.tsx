'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  BuildingOffice2Icon,
  ArrowDownTrayIcon,
  CalendarIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

interface Stats {
  totalInvested: number
  currentValue: number
  totalReturn: number
  totalIrr: number
  totalDistributions: number
  activeInvestments: number
}

interface InvestmentRow {
  id: string
  propertyName: string
  address?: string
  investmentAmount: number
  currentValue?: number
  totalReturn?: number
  irr?: number
  status: string
  ownershipPercentage?: number
  distributions?: { amount: number; distributionDate: string }[]
}

const currentYear = new Date().getFullYear()

export default function InvestorPerformancePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [investments, setInvestments] = useState<InvestmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token')
    if (!token) return

    const load = async () => {
      try {
        setLoading(true)
        const [statsRes, invRes] = await Promise.all([
          fetch('/api/investors/stats', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/investors/investments', { headers: { Authorization: `Bearer ${token}` } }),
        ])

        if (statsRes.ok) {
          const s = await statsRes.json()
          setStats({
            totalInvested: s.totalInvested ?? 0,
            currentValue: s.currentValue ?? 0,
            totalReturn: s.totalReturn ?? 0,
            totalIrr: s.totalIrr ?? 0,
            totalDistributions: s.totalDistributions ?? 0,
            activeInvestments: s.activeInvestments ?? 0,
          })
        }

        if (invRes.ok) {
          const invs = await invRes.json()
          const list: InvestmentRow[] = (invs || []).map((inv: any) => {
            const dists = inv.distributions || []
            const totalDist = dists.reduce((sum: number, d: any) => sum + (d.amount ?? 0), 0)
            const currVal = inv.property?.currentValue ?? inv.investmentAmount
            const invested = inv.investmentAmount ?? 0
            const totalReturn = currVal + totalDist - invested
            const irr = invested > 0 ? (totalReturn / invested) * 100 : 0
            return {
              id: inv.id,
              propertyName: inv.property?.name ?? 'Unknown',
              address: inv.property?.address,
              investmentAmount: invested,
              currentValue: currVal,
              totalReturn,
              irr,
              status: inv.status ?? 'ACTIVE',
              ownershipPercentage: inv.ownershipPercentage,
              distributions: dists.map((d: any) => ({ amount: d.amount, distributionDate: d.distributionDate })),
            }
          })
          setInvestments(list)
        }
      } catch (e) {
        setError('Failed to load performance data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

  const ytdDistributions = investments.reduce((sum, inv) => {
    const ytd = (inv.distributions || []).filter(
      (d) => new Date(d.distributionDate).getFullYear() === currentYear
    )
    return sum + ytd.reduce((s, d) => s + d.amount, 0)
  }, 0)

  const exportCsv = () => {
    const headers = ['Property', 'Address', 'Invested', 'Current value', 'Distributions', 'Total return', 'IRR %', 'Status']
    const rows = investments.map((inv) => {
      const distTotal = (inv.distributions || []).reduce((s, d) => s + d.amount, 0)
      return [
        inv.propertyName,
        inv.address ?? '',
        inv.investmentAmount,
        inv.currentValue ?? '',
        distTotal,
        inv.totalReturn ?? inv.currentValue! + distTotal - inv.investmentAmount,
        inv.irr != null ? inv.irr.toFixed(2) : '',
        inv.status,
      ]
    })
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `performance-report-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-slate-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8" style={{ fontFamily: 'var(--font-sans)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">Performance</h1>
          <p className="text-[15px] text-slate-600 mt-1">Returns by property and export for your records</p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-[15px]">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center gap-2 text-slate-600 text-[13px] font-semibold uppercase tracking-wider">
            <CurrencyDollarIcon className="w-5 h-5" />
            Total invested
          </div>
          <p className="mt-3 text-[28px] font-semibold text-slate-900 tracking-tight">
            {stats ? formatCurrency(stats.totalInvested) : '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="text-slate-600 text-[13px] font-semibold uppercase tracking-wider">Current value</div>
          <p className="mt-3 text-[28px] font-semibold text-emerald-600 tracking-tight">
            {stats ? formatCurrency(stats.currentValue) : '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center gap-2 text-slate-600 text-[13px] font-semibold uppercase tracking-wider">
            <ArrowTrendingUpIcon className="w-5 h-5" />
            Total return
          </div>
          <p className="mt-3 text-[28px] font-semibold text-slate-900 tracking-tight">
            {stats ? formatCurrency(stats.totalReturn) : '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="text-slate-600 text-[13px] font-semibold uppercase tracking-wider">IRR</div>
          <p className="mt-3 text-[28px] font-semibold text-amber-600 tracking-tight">
            {stats != null ? `${stats.totalIrr.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      {/* YTD note */}
      <div className="flex items-center gap-2 text-slate-600 text-sm">
        <CalendarIcon className="w-5 h-5" />
        <span>
          YTD distributions ({currentYear}): {formatCurrency(ytdDistributions)}
        </span>
      </div>

      {/* By property */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center gap-2">
          <BuildingOffice2Icon className="w-5 h-5 text-slate-600" />
          <h2 className="text-[22px] font-semibold text-slate-900 tracking-tight">By property</h2>
        </div>
        <div className="overflow-x-auto">
          {investments.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-600 text-[15px]">
              No investments. Performance will appear here once you have holdings.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-[13px] text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200/80">
                  <th className="px-6 py-4">Property</th>
                  <th className="px-6 py-4 text-right">Invested</th>
                  <th className="px-6 py-4 text-right">Current value</th>
                  <th className="px-6 py-4 text-right">Return</th>
                  <th className="px-6 py-4 text-right">IRR</th>
                  <th className="px-6 py-4 w-10" />
                </tr>
              </thead>
              <tbody>
                {investments.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900 text-[15px]">{inv.propertyName}</p>
                      {inv.address && <p className="text-[13px] text-slate-500 mt-0.5">{inv.address}</p>}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700 text-[15px]">{formatCurrency(inv.investmentAmount)}</td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600 text-[15px]">
                      {inv.currentValue != null ? formatCurrency(inv.currentValue) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900 text-[15px]">
                      {inv.totalReturn != null ? formatCurrency(inv.totalReturn) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-amber-600 text-[15px]">
                      {inv.irr != null ? `${inv.irr.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/investors/investments/${inv.id}`}
                        className="inline-flex items-center text-slate-500 hover:text-slate-900"
                      >
                        <ChevronRightIcon className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
