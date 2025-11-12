'use client'

import { useState, useEffect } from 'react'
import {
  PlusIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  TableCellsIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  TagIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline'
import {
  CheckCircleIcon as CheckCircleIconSolid,
} from '@heroicons/react/24/solid'

interface Deal {
  id: string
  name: string
  propertyId?: string
  pipelineId?: string
  stageId?: string
  dealType: string
  status: string
  priority: string
  askingPrice?: number
  offerPrice?: number
  purchasePrice?: number
  estimatedValue?: number
  address?: string
  city?: string
  state?: string
  description?: string
  tags: string[]
  source?: string
  assignedTo?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  stage?: {
    id: string
    name: string
    color?: string
  }
  pipeline?: {
    id: string
    name: string
  }
  _count?: {
    tasks: number
    activities: number
    dealNotes: number
  }
  tasks?: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate?: string
  }>
}

interface Pipeline {
  id: string
  name: string
  description?: string
  isDefault: boolean
  stages: Array<{
    id: string
    name: string
    order: number
    color?: string
    _count: {
      deals: number
    }
  }>
  _count: {
    deals: number
  }
}

interface CRMDealPipelineProps {
  authToken: string
}

export default function CRMDealPipeline({ authToken }: CRMDealPipelineProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'table'>('kanban')
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDeal, setShowCreateDeal] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)

  useEffect(() => {
    fetchPipelines()
  }, [])

  useEffect(() => {
    if (selectedPipelineId || pipelines.length > 0) {
      const pipelineId = selectedPipelineId || pipelines.find(p => p.isDefault)?.id || pipelines[0]?.id
      if (pipelineId) {
        setSelectedPipelineId(pipelineId)
        fetchDeals(pipelineId)
      }
    }
  }, [selectedPipelineId, pipelines])

  const fetchPipelines = async () => {
    try {
      const response = await fetch('/api/investors/crm/pipelines', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setPipelines(data.pipelines || [])
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error)
    }
  }

  const fetchDeals = async (pipelineId: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ pipelineId })
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetch(`/api/investors/crm/deals?${params}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setDeals(data.deals || [])
      }
    } catch (error) {
      console.error('Error fetching deals:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)
  const stages = selectedPipeline?.stages || []

  // Group deals by stage
  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = deals.filter(deal => deal.stageId === stage.id)
    return acc
  }, {} as Record<string, Deal[]>)

  const formatCurrency = (amount?: number) => {
    if (!amount) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700 border-red-300'
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'LOW': return 'bg-blue-100 text-blue-700 border-blue-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Deal Pipeline</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your deal flow and track progress</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-white shadow-sm' : ''}`}
              title="Kanban View"
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              title="List View"
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded ${viewMode === 'table' ? 'bg-white shadow-sm' : ''}`}
              title="Table View"
            >
              <TableCellsIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Create Deal Button */}
          <button
            onClick={() => setShowCreateDeal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="hidden sm:inline">New Deal</span>
          </button>
        </div>
      </div>

      {/* Pipeline Selector */}
      {pipelines.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {pipelines.map((pipeline) => (
            <button
              key={pipeline.id}
              onClick={() => setSelectedPipelineId(pipeline.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedPipelineId === pipeline.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {pipeline.name}
              {pipeline.isDefault && (
                <span className="ml-2 text-xs opacity-75">(Default)</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search deals..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            if (selectedPipelineId) {
              fetchDeals(selectedPipelineId)
            }
          }}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading deals...</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {stages.map((stage) => (
              <div
                key={stage.id}
                className="flex-shrink-0 w-80 bg-slate-50 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{stage.name}</h3>
                    <span className="px-2 py-0.5 bg-white rounded-full text-xs font-medium text-slate-600">
                      {dealsByStage[stage.id]?.length || 0}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {dealsByStage[stage.id]?.map((deal) => (
                    <div
                      key={deal.id}
                      onClick={() => setSelectedDeal(deal)}
                      className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-slate-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-900 line-clamp-2">{deal.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(deal.priority)}`}>
                          {deal.priority}
                        </span>
                      </div>
                      
                      {deal.address && (
                        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                          <MapPinIcon className="h-3 w-3" />
                          <span className="truncate">{deal.address}</span>
                        </p>
                      )}
                      
                      {deal.purchasePrice && (
                        <p className="text-sm font-semibold text-slate-900 mb-2">
                          {formatCurrency(deal.purchasePrice)}
                        </p>
                      )}
                      
                      {deal.assignedTo && (
                        <div className="flex items-center gap-2 mt-2">
                          <UserIcon className="h-4 w-4 text-slate-400" />
                          <span className="text-xs text-slate-600">
                            {deal.assignedTo.firstName} {deal.assignedTo.lastName}
                          </span>
                        </div>
                      )}
                      
                      {deal._count && (deal._count.tasks > 0 || deal._count.dealNotes > 0) && (
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          {deal._count.tasks > 0 && (
                            <span className="flex items-center gap-1">
                              <CheckCircleIcon className="h-3 w-3" />
                              {deal._count.tasks} tasks
                            </span>
                          )}
                          {deal._count.dealNotes > 0 && (
                            <span className="flex items-center gap-1">
                              <DocumentIcon className="h-3 w-3" />
                              {deal._count.dealNotes} notes
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {(!dealsByStage[stage.id] || dealsByStage[stage.id].length === 0) && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No deals in this stage
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {deals.map((deal) => (
            <div
              key={deal.id}
              onClick={() => setSelectedDeal(deal)}
              className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-slate-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-slate-900">{deal.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(deal.priority)}`}>
                      {deal.priority}
                    </span>
                    {deal.stage && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                        {deal.stage.name}
                      </span>
                    )}
                  </div>
                  
                  {deal.address && (
                    <p className="text-sm text-slate-500 mb-2 flex items-center gap-1">
                      <MapPinIcon className="h-4 w-4" />
                      {deal.address}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    {deal.purchasePrice && (
                      <span className="font-semibold">{formatCurrency(deal.purchasePrice)}</span>
                    )}
                    {deal.assignedTo && (
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-4 w-4" />
                        {deal.assignedTo.firstName} {deal.assignedTo.lastName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {deals.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No deals found
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Deal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tasks</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {deals.map((deal) => (
                <tr
                  key={deal.id}
                  onClick={() => setSelectedDeal(deal)}
                  className="hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-semibold text-slate-900">{deal.name}</div>
                      {deal.address && (
                        <div className="text-sm text-slate-500">{deal.address}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {deal.stage ? (
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                        {deal.stage.name}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(deal.purchasePrice || deal.estimatedValue)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(deal.priority)}`}>
                      {deal.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {deal.assignedTo ? (
                      <span className="text-sm text-slate-600">
                        {deal.assignedTo.firstName} {deal.assignedTo.lastName}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">
                      {deal._count?.tasks || 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {deals.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No deals found
            </div>
          )}
        </div>
      )}

      {/* Create Deal Modal - Placeholder */}
      {showCreateDeal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Create New Deal</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-500">Deal creation form coming soon...</p>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateDeal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

