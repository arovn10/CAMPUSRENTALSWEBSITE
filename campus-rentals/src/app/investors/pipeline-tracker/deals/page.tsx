'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  HomeIcon,
  MapPinIcon,
  ArrowUpRightIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'

interface Investment {
  id: string
  propertyName?: string
  propertyAddress: string
  propertyCity?: string
  propertyState?: string
  investmentAmount: number
  ownershipPercentage: number
  startDate?: string
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'SOLD'
  dealStatus?: 'STABILIZED' | 'UNDER_CONSTRUCTION' | 'UNDER_CONTRACT' | 'SOLD'
  fundingStatus?: 'FUNDED' | 'FUNDING'
  estimatedCurrentDebt?: number
  estimatedMonthlyDebtService?: number
  irr?: number
  investmentType?: 'DIRECT' | 'ENTITY'
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  propertyId?: string
  property?: {
    id: string
  }
}

export default function PipelineTrackerDeals() {
  const router = useRouter()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [propertyThumbnails, setPropertyThumbnails] = useState<{ [propertyId: string]: string | null }>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('token')
        
        const response = await fetch('/api/investors/properties', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          // Filter for FUNDING deals (deals that are still being funded)
          const fundingDeals = data.filter((inv: Investment) => inv.fundingStatus === 'FUNDING')
          setInvestments(fundingDeals)
          
          // Fetch thumbnails for properties
          const thumbnailPromises = fundingDeals.map(async (inv: Investment) => {
            const propertyId = inv.property?.id || inv.propertyId
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
        }
      } catch (error) {
        console.error('Error fetching investments:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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

  const handleViewInvestmentDetails = (investmentId: string) => {
    router.push(`/investors/investments/${investmentId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Deals</h1>
        <p className="mt-2 text-gray-600">Manage and track all your deals</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {investments.length === 0 ? (
          <div className="text-center py-20">
            <div className="p-6 bg-gray-100 rounded-3xl w-fit mx-auto mb-6">
              <BuildingOfficeIcon className="h-20 w-20 text-gray-400" />
            </div>
            <p className="text-xl font-semibold text-gray-900 mb-2">No funding deals found</p>
            <p className="text-gray-500 font-medium">Deals that are currently being funded will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {investments.map((investment) => (
              <div
                key={investment.id}
                className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1"
                onClick={() => handleViewInvestmentDetails(investment.id)}
              >
                {/* Thumbnail Image */}
                {(() => {
                  const propertyId = investment.property?.id || investment.propertyId
                  const thumbnail = propertyId ? propertyThumbnails[propertyId] : null
                  return thumbnail ? (
                    <div className="relative h-48 w-full overflow-hidden">
                      <img
                        src={thumbnail}
                        alt={investment.propertyName || investment.propertyAddress}
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
                  <div className="flex items-center justify-end mb-4">
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getDealBadge(investment.dealStatus)}`}>
                        {investment.dealStatus || 'STABILIZED'}
                      </span>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getFundingBadge(investment.fundingStatus)}`}>
                        {investment.fundingStatus || 'FUNDING'}
                      </span>
                    </div>
                  </div>
                
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-200">
                    {investment.propertyName || investment.propertyAddress}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    {investment.propertyAddress}
                  </p>
                  
                  {investment.bedrooms && (
                    <p className="text-sm text-gray-600 mb-4 font-medium">
                      {investment.bedrooms} bed • {investment.bathrooms} bath • {investment.squareFeet?.toLocaleString()} sqft
                    </p>
                  )}
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 font-medium">Investment</span>
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(investment.investmentAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 font-medium">Ownership</span>
                      <span className="text-sm font-bold text-gray-900">
                        {investment.ownershipPercentage}%
                      </span>
                    </div>
                    {typeof investment.estimatedCurrentDebt === 'number' && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 font-medium">Est. Current Debt</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(investment.estimatedCurrentDebt)}</span>
                      </div>
                    )}
                    {typeof investment.estimatedMonthlyDebtService === 'number' && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 font-medium">Monthly Debt Service</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(investment.estimatedMonthlyDebtService)}</span>
                      </div>
                    )}
                    {investment.irr && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 font-medium">IRR</span>
                        <span className={`text-sm font-bold ${investment.irr > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatPercentage(investment.irr)}
                        </span>
                      </div>
                    )}
                  </div>
            
                  <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">
                      {investment.startDate ? `Started ${new Date(investment.startDate).toLocaleDateString()}` : 'In Progress'}
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
    </div>
  )
}

