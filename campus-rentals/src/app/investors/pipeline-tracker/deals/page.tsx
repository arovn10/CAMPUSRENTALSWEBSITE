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
  name?: string
  propertyName?: string
  propertyAddress: string
  propertyCity?: string
  propertyState?: string
  totalInvestment?: number
  investorId?: string
  investorEmail?: string
  investmentAmount: number
  ownershipPercentage: number
  startDate?: string
  expectedReturn?: number
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'SOLD'
  currentValue?: number
  totalReturn?: number
  irr?: number
  investmentType?: 'DIRECT' | 'ENTITY'
  entityName?: string
  entityType?: string
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  acquisitionDate?: string
  monthlyRent?: number
  capRate?: number
  dealStatus?: 'STABILIZED' | 'UNDER_CONSTRUCTION' | 'UNDER_CONTRACT' | 'SOLD'
  fundingStatus?: 'FUNDED' | 'FUNDING'
  estimatedCurrentDebt?: number
  estimatedMonthlyDebtService?: number
  property?: {
    id?: string
    monthlyRent?: number
    otherIncome?: number
    annualExpenses?: number
    capRate?: number
    totalCost?: number
    acquisitionPrice?: number
    constructionCost?: number
  }
  propertyId?: string
  entityOwners?: Array<{
    userId?: string
    userName?: string
    investmentAmount?: number
    ownershipPercentage?: number
  }>
}

interface User {
  id: string
  role: string
  email?: string
  firstName?: string
  lastName?: string
}

