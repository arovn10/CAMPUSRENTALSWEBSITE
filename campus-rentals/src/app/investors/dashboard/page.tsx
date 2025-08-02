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
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface Investment {
  id: string
  name: string
  propertyAddress: string
  totalInvestment: number
  investorId: string
  investorEmail: string
  investmentAmount: number
  ownershipPercentage: number
  startDate: string
  expectedReturn: number
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED'
  distributions: Distribution[]
}

interface Distribution {
  id: string
  investmentId: string
  amount: number
  date: string
  type: 'RENTAL' | 'SALE' | 'REFINANCE'
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
}

export default function InvestorDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
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
    unreadNotifications: 0
  })
  const [activeTab, setActiveTab] = useState('overview')
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showCreateInvestment, setShowCreateInvestment] = useState(false)
  const [loading, setLoading] = useState(true)

  // Form states
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'INVESTOR' as const,
    company: '',
    phone: ''
  })

  const [newInvestment, setNewInvestment] = useState({
    name: '',
    propertyAddress: '',
    totalInvestment: '',
    investorId: '',
    investorEmail: '',
    investmentAmount: '',
    ownershipPercentage: '',
    startDate: '',
    expectedReturn: '',
    status: 'PENDING' as const
  })

  useEffect(() => {
    const user = sessionStorage.getItem('currentUser')
    if (user) {
      setCurrentUser(JSON.parse(user))
      fetchDashboardData()
    } else {
      router.push('/investors/login')
    }
  }, [router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch users (admin only)
      if (currentUser?.role === 'ADMIN') {
        const usersResponse = await fetch('/api/investors/users?auth=' + currentUser.email)
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData)
        }
      }

      // Fetch investments
      const investmentsResponse = await fetch('/api/investors/investments?auth=' + currentUser?.email)
      if (investmentsResponse.ok) {
        const investmentsData = await investmentsResponse.json()
        setInvestments(investmentsData.data || [])
      }

      // Calculate stats
      calculateStats()
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = () => {
    const totalInvested = investments.reduce((sum, inv) => sum + inv.investmentAmount, 0)
    const activeInvestments = investments.filter(inv => inv.status === 'ACTIVE').length
    const totalDistributions = investments.reduce((sum, inv) => 
      sum + inv.distributions.reduce((distSum, dist) => distSum + dist.amount, 0), 0
    )

    setStats({
      totalInvested,
      currentValue: totalInvested * 1.15, // 15% appreciation
      totalReturn: totalDistributions,
      totalIrr: 12.5, // Mock IRR
      activeInvestments,
      totalDistributions,
      pendingDistributions: 0,
      documentsCount: 0,
      unreadNotifications: 0
    })
  }

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser')
    router.push('/investors/login')
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/investors/users?auth=' + currentUser?.email, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })

      if (response.ok) {
        setShowCreateUser(false)
        setNewUser({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          role: 'INVESTOR',
          company: '',
          phone: ''
        })
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

  const handleCreateInvestment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/investors/investments?auth=' + currentUser?.email, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newInvestment,
          totalInvestment: Number(newInvestment.totalInvestment),
          investmentAmount: Number(newInvestment.investmentAmount),
          ownershipPercentage: Number(newInvestment.ownershipPercentage),
          expectedReturn: Number(newInvestment.expectedReturn)
        })
      })

      if (response.ok) {
        setShowCreateInvestment(false)
        setNewInvestment({
          name: '',
          propertyAddress: '',
          totalInvestment: '',
          investorId: '',
          investorEmail: '',
          investmentAmount: '',
          ownershipPercentage: '',
          startDate: '',
          expectedReturn: '',
          status: 'PENDING'
        })
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error creating investment:', error)
    }
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
    return `${value.toFixed(1)}%`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const calculateWaterfall = (investment: Investment) => {
    const totalInvestment = investment.totalInvestment
    const investorAmount = investment.investmentAmount
    const ownershipPercentage = investment.ownershipPercentage / 100
    
    // Simple waterfall calculation
    const preferredReturn = investorAmount * 0.08 // 8% preferred return
    const catchUp = Math.max(0, (totalInvestment * 0.15) - preferredReturn) * ownershipPercentage
    const carriedInterest = Math.max(0, (totalInvestment * 0.20) - preferredReturn - catchUp) * 0.20
    const investorReturn = preferredReturn + catchUp + (carriedInterest * 0.80)
    const gpReturn = carriedInterest * 0.20
    
    return {
      preferredReturn,
      catchUp,
      carriedInterest,
      investorReturn,
      gpReturn,
      totalReturn: investorReturn + gpReturn
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Investor Dashboard</h1>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {currentUser?.role}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {currentUser?.firstName} {currentUser?.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Invested</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalInvested)}</p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Current Value</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.currentValue)}</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Return</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalReturn)}</p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">IRR</p>
                <p className="text-2xl font-bold">{formatPercentage(stats.totalIrr)}</p>
              </div>
              <CalculatorIcon className="h-8 w-8 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('investments')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'investments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Investments
              </button>
              {currentUser?.role === 'ADMIN' && (
                <>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'users'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'admin'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Admin
                  </button>
                </>
              )}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                      {investments.slice(0, 3).map((investment) => (
                        <div key={investment.id} className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <BuildingOfficeIcon className="h-4 w-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{investment.name}</p>
                            <p className="text-sm text-gray-500">{investment.propertyAddress}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{formatCurrency(investment.investmentAmount)}</p>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(investment.status)}`}>
                              {investment.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Active Investments</span>
                        <span className="text-sm font-medium text-gray-900">{stats.activeInvestments}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Distributions</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(stats.totalDistributions)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Average IRR</span>
                        <span className="text-sm font-medium text-gray-900">{formatPercentage(stats.totalIrr)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Investments Tab */}
            {activeTab === 'investments' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Property Investments</h3>
                  {currentUser?.role === 'ADMIN' && (
                    <button
                      onClick={() => setShowCreateInvestment(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <PlusIcon className="h-5 w-5" />
                      <span>New Investment</span>
                    </button>
                  )}
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Property
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Investment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ownership
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expected Return
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {investments.map((investment) => {
                        const waterfall = calculateWaterfall(investment)
                        return (
                          <tr key={investment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{investment.name}</div>
                                <div className="text-sm text-gray-500">{investment.propertyAddress}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{formatCurrency(investment.investmentAmount)}</div>
                              <div className="text-sm text-gray-500">of {formatCurrency(investment.totalInvestment)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatPercentage(investment.ownershipPercentage)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{formatCurrency(waterfall.investorReturn)}</div>
                              <div className="text-sm text-gray-500">{formatPercentage(investment.expectedReturn)} IRR</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(investment.status)}`}>
                                {investment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(investment.startDate)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Users Tab (Admin Only) */}
            {activeTab === 'users' && currentUser?.role === 'ADMIN' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                  <button
                    onClick={() => setShowCreateUser(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>Create Account</span>
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
                          Created
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
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <UserIcon className="h-6 w-6 text-gray-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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
                            {formatDate(user.createdAt)}
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

            {/* Admin Tab */}
            {activeTab === 'admin' && currentUser?.role === 'ADMIN' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Admin Panel</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Quick Actions</h4>
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowCreateUser(true)}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center justify-center space-x-2"
                      >
                        <PlusIcon className="h-5 w-5" />
                        <span>Create User Account</span>
                      </button>
                      <button
                        onClick={() => setShowCreateInvestment(true)}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 flex items-center justify-center space-x-2"
                      >
                        <BuildingOfficeIcon className="h-5 w-5" />
                        <span>Setup New Investment</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">System Overview</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Users</span>
                        <span className="text-sm font-medium text-gray-900">{users.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Investments</span>
                        <span className="text-sm font-medium text-gray-900">{investments.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active Investments</span>
                        <span className="text-sm font-medium text-gray-900">{stats.activeInvestments}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New User Account</h3>
              <button
                onClick={() => setShowCreateUser(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="INVESTOR">Investor</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Company</label>
                <input
                  type="text"
                  value={newUser.company}
                  onChange={(e) => setNewUser({...newUser, company: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Investment Modal */}
      {showCreateInvestment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Setup New Investment</h3>
              <button
                onClick={() => setShowCreateInvestment(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateInvestment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Investment Name</label>
                <input
                  type="text"
                  required
                  value={newInvestment.name}
                  onChange={(e) => setNewInvestment({...newInvestment, name: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Property Address</label>
                <input
                  type="text"
                  required
                  value={newInvestment.propertyAddress}
                  onChange={(e) => setNewInvestment({...newInvestment, propertyAddress: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Investment Amount</label>
                <input
                  type="number"
                  required
                  value={newInvestment.totalInvestment}
                  onChange={(e) => setNewInvestment({...newInvestment, totalInvestment: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Investor Email</label>
                <select
                  required
                  value={newInvestment.investorEmail}
                  onChange={(e) => {
                    const user = users.find(u => u.email === e.target.value)
                    setNewInvestment({
                      ...newInvestment, 
                      investorEmail: e.target.value,
                      investorId: user?.id || ''
                    })
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Investor</option>
                  {users.filter(u => u.role === 'INVESTOR').map(user => (
                    <option key={user.id} value={user.email}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Investment Amount</label>
                <input
                  type="number"
                  required
                  value={newInvestment.investmentAmount}
                  onChange={(e) => setNewInvestment({...newInvestment, investmentAmount: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Ownership Percentage</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newInvestment.ownershipPercentage}
                  onChange={(e) => setNewInvestment({...newInvestment, ownershipPercentage: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  required
                  value={newInvestment.startDate}
                  onChange={(e) => setNewInvestment({...newInvestment, startDate: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Expected Return (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newInvestment.expectedReturn}
                  onChange={(e) => setNewInvestment({...newInvestment, expectedReturn: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={newInvestment.status}
                  onChange={(e) => setNewInvestment({...newInvestment, status: e.target.value as any})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="PENDING">Pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Create Investment
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateInvestment(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 