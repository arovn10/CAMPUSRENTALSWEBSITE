'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChartBarIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  BellIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  XMarkIcon,
  ArrowUpRightIcon
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
  distributions?: Distribution[]
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
  // Optional nested property details for NOI calculations
  property?: {
    monthlyRent?: number
    otherIncome?: number
    annualExpenses?: number
    capRate?: number
    totalCost?: number
    acquisitionPrice?: number
    constructionCost?: number
  }
  totalOriginalDebt?: number
  totalProjectCost?: number
}

interface Distribution {
  id: string
  investmentId: string
  amount: number
  date: string
  type: 'RENTAL' | 'SALE' | 'REFINANCE' | 'INSURANCE_SETTLEMENT' | 'OTHER'
}

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'INVESTOR' | 'MANAGER'
  company?: string
  phone?: string
  createdAt: string
  lastLogin: string
}

interface DashboardStats {
  totalInvested: number
  currentValue: number
  projectedValue: number
  totalEquity?: number
  totalEquityToday?: number
  totalEquityProjected?: number
  totalReturn: number
  totalIrr: number
  activeInvestments: number
  totalDistributions: number
  pendingDistributions: number
  documentsCount: number
  unreadNotifications: number
  totalProperties: number
  totalSquareFeet: number
  averageIRR: number
  monthlyRevenue: number
  monthlyDebtServiceAndCondoFees: number
  monthlyNOIBeforeDebt: number
  monthlyNOIAfterDebt: number
  yearlyNOIBeforeDebt: number
  yearlyNOIAfterDebt: number
  totalProjectCost: number
}