export default function PipelineTrackerDeals() {
  const router = useRouter()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [propertyThumbnails, setPropertyThumbnails] = useState<{ [propertyId: string]: string | null }>({})
  const [dealFilter, setDealFilter] = useState<'ALL' | 'STABILIZED' | 'UNDER_CONSTRUCTION' | 'UNDER_CONTRACT' | 'SOLD'>('ALL')
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  useEffect(() => {
    // Fetch current user from sessionStorage (same as dashboard)
    const userStr = sessionStorage.getItem('currentUser')
    if (userStr) {
      try {
        const userData = JSON.parse(userStr)
        setCurrentUser(userData)
        fetchDashboardData(userData)
      } catch (error) {
        console.error('Error parsing user from sessionStorage:', error)
        // Fallback to API call
        fetchUser()
      }
    } else {
      // Fallback to API call
      fetchUser()
    }
  }, [])

  const fetchUser = async () => {
    try {
      const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('token')
      const response = await fetch('/api/investors/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const userData = await response.json()
        setCurrentUser(userData)
        sessionStorage.setItem('currentUser', JSON.stringify(userData))
        fetchDashboardData(userData)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      setLoading(false)
    }
  }

  const fetchDashboardData = async (user: User) => {
    try {
      setLoading(true)
      
      const token = sessionStorage.getItem('authToken') || user.email
      const investmentsResponse = await fetch('/api/investors/properties', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (investmentsResponse.ok) {
        const investmentsData = await investmentsResponse.json()
        
        // For investors, extract individual amounts from entity owners (same as dashboard)
        if (user.role === 'INVESTOR') {
          const investorName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
          const investorInvestments = investmentsData.map((inv: any) => {
            if (inv.investmentType === 'ENTITY' && inv.entityOwners && Array.isArray(inv.entityOwners)) {
              const targetNameLower = investorName.toLowerCase()
              const investorId = user.id
              
              // First, try to find direct owner match
              let matchingOwner = inv.entityOwners.find((owner: any) => {
                const ownerId = owner.userId || null
                const ownerName = (owner.userName || '').trim()
                return (
                  (ownerId && investorId && String(ownerId) === String(investorId)) ||
                  (ownerName.toLowerCase() === targetNameLower)
                )
              })
              
              if (matchingOwner && matchingOwner.investmentAmount) {
                return {
                  ...inv,
                  investmentAmount: parseFloat(matchingOwner.investmentAmount) || 0,
                  entityOwners: inv.entityOwners
                }
              }
              
              // If no direct match, check if investor is nested in an entity owner's breakdown
              const entityOwnerWithBreakdown = inv.entityOwners.find((owner: any) => {
                return !!owner.investorEntityId && Array.isArray(owner.breakdown) && owner.breakdown.length > 0
              })
              
              if (entityOwnerWithBreakdown && Array.isArray(entityOwnerWithBreakdown.breakdown)) {
                const breakdownMatch = entityOwnerWithBreakdown.breakdown.find((item: any) => {
                  const itemId = item.id || null
                  const itemLabel = (item.label || '').trim().toLowerCase()
                  return (
                    (itemId && investorId && String(itemId) === String(investorId)) ||
                    (itemLabel === targetNameLower)
                  )
                })
                
                if (breakdownMatch && breakdownMatch.amount) {
                  return {
                    ...inv,
                    investmentAmount: parseFloat(breakdownMatch.amount) || 0,
                    entityOwners: inv.entityOwners
                  }
                }
              }
              
              return {
                ...inv,
                investmentAmount: inv.investmentAmount || 0,
                entityOwners: inv.entityOwners
              }
            }
            return {
              ...inv,
              investorName: inv.user ? `${inv.user.firstName || ''} ${inv.user.lastName || ''}`.trim() : investorName
            }
          })
          setInvestments(investorInvestments)
        } else {
          setInvestments(investmentsData)
        }

        // Fetch thumbnails for all investments (same as dashboard)
        const thumbnailPromises = (investmentsData || []).map(async (inv: any) => {
          const propertyId = inv.property?.id || inv.propertyId
          if (!propertyId) return null
          
          try {
            const response = await fetch(`/api/properties/thumbnail/${propertyId}`, {
              headers: {
                'Authorization': `Bearer ${token || ''}`
              }
            })
            if (response.ok) {
              const data = await response.json()
              return { propertyId, thumbnail: data.thumbnail }
            }
          } catch (error) {
            console.error(`Error fetching thumbnail for property ${propertyId}:`, error)
          }
          return { propertyId, thumbnail: null }
        })
        
        const thumbnailResults = await Promise.all(thumbnailPromises)
        const thumbnailMap: { [key: string]: string | null } = {}
        thumbnailResults.forEach((result) => {
          if (result) {
            thumbnailMap[result.propertyId] = result.thumbnail
          }
        })
        setPropertyThumbnails(thumbnailMap)
      } else {
        console.error('Failed to fetch investments:', investmentsResponse.statusText)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewInvestmentDetails = (investmentId: string) => {
    router.push(`/investors/pipeline-tracker/deals/${investmentId}`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getDealBadge = (dealStatus?: string) => {
    switch (dealStatus) {
      case 'STABILIZED': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'UNDER_CONSTRUCTION': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'UNDER_CONTRACT': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'SOLD': return 'bg-slate-50 text-slate-700 border-slate-200'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-blue-200"></div>
            <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-6 text-slate-600 font-medium">Loading your portfolio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-4 sm:p-6 lg:p-8 border border-slate-200/60 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">All Deals & Properties</h2>
              <p className="text-slate-500 font-medium text-sm sm:text-base">Complete investment portfolio</p>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <select
                value={dealFilter}
                onChange={(e) => setDealFilter(e.target.value as any)}
                className="px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm w-full sm:w-auto"
              >
                <option value="ALL">All Status</option>
                <option value="STABILIZED">Stabilized</option>
                <option value="UNDER_CONSTRUCTION">Under Construction</option>
                <option value="UNDER_CONTRACT">Under Contract</option>
                <option value="SOLD">Sold</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {investments
              .filter(inv => inv.fundingStatus === 'FUNDED')
              .filter(inv => dealFilter === 'ALL' ? true : (inv.dealStatus === dealFilter))
              .map((investment) => (
                <div
                  key={investment.id}
                  className="group relative bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden hover:border-blue-300/60 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                  onClick={() => handleViewInvestmentDetails(investment.id)}
                  onMouseEnter={() => setHoveredCard(investment.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {/* Thumbnail Image */}
                  {(() => {
                    const propertyId = (investment as any).property?.id || investment.propertyId
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
                          {investment.fundingStatus || 'FUNDED'}
                        </span>
                      </div>
                    </div>
                  
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors duration-200 break-words">
                      {investment.propertyName || investment.propertyAddress}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mb-4 flex items-start">
                      <MapPinIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="break-words">{investment.propertyAddress}</span>
                    </p>
                    
                    {investment.bedrooms && (
                      <p className="text-sm text-slate-600 mb-4 font-medium">
                        {investment.bedrooms} bed • {investment.bathrooms} bath • {investment.squareFeet?.toLocaleString()} sqft
                      </p>
                    )}
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">Investment</span>
                        <span className="text-sm font-bold text-slate-900">
                          {(() => {
                            // For investors, show individual investment amount from entity owners
                            const shouldShowIndividual = (currentUser?.role === 'INVESTOR')
                            if (investment.investmentType === 'ENTITY' && shouldShowIndividual && (investment as any).entityOwners) {
                              const targetName = currentUser?.role === 'INVESTOR' 
                                ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim().toLowerCase()
                                : ''
                              const matchingOwner = (investment as any).entityOwners.find((owner: any) => 
                                (owner.userName || '').trim().toLowerCase() === targetName
                              )
                              if (matchingOwner && matchingOwner.investmentAmount) {
                                return formatCurrency(matchingOwner.investmentAmount)
                              }
                            }
                            return formatCurrency(investment.investmentAmount)
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">Ownership</span>
                        <span className="text-sm font-bold text-slate-900">
                          {(() => {
                            // For investors, show effective ownership percentage
                            const shouldShowIndividual = (currentUser?.role === 'INVESTOR')
                            if (investment.investmentType === 'ENTITY' && shouldShowIndividual && (investment as any).entityOwners) {
                              const targetName = currentUser?.role === 'INVESTOR'
                                ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim().toLowerCase()
                                : ''
                              const matchingOwner = (investment as any).entityOwners.find((owner: any) => 
                                (owner.userName || '').trim().toLowerCase() === targetName
                              )
                              if (matchingOwner && matchingOwner.ownershipPercentage) {
                                const entityOwnershipOfProperty = (investment.ownershipPercentage || 0) / 100
                                const investorOwnershipOfEntity = (matchingOwner.ownershipPercentage || 0) / 100
                                const effectiveOwnership = entityOwnershipOfProperty * investorOwnershipOfEntity * 100
                                return `${effectiveOwnership.toFixed(1)}%`
                              }
                            }
                            return `${investment.ownershipPercentage}%`
                          })()}
                        </span>
                      </div>
                      {typeof investment.estimatedCurrentDebt === 'number' && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500 font-medium">Est. Current Debt</span>
                          <span className="text-sm font-bold text-slate-900">{formatCurrency(investment.estimatedCurrentDebt)}</span>
                        </div>
                      )}
                      {typeof investment.estimatedMonthlyDebtService === 'number' && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500 font-medium">Monthly Debt Service</span>
                          <span className={`text-sm font-bold text-slate-900`}>{formatCurrency(investment.estimatedMonthlyDebtService)}</span>
                        </div>
                      )}
                      {investment.irr && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500 font-medium">IRR</span>
                          <span className={`text-sm font-bold ${investment.irr > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {formatPercentage(investment.irr)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
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
          
          {investments.filter(inv => inv.fundingStatus === 'FUNDED').length === 0 && (
            <div className="text-center py-20">
              <div className="p-6 bg-slate-100 rounded-3xl w-fit mx-auto mb-6">
                <BuildingOfficeIcon className="h-20 w-20 text-slate-400" />
              </div>
              <p className="text-xl font-semibold text-slate-900 mb-2">No funded investments found.</p>
              <p className="text-slate-500 font-medium">Funded investments will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
