'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Squares2X2Icon,
  ListBulletIcon,
  TableCellsIcon,
  PlusIcon,
  CogIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import PipelineManager from './PipelineManager'
import DealCreateModal from './DealCreateModal'

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
  location?: string
  estimatedValue?: number
  estimatedCloseDate?: string
  assignedToId?: string
  tags: string[]
  pipeline?: {
    id: string
    name: string
  }
  stage?: {
    id: string
    name: string
    color?: string
  }
  property?: {
    id: string
    propertyId: number
    name: string
    address: string
  }
  assignedTo?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  _count?: {
    tasks: number
    notes: number
    relationships: number
  }
}

interface Pipeline {
  id: string
  name: string
  description?: string
  isDefault: boolean
  stages: Stage[]
}

interface Stage {
  id: string
  name: string
  description?: string
  order: number
  color?: string
  isActive: boolean
}

type ViewMode = 'kanban' | 'list' | 'table'

export default function CRMDealPipeline() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('')
  const [deals, setDeals] = useState<Deal[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateDeal, setShowCreateDeal] = useState(false)
  const [showPipelineManager, setShowPipelineManager] = useState(false)
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    errors?: number
    errorDetails?: Array<{ propertyName: string; error: string }>
  } | null>(null)

  useEffect(() => {
    fetchPipelines()
  }, [])

  useEffect(() => {
    if (selectedPipelineId) {
      fetchDeals()
    }
  }, [selectedPipelineId, searchTerm])

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('token') || localStorage.getItem('token')
    }
    return null
  }

  const fetchPipelines = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch('/api/investors/crm/pipelines', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPipelines(data)
        // Set default pipeline
        const defaultPipeline = data.find((p: Pipeline) => p.isDefault) || data[0]
        if (defaultPipeline) {
          setSelectedPipelineId(defaultPipeline.id)
        }
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error)
    }
  }

  const fetchDeals = async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams()
      if (selectedPipelineId) {
        params.append('pipelineId', selectedPipelineId)
      }
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/investors/crm/deals?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDeals(data)
      }
    } catch (error) {
      console.error('Error fetching deals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDealClick = (dealId: string) => {
    router.push(`/investors/crm/deals/${dealId}`)
  }

  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (stageId: string) => {
    if (!draggedDeal) return

    try {
      const token = getAuthToken()
      const response = await fetch(`/api/investors/crm/deals/${draggedDeal.id}/stage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          stageId,
          pipelineId: selectedPipelineId,
        }),
      })

      if (response.ok) {
        await fetchDeals()
      }
    } catch (error) {
      console.error('Error updating deal stage:', error)
    } finally {
      setDraggedDeal(null)
    }
  }

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId)

  const handleImportProperties = async () => {
    if (!confirm('This will import all properties from the Deals page as CRM deals. Continue?')) {
      return
    }

    setImporting(true)
    setImportResult(null)

    try {
      const token = getAuthToken()
      const response = await fetch('/api/investors/crm/import-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          pipelineId: selectedPipelineId,
          stageId: selectedPipeline?.stages[0]?.id,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setImportResult(result)
        await fetchDeals()
        setShowImportModal(true)
      } else {
        const error = await response.json()
        console.error('Import error:', error)
        alert(error.error || error.details || 'Failed to import properties')
      }
    } catch (error) {
      console.error('Error importing properties:', error)
      alert('Failed to import properties')
    } finally {
      setImporting(false)
    }
  }

  const renderKanbanView = () => {
    if (!selectedPipeline) return null

    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {selectedPipeline.stages.map((stage) => {
          const stageDeals = deals.filter((deal) => deal.stageId === stage.id)
          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-80 bg-slate-50 rounded-lg p-4"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.id)}
            >
              <div
                className="font-semibold text-slate-900 mb-3 px-2 py-1 rounded"
                style={{
                  backgroundColor: stage.color ? `${stage.color}20` : '#E0E7FF',
                  color: stage.color || '#3B82F6',
                }}
              >
                {stage.name} ({stageDeals.length})
              </div>
              <div className="space-y-3">
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStart(deal)}
                    onClick={() => handleDealClick(deal.id)}
                    className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-900">{deal.name}</h4>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          deal.priority === 'URGENT'
                            ? 'bg-red-100 text-red-700'
                            : deal.priority === 'HIGH'
                            ? 'bg-orange-100 text-orange-700'
                            : deal.priority === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {deal.priority}
                      </span>
                    </div>
                    {deal.property && (
                      <p className="text-sm text-slate-600 mb-2">{deal.property.name}</p>
                    )}
                    {deal.assignedTo && (
                      <p className="text-xs text-slate-500">
                        Assigned to: {deal.assignedTo.firstName} {deal.assignedTo.lastName}
                      </p>
                    )}
                    {deal.estimatedValue && (
                      <p className="text-sm font-medium text-slate-900 mt-2">
                        ${deal.estimatedValue.toLocaleString()}
                      </p>
                    )}
                    {deal.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {deal.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderListView = () => {
    return (
      <div className="space-y-2">
        {deals.map((deal) => (
          <div
            key={deal.id}
            onClick={() => handleDealClick(deal.id)}
            className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-slate-900">{deal.name}</h4>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {deal.dealType}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      deal.priority === 'URGENT'
                        ? 'bg-red-100 text-red-700'
                        : deal.priority === 'HIGH'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {deal.priority}
                  </span>
                </div>
                {deal.description && (
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{deal.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  {deal.stage && <span>Stage: {deal.stage.name}</span>}
                  {deal.property && <span>Property: {deal.property.name}</span>}
                  {deal.assignedTo && (
                    <span>
                      Assigned: {deal.assignedTo.firstName} {deal.assignedTo.lastName}
                    </span>
                  )}
                </div>
              </div>
              {deal.estimatedValue && (
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    ${deal.estimatedValue.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderTableView = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                Deal Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                Stage
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                Property
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                Assigned To
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {deals.map((deal) => (
              <tr
                key={deal.id}
                onClick={() => handleDealClick(deal.id)}
                className="hover:bg-slate-50 cursor-pointer"
              >
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{deal.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{deal.dealType}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {deal.stage ? deal.stage.name : '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      deal.priority === 'URGENT'
                        ? 'bg-red-100 text-red-700'
                        : deal.priority === 'HIGH'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {deal.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {deal.property ? deal.property.name : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {deal.assignedTo
                    ? `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}`
                    : '-'}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                  {deal.estimatedValue ? `$${deal.estimatedValue.toLocaleString()}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">Deal Pipeline</h2>
          <p className="text-sm text-slate-600 mt-1">Manage your deals and track their progress</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImportProperties}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : 'Import Properties'}
          </button>
          <button
            onClick={() => setShowCreateDeal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            New Deal
          </button>
          <button
            onClick={() => setShowPipelineManager(true)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <CogIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Pipeline Selector */}
      <div className="flex items-center gap-4">
        <select
          value={selectedPipelineId}
          onChange={(e) => setSelectedPipelineId(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {pipelines.map((pipeline) => (
            <option key={pipeline.id} value={pipeline.id}>
              {pipeline.name}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="flex-1 max-w-md relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search deals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'kanban'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Squares2X2Icon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListBulletIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableCellsIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div>
          {viewMode === 'kanban' && renderKanbanView()}
          {viewMode === 'list' && renderListView()}
          {viewMode === 'table' && renderTableView()}
        </div>
      )}

      {/* Modals */}
      {showCreateDeal && (
        <DealCreateModal
          isOpen={showCreateDeal}
          onClose={() => setShowCreateDeal(false)}
          onSuccess={fetchDeals}
          initialPipelineId={selectedPipelineId}
        />
      )}

      {showPipelineManager && (
        <PipelineManager
          onClose={() => setShowPipelineManager(false)}
          onPipelineChange={() => {
            fetchPipelines()
            fetchDeals()
          }}
        />
      )}

      {showImportModal && importResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Import Complete</h3>
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">Imported</span>
                  <span className="text-lg font-bold text-green-600">{importResult.imported}</span>
                </div>
                {importResult.skipped > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">Skipped (already exist)</span>
                    <span className="text-lg font-bold text-yellow-600">{importResult.skipped}</span>
                  </div>
                )}
                {importResult.errors && importResult.errors > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">Errors</span>
                    <span className="text-lg font-bold text-red-600">{importResult.errors}</span>
                  </div>
                )}
                {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg max-h-40 overflow-y-auto">
                    <p className="text-xs font-semibold text-red-700 mb-2">Error Details:</p>
                    {importResult.errorDetails.map((err, idx) => (
                      <p key={idx} className="text-xs text-red-600">
                        {err.propertyName}: {err.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportResult(null)
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

