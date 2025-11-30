'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline'

interface Deal {
  id: string
  name: string
  dealStatus: string | null
  fundingStatus: string | null
  currentValue: number | null
  totalCost: number | null
  acquisitionDate: string | null
  property?: {
    id: string
    name: string
    address: string | null
  }
}

export default function PipelineReports() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'quarter' | 'year'>('all')

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || sessionStorage.getItem('token') || localStorage.getItem('token')
    }
    return null
  }

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true)
      const token = getAuthToken()
      if (!token) {
        console.error('No auth token available')
        setLoading(false)
        return
      }

      const response = await fetch('/api/investors/crm/deals', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDeals(data || [])
      } else {
        console.error('Failed to fetch deals:', response.status)
        setDeals([])
      }
    } catch (error) {
      console.error('Error fetching deals:', error)
      setDeals([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDeals()
  }, [fetchDeals])

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Calculate statistics from deals with property data
  const dealsWithProperty = deals.filter(d => d.property)
  const totalDeals = dealsWithProperty.length
  const activeDeals = dealsWithProperty.filter(d => d.dealStatus === 'ACTIVE' || d.fundingStatus === 'FUNDED').length
  
  // Calculate total invested from all deals (using totalCost or estimatedValue)
  const totalInvested = dealsWithProperty.reduce((sum, d) => {
    // Try to get totalCost from property, fallback to deal's totalCost or estimatedValue
    const cost = d.totalCost || (d.property as any)?.totalCost || 0
    return sum + cost
  }, 0)
  
  // Calculate total value from all deals
  const totalValue = dealsWithProperty.reduce((sum, d) => {
    const value = d.currentValue || (d.property as any)?.currentValue || 0
    return sum + value
  }, 0)
  
  // Calculate ROI
  const totalROI = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0

  const dealsByStatus = deals.reduce((acc, deal) => {
    const status = deal.dealStatus || 'UNKNOWN'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const dealsByFundingStatus = deals.reduce((acc, deal) => {
    const status = deal.fundingStatus || 'UNKNOWN'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topDeals = [...dealsWithProperty]
    .sort((a, b) => {
      const aValue = a.currentValue || (a.property as any)?.currentValue || 0
      const bValue = b.currentValue || (b.property as any)?.currentValue || 0
      return bValue - aValue
    })
    .slice(0, 5)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Date Range Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-secondary">Time Period:</label>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm sm:text-base"
        >
          <option value="all">All Time</option>
          <option value="month">Last Month</option>
          <option value="quarter">Last Quarter</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <BuildingOfficeIcon className="h-6 w-6 text-accent" />
            </div>
            <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-xs text-text mb-1">Total Deals</p>
          <p className="text-2xl font-bold text-secondary">{totalDeals}</p>
          <p className="text-xs text-text mt-1">{activeDeals} active</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-primary" />
            </div>
            <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-xs text-text mb-1">Total Value</p>
          <p className="text-2xl font-bold text-secondary">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-text mt-1">Portfolio value</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-accent" />
            </div>
            {totalROI >= 0 ? (
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
            ) : (
              <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
            )}
          </div>
          <p className="text-xs text-text mb-1">Total ROI</p>
          <p className={`text-2xl font-bold ${totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercent(totalROI)}
          </p>
          <p className="text-xs text-text mt-1">
            {formatCurrency(totalValue - totalInvested)} gain/loss
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-primary" />
            </div>
            <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-xs text-text mb-1">Total Invested</p>
          <p className="text-2xl font-bold text-secondary">{formatCurrency(totalInvested)}</p>
          <p className="text-xs text-text mt-1">Initial investment</p>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Deals by Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-secondary mb-4">Deals by Status</h3>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(dealsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-text capitalize">{status.toLowerCase()}</span>
                  <div className="flex items-center gap-3 flex-1 mx-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-accent to-primary h-2 rounded-full"
                        style={{ width: `${(count / totalDeals) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-secondary w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deals by Funding Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-secondary mb-4">Deals by Funding Status</h3>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(dealsByFundingStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-text capitalize">{status.toLowerCase()}</span>
                  <div className="flex items-center gap-3 flex-1 mx-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary to-accent h-2 rounded-full"
                        style={{ width: `${(count / totalDeals) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-secondary w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Deals */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-secondary mb-4">Top Deals by Value</h3>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        ) : topDeals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text">No deals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-secondary">Deal</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-secondary">Property</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-secondary">Value</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-secondary">Cost</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-secondary">ROI</th>
                </tr>
              </thead>
              <tbody>
                {topDeals.map((deal) => {
                  const dealCost = deal.totalCost || (deal.property as any)?.totalCost || 0
                  const dealValue = deal.currentValue || (deal.property as any)?.currentValue || 0
                  const roi = dealCost > 0 ? ((dealValue - dealCost) / dealCost) * 100 : 0
                  return (
                    <tr key={deal.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-secondary">{deal.name}</td>
                      <td className="py-3 px-4 text-sm text-text">
                        {deal.property?.name || deal.property?.address || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-secondary">
                        {formatCurrency(dealValue)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-text">
                        {formatCurrency(dealCost)}
                      </td>
                      <td className={`py-3 px-4 text-sm text-right font-medium ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(roi)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

