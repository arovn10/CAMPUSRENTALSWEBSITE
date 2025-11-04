'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  CurrencyDollarIcon, 
  HomeIcon,
  BuildingOfficeIcon,
  BellIcon,
  CogIcon,
  UserIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  BanknotesIcon,
  DocumentIcon,
  PlusIcon,
  UsersIcon,
  ChartPieIcon,
  CalculatorIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpRightIcon,
  SparklesIcon,
  StarIcon
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
  const [activeView, setActiveView] = useState<'overview' | 'deals' | 'analytics'>('overview')
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [dealFilter, setDealFilter] = useState<'ALL' | 'STABILIZED' | 'UNDER_CONSTRUCTION' | 'UNDER_CONTRACT' | 'SOLD'>('ALL')
  const [analyticsScope, setAnalyticsScope] = useState<'ALL' | 'PERSON' | 'ENTITY'>('ALL')
  const [analyticsTarget, setAnalyticsTarget] = useState<string>('ALL')
  const [showProformaModal, setShowProformaModal] = useState(false)
  const [proformaRows, setProformaRows] = useState<any[]>([])
  const [proformaTitle, setProformaTitle] = useState<string>('')
  const [showCalcModal, setShowCalcModal] = useState(false)
  const [calcTitle, setCalcTitle] = useState('')
  const [calcLines, setCalcLines] = useState<{ label: string; value: number }[]>([])
  const [showInvestedBreakdown, setShowInvestedBreakdown] = useState(false)
  const [investedBreakdown, setInvestedBreakdown] = useState<{ property: string; amount: number }[]>([])

  useEffect(() => {
    const user = sessionStorage.getItem('currentUser')
    if (user) {
      const userData = JSON.parse(user)
      setCurrentUser(userData)
      
      // For investors (non-admin), automatically filter by their name
      if (userData.role === 'INVESTOR') {
        const investorName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
        if (investorName) {
          setAnalyticsScope('PERSON')
          setAnalyticsTarget(investorName)
        }
      }
      
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
              const matchingOwner = inv.entityOwners.find((owner: any) => {
                const ownerName = (owner.userName || '').trim()
                return ownerName.toLowerCase() === targetNameLower
              })
              if (matchingOwner && matchingOwner.investmentAmount) {
                // Only update investmentAmount to individual amount, but keep all property values at full amount
                // IMPORTANT: Preserve entityOwners array for person filter to work
                return {
                  ...inv,
                  investmentAmount: parseFloat(matchingOwner.investmentAmount) || 0,
                  entityOwners: inv.entityOwners // Preserve for filtering
                }
              }
              // If no match found, return with 0 investment amount but preserve entityOwners
              return {
                ...inv,
                investmentAmount: 0,
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

  // Recalculate stats when person filter changes
  useEffect(() => {
    if (investments.length > 0 && analyticsScope === 'PERSON' && analyticsTarget !== 'ALL') {
      // Filter investments to only this person's investments
      // NOTE: We do NOT scale property values here - scaling only applies to Analytics table display
      const personInvestments: Investment[] = []
      const targetName = analyticsTarget.trim().toLowerCase()
      
      investments.forEach(inv => {
        if (inv.investmentType === 'ENTITY' && (inv as any).entityOwners && Array.isArray((inv as any).entityOwners) && (inv as any).entityOwners.length > 0) {
          // Check if this person is an owner in this entity investment (case-insensitive match)
          const matchingOwner = (inv as any).entityOwners.find((owner: any) => {
            const ownerName = (owner.userName || '').trim().toLowerCase()
            // Also try matching by first and last name separately if userName is a full name
            const ownerNameParts = ownerName.split(' ')
            const targetNameParts = targetName.split(' ')
            const exactMatch = ownerName === targetName
            const namePartsMatch = ownerNameParts.length >= 2 && targetNameParts.length >= 2 && 
                                  ownerNameParts[0] === targetNameParts[0] && 
                                  ownerNameParts[1] === targetNameParts[1]
            
            // Debug logging for Joseph St specifically
            if (inv.propertyName && inv.propertyName.includes('Joseph')) {
              console.log(`[Person Filter] Checking Joseph St investment:`, {
                property: inv.propertyName,
                ownerName,
                targetName,
                exactMatch,
                namePartsMatch,
                ownerNameParts,
                targetNameParts,
                allOwners: (inv as any).entityOwners.map((o: any) => o.userName)
              })
            }
            
            return exactMatch || namePartsMatch
          })
          
          if (matchingOwner) {
            // Only update investmentAmount to individual amount, keep property values at full amount
            personInvestments.push({
              ...inv,
              investmentAmount: matchingOwner.investmentAmount || 0
            })
            
            // Debug logging
            if (inv.propertyName && inv.propertyName.includes('Joseph')) {
              console.log(`[Person Filter] Matched Joseph St for ${targetName}:`, {
                individualInvestment: matchingOwner.investmentAmount,
                totalInvestment: inv.investmentAmount
              })
            }
          } else {
            // Debug logging for unmatched entity investments
            if (inv.propertyName && inv.propertyName.includes('Joseph')) {
              console.log(`[Person Filter] Joseph St NOT matched for ${targetName}. Entity owners:`, (inv as any).entityOwners.map((o: any) => ({
                userName: o.userName,
                userNameLower: (o.userName || '').trim().toLowerCase()
              })))
            }
          }
        } else if (inv.investmentType === 'DIRECT') {
          // Direct investment - check if investor name matches (case-insensitive)
          // Try multiple name fields
          const invName = (
            (inv as any).investorName || 
            ((inv as any).user ? `${(inv as any).user.firstName || ''} ${(inv as any).user.lastName || ''}`.trim() : '') ||
            ''
          ).trim().toLowerCase()
          if (invName === targetName) {
            personInvestments.push(inv)
          }
        }
      })
      
      // Enhanced debugging - check all entity investments
      const entityInvestments = investments.filter((inv: any) => inv.investmentType === 'ENTITY')
      const directInvestments = investments.filter((inv: any) => inv.investmentType === 'DIRECT')
      
      console.log('Person filter stats calculation:', {
        targetName,
        totalInvestments: investments.length,
        entityInvestmentsCount: entityInvestments.length,
        directInvestmentsCount: directInvestments.length,
        personInvestments: personInvestments.length,
        entityInvestmentsWithOwners: entityInvestments.filter((inv: any) => (inv as any).entityOwners && Array.isArray((inv as any).entityOwners) && (inv as any).entityOwners.length > 0).length,
        entityInvestmentsDetails: entityInvestments.slice(0, 3).map((inv: any) => ({
          property: inv.propertyName,
          hasEntityOwners: !!(inv as any).entityOwners,
          entityOwnersCount: (inv as any).entityOwners?.length || 0,
          entityOwnerNames: (inv as any).entityOwners?.map((o: any) => ({
            userName: o.userName,
            userNameLower: (o.userName || '').trim().toLowerCase(),
            investmentAmount: o.investmentAmount
          })) || [],
          matchesTarget: (inv as any).entityOwners?.some((o: any) => 
            (o.userName || '').trim().toLowerCase() === targetName
          ) || false
        })),
        directInvestmentsDetails: directInvestments.slice(0, 3).map((inv: any) => ({
          property: inv.propertyName,
          investorName: (inv as any).investorName,
          investorNameLower: ((inv as any).investorName || '').trim().toLowerCase(),
          matchesTarget: ((inv as any).investorName || '').trim().toLowerCase() === targetName
        }))
      })
      
      // Recalculate stats based on person's investments only
      calculateStats(personInvestments)
    } else if (investments.length > 0 && (analyticsScope === 'ALL' || analyticsTarget === 'ALL')) {
      // Recalculate stats for all investments
      calculateStats(investments)
    }
  }, [analyticsScope, analyticsTarget, investments])

  const estimateValueFromNOI = (inv: Investment) => {
    const rent = inv.property?.monthlyRent || 0
    const other = inv.property?.otherIncome || 0
    const annualExp = inv.property?.annualExpenses || 0
    const capRate = inv.property?.capRate || 0
    const annualNOI = Math.max(((rent + other) * 12) - annualExp, 0)
    return capRate > 0 ? (annualNOI / (capRate / 100)) : (inv.currentValue || 0)
  }

  const openProforma = (inv: Investment) => {
    const years = [0,1,2,3,4,5]
    const rows: any[] = []
    const cashflows: number[] = []

    const loans: any[] = (inv as any).loans || []
    const loanStates = loans.map(l => ({
      balance: (l.currentBalance ?? l.originalAmount ?? 0) as number,
      rate: ((l.interestRate ?? 0) as number) / 100,
      monthlyPayment: (l.monthlyPayment ?? 0) as number,
      type: (l.paymentType || 'AMORTIZING') as string,
      amortYears: (l.amortizationYears || 30) as number
    }))
    const hasLoans = loanStates.length > 0

    const annualRevenue = ((inv.property?.monthlyRent || 0) + (inv.property?.otherIncome || 0)) * 12
    const annualExpenses = inv.property?.annualExpenses || 0

    years.forEach((yr) => {
      if (yr === 0) {
        rows.push({
          year: 0,
          revenue: 0,
          expenses: 0,
          noi: 0,
          interest: 0,
          principal: 0,
          debtService: 0,
          endingDebt: loanStates.reduce((s, l) => s + l.balance, 0),
          exitProceeds: 0,
          cashFlow: -(inv.investmentAmount || 0),
          dscr: null,
          irrToDate: null
        })
        cashflows.push(-(inv.investmentAmount || 0))
        return
      }

      let interestPaid = 0
      let principalPaid = 0
      if (hasLoans) {
        loanStates.forEach(ls => {
          if (ls.balance <= 0) return
          if (ls.type === 'IO') {
            const annualInterest = ls.balance * ls.rate
            interestPaid += annualInterest
          } else {
            let monthlyPay = ls.monthlyPayment
            if (!monthlyPay || monthlyPay <= 0) {
              const i = ls.rate / 12
              const n = (ls.amortYears || 30) * 12
              monthlyPay = i > 0 ? (ls.balance * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)) : (ls.balance / n)
            }
            for (let m = 0; m < 12; m++) {
              const monthlyInterest = ls.balance * (ls.rate / 12)
              const monthlyPrincipal = Math.max(monthlyPay - monthlyInterest, 0)
              interestPaid += monthlyInterest
              const appliedPrincipal = Math.min(monthlyPrincipal, ls.balance)
              principalPaid += appliedPrincipal
              ls.balance = Math.max(ls.balance - appliedPrincipal, 0)
              if (ls.balance <= 0) break
            }
          }
        })
      } else {
        // Fallback to estimated monthly debt service when loans are not available
        const annualDebtSvc = (inv.estimatedMonthlyDebtService || 0) * 12
        interestPaid = annualDebtSvc
        principalPaid = 0
      }

      const revenue = annualRevenue
      const expenses = annualExpenses
      const noi = Math.max(revenue - expenses, 0)
      const debtService = interestPaid + principalPaid

      let exitSaleValue = 0
      let debtPayoff = 0
      if (yr === 5) {
        exitSaleValue = estimateValueFromNOI(inv)
        const endingDebtVal = hasLoans ? loanStates.reduce((s, l) => s + l.balance, 0) : (inv.estimatedCurrentDebt || 0)
        debtPayoff = endingDebtVal
      }

      const cashFlow = (noi - debtService) + (exitSaleValue - debtPayoff)
      cashflows.push(cashFlow)

      const dscr = debtService > 0 ? (noi / debtService) : null
      const irrToDate = computeIRR(cashflows)

      const endingDebtVal = hasLoans ? loanStates.reduce((s, l) => s + l.balance, 0) : (inv.estimatedCurrentDebt || 0)
      rows.push({
        year: yr,
        revenue,
        expenses,
        noi,
        interest: interestPaid,
        principal: principalPaid,
        debtService,
        endingDebt: endingDebtVal,
        exitSaleValue,
        debtPayoff: yr === 5 ? endingDebtVal : 0,
        exitProceeds: Math.max(exitSaleValue - debtPayoff, 0),
        cashFlow,
        dscr,
        irrToDate,
      })
    })

    setProformaRows(rows)
    setProformaTitle(inv.propertyName || inv.propertyAddress)
    setShowProformaModal(true)
  }

  // Internal IRR calculator (Newton-Raphson with guardrails)
  const computeIRR = (flows: number[]) => {
    if (!flows || flows.length < 2) return null
    // Ensure at least one negative and one positive for convergence
    const hasNeg = flows.some(f => f < 0)
    const hasPos = flows.some(f => f > 0)
    if (!hasNeg || !hasPos) return null
    let rate = 0.1
    for (let iter = 0; iter < 50; iter++) {
      let npv = 0
      let dnpv = 0
      for (let t = 0; t < flows.length; t++) {
        const denom = Math.pow(1 + rate, t)
        npv += flows[t] / denom
        if (t > 0) {
          dnpv -= (t * flows[t]) / (denom * (1 + rate))
        }
      }
      if (Math.abs(npv) < 1e-6) return rate * 100
      const step = dnpv !== 0 ? (npv / dnpv) : 0
      rate -= step
      if (!isFinite(rate)) return null
      if (rate <= -0.99) rate = -0.99
    }
    return null
  }

  const calculateStats = (investmentData: Investment[]) => {
    // Exclude UNDER_CONSTRUCTION for equity and project cost metrics
    const notUnderConstruction = investmentData.filter(inv => inv.dealStatus !== 'UNDER_CONSTRUCTION')
    const irrIncluded = notUnderConstruction

    // Overview: Total Invested = sum of investments for FUNDED deals (any status)
    const totalInvestedOverview = investmentData
      .filter(inv => inv.fundingStatus === 'FUNDED')
      .reduce((sum, inv) => sum + inv.investmentAmount, 0)
    // Helpers to estimate value from NOI calculator
    const estimateValue = (inv: Investment) => {
      const rent = inv.property?.monthlyRent || 0
      const other = inv.property?.otherIncome || 0
      const annualExp = inv.property?.annualExpenses || 0
      const capRate = inv.property?.capRate || 0
      const annualNOI = Math.max(((rent + other) * 12) - annualExp, 0)
      return capRate > 0 ? (annualNOI / (capRate / 100)) : (inv.currentValue || 0)
    }
    // Current value: sum of estimated values for active (stabilized) properties
    // When scaled for person, values are already scaled in the investment data
    const currentValue = investmentData
      .filter(inv => inv.dealStatus === 'STABILIZED')
      .reduce((sum: number, inv: Investment) => sum + estimateValue(inv), 0)
    // Projected value: sum for all not SOLD projects (includes under construction)
    // When scaled for person, values are already scaled in the investment data
    const projectedValue = investmentData
      .filter(inv => inv.dealStatus !== 'SOLD')
      .reduce((sum: number, inv: Investment) => sum + estimateValue(inv), 0)
    // Totals for FUNDED
    const totalFundedDebt = investmentData
      .filter(inv => inv.fundingStatus === 'FUNDED')
      .reduce((sum, inv) => sum + (inv.estimatedCurrentDebt || 0), 0)
    const totalFundedAndStabilizedDebt = investmentData
      .filter(inv => inv.fundingStatus === 'FUNDED' && inv.dealStatus === 'STABILIZED')
      .reduce((sum, inv) => sum + (inv.estimatedCurrentDebt || 0), 0)
    const totalInvestedFundedAndStabilized = investmentData
      .filter(inv => inv.fundingStatus === 'FUNDED' && inv.dealStatus === 'STABILIZED')
      .reduce((sum, inv) => sum + inv.investmentAmount, 0)

    // Equity (Today): currentValue (stabilized) - invested (FUNDED & STABILIZED) - current debt (FUNDED & STABILIZED)
    const totalEquityToday = currentValue - totalInvestedFundedAndStabilized - totalFundedAndStabilizedDebt
    // Equity (Projected): projectedValue (all non-sold) - invested (FUNDED) - current debt (FUNDED)
    const totalEquityProjected = projectedValue - totalInvestedOverview - totalFundedDebt
    // Backward compatibility single totalEquity mirrors Today
    const totalEquity = totalEquityToday

    // Total Returns to date = Total Equity Today − Total Invested (FUNDED & STABILIZED)
    const totalReturn = totalEquityToday - totalInvestedFundedAndStabilized
    const activeInvestments = investmentData.filter(inv => inv.status === 'ACTIVE').length
    const totalDistributions = investmentData.reduce((sum, inv) => 
      sum + (inv.distributions?.reduce((distSum, dist) => distSum + dist.amount, 0) || 0), 0
    )
    const averageIRR = irrIncluded.length > 0 
      ? irrIncluded.reduce((sum, inv) => sum + (inv.irr || 0), 0) / irrIncluded.length 
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

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser')
    router.push('/investors/login')
  }

  const handleViewInvestmentDetails = (investmentId: string) => {
    router.push(`/investors/investments/${investmentId}`)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'COMPLETED': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'SOLD': return 'bg-slate-50 text-slate-700 border-slate-200'
      default: return 'bg-slate-50 text-slate-700 border-slate-200'
    }
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

      {/* Premium Navigation */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200/40">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex space-x-1 py-2">
            {[
              { id: 'overview', label: 'Overview', icon: ChartBarIcon },
              { id: 'deals', label: 'Deals', icon: HomeIcon },
              { id: 'analytics', label: 'Analytics', icon: ChartPieIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`relative px-6 py-4 font-medium text-sm transition-all duration-300 rounded-xl ${
                  activeView === tab.id
                    ? 'text-blue-600 bg-blue-50 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="h-5 w-5 inline mr-2" />
                {tab.label}
                {activeView === tab.id && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full"></div>
                )}
              </button>
            ))}
              </div>
            </div>
          </div>
          
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {activeView === 'overview' && (
          <>
            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {/* Total Invested */}
              <div
                className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-1 cursor-pointer"
                onClick={() => {
                  // Build per-deal breakdown for the investor using the processed investments
                  const breakdown = investments
                    .filter(inv => inv.fundingStatus === 'FUNDED')
                    .map(inv => ({ property: inv.propertyName || inv.name || 'Deal', amount: inv.investmentAmount || 0 }))
                    .filter(item => (item.amount || 0) > 0)
                    .sort((a, b) => b.amount - a.amount)
                  setInvestedBreakdown(breakdown)
                  setShowInvestedBreakdown(true)
                }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <CurrencyDollarIcon className="h-6 w-6 text-white" />
              </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invested</p>
                    <div className="flex items-center mt-1">
                      <ArrowTrendingUpIcon className="h-3 w-3 text-emerald-500 mr-1" />
                      <span className="text-xs text-emerald-600 font-medium">Growing</span>
            </div>
          </div>
              </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">{formatCurrency(stats.totalInvested)}</h3>
                <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
          </div>
          
              {/* Current Value */}
              <div className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-500 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Value</p>
                    <div className="flex items-center mt-1">
                      <SparklesIcon className="h-3 w-3 text-emerald-500 mr-1" />
                      <span className="text-xs text-emerald-600 font-medium">Appreciating</span>
            </div>
          </div>
        </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">{formatCurrency(stats.currentValue)}</h3>
                <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"></div>
          </div>

              {/* Projected Value */}
              <div className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projected Value</p>
                    <div className="flex items-center mt-1">
                      <SparklesIcon className="h-3 w-3 text-indigo-500 mr-1" />
                      <span className="text-xs text-indigo-600 font-medium">Includes pipeline</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">{formatCurrency(stats.projectedValue)}</h3>
                <div className="h-1 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"></div>
              </div>

              {/* Total Distributions */}
              <div className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-500 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300" title="Portfolio Value = sum of estimated values of stabilized properties">
                    <BanknotesIcon className="h-6 w-6 text-white" />
                          </div>
                          <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Distributions</p>
                    <div className="flex items-center mt-1">
                      <StarIcon className="h-3 w-3 text-purple-500 mr-1" />
                      <span className="text-xs text-purple-600 font-medium">Cash Flow</span>
                          </div>
                        </div>
                    </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">{formatCurrency(stats.totalDistributions)}</h3>
                <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"></div>
                  </div>

              {/* Average IRR */}
              <div className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-500 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
                      </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average IRR</p>
                    <div className="flex items-center mt-1">
                      <ChartBarIcon className="h-3 w-3 text-orange-500 mr-1" />
                      <span className="text-xs text-orange-600 font-medium">Performance</span>
                      </div>
                      </div>
                    </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">{formatPercentage(stats.averageIRR)}</h3>
                <div className="h-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"></div>
                  </div>
                </div>

            {/* Portfolio Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Active Investments */}
              <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-slate-200/60 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                              <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Active Deals</h2>
                    <p className="text-slate-500 font-medium">{stats.activeInvestments} properties in portfolio</p>
                                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl" title="Excludes under construction deals">
                    <HomeIcon className="h-6 w-6 text-white" />
                  </div>
                              </div>
                
                <div className="space-y-4">
                  {investments.filter(inv => inv.status === 'ACTIVE').slice(0, 5).map((investment) => (
                    <div
                      key={investment.id}
                      className="group relative bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 hover:border-blue-300/60 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
                      onClick={() => handleViewInvestmentDetails(investment.id)}
                      onMouseEnter={() => setHoveredCard(investment.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors duration-200 mb-1">
                            {investment.propertyName || investment.propertyAddress}
                          </h3>
                          <p className="text-sm text-slate-500 flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-2" />
                            {investment.propertyAddress}
                          </p>
                </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getDealBadge(investment.dealStatus)}`}>
                            {investment.dealStatus || 'STABILIZED'}
                            </span>
                          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getFundingBadge(investment.fundingStatus)}`}>
                            {investment.fundingStatus || 'FUNDED'}
                          </span>
                            </div>
                </div>
                      
                      <div className="grid grid-cols-3 gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-slate-500 font-medium mb-1">Investment</p>
                          <p className="font-bold text-slate-900">{formatCurrency(investment.investmentAmount)}</p>
                    </div>
                        <div className="text-center">
                          <p className="text-slate-500 font-medium mb-1">Ownership</p>
                          <p className="font-bold text-slate-900">{investment.ownershipPercentage}%</p>
                  </div>
                        <div className="text-center">
                          <p className="text-slate-500 font-medium mb-1">IRR</p>
                          <p className={`font-bold ${((investment.irr || 0) >= 0) ? 'text-emerald-600' : 'text-red-500'}`}>{formatPercentage(investment.irr || 0)}</p>
                      </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6 text-sm mt-4">
                        {typeof investment.estimatedCurrentDebt === 'number' && (
                          <div className="text-center">
                            <p className="text-slate-500 font-medium mb-1">Est. Current Debt</p>
                            <p className="font-bold text-slate-900">{formatCurrency(investment.estimatedCurrentDebt)}</p>
                      </div>
                        )}
                        {typeof investment.estimatedMonthlyDebtService === 'number' && (
                          <div className="text-center">
                            <p className="text-slate-500 font-medium mb-1">Monthly Debt Service</p>
                            <p className="font-bold text-slate-900">{formatCurrency(investment.estimatedMonthlyDebtService)}</p>
              </div>
            )}
      </div>

                      <div className="mt-4 flex items-center justify-end">
                        <span className="text-sm text-blue-600 group-hover:text-blue-700 font-semibold flex items-center transition-colors duration-200">
                          View Details
                          <ArrowUpRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                        </span>
            </div>
                </div>
                  ))}
                  
                  {investments.filter(inv => inv.status === 'ACTIVE').length === 0 && (
                    <div className="text-center py-16">
                      <div className="p-4 bg-slate-100 rounded-2xl w-fit mx-auto mb-4">
                        <HomeIcon className="h-12 w-12 text-slate-400" />
              </div>
                      <p className="text-slate-500 font-medium">No active investments yet</p>
              </div>
                  )}
                  
                  {investments.filter(inv => inv.status === 'ACTIVE').length > 5 && (
                <button
                      onClick={() => setActiveView('deals')}
                      className="w-full py-4 text-blue-600 font-semibold hover:text-blue-700 transition-colors duration-200 bg-blue-50 hover:bg-blue-100 rounded-2xl"
                >
                      View all {stats.activeInvestments} investments →
                </button>
                  )}
              </div>
          </div>

              {/* Portfolio Summary */}
              <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-3xl p-8 text-white shadow-2xl shadow-blue-500/25">
                <h2 className="text-2xl font-bold mb-8">Portfolio Summary</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-white/20">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-white/20 rounded-xl">
                        <HomeIcon className="h-5 w-5" />
                </div>
                      <span className="font-medium">Properties</span>
                </div>
                    <span className="text-2xl font-bold">{stats.totalProperties}</span>
              </div>
              
                  <div className="flex items-center justify-between pb-4 border-b border-white/20">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-white/20 rounded-xl">
                        <ChartBarIcon className="h-5 w-5" />
                </div>
                      <span className="font-medium">Square Feet</span>
                </div>
                    <span className="text-2xl font-bold">{stats.totalSquareFeet.toLocaleString()}</span>
              </div>
              
                  <div className="flex items-center justify-between pb-4 border-b border-white/20">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-white/20 rounded-xl">
                        <UsersIcon className="h-5 w-5" />
              </div>
                      <span className="font-medium">Active Deals</span>
                </div>
                    <span className="text-2xl font-bold">{stats.activeInvestments}</span>
                </div>
                
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-white/20 rounded-xl">
                        <BanknotesIcon className="h-5 w-5" />
                </div>
                      <span className="font-medium">Total Return</span>
                </div>
                    <span className="text-2xl font-bold">{formatCurrency(stats.totalReturn)}</span>
              </div>
                </div>
                </div>
              </div>
              
            {/* Recent Activity */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-slate-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Recent Distributions</h2>
                  <p className="text-slate-500 font-medium">Latest cash flow activity</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl">
                  <BanknotesIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              
              <div className="overflow-hidden rounded-2xl border border-slate-200/60">
                <table className="min-w-full divide-y divide-slate-200/60">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Property</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-slate-200/60">
                    {investments
                      .flatMap(inv => inv.distributions?.map(dist => ({ ...dist, propertyName: inv.propertyName })) || [])
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 10)
                      .map((distribution, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                            {distribution.propertyName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {new Date(distribution.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                              {distribution.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                            {formatCurrency(distribution.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold flex items-center w-fit">
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Processed
                            </span>
                          </td>
                        </tr>
                      ))}
                    {investments.flatMap(inv => inv.distributions || []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                          <div className="p-4 bg-slate-100 rounded-2xl w-fit mx-auto mb-4">
                            <BanknotesIcon className="h-12 w-12 text-slate-400" />
              </div>
                          <p className="font-medium">No distributions yet</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
          </div>
        </div>
          </>
        )}

        {activeView === 'deals' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">All Deals & Properties</h2>
                <p className="text-slate-500 font-medium">Complete investment portfolio</p>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={dealFilter}
                  onChange={(e) => setDealFilter(e.target.value as any)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm"
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
                .filter(inv => dealFilter === 'ALL' ? true : (inv.dealStatus === dealFilter))
                .map((investment) => (
                <div
                  key={investment.id}
                  className="group relative bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 hover:border-blue-300/60 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                  onClick={() => handleViewInvestmentDetails(investment.id)}
                  onMouseEnter={() => setHoveredCard(investment.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <HomeIcon className="h-6 w-6 text-white" />
                </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getDealBadge(investment.dealStatus)}`}>
                        {investment.dealStatus || 'STABILIZED'}
                      </span>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getFundingBadge(investment.fundingStatus)}`}>
                        {investment.fundingStatus || 'FUNDED'}
                      </span>
              </div>
              </div>
              
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors duration-200">
                    {investment.propertyName || investment.propertyAddress}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4 flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    {investment.propertyAddress}
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
                          // For investors or when filtering by person, show individual investment amount from entity owners
                          const shouldShowIndividual = (currentUser?.role === 'INVESTOR') || (analyticsScope === 'PERSON' && analyticsTarget !== 'ALL')
                          if (investment.investmentType === 'ENTITY' && shouldShowIndividual && (investment as any).entityOwners) {
                            const targetName = currentUser?.role === 'INVESTOR' 
                              ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim().toLowerCase()
                              : analyticsTarget.trim().toLowerCase()
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
                          // For investors or when filtering by person, show effective ownership percentage
                          const shouldShowIndividual = (currentUser?.role === 'INVESTOR') || (analyticsScope === 'PERSON' && analyticsTarget !== 'ALL')
                          if (investment.investmentType === 'ENTITY' && shouldShowIndividual && (investment as any).entityOwners) {
                            const targetName = currentUser?.role === 'INVESTOR'
                              ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim().toLowerCase()
                              : analyticsTarget.trim().toLowerCase()
                            const matchingOwner = (investment as any).entityOwners.find((owner: any) => 
                              (owner.userName || '').trim().toLowerCase() === targetName
                            )
                            if (matchingOwner && matchingOwner.ownershipPercentage) {
                              // Calculate effective ownership: entity ownership % * individual ownership %
                              const effectiveOwnership = ((investment.ownershipPercentage || 0) / 100) * (matchingOwner.ownershipPercentage || 0)
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
              ))}
              </div>
              
            {investments.length === 0 && (
              <div className="text-center py-20">
                <div className="p-6 bg-slate-100 rounded-3xl w-fit mx-auto mb-6">
                  <BuildingOfficeIcon className="h-20 w-20 text-slate-400" />
              </div>
                <p className="text-xl font-semibold text-slate-900 mb-2">No investments yet</p>
                <p className="text-slate-500 font-medium">Start by creating your first deal or property</p>
              </div>
            )}
        </div>
      )}

        {activeView === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-slate-200/60 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900 mb-8">Portfolio Performance</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl cursor-pointer" onClick={() => {
                    setCalcTitle('Total Equity Today (Estimated)')
                    setCalcLines([
                      { label: 'Current Value (Current Portfolio Value)', value: stats.currentValue },
                      { label: '− Invested (FUNDED & STABILIZED)', value: -(investments.filter(i => i.fundingStatus==='FUNDED' && i.dealStatus==='STABILIZED').reduce((s,i)=> s + (i.investmentAmount||0),0)) },
                      { label: '− Current Debt (FUNDED & STABILIZED)', value: -(investments.filter(i => i.fundingStatus==='FUNDED' && i.dealStatus==='STABILIZED').reduce((s,i)=> s + (i.estimatedCurrentDebt||0),0)) },
                    ])
                    setShowCalcModal(true)
                  }}>
                <div>
                      <p className="text-sm text-slate-600 font-semibold mb-1" title="Current Value − Invested (FUNDED & STABILIZED) − Debt (FUNDED & STABILIZED)">Total Equity Today (Estimated)</p>
                      <p className="text-3xl font-bold text-slate-900">{formatCurrency((stats as any).totalEquityToday || 0)}</p>
                </div>
                    <ChartBarIcon className="h-16 w-16 text-blue-600" />
              </div>

                  <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl cursor-pointer" onClick={() => {
                    setCalcTitle('Total Projected Future Equity (Estimated)')
                    setCalcLines([
                      { label: 'Projected Value (Includes pipeline)', value: stats.projectedValue },
                      { label: '− Invested (FUNDED)', value: -(stats.totalInvested) },
                      { label: '− Current Debt (FUNDED)', value: -(investments.filter(i => i.fundingStatus==='FUNDED').reduce((s,i)=> s + (i.estimatedCurrentDebt||0),0)) },
                    ])
                    setShowCalcModal(true)
                  }}>
                <div>
                      <p className="text-sm text-slate-600 font-semibold mb-1" title="Projected Value − Invested (FUNDED) − Debt (FUNDED)">Total Projected Future Equity (Estimated)</p>
                      <p className="text-3xl font-bold text-slate-900">{formatCurrency((stats as any).totalEquityProjected || 0)}</p>
                </div>
                    <ChartBarIcon className="h-16 w-16 text-indigo-600" />
              </div>
              
                  <div className="flex items-center justify-between p-6 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-2xl cursor-pointer" onClick={() => {
                    setCalcTitle('Total Returns (Current)')
                    setCalcLines([
                      { label: 'Total Equity Today (Estimated)', value: (stats as any).totalEquityToday || 0 },
                      { label: '− Total Invested (FUNDED & STABILIZED)', value: -(investments.filter(i => i.fundingStatus==='FUNDED' && i.dealStatus==='STABILIZED').reduce((s,i)=> s + (i.investmentAmount||0),0)) },
                    ])
                    setShowCalcModal(true)
                  }}>
                <div>
                      <p className="text-sm text-slate-600 font-semibold mb-1">Total Returns</p>
                      <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalReturn)}</p>
                </div>
                    <ArrowTrendingUpIcon className="h-16 w-16 text-emerald-600" />
              </div>
              
                  <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl">
                <div>
                      <p className="text-sm text-slate-600 font-semibold mb-1">Cash Distributions</p>
                      <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalDistributions)}</p>
                </div>
                    <BanknotesIcon className="h-16 w-16 text-purple-600" />
                </div>
              </div>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-slate-200/60 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900 mb-8">Performance Metrics</h2>
                <div className="space-y-6">
                  <div className="p-6 border border-slate-200/60 rounded-2xl hover:border-blue-300/60 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-slate-700" title="IRR excludes under construction">Average IRR</span>
                      <span className="text-2xl font-bold text-blue-600">{formatPercentage(stats.averageIRR)}</span>
              </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(Math.abs(stats.averageIRR) * 10, 100)}%` }}
                      ></div>
                      </div>
                  </div>
                  
                  <div className="p-6 border border-slate-200/60 rounded-2xl hover:border-emerald-300/60 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">Total Properties</span>
                      <span className="text-2xl font-bold text-emerald-600">{stats.totalProperties}</span>
              </div>
            </div>
                  
                  <div className="p-6 border border-slate-200/60 rounded-2xl hover:border-purple-300/60 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700" title="Current Portfolio Value">Portfolio Size (Current)</span>
                      <span className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalProjectCost)}</span>
            </div>
              </div>
              
                  <div className="p-6 border border-slate-200/60 rounded-2xl hover:border-indigo-300/60 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700" title="Total Original Debt (FUNDED + STABILIZED) + Total Equity Today">Total Project Cost (Current)</span>
                      <span className="text-2xl font-bold text-indigo-600">{formatCurrency(stats.totalProjectCost)}</span>
              </div>
              </div>
              
                  <div className="p-6 border border-slate-200/60 rounded-2xl hover:border-rose-300/60 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">Portfolio Yield on Cost</span>
                      <span className={`text-2xl font-bold ${(stats.totalProjectCost > 0 && stats.yearlyNOIBeforeDebt / stats.totalProjectCost >= 0) ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatPercentage(stats.totalProjectCost > 0 ? (stats.yearlyNOIBeforeDebt / stats.totalProjectCost) * 100 : 0)}
                      </span>
              </div>
              </div>
          </div>
        </div>
            </div>
            
            {/* IRR Analysis */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-slate-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Deal IRR Analysis</h2>
                <div className="flex items-center gap-3">
                  {currentUser?.role === 'ADMIN' ? (
                    <>
                      <select
                        value={analyticsScope}
                        onChange={(e)=>{ setAnalyticsScope(e.target.value as any); setAnalyticsTarget('ALL') }}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="ALL">All</option>
                        <option value="PERSON">By Person</option>
                        <option value="ENTITY">By Entity</option>
                      </select>
                      <select
                        value={analyticsTarget}
                        onChange={(e)=>setAnalyticsTarget(e.target.value)}
                        disabled={analyticsScope==='ALL'}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-50"
                      >
                    <option value="ALL">All</option>
                    {analyticsScope==='PERSON' && (() => {
                      // Collect all individual people from direct investments and entity owners
                      const allPeople = new Set<string>()
                      investments.forEach(inv => {
                        // Direct investments
                        if ((inv as any).investorName) {
                          allPeople.add((inv as any).investorName)
                        }
                        // Entity investments - get individual owners
                        if (inv.investmentType === 'ENTITY' && (inv as any).entityOwners) {
                          (inv as any).entityOwners.forEach((owner: any) => {
                            if (owner.userName) {
                              allPeople.add(owner.userName)
                            }
                          })
                        }
                      })
                      return Array.from(allPeople).sort().map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))
                    })()}
                    {analyticsScope==='ENTITY' && Array.from(new Set(investments.map(inv => inv.entityName).filter(Boolean))).map(name=> (
                      <option key={name as string} value={name as string}>{name as string}</option>
                    ))}
                  </select>
                    </>
                  ) : (
                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 font-semibold">
                      Viewing: {analyticsTarget || 'Your Investments'}
                    </div>
                  )}
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200/60">
                <table className="min-w-full divide-y divide-slate-200/60">
                  <thead className="bg-slate-50/80">
                    <tr>
                      {analyticsScope === 'PERSON' && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Person</th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Property</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Investment</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. Current Debt</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Debt Service</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">IRR</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Yield on Cost</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">DSCR</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Construction Start</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Construction Complete</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Proforma</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-slate-200/60">
                    {(() => {
                      // Transform investments for "By Person" view - expand entity investments into individual person rows
                      let displayInvestments: any[] = []
                      
                      if (analyticsScope === 'PERSON') {
                        investments
                          .forEach(inv => {
                            if (inv.investmentType === 'ENTITY' && (inv as any).entityOwners && Array.isArray((inv as any).entityOwners)) {
                              // Expand entity investment into individual person rows
                              (inv as any).entityOwners.forEach((owner: any) => {
                                // Apply person filter if specified
                                if (analyticsTarget !== 'ALL' && owner.userName !== analyticsTarget) {
                                  return
                                }
                                // Calculate effective ownership percentage for scaling
                                const entityOwnershipPct = inv.ownershipPercentage || 0
                                const individualOwnershipPct = owner.ownershipPercentage || 0
                                const effectiveOwnershipPct = (entityOwnershipPct / 100) * (individualOwnershipPct / 100)
                                
                                displayInvestments.push({
                                  ...inv,
                                  id: `${inv.id}_${owner.id}`,
                                  personName: owner.userName,
                                  investmentAmount: owner.investmentAmount || 0,
                                  ownershipPercentage: owner.ownershipPercentage || 0,
                                  // Scale property-level values by ownership for Analytics table
                                  estimatedCurrentDebt: (inv.estimatedCurrentDebt || 0) * effectiveOwnershipPct,
                                  estimatedMonthlyDebtService: (inv.estimatedMonthlyDebtService || 0) * effectiveOwnershipPct,
                                  property: inv.property ? {
                                    ...inv.property,
                                    monthlyRent: (inv.property.monthlyRent || 0) * effectiveOwnershipPct,
                                    otherIncome: (inv.property.otherIncome || 0) * effectiveOwnershipPct,
                                    annualExpenses: (inv.property.annualExpenses || 0) * effectiveOwnershipPct,
                                    totalCost: (inv.property.totalCost || 0) * effectiveOwnershipPct,
                                    acquisitionPrice: (inv.property.acquisitionPrice || 0) * effectiveOwnershipPct,
                                    constructionCost: (inv.property.constructionCost || 0) * effectiveOwnershipPct
                                  } : undefined
                                })
                              })
                            } else {
                              // Direct investment - apply person filter if specified
                              if (analyticsTarget !== 'ALL' && (inv as any).investorName !== analyticsTarget) {
                                return
                              }
                              displayInvestments.push({
                                ...inv,
                                personName: (inv as any).investorName || 'Direct Investor'
                              })
                            }
                          })
                      } else {
                        // Non-person view - use existing filter logic
                        displayInvestments = investments
                          .filter(inv => {
                            if (analyticsScope==='ALL' || analyticsTarget==='ALL') return true
                            if (analyticsScope==='ENTITY') return (inv.entityName) === analyticsTarget
                            return true
                          })
                      }
                      
                      return displayInvestments
                    })().map((inv) => {
                      const rent = inv.property?.monthlyRent || 0
                      const other = inv.property?.otherIncome || 0
                      const annualExp = inv.property?.annualExpenses || 0
                      const monthlyExp = annualExp / 12
                      const monthlyNOI = Math.max((rent + other) - monthlyExp, 0)
                      const annualNOI = monthlyNOI * 12
                      const totalProjectCost = (inv.property?.totalCost && inv.property?.totalCost! > 0)
                        ? (inv.property?.totalCost as number)
                        : ((inv.property?.acquisitionPrice || 0) + (inv.property?.constructionCost || 0))
                      const yieldOnCost = totalProjectCost > 0 ? (annualNOI / totalProjectCost) * 100 : null
                      const annualDebtService = (inv.estimatedMonthlyDebtService || 0) * 12
                      const dscr = annualDebtService > 0 ? (annualNOI / annualDebtService) : null

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors duration-200">
                          {analyticsScope === 'PERSON' && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                              {inv.personName || 'Unknown'}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                            {inv.propertyName || inv.propertyAddress}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                            {formatCurrency(inv.investmentAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                            {typeof inv.estimatedCurrentDebt === 'number' ? formatCurrency(inv.estimatedCurrentDebt) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                            {typeof inv.estimatedMonthlyDebtService === 'number' ? formatCurrency(inv.estimatedMonthlyDebtService) : '—'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${((inv.irr || 0) >= 0) ? 'text-emerald-600' : 'text-red-500'}`}>
                            {formatPercentage(inv.irr || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right">
                            {yieldOnCost !== null ? formatPercentage(yieldOnCost) : '—'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${dscr !== null && dscr < 1 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {dscr !== null ? dscr.toFixed(2) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {inv.property?.acquisitionDate ? new Date(inv.property.acquisitionDate).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {inv.property?.constructionCompletionDate ? new Date(inv.property.constructionCompletionDate).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <button
                              onClick={() => openProforma(inv)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-xs font-semibold"
                            >
                              View 5Y Proforma
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {(() => {
                      // Calculate summary stats for selected person
                      if (analyticsScope === 'PERSON' && analyticsTarget !== 'ALL') {
                        const personInvestments = (() => {
                          let result: any[] = []
                          investments
                            .forEach(inv => {
                              if (inv.investmentType === 'ENTITY' && (inv as any).entityOwners && Array.isArray((inv as any).entityOwners)) {
                                (inv as any).entityOwners.forEach((owner: any) => {
                                  if (owner.userName === analyticsTarget) {
                                    result.push({
                                      ...inv,
                                      personName: owner.userName,
                                      investmentAmount: owner.investmentAmount || 0,
                                      ownershipPercentage: owner.ownershipPercentage || 0
                                    })
                                  }
                                })
                              } else {
                                if ((inv as any).investorName === analyticsTarget) {
                                  result.push({
                                    ...inv,
                                    personName: (inv as any).investorName || 'Direct Investor'
                                  })
                                }
                              }
                            })
                          return result
                        })()

                        if (personInvestments.length > 0) {
                          const totalInvested = personInvestments.reduce((sum, inv) => sum + (inv.investmentAmount || 0), 0)
                          const totalDebt = personInvestments.reduce((sum, inv) => sum + (inv.estimatedCurrentDebt || 0), 0)
                          const totalMonthlyDebtService = personInvestments.reduce((sum, inv) => sum + (inv.estimatedMonthlyDebtService || 0), 0)
                          const avgIRR = personInvestments.length > 0 
                            ? personInvestments.reduce((sum, inv) => sum + (inv.irr || 0), 0) / personInvestments.length 
                            : 0
                          const totalProperties = personInvestments.length

                          // Calculate weighted average yield on cost
                          let totalYield = 0
                          let totalCost = 0
                          personInvestments.forEach(inv => {
                            const rent = inv.property?.monthlyRent || 0
                            const other = inv.property?.otherIncome || 0
                            const annualExp = inv.property?.annualExpenses || 0
                            const monthlyExp = annualExp / 12
                            const monthlyNOI = Math.max((rent + other) - monthlyExp, 0)
                            const annualNOI = monthlyNOI * 12
                            const projectCost = (inv.property?.totalCost && inv.property?.totalCost! > 0)
                              ? (inv.property?.totalCost as number)
                              : ((inv.property?.acquisitionPrice || 0) + (inv.property?.constructionCost || 0))
                            if (projectCost > 0) {
                              totalYield += (annualNOI / projectCost) * 100
                              totalCost += projectCost
                            }
                          })
                          const avgYieldOnCost = totalCost > 0 ? (totalYield / personInvestments.length) : 0

                          // Calculate weighted average DSCR
                          let totalDSCR = 0
                          let dscrCount = 0
                          personInvestments.forEach(inv => {
                            const rent = inv.property?.monthlyRent || 0
                            const other = inv.property?.otherIncome || 0
                            const annualExp = inv.property?.annualExpenses || 0
                            const monthlyExp = annualExp / 12
                            const monthlyNOI = Math.max((rent + other) - monthlyExp, 0)
                            const annualNOI = monthlyNOI * 12
                            const annualDebtService = (inv.estimatedMonthlyDebtService || 0) * 12
                            if (annualDebtService > 0) {
                              totalDSCR += annualNOI / annualDebtService
                              dscrCount++
                            }
                          })
                          const avgDSCR = dscrCount > 0 ? totalDSCR / dscrCount : 0

                          return (
                            <>
                              <tr className="bg-slate-100/50 border-t-2 border-slate-300">
                                {analyticsScope === 'PERSON' && (
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                                    TOTAL
                                  </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                                  {analyticsScope === 'PERSON' ? `${totalProperties} Properties` : 'TOTAL'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 text-right">
                                  {formatCurrency(totalInvested)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 text-right">
                                  {formatCurrency(totalDebt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 text-right">
                                  {formatCurrency(totalMonthlyDebtService)}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${avgIRR >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {formatPercentage(avgIRR)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right">
                                  {avgYieldOnCost > 0 ? formatPercentage(avgYieldOnCost) : '—'}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${avgDSCR >= 1 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {avgDSCR > 0 ? avgDSCR.toFixed(2) : '—'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                  <span className="text-xs text-slate-500">—</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                  <span className="text-xs text-slate-500">—</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                  <span className="text-xs text-slate-500">Summary</span>
                                </td>
                              </tr>
                            </>
                          )
                        }
                      }

                      const displayInvestments = (() => {
                        if (analyticsScope === 'PERSON') {
                          let result: any[] = []
                          investments
                            .forEach(inv => {
                              if (inv.investmentType === 'ENTITY' && (inv as any).entityOwners && Array.isArray((inv as any).entityOwners)) {
                                (inv as any).entityOwners.forEach((owner: any) => {
                                  if (analyticsTarget !== 'ALL' && owner.userName !== analyticsTarget) return
                                  result.push(inv)
                                })
                              } else {
                                if (analyticsTarget !== 'ALL' && (inv as any).investorName !== analyticsTarget) return
                                result.push(inv)
                              }
                            })
                          return result
                        } else {
                          return investments.filter(inv => {
                            if (analyticsScope==='ALL' || analyticsTarget==='ALL') return true
                            if (analyticsScope==='ENTITY') return (inv.entityName) === analyticsTarget
                            return true
                          })
                        }
                      })()
                      return displayInvestments.length === 0 && (
                        <tr>
                          <td colSpan={analyticsScope === 'PERSON' ? 11 : 10} className="px-6 py-12 text-center text-slate-500 text-sm">No investments found</td>
                        </tr>
                      )
                    })()}
                  </tbody>
                </table>
                </div>
              </div>
              
            {/* NOI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div 
                className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 shadow-sm cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={() => {
                  // Show revenue breakdown for stabilized, funded properties
                  const revenueBreakdown = investments
                    .filter(inv => inv.dealStatus === 'STABILIZED' && inv.fundingStatus === 'FUNDED')
                    .map(inv => ({
                      label: inv.propertyName || inv.propertyAddress,
                      value: (inv.property?.monthlyRent || 0) + (inv.property?.otherIncome || 0)
                    }))
                    .filter(item => item.value > 0)
                  
                  setCalcTitle('Monthly Revenue Breakdown (Stabilized & Funded Properties)')
                  setCalcLines(revenueBreakdown)
                  setShowCalcModal(true)
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Revenue (Before Debt)</span>
              </div>
                <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.monthlyRevenue)}</h3>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <CalculatorIcon className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Debt Service and Condo Fees</span>
            </div>
                <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.monthlyDebtServiceAndCondoFees)}</h3>
          </div>
              <div className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly NOI</span>
            </div>
                <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.monthlyNOIAfterDebt)}</h3>
          </div>
              <div className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Yearly NOI (Before Debt)</span>
        </div>
                <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.yearlyNOIBeforeDebt)}</h3>
            </div>
              <div className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Yearly NOI (After Debt)</span>
              </div>
                <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.yearlyNOIAfterDebt)}</h3>
              </div>
          </div>
        </div>
      )}
      {showProformaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl border border-slate-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-bold text-slate-900">5-Year Proforma</h3>
                <p className="text-sm text-slate-500">{proformaTitle}</p>
              </div>
              <button
                onClick={() => setShowProformaModal(false)}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Year</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Expenses</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">NOI</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Interest</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Principal</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Debt Service</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Ending Debt</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Exit Value</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Debt Payoff (Y5)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Exit Proceeds (Net)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Cash Flow</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">DSCR</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">IRR to Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {proformaRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{r.year}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{formatCurrency(r.revenue)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{formatCurrency(r.expenses)}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">{formatCurrency(r.noi)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{formatCurrency(r.interest)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{formatCurrency(r.principal)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{formatCurrency(r.debtService)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{formatCurrency(r.endingDebt)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{formatCurrency(r.exitSaleValue || 0)}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600 font-semibold">{formatCurrency(r.debtPayoff || 0)}</td>
                      <td className="px-4 py-3 text-sm text-right text-emerald-600 font-semibold">{formatCurrency(r.exitProceeds || 0)}</td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${r.cashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(r.cashFlow)}</td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${r.dscr !== null && r.dscr < 1 ? 'text-red-500' : 'text-emerald-600'}`}>{r.dscr !== null ? r.dscr.toFixed(2) : '—'}</td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${r.irrToDate !== null && r.irrToDate < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{r.irrToDate !== null ? `${r.irrToDate.toFixed(1)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {showCalcModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">{calcTitle}</h3>
              <button onClick={() => setShowCalcModal(false)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                {calcLines.map((l, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{l.label}</span>
                    <span className={`text-sm font-semibold ${l.value < 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatCurrency(l.value)}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between pt-3 border-t border-slate-200 mt-2">
                  <span className="text-sm font-semibold text-slate-900">Result</span>
                  <span className="text-sm font-bold text-blue-600">{formatCurrency(calcLines.reduce((s,l)=> s + l.value, 0))}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
      {showInvestedBreakdown && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Total Invested Breakdown</h3>
              <button onClick={() => setShowInvestedBreakdown(false)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 divide-y divide-slate-100">
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
    </div>
  )
} 