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
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

interface Investment {
  id: string
  propertyId: string
  propertyName: string
  propertyAddress: string
  investmentAmount: number
  currentValue: number
  totalReturn: number
  irr: number
  ownershipPercentage: number
  status: string
  investmentDate: string
  distributions: Distribution[]
  waterfall: WaterfallCalculation
}

interface WaterfallCalculation {
  preferredReturn: number
  catchUp: number
  carriedInterest: number
  investorReturn: number
  gpReturn: number
  totalReturn: number
}

interface Distribution {
  id: string
  amount: number
  distributionDate: string
  distributionType: string
  description?: string
}

interface FundInvestment {
  id: string
  fundId: string
  fundName: string
  investmentAmount: number
  ownershipPercentage: number
  status: string
  investmentDate: string
  contributions: FundContribution[]
  distributions: FundDistribution[]
}

interface FundContribution {
  id: string
  amount: number
  contributionDate: string
  contributionType: string
  description?: string
}

interface FundDistribution {
  id: string
  amount: number
  distributionDate: string
  distributionType: string
  description?: string
}

interface Document {
  id: string
  title: string
  documentType: string
  entityType: string
  entityName: string
  uploadedAt: string
  fileSize: number
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
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

export default function InvestorDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [fundInvestments, setFundInvestments] = useState<FundInvestment[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showCreateInvestment, setShowCreateInvestment] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const userStr = sessionStorage.getItem('user')
    if (!userStr) {
      router.push('/investors/login')
      return
    }

