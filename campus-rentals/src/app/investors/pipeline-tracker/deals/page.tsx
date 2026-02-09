'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  PlusIcon,
  FolderIcon,
  ArrowUpRightIcon,
} from '@heroicons/react/24/outline'
import DealCreateModal from '@/components/DealCreateModal'

interface Deal {
  id: string
  name: string
  dealType: string
  status: string
  priority: string
  pipelineId?: string
  stageId?: string
  propertyId?: string
  description?: string
  estimatedValue?: number
  estimatedCloseDate?: string
  source?: string
  tags: string[]
  pipeline?: { id: string; name: string }
  stage?: { id: string; name: string; color?: string }
  property?: { id: string; name: string; address: string }
}

type SortBy = 'name' | 'stage' | 'date' | 'location'
type ViewMode = 'all' | 'stage' | 'quarter'

export default function PipelineTrackerDealsPage() {
  const router = useRouter()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [pipelineId, setPipelineId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<ViewMode>('all')

  const getToken = () =>
    typeof window !== 'undefined'
      ? sessionStorage.getItem('authToken') || sessionStorage.getItem('token') || ''
      : ''

  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr))
      } catch (_) {}
    }
    fetchDeals()
  }, [pipelineId, search])

  const fetchDeals = async () => {
    try {
      setLoading(true)
      const token = getToken()
      const params = new URLSearchParams()
      if (pipelineId) params.set('pipelineId', pipelineId)
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/investors/crm/deals?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setDeals(Array.isArray(data) ? data : [])
      } else {
        setDeals([])
      }
    } catch (e) {
      console.error('Error fetching deals:', e)
      setDeals([])
    } finally {
      setLoading(false)
    }
  }

  const stageOptions = useMemo(() => {
    const set = new Set<string>()
    deals.forEach((d) => {
      if (d.stage?.name) set.add(d.stage.name)
    })
    return Array.from(set).sort()
  }, [deals])

  const filteredAndSorted = useMemo(() => {
    let list = [...deals]
    if (stageFilter) list = list.filter((d) => d.stage?.name === stageFilter)
    const mult = sortOrder === 'asc' ? 1 : -1
    list.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '')
      else if (sortBy === 'stage') cmp = (a.stage?.name || '').localeCompare(b.stage?.name || '')
      else if (sortBy === 'date') {
        const da = a.estimatedCloseDate ? new Date(a.estimatedCloseDate).getTime() : 0
        const db = b.estimatedCloseDate ? new Date(b.estimatedCloseDate).getTime() : 0
        cmp = da - db
      } else if (sortBy === 'location') cmp = (a.property?.address || '').localeCompare(b.property?.address || '')
      return cmp * mult
    })
    return list
  }, [deals, stageFilter, sortBy, sortOrder])

  const groupedByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {}
    filteredAndSorted.forEach((d) => {
      const key = d.stage?.name ?? 'No stage'
      if (!map[key]) map[key] = []
      map[key].push(d)
    })
    return map
  }, [filteredAndSorted])

  const groupedByQuarter = useMemo(() => {
    const map: Record<string, Deal[]> = {}
    filteredAndSorted.forEach((d) => {
      const date = d.estimatedCloseDate ? new Date(d.estimatedCloseDate) : null
      const key = date ? `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}` : 'No date'
      if (!map[key]) map[key] = []
      map[key].push(d)
    })
    return map
  }, [filteredAndSorted])

  const quarterKeysOrdered = useMemo(() => {
    return Object.keys(groupedByQuarter).sort((a, b) => {
      if (a === 'No date') return 1
      if (b === 'No date') return -1
      const [, qa, ya] = a.match(/Q(\d) (\d+)/) || [ '', 0, 0 ]
      const [, qb, yb] = b.match(/Q(\d) (\d+)/) || [ '', 0, 0 ]
      const yan = Number(ya)
      const ybn = Number(yb)
      const qan = Number(qa)
      const qbn = Number(qb)
      return yan !== ybn ? yan - ybn : qan - qbn
    })
  }, [groupedByQuarter])

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const isAdminOrManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER'

  const renderDealCard = (deal: Deal) => (
    <div
      key={deal.id}
      onClick={() => router.push(`/investors/pipeline-tracker/deals/${deal.id}`)}
      className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all cursor-pointer overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h2 className="text-lg font-semibold text-slate-900 truncate flex-1">{deal.name}</h2>
          <ArrowUpRightIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />
        </div>
        {deal.stage && (
          <span
            className="inline-block px-2.5 py-1 rounded-lg text-xs font-medium mb-2"
            style={{
              backgroundColor: deal.stage.color ? `${deal.stage.color}20` : '#E0E7FF',
              color: deal.stage.color || '#3B82F6',
            }}
          >
            {deal.stage.name}
          </span>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-2">
          <span className="font-medium text-slate-700">{deal.dealType}</span>
          <span>·</span>
          <span>{deal.status}</span>
          {deal.priority && deal.priority !== 'MEDIUM' && (
            <>
              <span>·</span>
              <span>{deal.priority}</span>
            </>
          )}
        </div>
        {(deal.property?.address || deal.description) && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-2">
            {deal.property?.address || deal.description}
          </p>
        )}
        {deal.estimatedValue != null && deal.estimatedValue > 0 && (
          <p className="text-sm font-semibold text-slate-900">{formatCurrency(deal.estimatedValue)}</p>
        )}
        {deal.source && <p className="text-xs text-slate-500 mt-1">Source: {deal.source}</p>}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">List</h1>
            <p className="text-slate-500 mt-0.5 text-sm">Deal pipeline — filter, sort, and view by stage or timeline.</p>
          </div>
          {isAdminOrManager && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
              className="bg-accent text-white"
            >
              <PlusIcon className="h-5 w-5" />
              New deal
            </button>
          )}
        </div>

        {/* Filter and sort bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 sm:p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter by stage:</label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-offset-0 focus:ring-accent focus:border-accent"
            >
              <option value="">All stages</option>
              {stageOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-accent"
            >
              <option value="name">Name</option>
              <option value="stage">Stage</option>
              <option value="date">Start / close date</option>
              <option value="location">Location</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-accent"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <label className="text-sm font-medium text-gray-700">View:</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {(['all', 'stage', 'quarter'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-2 text-sm font-medium border-r border-gray-300 last:border-r-0 ${
                    viewMode === mode ? 'bg-accent text-white' : 'text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  {mode === 'all' ? 'All' : mode === 'stage' ? 'By stage' : 'By quarter/year'}
                </button>
              ))}
            </div>
          </div>
          <input
            type="search"
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-56 focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-accent animate-spin" />
          </div>
        ) : viewMode === 'stage' ? (
          <div className="space-y-6">
            {Object.entries(groupedByStage).map(([stageName, list]) => (
              <div key={stageName}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: list[0]?.stage?.color ?? '#54AAB1' }}
                  />
                  {stageName} ({list.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map(renderDealCard)}
                </div>
              </div>
            ))}
            {Object.keys(groupedByStage).length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
                No deals match the current filters.
              </div>
            )}
          </div>
        ) : viewMode === 'quarter' ? (
          <div className="space-y-6">
            {quarterKeysOrdered.map((label) => {
              const list = groupedByQuarter[label] ?? []
              return (
              <div key={label}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{label} ({list.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map(renderDealCard)}
                </div>
              </div>
            );
            })}
            {quarterKeysOrdered.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
                No deals match the current filters.
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredAndSorted.map(renderDealCard)}
          </div>
        )}

        {!loading && filteredAndSorted.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <div className="inline-flex p-4 bg-slate-100 rounded-2xl mb-4">
              <FolderIcon className="h-12 w-12 text-slate-500" />
            </div>
            <p className="text-lg font-semibold text-slate-900 mb-1">No deals yet</p>
            <p className="text-slate-500 text-sm mb-4">
              {isAdminOrManager
                ? 'Create a prospective deal to start tracking.'
                : 'Deals linked to your investments will appear here.'}
            </p>
            {isAdminOrManager && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white font-semibold rounded-xl hover:opacity-90"
              >
                <PlusIcon className="h-5 w-5" />
                New deal
              </button>
            )}
          </div>
        )}
      </div>

      {/* Deal count badge bottom-right */}
      {!loading && filteredAndSorted.length > 0 && (
        <div
          className="fixed bottom-6 right-6 px-4 py-2 rounded-full text-sm font-medium bg-accent text-white shadow-lg"
          aria-live="polite"
        >
          {filteredAndSorted.length} deal{filteredAndSorted.length !== 1 ? 's' : ''}
        </div>
      )}

      <DealCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          fetchDeals()
        }}
        initialPipelineId={pipelineId || undefined}
      />
    </div>
  )
}
