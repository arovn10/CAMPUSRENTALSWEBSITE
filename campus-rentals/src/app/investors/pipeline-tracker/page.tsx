'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRightIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'

interface Deal {
  id: string
  name: string
  stage?: { id: string; name: string; color?: string }
  property?: { name: string; address?: string }
  estimatedCloseDate?: string | null
  estimatedValue?: number | null
}

export default function PipelineTrackerOverviewPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('authToken') || sessionStorage.getItem('token') : ''
    if (!token) {
      setLoading(false)
      return
    }
    fetch('/api/investors/crm/deals', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setDeals(Array.isArray(data) ? data : []))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false))
  }, [])

  const byStage = deals.reduce<Record<string, Deal[]>>((acc, d) => {
    const stageName = d.stage?.name ?? 'No stage'
    if (!acc[stageName]) acc[stageName] = []
    acc[stageName].push(d)
    return acc
  }, {})
  const stageNames = Object.keys(byStage).sort()

  const now = new Date()
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const upcomingDates = deals
    .filter((d) => d.estimatedCloseDate)
    .map((d) => ({ ...d, date: new Date(d.estimatedCloseDate!) }))
    .filter((d) => d.date >= now && d.date <= in90)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 10)

  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Summary cards */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            className="border-l-4 border-accent"
          >
            <p className="text-sm font-medium text-gray-500">Total Deals</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{deals.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Stages</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stageNames.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Upcoming (90 days)</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{upcomingDates.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">With close date</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {deals.filter((d) => d.estimatedCloseDate).length}
            </p>
          </div>
        </div>
      </section>

      {/* Deals by stage */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Deals by stage</h2>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <ul className="divide-y divide-gray-100">
            {stageNames.length === 0 ? (
              <li className="px-5 py-6 text-center text-gray-500 text-sm">No deals yet</li>
            ) : (
              stageNames.map((stageName) => {
                const list = byStage[stageName]
                const stageColor = list[0]?.stage?.color ?? '#54AAB1'
                return (
                  <li key={stageName} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <span
                      className="inline-block w-3 h-3 rounded-full flex-shrink-0 mr-3"
                      style={{ backgroundColor: stageColor }}
                    />
                    <span className="font-medium text-gray-900 flex-1">{stageName}</span>
                    <span className="text-gray-500 text-sm">{list.length} deal{list.length !== 1 ? 's' : ''}</span>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      </section>

      {/* Upcoming dates */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Upcoming dates (next 90 days)
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          {upcomingDates.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-500 text-sm">
              No upcoming close dates in the next 90 days
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcomingDates.map((deal) => (
                <li key={deal.id} className="hover:bg-gray-50">
                  <Link
                    href={`/investors/pipeline-tracker/deals/${deal.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-left"
                  >
                    <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                      {formatDate(deal.date)}
                    </span>
                    <span className="text-gray-700 flex-1 min-w-0 truncate">{deal.name}</span>
                    {deal.property?.name && (
                      <span className="text-gray-500 text-sm truncate">{deal.property.name}</span>
                    )}
                    <ArrowRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="flex justify-center pt-4">
        <Link
          href="/investors/pipeline-tracker/deals"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
          className="bg-accent text-white"
        >
          <BuildingOfficeIcon className="h-5 w-5" />
          View all deals
        </Link>
      </div>
    </div>
  )
}
