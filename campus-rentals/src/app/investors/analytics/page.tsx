'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChartCard, LineChart, DonutChart, BarChart, WaterfallChart } from '@/components/ims/charts'

type Metrics = {
  totalContributed: number
  totalDistributed: number
  currentValue: number
}
type LedgerEntry = { type: string; amount: number; date: string }
type Account = {
  propertyId: string
  propertyName: string
  metrics: Metrics & { irr: number | null; tvpi: number | null }
  ledger: LedgerEntry[]
}
type Payload = { asOf: string; consolidated: Metrics; accounts: Account[] }

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

export default function AnalyticsPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/investors/capital-account', { headers: { Authorization: `Bearer ${token()}` } })
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        setData(await res.json())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const charts = useMemo(() => {
    if (!data) return null
    // All ledger entries across deals, sorted ascending.
    const all = data.accounts
      .flatMap((a) => a.ledger)
      .slice()
      .sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime())

    // Cumulative capital deployed over time (running sum of contributions).
    let cum = 0
    const deployed = all
      .filter((e) => e.type === 'CONTRIBUTION')
      .map((e) => {
        cum += e.amount
        return { date: e.date, value: cum }
      })

    // Allocation by deal (by current value).
    const allocation = data.accounts
      .map((a) => ({ label: a.propertyName, value: a.metrics.currentValue }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value)

    // Distributions by month.
    const byMonth = new Map<string, number>()
    for (const e of all) {
      if (e.type !== 'DISTRIBUTION') continue
      const key = new Date(e.date).toISOString().slice(0, 7)
      byMonth.set(key, (byMonth.get(key) ?? 0) + e.amount)
    }
    const distBars = Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({ label: k.slice(2).replace('-', "/"), value: v }))

    // Value-creation bridge: Contributed → +gain → Total value.
    const c = data.consolidated
    const totalValue = c.totalDistributed + c.currentValue
    const gain = totalValue - c.totalContributed
    const gainKind: 'add' | 'sub' = gain >= 0 ? 'add' : 'sub'
    const bridge: { label: string; value: number; kind: 'base' | 'add' | 'sub' | 'total' }[] = [
      { label: 'Contributed', value: c.totalContributed, kind: 'base' },
      { label: gain >= 0 ? 'Value gained' : 'Value lost', value: Math.abs(gain), kind: gainKind },
      { label: 'Total value', value: totalValue, kind: 'total' },
    ]

    return { deployed, allocation, distBars, bridge }
  }, [data])

  if (loading) return <div className="p-8 text-gray-500">Loading analytics…</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>
  if (!data || !charts || data.accounts.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-2 text-gray-500">No investment data to visualize yet.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      <p className="mt-1 text-sm text-gray-500">A visual view of your portfolio, allocation, and distributions.</p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Capital deployed over time">
          <LineChart points={charts.deployed} />
        </ChartCard>
        <ChartCard title="Value creation bridge">
          <WaterfallChart steps={charts.bridge} />
        </ChartCard>
        <ChartCard title="Allocation by deal">
          <DonutChart slices={charts.allocation} />
        </ChartCard>
        <ChartCard title="Distributions by month">
          <BarChart bars={charts.distBars} />
        </ChartCard>
      </div>
    </div>
  )
}
