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
}

export default function InvestorDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalInvested: 0,
    currentValue: 0,
    totalReturn: 0,
    totalIrr: 0,
    activeInvestments: 0,
    totalDistributions: 0,
    pendingDistributions: 0,
    documentsCount: 0,
    unreadNotifications: 0,
    totalProperties: 0,
    totalSquareFeet: 0,
    averageIRR: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'overview' | 'deals' | 'analytics'>('overview')

  useEffect(() => {
    const user = sessionStorage.getItem('currentUser')
    if (user) {
      const userData = JSON.parse(user)
      setCurrentUser(userData)
      fetchDashboardData(userData)
    } else {
      router.push('/investors/login')
    }
  }, [router])

  const fetchDashboardData = async (user: User) => {
    try {
      setLoading(true)
      
      // Fetch investments
      const investmentsResponse = await fetch('/api/investors/properties', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.email}`
        }
      })
      
      if (investmentsResponse.ok) {
        const investmentsData = await investmentsResponse.json()
        setInvestments(investmentsData || [])
        calculateStats(investmentsData || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (investmentData: Investment[]) => {
    const totalInvested = investmentData.reduce((sum, inv) => sum + inv.investmentAmount, 0)
    const currentValue = investmentData.reduce((sum, inv) => sum + (inv.currentValue || inv.investmentAmount * 1.15), 0)
    const totalReturn = investmentData.reduce((sum, inv) => sum + (inv.totalReturn || 0), 0)
    const activeInvestments = investmentData.filter(inv => inv.status === 'ACTIVE').length
    const totalDistributions = investmentData.reduce((sum, inv) => 
      sum + (inv.distributions?.reduce((distSum, dist) => distSum + dist.amount, 0) || 0), 0
    )
    const averageIRR = investmentData.length > 0 
      ? investmentData.reduce((sum, inv) => sum + (inv.irr || 0), 0) / investmentData.length 
      : 0
    const totalProperties = investmentData.length
    const totalSquareFeet = investmentData.reduce((sum, inv) => sum + (inv.squareFeet || 0), 0)

    setStats({
      totalInvested,
      currentValue,
      totalReturn,
      totalIrr: averageIRR,
      activeInvestments,
      totalDistributions,
      pendingDistributions: 0,
      documentsCount: 0,
      unreadNotifications: 0,
      totalProperties,
      totalSquareFeet,
      averageIRR
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
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-300'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'SOLD': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-3 rounded-xl shadow-lg">
                <BuildingOfficeIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Campus Rentals LLC</h1>
                <p className="text-sm text-gray-500">Investment Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                Admin
              </button>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {currentUser?.firstName} {currentUser?.lastName}
                </p>
                <p className="text-xs text-gray-500">{currentUser?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveView('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChartBarIcon className="h-5 w-5 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveView('deals')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'deals'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <HomeIcon className="h-5 w-5 inline mr-2" />
              Deals & Properties
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'analytics'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChartPieIcon className="h-5 w-5 inline mr-2" />
              Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {/* Total Invested */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">Total Invested</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(stats.totalInvested)}</h3>
                <p className="text-sm text-green-600 flex items-center">
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                  Growing portfolio
                </p>
              </div>

              {/* Current Value */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">Current Value</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(stats.currentValue)}</h3>
                <p className="text-sm text-blue-600 flex items-center">
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                  {formatCurrency(stats.currentValue - stats.totalInvested)} profit
                </p>
              </div>

              {/* Total Distributions */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <BanknotesIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">Total Distributions</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(stats.totalDistributions)}</h3>
                <p className="text-sm text-purple-600">Cash flow received</p>
              </div>

              {/* Average IRR */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <ArrowTrendingUpIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">Average IRR</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{formatPercentage(stats.averageIRR)}</h3>
                <p className="text-sm text-orange-600">Performance metric</p>
              </div>
            </div>

            {/* Portfolio Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Active Investments */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Active Deals</h2>
                  <span className="text-sm text-gray-500">{stats.activeInvestments} properties</span>
                </div>
                
                <div className="space-y-4">
                  {investments.filter(inv => inv.status === 'ACTIVE').slice(0, 5).map((investment) => (
                    <div
                      key={investment.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => handleViewInvestmentDetails(investment.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {investment.propertyName || investment.propertyAddress}
                          </h3>
                          <p className="text-sm text-gray-500 flex items-center mt-1">
                            <MapPinIcon className="h-3 w-3 mr-1" />
                            {investment.propertyAddress}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(investment.status)}`}>
                          {investment.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Investment</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(investment.investmentAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Ownership</p>
                          <p className="font-semibold text-gray-900">{investment.ownershipPercentage}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">IRR</p>
                          <p className="font-semibold text-green-600">{formatPercentage(investment.irr || 0)}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-end">
                        <span className="text-sm text-blue-600 group-hover:text-blue-700 font-medium flex items-center">
                          View Details
                          <ArrowUpRightIcon className="h-4 w-4 ml-1" />
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {investments.filter(inv => inv.status === 'ACTIVE').length === 0 && (
                    <div className="text-center py-12">
                      <HomeIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No active investments yet</p>
                    </div>
                  )}
                  
                  {investments.filter(inv => inv.status === 'ACTIVE').length > 5 && (
                    <button
                      onClick={() => setActiveView('deals')}
                      className="w-full py-3 text-blue-600 font-medium hover:text-blue-700 transition-colors"
                    >
                      View all {stats.activeInvestments} investments →
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg p-6 text-white">
                <h2 className="text-xl font-bold mb-6">Portfolio Summary</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-blue-400/30">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <HomeIcon className="h-5 w-5" />
                      </div>
                      <span className="text-sm">Properties</span>
                    </div>
                    <span className="text-xl font-bold">{stats.totalProperties}</span>
                  </div>
                  
                  <div className="flex items-center justify-between pb-4 border-b border-blue-400/30">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <ChartBarIcon className="h-5 w-5" />
                      </div>
                      <span className="text-sm">Square Feet</span>
                    </div>
                    <span className="text-xl font-bold">{stats.totalSquareFeet.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between pb-4 border-b border-blue-400/30">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <UsersIcon className="h-5 w-5" />
                      </div>
                      <span className="text-sm">Active Deals</span>
                    </div>
                    <span className="text-xl font-bold">{stats.activeInvestments}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <BanknotesIcon className="h-5 w-5" />
                      </div>
                      <span className="text-sm">Total Return</span>
                    </div>
                    <span className="text-xl font-bold">{formatCurrency(stats.totalReturn)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Distributions</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {investments
                      .flatMap(inv => inv.distributions?.map(dist => ({ ...dist, propertyName: inv.propertyName })) || [])
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 10)
                      .map((distribution, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {distribution.propertyName || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {new Date(distribution.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              {distribution.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                            {formatCurrency(distribution.amount)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center">
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Processed
                            </span>
                          </td>
                        </tr>
                      ))}
                    {investments.flatMap(inv => inv.distributions || []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                          No distributions yet
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
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">All Deals & Properties</h2>
              <div className="flex items-center space-x-2">
                <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Pending</option>
                  <option>Completed</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {investments.map((investment) => (
                <div
                  key={investment.id}
                  className="border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => handleViewInvestmentDetails(investment.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                      <HomeIcon className="h-6 w-6 text-white" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(investment.status)}`}>
                      {investment.status}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {investment.propertyName || investment.propertyAddress}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    {investment.propertyAddress}
                  </p>
                  
                  {investment.bedrooms && (
                    <p className="text-sm text-gray-600 mb-4">
                      {investment.bedrooms} bed • {investment.bathrooms} bath • {investment.squareFeet?.toLocaleString()} sqft
                    </p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Investment</span>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(investment.investmentAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Ownership</span>
                      <span className="text-sm font-semibold text-gray-900">{investment.ownershipPercentage}%</span>
                    </div>
                    {investment.irr && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">IRR</span>
                        <span className={`text-sm font-semibold ${investment.irr > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercentage(investment.irr)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {investment.startDate ? `Started ${new Date(investment.startDate).toLocaleDateString()}` : 'In Progress'}
                    </span>
                    <span className="text-sm text-blue-600 font-medium group-hover:text-blue-700 flex items-center">
                      View Deal
                      <ArrowUpRightIcon className="h-4 w-4 ml-1" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {investments.length === 0 && (
              <div className="text-center py-16">
                <BuildingOfficeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">No investments yet</p>
                <p className="text-gray-500">Start by creating your first deal or property</p>
              </div>
            )}
          </div>
        )}

        {activeView === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Portfolio Performance</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Total Equity</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.currentValue)}</p>
                    </div>
                    <ChartBarIcon className="h-12 w-12 text-blue-600" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Total Returns</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalReturn)}</p>
                    </div>
                    <ArrowTrendingUpIcon className="h-12 w-12 text-green-600" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Cash Distributions</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalDistributions)}</p>
                    </div>
                    <BanknotesIcon className="h-12 w-12 text-purple-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Performance Metrics</h2>
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Average IRR</span>
                      <span className="text-lg font-bold text-blue-600">{formatPercentage(stats.averageIRR)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all" 
                        style={{ width: `${Math.min(Math.abs(stats.averageIRR) * 10, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-green-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Total Properties</span>
                      <span className="text-lg font-bold text-green-600">{stats.totalProperties}</span>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Portfolio Size</span>
                      <span className="text-lg font-bold text-purple-600">{formatCurrency(stats.totalInvested)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}