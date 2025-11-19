'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  HomeIcon,
  MapPinIcon,
  ArrowUpRightIcon,
  BuildingOfficeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import DealCreateModal from '@/components/DealCreateModal'

interface Deal {
  id: string
  name: string
  description?: string
  dealType?: string
  status?: string
  priority?: string
  estimatedValue?: number
  estimatedCloseDate?: string
  pipeline?: {
    id: string
    name: string
    description?: string
  }
  stage?: {
    id: string
    name: string
    order?: number
    color?: string
  }
  property?: {
    id: string
    name?: string
    address?: string
    fundingStatus?: string
  }
  assignedTo?: {
    id: string
    firstName?: string
    lastName?: string
    email?: string
  }
}

export default function PipelineTrackerDeals() {
  const router = useRouter()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [propertyThumbnails, setPropertyThumbnails] = useState<{ [propertyId: string]: string | null }>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDeal, setShowCreateDeal] = useState(false)
  const [selectedPipeline, setSelectedPipeline] = useState<string>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('token')
        
        // Fetch deals from CRM API - show both FUNDED and FUNDING
        const params = new URLSearchParams()
        if (selectedPipeline !== 'all') {
          params.append('pipelineId', selectedPipeline)
        }
        // Don't filter by fundingStatus - show all deals
        const response = await fetch(`/api/investors/crm/deals?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setDeals(data || [])
          
          // Fetch thumbnails for properties
          const thumbnailPromises = data.map(async (deal: Deal) => {
            const propertyId = deal.property?.id
            if (propertyId) {
              try {
                const thumbResponse = await fetch(`/api/properties/thumbnail/${propertyId}`)
                if (thumbResponse.ok) {
                  const thumbData = await thumbResponse.json()
                  return { propertyId, thumbnail: thumbData.thumbnail }
                }
              } catch (error) {
                console.error(`Error fetching thumbnail for property ${propertyId}:`, error)
              }
            }
            return { propertyId: propertyId || '', thumbnail: null }
          })
          
          const thumbnailResults = await Promise.all(thumbnailPromises)
          const thumbnailMap: { [key: string]: string | null } = {}
          thumbnailResults.forEach((result) => {
            if (result.propertyId) {
              thumbnailMap[result.propertyId] = result.thumbnail
            }
          })
          setPropertyThumbnails(thumbnailMap)
        } else {
          console.error('Failed to fetch deals:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Error fetching deals:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedPipeline])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getDealBadge = (dealStatus?: string) => {
    switch (dealStatus) {
      case 'STABILIZED': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'UNDER_CONSTRUCTION': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'UNDER_CONTRACT': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'SOLD': return 'bg-gray-50 text-gray-700 border-gray-200'
      default: return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const getFundingBadge = (fundingStatus?: string) => {
    switch (fundingStatus) {
      case 'FUNDED': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'FUNDING': return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      default: return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const handleViewDealDetails = (dealId: string) => {
    router.push(`/investors/crm/deals/${dealId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  const filteredDeals = deals.filter((deal) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        deal.name?.toLowerCase().includes(searchLower) ||
        deal.property?.name?.toLowerCase().includes(searchLower) ||
        deal.property?.address?.toLowerCase().includes(searchLower) ||
        deal.description?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const handleDealCreated = () => {
    // Refresh the deals list after creating a deal
    const fetchData = async () => {
      try {
        const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('token')
        const params = new URLSearchParams()
        if (selectedPipeline !== 'all') {
          params.append('pipelineId', selectedPipeline)
        }
        const response = await fetch(`/api/investors/crm/deals?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setDeals(data || [])
        }
      } catch (error) {
        console.error('Error refreshing deals:', error)
      }
    }
    fetchData()
  }

  // Get unique pipelines from deals
  const pipelines = Array.from(new Set(deals.map(d => d.pipeline?.id).filter(Boolean)))
  const pipelineMap = new Map(deals.map(d => [d.pipeline?.id, d.pipeline]).filter(([id]) => id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deals</h1>
          <p className="mt-2 text-gray-600">Manage and track all your deals</p>
        </div>
        <button
          onClick={() => setShowCreateDeal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          New Deal
        </button>
      </div>

      {/* Pipeline Filter and Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Pipeline:</span>
          </div>
          <select
            value={selectedPipeline}
            onChange={(e) => setSelectedPipeline(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Pipelines</option>
            {Array.from(pipelineMap.entries()).map(([id, pipeline]) => (
              <option key={id} value={id}>{pipeline?.name || 'Unknown'}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search deals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {filteredDeals.length === 0 ? (
          <div className="text-center py-20">
            <div className="p-6 bg-gray-100 rounded-3xl w-fit mx-auto mb-6">
              <BuildingOfficeIcon className="h-20 w-20 text-gray-400" />
            </div>
            <p className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No deals found matching your search' : 'No deals found'}
            </p>
            <p className="text-gray-500 font-medium">
              {searchTerm ? 'Try adjusting your search terms' : 'Create a new deal or sync investments to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDeals.map((deal) => (
              <div
                key={deal.id}
                className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1"
                onClick={() => handleViewDealDetails(deal.id)}
              >
                {/* Thumbnail Image */}
                {(() => {
                  const propertyId = deal.property?.id
                  const thumbnail = propertyId ? propertyThumbnails[propertyId] : null
                  return thumbnail ? (
                    <div className="relative h-48 w-full overflow-hidden">
                      <img
                        src={thumbnail}
                        alt={deal.name || deal.property?.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  ) : (
                    <div className="h-48 w-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                      <HomeIcon className="h-12 w-12 text-blue-400" />
                    </div>
                  )
                })()}
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    {deal.pipeline && (
                      <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {deal.pipeline.name}
                      </span>
                    )}
                    <div className="flex items-center space-x-2">
                      {deal.stage && (
                        <span 
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                          style={{ 
                            backgroundColor: `${deal.stage.color || '#3B82F6'}20`,
                            color: deal.stage.color || '#3B82F6',
                            borderColor: `${deal.stage.color || '#3B82F6'}40`
                          }}
                        >
                          {deal.stage.name}
                        </span>
                      )}
                      {deal.property?.fundingStatus && (
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getFundingBadge(deal.property.fundingStatus)}`}>
                          {deal.property.fundingStatus}
                        </span>
                      )}
                    </div>
                  </div>
                
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-200">
                    {deal.name}
                  </h3>
                  {deal.property?.address && (
                    <p className="text-sm text-gray-500 mb-4 flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      {deal.property.address}
                    </p>
                  )}
                  
                  {deal.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {deal.description}
                    </p>
                  )}
                  
                  <div className="space-y-3 mb-6">
                    {deal.estimatedValue && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 font-medium">Estimated Value</span>
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(deal.estimatedValue)}
                        </span>
                      </div>
                    )}
                    {deal.priority && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 font-medium">Priority</span>
                        <span className="text-sm font-bold text-gray-900">
                          {deal.priority}
                        </span>
                      </div>
                    )}
                    {deal.assignedTo && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 font-medium">Assigned To</span>
                        <span className="text-sm font-bold text-gray-900">
                          {deal.assignedTo.firstName} {deal.assignedTo.lastName}
                        </span>
                      </div>
                    )}
                  </div>
            
                  <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">
                      {deal.estimatedCloseDate ? `Close: ${new Date(deal.estimatedCloseDate).toLocaleDateString()}` : 'In Progress'}
                    </span>
                    <span className="text-sm text-blue-600 font-semibold group-hover:text-blue-700 flex items-center transition-colors duration-200">
                      View Deal
                      <ArrowUpRightIcon className="h-4 w-4 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Deal Modal */}
      {showCreateDeal && (
        <DealCreateModal
          isOpen={showCreateDeal}
          onClose={() => setShowCreateDeal(false)}
          onSuccess={handleDealCreated}
        />
      )}
    </div>
  )
}

