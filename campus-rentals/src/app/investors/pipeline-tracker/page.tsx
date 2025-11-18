'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  BanknotesIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import CRMDealPipeline from '@/components/CRMDealPipeline'

interface Investment {
  id: string
  propertyName?: string
  propertyAddress?: string
  investmentAmount: number
  ownershipPercentage: number
  status: string
  currentValue?: number
  totalReturn?: number
  irr?: number
  investmentType?: 'DIRECT' | 'ENTITY'
  dealStatus?: 'STABILIZED' | 'UNDER_CONSTRUCTION' | 'UNDER_CONTRACT' | 'SOLD'
  fundingStatus?: 'FUNDED' | 'FUNDING'
  estimatedCurrentDebt?: number
  estimatedMonthlyDebtService?: number
}

interface Stats {
  totalInvested: number
  currentValue: number
  projectedValue: number
  totalDistributions: number
  averageIRR: number
  activeDeals: number
  totalProperties: number
}

export default function PipelineTrackerDashboard() {
  const router = useRouter()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [stats, setStats] = useState<Stats>({
    totalInvested: 0,
    currentValue: 0,
    projectedValue: 0,
    totalDistributions: 0,
    averageIRR: 0,
    activeDeals: 0,
    totalProperties: 0,
  })
  const [loading, setLoading] = useState(true)
  const [showPipeline, setShowPipeline] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || sessionStorage.getItem('token') || localStorage.getItem('token')
        
        const response = await fetch('/api/investors/properties', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setInvestments(data)
          
          // Calculate stats
          const totalInvested = data.reduce((sum: number, inv: Investment) => sum + (inv.investmentAmount || 0), 0)
          const currentValue = data.reduce((sum: number, inv: Investment) => sum + (inv.currentValue || inv.investmentAmount || 0), 0)
          const totalDistributions = data.reduce((sum: number, inv: Investment) => sum + (inv.totalReturn || 0), 0)
          const irrs = data.filter((inv: Investment) => inv.irr !== undefined && inv.irr !== null).map((inv: Investment) => inv.irr || 0)
          const averageIRR = irrs.length > 0 ? irrs.reduce((sum: number, irr: number) => sum + irr, 0) / irrs.length : 0
          const activeDeals = data.filter((inv: Investment) => inv.status === 'ACTIVE' || inv.fundingStatus === 'FUNDING').length
          const totalProperties = new Set(data.map((inv: Investment) => inv.propertyName)).size

          setStats({
            totalInvested,
            currentValue,
            projectedValue: currentValue, // Can be enhanced with pipeline deals
            totalDistributions,
            averageIRR,
            activeDeals,
            totalProperties,
          })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline Tracker Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your deal pipeline and key metrics</p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Total Invested */}
        <div className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-accent/10 transition-all duration-500 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-gradient-to-br from-accent to-primary rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invested</p>
              <div className="flex items-center mt-1">
                <ArrowTrendingUpIcon className="h-3 w-3 text-accent mr-1" />
                <span className="text-xs text-accent font-medium">Growing</span>
              </div>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-2">{formatCurrency(stats.totalInvested)}</h3>
          <div className="h-1 bg-gradient-to-r from-accent to-primary rounded-full"></div>
        </div>

        {/* Current Value */}
        <div className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Value</p>
              <div className="flex items-center mt-1">
                <SparklesIcon className="h-3 w-3 text-primary mr-1" />
                <span className="text-xs text-primary font-medium">Appreciating</span>
              </div>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-2">{formatCurrency(stats.currentValue)}</h3>
          <div className="h-1 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
        </div>

        {/* Active Deals */}
        <div className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-secondary/10 transition-all duration-500 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-gradient-to-br from-secondary to-primary rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <BuildingOfficeIcon className="h-6 w-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Deals</p>
              <div className="flex items-center mt-1">
                <SparklesIcon className="h-3 w-3 text-secondary mr-1" />
                <span className="text-xs text-secondary font-medium">In Pipeline</span>
              </div>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-2">{stats.activeDeals}</h3>
          <div className="h-1 bg-gradient-to-r from-secondary to-primary rounded-full"></div>
        </div>

        {/* Average IRR */}
        <div className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-accent/10 transition-all duration-500 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-gradient-to-br from-accent via-primary to-secondary rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average IRR</p>
              <div className="flex items-center mt-1">
                <ChartBarIcon className="h-3 w-3 text-accent mr-1" />
                <span className="text-xs text-accent font-medium">Performance</span>
              </div>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-2">{formatPercentage(stats.averageIRR)}</h3>
          <div className="h-1 bg-gradient-to-r from-accent via-primary to-secondary rounded-full"></div>
        </div>
      </div>

      {/* Toggle Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowPipeline(!showPipeline)}
          className="px-4 py-2 bg-gradient-to-r from-accent to-primary text-white rounded-lg hover:from-accent/90 hover:to-primary/90 transition-all shadow-md hover:shadow-lg"
        >
          {showPipeline ? 'Hide' : 'Show'} Deal Pipeline
        </button>
      </div>

      {/* Deal Pipeline (Toggleable) */}
      {showPipeline && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <CRMDealPipeline />
        </div>
      )}
    </div>
  )
}