export default function InvestorDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalInvested: 0,
    currentValue: 0,
    projectedValue: 0,
    totalEquity: 0,
    totalEquityToday: 0,
    totalEquityProjected: 0,
    totalReturn: 0,
    totalIrr: 0,
    activeInvestments: 0,
    totalDistributions: 0,
    pendingDistributions: 0,
    documentsCount: 0,
    unreadNotifications: 0,
    totalProperties: 0,
    totalSquareFeet: 0,
    averageIRR: 0,
    monthlyRevenue: 0,
    monthlyDebtServiceAndCondoFees: 0,
    monthlyNOIBeforeDebt: 0,
    monthlyNOIAfterDebt: 0,
    yearlyNOIBeforeDebt: 0,
    yearlyNOIAfterDebt: 0,
    totalProjectCost: 0
  })
  const [loading, setLoading] = useState(true)
  const [showInvestedBreakdown, setShowInvestedBreakdown] = useState(false)
  const [investedBreakdown, setInvestedBreakdown] = useState<{ property: string; amount: number }[]>([])
  // Legacy: keep a single "overview" view so any stray reference to activeView (e.g. from sessionStorage or links) does not throw
  const activeView = 'overview'

  useEffect(() => {
    const user = sessionStorage.getItem('currentUser')
    if (user) {
      const userData = JSON.parse(user)
      setCurrentUser(userData)
      
      // Restore active tab from sessionStorage if available
      fetchDashboardData(userData)
    } else {
      router.push('/investors/login')
    }
  }, [router])

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
        try {
          // High-signal client-side logs to compare with server logs
          console.log('[DASHBOARD] Raw API investments', {
            role: user.role,
            count: investmentsData.length,
            totalAmount: investmentsData.reduce((s: number, i: any) => s + (i.investmentAmount || 0), 0),
            sample: investmentsData.slice(0, 3).map((i: any) => ({ property: i.propertyName, type: i.investmentType, amount: i.investmentAmount }))
          })
        } catch {}
        // For investors, if they're auto-filtered, we need to recalculate stats
        // But first, just calculate with all returned investments (API already filters for investors)
        // The useEffect will handle the person filter recalculation
        if (user.role === 'INVESTOR') {
          // For investors, the API already filters to their investments
          // Extract individual amounts from entity owners (for overview stats calculation)
          // NOTE: We do NOT scale property values here - scaling only applies to Analytics table
          const investorName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
          const investorInvestments = investmentsData.map((inv: any) => {
            if (inv.investmentType === 'ENTITY' && inv.entityOwners && Array.isArray(inv.entityOwners)) {
              // Find the owner that matches this investor (case-insensitive)
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
                // Direct owner match found
                return {
                  ...inv,
                  investmentAmount: parseFloat(matchingOwner.investmentAmount) || 0,
                  entityOwners: inv.entityOwners // Preserve for filtering
                }
              }
              
              // If no direct match, check if investor is nested in an entity owner's breakdown
              // (e.g., Campus Rentals LLC inside Campus Rentals 2 LLC)
              const entityOwnerWithBreakdown = inv.entityOwners.find((owner: any) => {
                return !!owner.investorEntityId && Array.isArray(owner.breakdown) && owner.breakdown.length > 0
              })
              
              if (entityOwnerWithBreakdown && Array.isArray(entityOwnerWithBreakdown.breakdown)) {
                // Search breakdown array for the investor
                const breakdownMatch = entityOwnerWithBreakdown.breakdown.find((item: any) => {
                  const itemId = item.id || null
                  const itemLabel = (item.label || '').trim().toLowerCase()
                  return (
                    (itemId && investorId && String(itemId) === String(investorId)) ||
                    (itemLabel === targetNameLower)
                  )
                })
                
                if (breakdownMatch && breakdownMatch.amount) {
                  // Found investor in nested entity breakdown
                  return {
                    ...inv,
                    investmentAmount: parseFloat(breakdownMatch.amount) || 0,
                    entityOwners: inv.entityOwners // Preserve for filtering
                  }
                }
              }
              
              // If no match found (direct or nested), use API's calculated amount (API already handles nested entities correctly)
              // Only set to 0 if API also returned 0
              return {
                ...inv,
                investmentAmount: inv.investmentAmount || 0, // Preserve API's calculated amount
                entityOwners: inv.entityOwners // Preserve for filtering
              }
            }
            // For direct investments, add investorName field for filtering
            return {
              ...inv,
              investorName: inv.user ? `${inv.user.firstName || ''} ${inv.user.lastName || ''}`.trim() : investorName
            }
          })
          
          // CRITICAL: Set investments state with processed data that has entityOwners preserved
          setInvestments(investorInvestments)
          
          // Debug: Log raw API response to see what entityOwners data we're getting
          const entityInvestmentsFromAPI = investmentsData.filter((inv: any) => inv.investmentType === 'ENTITY')
          console.log('Investor stats calculation:', {
            investorName,
            totalInvestments: investmentsData.length,
            entityInvestmentsCount: entityInvestmentsFromAPI.length,
            processedInvestments: investorInvestments.length,
            totalInvested: investorInvestments.reduce((sum: number, inv: any) => sum + (inv.investmentAmount || 0), 0),
            rawAPISample: investmentsData[0] ? {
              property: investmentsData[0].propertyName,
              type: investmentsData[0].investmentType,
              hasEntityOwners: !!(investmentsData[0] as any).entityOwners,
              entityOwnersCount: (investmentsData[0] as any).entityOwners?.length || 0,
              entityOwnerNames: (investmentsData[0] as any).entityOwners?.map((o: any) => o.userName) || []
            } : null,
            processedSample: investorInvestments[0] ? {
              property: investorInvestments[0].propertyName,
              amount: investorInvestments[0].investmentAmount,
              type: investorInvestments[0].investmentType,
              hasEntityOwners: !!(investorInvestments[0] as any).entityOwners,
              entityOwnersCount: (investorInvestments[0] as any).entityOwners?.length || 0,
              entityOwners: (investorInvestments[0] as any).entityOwners?.map((o: any) => ({
                name: o.userName,
                amount: o.investmentAmount
              })) || [],
              investorName: (investorInvestments[0] as any).investorName
            } : null,
            sampleEntityInvestment: investorInvestments.find((inv: any) => inv.investmentType === 'ENTITY') ? {
              property: investorInvestments.find((inv: any) => inv.investmentType === 'ENTITY')?.propertyName,
              hasEntityOwners: !!(investorInvestments.find((inv: any) => inv.investmentType === 'ENTITY') as any)?.entityOwners,
              entityOwnersCount: (investorInvestments.find((inv: any) => inv.investmentType === 'ENTITY') as any)?.entityOwners?.length || 0,
              entityOwnerNames: (investorInvestments.find((inv: any) => inv.investmentType === 'ENTITY') as any)?.entityOwners?.map((o: any) => o.userName) || []
            } : null
          })
          
          calculateStats(investorInvestments)
        } else {
          setInvestments(investmentsData || [])
          calculateStats(investmentsData || [])
        }
      }
    } catch (error) {
      // Silent error handling for smooth UX
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (investmentData: Investment[]) => {
    // Exclude UNDER_CONSTRUCTION for equity and project cost metrics
    const notUnderConstruction = investmentData.filter(inv => inv.dealStatus !== 'UNDER_CONSTRUCTION')
    const irrIncluded = notUnderConstruction

    // Overview: Total Invested = sum of investments for FUNDED deals (any status)
    const totalInvestedOverview = investmentData
      .filter(inv => inv.fundingStatus === 'FUNDED')
      .reduce((sum, inv) => sum + (inv.investmentAmount ?? 0), 0)
    // Helpers to estimate value from NOI calculator
    const estimateValue = (inv: Investment) => {
      const rent = inv.property?.monthlyRent ?? 0
      const other = inv.property?.otherIncome ?? 0
      const annualExp = inv.property?.annualExpenses ?? 0
      const capRate = inv.property?.capRate ?? 0
      const annualNOI = Math.max(((rent + other) * 12) - annualExp, 0)
      return capRate > 0 ? (annualNOI / (capRate / 100)) : (inv.currentValue ?? 0)
    }
    // Current value: sum of estimated values for active (stabilized) properties
    const currentValue = investmentData
      .filter(inv => inv.dealStatus === 'STABILIZED')
      .reduce((sum: number, inv: Investment) => sum + estimateValue(inv), 0)
    // Projected value: sum for all not SOLD projects (includes under construction)
    const projectedValue = investmentData
      .filter(inv => inv.dealStatus !== 'SOLD')
      .reduce((sum: number, inv: Investment) => sum + estimateValue(inv), 0)
    // Total current value (all FUNDED) for return calc: same formula as API (currentValue + distributions - invested)
    const fundedForReturn = investmentData.filter(inv => inv.fundingStatus === 'FUNDED')
    const totalCurrentValueAll = fundedForReturn.reduce((sum: number, inv: Investment) => {
      const val = inv.currentValue ?? inv.property?.currentValue ?? estimateValue(inv)
      return sum + (typeof val === 'number' ? val : 0)
    }, 0)
    // Totals for FUNDED
    const totalFundedDebt = investmentData
      .filter(inv => inv.fundingStatus === 'FUNDED')
      .reduce((sum, inv) => sum + (inv.estimatedCurrentDebt ?? 0), 0)
    const totalFundedAndStabilizedDebt = investmentData
      .filter(inv => inv.fundingStatus === 'FUNDED' && inv.dealStatus === 'STABILIZED')
      .reduce((sum, inv) => sum + (inv.estimatedCurrentDebt ?? 0), 0)
    const totalInvestedFundedAndStabilized = investmentData
      .filter(inv => inv.fundingStatus === 'FUNDED' && inv.dealStatus === 'STABILIZED')
      .reduce((sum, inv) => sum + (inv.investmentAmount ?? 0), 0)

    // Equity (Today): currentValue (stabilized) - invested (FUNDED & STABILIZED) - current debt (FUNDED & STABILIZED)
    const totalEquityToday = currentValue - totalInvestedFundedAndStabilized - totalFundedAndStabilizedDebt
    // Equity (Projected): projectedValue (all non-sold) - invested (FUNDED) - current debt (FUNDED)
    const totalEquityProjected = projectedValue - totalInvestedOverview - totalFundedDebt
    const totalEquity = totalEquityToday

    const totalDistributions = investmentData.reduce((sum, inv) =>
      sum + (inv.distributions?.reduce((distSum, dist) => distSum + dist.amount, 0) ?? 0), 0
    )
    // Total return = current value + distributions - invested (consistent with API and reports)
    const totalReturn = totalCurrentValueAll + totalDistributions - totalInvestedOverview
    const activeInvestments = investmentData.filter(inv => inv.status === 'ACTIVE').length
    const averageIRR = irrIncluded.length > 0
      ? irrIncluded.reduce((sum, inv) => sum + (inv.irr ?? 0), 0) / irrIncluded.length
      : 0
    const totalProperties = investmentData.length
    const totalSquareFeet = investmentData.reduce((sum, inv) => sum + (inv.squareFeet || 0), 0)

    // Filter for stabilized, funded properties only (used for revenue/NOI calculations)
    const stabilizedFunded = investmentData.filter(inv => inv.dealStatus === 'STABILIZED' && inv.fundingStatus === 'FUNDED')

    // Monthly Revenue (from stabilized, funded properties only) - sum of rent + other income
    const monthlyRevenue = stabilizedFunded.reduce((sum: number, inv: Investment) => {
      const rent = inv.property?.monthlyRent || 0
      const other = inv.property?.otherIncome || 0
      return sum + (rent + other)
    }, 0)

    // Monthly Debt Service and Condo Fees (from stabilized, funded properties only)
    const monthlyDebtServiceAndCondoFees = stabilizedFunded.reduce((sum: number, inv: Investment) => {
      const debtSvc = inv.estimatedMonthlyDebtService || 0
      // TODO: Add condo fees if available in property data
      return sum + debtSvc
    }, 0)

    // NOI aggregates (from stabilized, funded properties only)
    // Monthly NOI Before Debt = Revenue (rent + other income) - Operating Expenses
    const monthlyNOIBeforeDebt = stabilizedFunded.reduce((sum: number, inv: Investment) => {
      const rent = inv.property?.monthlyRent || 0
      const other = inv.property?.otherIncome || 0
      const annualExp = inv.property?.annualExpenses || 0
      const monthlyExp = annualExp / 12
      return sum + Math.max((rent + other) - monthlyExp, 0)
    }, 0)

    // Monthly NOI After Debt = Monthly NOI Before Debt - Monthly Debt Service
    const monthlyNOIAfterDebt = monthlyNOIBeforeDebt - monthlyDebtServiceAndCondoFees

    const yearlyNOIBeforeDebt = monthlyNOIBeforeDebt * 12
    const yearlyNOIAfterDebt = monthlyNOIAfterDebt * 12

    // Total Original Debt (FUNDED + STABILIZED)
    const totalOriginalDebtFundedStabilized = investmentData
      .filter(inv => inv.fundingStatus === 'FUNDED' && inv.dealStatus === 'STABILIZED')
      .reduce((sum, inv) => sum + (inv.totalOriginalDebt || 0), 0)

    // Total Project Cost (current) = Total Original Debt (FUNDED+STABILIZED) + Total Equity Today
    const totalProjectCost = totalOriginalDebtFundedStabilized + totalEquityToday
    const portfolioYieldOnCost = totalProjectCost > 0 ? (yearlyNOIBeforeDebt / totalProjectCost) * 100 : 0

    setStats({
      totalInvested: totalInvestedOverview,
      currentValue,
      projectedValue,
      totalEquity,
      totalEquityToday,
      totalEquityProjected,
      totalReturn,
      totalIrr: averageIRR,
      activeInvestments,
      totalDistributions,
      pendingDistributions: 0,
      documentsCount: 0,
      unreadNotifications: 0,
      totalProperties,
      totalSquareFeet,
      averageIRR,
      monthlyRevenue,
      monthlyDebtServiceAndCondoFees,
      monthlyNOIBeforeDebt,
      monthlyNOIAfterDebt,
      yearlyNOIBeforeDebt,
      yearlyNOIAfterDebt,
      totalProjectCost
    })
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
    <div className="min-h-screen bg-[#fafafa]" style={{ fontFamily: 'var(--font-sans)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-10 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">Overview</h1>
          <p className="mt-1 text-[15px] text-slate-500">Your portfolio at a glance</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-10">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              const breakdown = investments
                .filter(inv => inv.fundingStatus === 'FUNDED')
                .map(inv => ({ property: inv.propertyName || inv.name || 'Deal', amount: inv.investmentAmount || 0 }))
                .filter(item => (item.amount || 0) > 0)
                .sort((a, b) => b.amount - a.amount)
              setInvestedBreakdown(breakdown)
              setShowInvestedBreakdown(true)
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).click()}
            className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300/80 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-slate-100 rounded-xl">
                <CurrencyDollarIcon className="h-5 w-5 text-slate-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Invested</span>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-slate-900">{formatCurrency(stats.totalInvested)}</p>
            <p className="text-sm text-emerald-600 font-medium mt-1">Growing</p>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-slate-100 rounded-xl">
                <ChartBarIcon className="h-5 w-5 text-slate-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current Value</span>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-slate-900">{formatCurrency(stats.currentValue)}</p>
            <p className="text-sm text-slate-500 font-medium mt-1">Stabilized portfolio</p>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-slate-100 rounded-xl">
                <BanknotesIcon className="h-5 w-5 text-slate-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Distributions</span>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-slate-900">{formatCurrency(stats.totalDistributions)}</p>
            <p className="text-sm text-slate-500 font-medium mt-1">Cash received</p>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-slate-100 rounded-xl">
                <ArrowTrendingUpIcon className="h-5 w-5 text-slate-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Average IRR</span>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-slate-900">{formatPercentage(stats.averageIRR)}</p>
            <p className="text-sm text-slate-500 font-medium mt-1">Performance</p>
          </div>
        </div>

        <section className="border-t border-slate-200/80 pt-8">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Quick access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/investors/documents"
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all"
            >
              <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                <DocumentTextIcon className="h-5 w-5 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-slate-900">Documents</p>
                <p className="text-xs text-slate-500">Tax, PPM, statements</p>
              </div>
              <ArrowUpRightIcon className="h-4 w-4 text-slate-400 ml-auto flex-shrink-0" />
            </Link>
            <Link
              href="/investors/updates"
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all"
            >
              <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                <BellIcon className="h-5 w-5 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-slate-900">Updates</p>
                <p className="text-xs text-slate-500">Announcements & notices</p>
              </div>
              <ArrowUpRightIcon className="h-4 w-4 text-slate-400 ml-auto flex-shrink-0" />
            </Link>
            <Link
              href="/investors/performance"
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all"
            >
              <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                <ChartBarIcon className="h-5 w-5 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-slate-900">Performance</p>
                <p className="text-xs text-slate-500">Reports & export</p>
              </div>
              <ArrowUpRightIcon className="h-4 w-4 text-slate-400 ml-auto flex-shrink-0" />
            </Link>
          </div>
        </section>
      </div>

      {showInvestedBreakdown && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-4 sm:py-10 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 my-4">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 break-words pr-2">Total Invested Breakdown</h3>
              <button onClick={() => setShowInvestedBreakdown(false)} className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex-shrink-0 font-medium">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 divide-y divide-slate-100">
              {investedBreakdown.length > 0 ? (
                investedBreakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3">
                    <span className="text-slate-700 font-medium">{item.property}</span>
                    <span className="text-slate-900 font-semibold">{formatCurrency(item.amount)}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No funded investments found.</p>
              )}
              <div className="flex items-center justify-between pt-4 mt-2">
                <span className="text-slate-600 font-medium">Total</span>
                <span className="text-slate-900 font-bold">{formatCurrency(investedBreakdown.reduce((s, i) => s + (i.amount || 0), 0))}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 