    const user = JSON.parse(userStr)
    setCurrentUser(user)
    fetchDashboardData()
  }, [router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch all dashboard data
      const [statsRes, investmentsRes, fundInvestmentsRes, documentsRes, notificationsRes, usersRes] = await Promise.all([
        fetch('/api/investors/stats'),
        fetch('/api/investors/properties'),
        fetch('/api/investors/funds'),
        fetch('/api/investors/documents'),
        fetch('/api/investors/notifications'),
        fetch('/api/investors/users')
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (investmentsRes.ok) setInvestments(await investmentsRes.json())
      if (fundInvestmentsRes.ok) setFundInvestments(await fundInvestmentsRes.json())
      if (documentsRes.ok) setDocuments(await documentsRes.json())
      if (notificationsRes.ok) setNotifications(await notificationsRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    router.push('/investors/login')
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
    return `${value.toFixed(2)}%`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600 bg-green-100'
      case 'SOLD': return 'text-blue-600 bg-blue-100'
      case 'PENDING': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const calculateWaterfall = (investment: Investment) => {
    const totalReturn = investment.totalReturn
    const preferredReturn = investment.investmentAmount * 0.08 // 8% preferred return
    const catchUp = Math.max(0, totalReturn - preferredReturn) * 0.8 // 80% catch-up
    const remaining = totalReturn - preferredReturn - catchUp
    const carriedInterest = remaining * 0.2 // 20% carried interest
    const investorReturn = preferredReturn + catchUp + (remaining - carriedInterest)
    const gpReturn = carriedInterest

    return {
      preferredReturn,
      catchUp,
      carriedInterest,
      investorReturn,
      gpReturn,
      totalReturn
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your investment dashboard...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Investor Dashboard</h1>
              <p className="text-gray-600">Welcome back, {currentUser.firstName} {currentUser.lastName}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-600">
                <BellIcon className="h-6 w-6" />
                {stats?.unreadNotifications && stats.unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {stats.unreadNotifications}
                  </span>
                )}
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <CogIcon className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {currentUser.firstName[0]}{currentUser.lastName[0]}
                  </span>
                </div>
                <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-gray-600">
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <CurrencyDollarIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Invested</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalInvested)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Current Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.currentValue)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Return</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalReturn)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <BanknotesIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total IRR</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPercentage(stats.totalIrr)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview', icon: ChartBarIcon },
                { id: 'properties', name: 'Properties', icon: HomeIcon },
                { id: 'funds', name: 'Funds', icon: BuildingOfficeIcon },
                { id: 'documents', name: 'Documents', icon: DocumentTextIcon },
                { id: 'notifications', name: 'Notifications', icon: BellIcon },
                ...(currentUser.role === 'ADMIN' ? [{ id: 'users', name: 'Users', icon: UsersIcon }] : []),
                ...(currentUser.role === 'ADMIN' ? [{ id: 'admin', name: 'Admin', icon: CogIcon }] : []),
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Activity */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                      {notifications.slice(0, 5).map((notification) => (
                        <div key={notification.id} className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                            notification.isRead ? 'bg-gray-300' : 'bg-blue-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-sm text-gray-600">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatDate(notification.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active Investments</span>
                        <span className="font-semibold">{stats?.activeInvestments || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Distributions</span>
                        <span className="font-semibold">{formatCurrency(stats?.totalDistributions || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pending Distributions</span>
                        <span className="font-semibold">{formatCurrency(stats?.pendingDistributions || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Documents</span>
                        <span className="font-semibold">{stats?.documentsCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'properties' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Property Investments</h3>
                  {currentUser.role === 'ADMIN' && (
                    <button 
                      onClick={() => setShowCreateInvestment(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <PlusIcon className="h-5 w-5" />
                      <span>Add Investment</span>
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {investments.map((investment) => {
                    const waterfall = calculateWaterfall(investment)
                    return (
                      <div key={investment.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-semibold text-gray-900">{investment.propertyName}</h4>
                            <p className="text-sm text-gray-600">{investment.propertyAddress}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(investment.status)}`}>
                            {investment.status}
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Investment</span>
                            <span className="font-semibold">{formatCurrency(investment.investmentAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Current Value</span>
                            <span className="font-semibold">{formatCurrency(investment.currentValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Return</span>
                            <span className="font-semibold">{formatCurrency(investment.totalReturn)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">IRR</span>
                            <span className="font-semibold">{formatPercentage(investment.irr)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ownership</span>
                            <span className="font-semibold">{formatPercentage(investment.ownershipPercentage)}</span>
                          </div>
                        </div>
                        
                        {/* Waterfall Calculation */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Waterfall Calculation</h5>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Preferred Return</span>
                              <span>{formatCurrency(waterfall.preferredReturn)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Catch-Up</span>
                              <span>{formatCurrency(waterfall.catchUp)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Carried Interest</span>
                              <span>{formatCurrency(waterfall.carriedInterest)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span className="text-gray-900">Investor Return</span>
                              <span className="text-green-600">{formatCurrency(waterfall.investorReturn)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs text-gray-500">Invested: {formatDate(investment.investmentDate)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'users' && currentUser.role === 'ADMIN' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                  <button 
                    onClick={() => setShowCreateUser(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>Add User</span>
                  </button>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Login
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {user.firstName[0]}{user.lastName[0]}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                              user.role === 'MANAGER' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.company || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.lastLogin)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-900">
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button className="text-gray-600 hover:text-gray-900">
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button className="text-red-600 hover:text-red-900">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Other tabs remain the same for now */}
            {activeTab === 'funds' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Fund Investments</h3>
                  {currentUser.role === 'ADMIN' && (
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700">
                      Add Fund
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {fundInvestments.map((fundInvestment) => (
                    <div key={fundInvestment.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">{fundInvestment.fundName}</h4>
                          <p className="text-sm text-gray-600">Fund Investment</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(fundInvestment.status)}`}>
                          {fundInvestment.status}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Investment</span>
                          <span className="font-semibold">{formatCurrency(fundInvestment.investmentAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ownership</span>
                          <span className="font-semibold">{formatPercentage(fundInvestment.ownershipPercentage)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Invested: {formatDate(fundInvestment.investmentDate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
                  {currentUser.role === 'ADMIN' && (
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700">
                      Upload Document
                    </button>
                  )}
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Document
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Entity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Uploaded
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Size
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {documents.map((document) => (
                        <tr key={document.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <DocumentIcon className="h-5 w-5 text-gray-400 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{document.title}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {document.documentType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {document.entityName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(document.uploadedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700">
                    Mark All Read
                  </button>
                </div>
                
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`bg-white border rounded-xl p-4 ${!notification.isRead ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                            {!notification.isRead && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-2">{formatDate(notification.createdAt)}</p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <button className="text-gray-400 hover:text-gray-600">
                            <span className="sr-only">Mark as read</span>
                            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 