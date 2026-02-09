'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ChartPieIcon,
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { ABODINGO_WEBSITE_URL } from '@/lib/apiConfig'

interface PortfolioStats {
  totalInvested: number
  currentValue: number
  totalReturn: number
  totalIrr: number
  activeInvestments: number
  totalDistributions: number
}

interface InvestmentRow {
  id: string
  propertyName: string
  address?: string
  investmentAmount: number
  currentValue?: number
  status: string
  ownershipPercentage?: number
}

export default function PortfolioDashboardPage() {
  const [stats, setStats] = useState<PortfolioStats | null>(null)
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
            activeInvestments: s.activeInvestments ?? 0,
            totalDistributions: s.totalDistributions ?? 0,
          })
        }

        if (invRes.ok) {
          const invs = await invRes.json()
          const list: InvestmentRow[] = (invs || []).map((inv: any) => ({
            id: inv.id,
            propertyName: inv.property?.name ?? 'Unknown',
            address: inv.property?.address,
            investmentAmount: inv.investmentAmount ?? 0,
            currentValue: inv.property?.currentValue,
            status: inv.status ?? 'ACTIVE',
            ownershipPercentage: inv.ownershipPercentage,
          }))
          setInvestments(list)
        }
      } catch (e) {
        setError('Failed to load portfolio data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8" style={{ fontFamily: 'var(--font-sans)' }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">Portfolio</h1>
          <p className="text-[15px] text-slate-500 mt-1">Holdings and performance</p>
        </div>
        <a
          href={ABODINGO_WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-[14px] font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
        >
          <PencilSquareIcon className="w-5 h-5 text-slate-500" />
          Edit listing details on the website
          <ArrowTopRightOnSquareIcon className="w-4 h-4 text-slate-400" />
        </a>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-[15px]">
          {error}
        </div>
      )}

      {/* Summary cards - Apple style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center gap-2 text-slate-500 text-[13px] font-medium uppercase tracking-wider">
            <CurrencyDollarIcon className="w-5 h-5 text-slate-500" />
            Total invested
          </div>
          <p className="mt-3 text-[28px] font-semibold text-slate-900 tracking-tight">
            {stats ? formatCurrency(stats.totalInvested) : '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="text-slate-500 text-[13px] font-medium uppercase tracking-wider">Current value</div>
          <p className="mt-3 text-[28px] font-semibold text-emerald-600 tracking-tight">
            {stats ? formatCurrency(stats.currentValue) : '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center gap-2 text-slate-500 text-[13px] font-medium uppercase tracking-wider">
            <ArrowTrendingUpIcon className="w-5 h-5 text-slate-500" />
            Total return
          </div>
          <p className="mt-3 text-[28px] font-semibold text-slate-900 tracking-tight">
            {stats ? formatCurrency(stats.totalReturn) : '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="text-slate-500 text-[13px] font-medium uppercase tracking-wider">IRR</div>
          <p className="mt-3 text-[28px] font-semibold text-amber-600 tracking-tight">
            {stats != null ? `${stats.totalIrr.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      {/* Holdings */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center gap-2">
          <BuildingOffice2Icon className="w-5 h-5 text-slate-500" />
          <h2 className="text-[22px] font-semibold text-slate-900 tracking-tight">Holdings</h2>
        </div>
        <div className="overflow-x-auto">
          {investments.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500 text-[15px]">
              No investments yet. View the Deal Pipeline to add properties.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-[13px] text-slate-500 font-medium uppercase tracking-wider border-b border-slate-200/80">
                  <th className="px-6 py-4">Property</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Invested</th>
                  <th className="px-6 py-4 text-right">Current value</th>
                  <th className="px-6 py-4 text-right">Ownership</th>
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
                    <td className="px-6 py-4 text-slate-600 text-[15px]">{inv.status}</td>
                    <td className="px-6 py-4 text-right text-slate-700 text-[15px]">{formatCurrency(inv.investmentAmount)}</td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600 text-[15px]">
                      {inv.currentValue != null ? formatCurrency(inv.currentValue) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600 text-[15px]">
                      {inv.ownershipPercentage != null ? `${inv.ownershipPercentage}%` : '—'}
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
