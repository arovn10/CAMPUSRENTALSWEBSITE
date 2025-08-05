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
  name?: string
  propertyName?: string
  propertyAddress: string
  totalInvestment?: number
  investorId?: string
  investorEmail?: string
  investmentAmount: number
  ownershipPercentage: number
  startDate?: string
  expectedReturn?: number
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED'
  distributions?: Distribution[]
  // New fields for entity investments
  investmentType?: 'DIRECT' | 'ENTITY'
  entityName?: string
  entityType?: string
  entityOwners?: Array<{
    id: string
    userId: string
    userName: string
    userEmail: string
    ownershipPercentage: number
    investmentAmount: number
  }>
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
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [showAssignInvestors, setShowAssignInvestors] = useState(false)
  const [showCreateInvestor, setShowCreateInvestor] = useState(false)
  const [showViewInvestment, setShowViewInvestment] = useState(false)
  const [showEditInvestment, setShowEditInvestment] = useState(false)
  const [showViewUser, setShowViewUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
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

  const [newProject, setNewProject] = useState({
    name: '',
    propertyAddress: '',
    totalProjectCost: '',
    totalAmountInvested: '',
    totalDebt: '',
    description: '',
    propertyType: 'SINGLE_FAMILY' as const,
    bedrooms: '',
    bathrooms: '',
    squareFeet: '',
    acquisitionDate: '',
    acquisitionPrice: '',
    monthlyRent: '',
    annualExpenses: ''
  })

  const [newInvestment, setNewInvestment] = useState({
    projectId: '',
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
      const userData = JSON.parse(user)
      setCurrentUser(userData)
      // Fetch data after user is set
      setTimeout(() => fetchDashboardData(userData), 100)
    } else {
      router.push('/investors/login')
    }
  }, [router])

  // Recalculate stats when investments change
  useEffect(() => {
    if (investments.length > 0) {
      calculateStats()
    }
  }, [investments])

  const fetchDashboardData = async (user?: User) => {
    try {
      setLoading(true)
      const currentUserData = user || currentUser
      
      if (!currentUserData) {
        console.error('No user data available')
        return
      }
      
      // Fetch stats from the API
      const statsResponse = await fetch('/api/investors/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUserData.email}`
        }
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      } else {
        console.error('Failed to fetch stats:', statsResponse.status)
      }

      // Fetch investments
      const investmentsResponse = await fetch('/api/investors/properties', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUserData.email}`
        }
      })
      
      if (investmentsResponse.ok) {
        const investmentsData = await investmentsResponse.json()
        setInvestments(investmentsData || [])
      } else {
        console.error('Failed to fetch investments:', investmentsResponse.status)
      }

      // Fetch users (admin only)
      if (currentUserData.role === 'ADMIN') {
        const usersResponse = await fetch('/api/investors/users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUserData.email}`
          }
        })
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData)
        }
      }
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
      sum + (inv.distributions?.reduce((distSum, dist) => distSum + dist.amount, 0) || 0), 0
    )

    setStats({
      totalInvested,
      currentValue: totalInvested * 1.15, // 15% appreciation
      totalReturn: totalDistributions,
      totalIrr: 0, // Will be calculated from real data
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

  const handleViewInvestmentDetails = (investmentId: string) => {
    router.push(`/investors/investments/${investmentId}`)
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/investors/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProject,
          totalProjectCost: Number(newProject.totalProjectCost),
          totalAmountInvested: Number(newProject.totalAmountInvested),
          totalDebt: Number(newProject.totalDebt),
          acquisitionPrice: Number(newProject.acquisitionPrice),
          monthlyRent: Number(newProject.monthlyRent),
          annualExpenses: Number(newProject.annualExpenses),
          bedrooms: Number(newProject.bedrooms),
          bathrooms: Number(newProject.bathrooms),
          squareFeet: Number(newProject.squareFeet)
        })
      })

      if (response.ok) {
        setShowCreateProject(false)
        setNewProject({
          name: '',
          propertyAddress: '',
          totalProjectCost: '',
          totalAmountInvested: '',
          totalDebt: '',
          description: '',
          propertyType: 'SINGLE_FAMILY' as const,
          bedrooms: '',
          bathrooms: '',
          squareFeet: '',
          acquisitionDate: '',
          acquisitionPrice: '',
          monthlyRent: '',
          annualExpenses: ''
        })
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error creating project:', error)
    }
  }

  const handleCreateInvestment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/investors/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newInvestment,
          investmentAmount: Number(newInvestment.investmentAmount),
          ownershipPercentage: Number(newInvestment.ownershipPercentage),
          expectedReturn: Number(newInvestment.expectedReturn)
        })
      })

      if (response.ok) {
        setShowAssignInvestors(false)
        setNewInvestment({
          projectId: '',
          investorId: '',
          investorEmail: '',
          investmentAmount: '',
          ownershipPercentage: '',
          startDate: '',
          expectedReturn: '',
          status: 'PENDING' as const
        })
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error creating investment:', error)
    }
  }

  const handleUpdateInvestment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvestment) return
    
    try {
      const response = await fetch(`/api/investors/investments/${selectedInvestment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investmentAmount: Number(newInvestment.investmentAmount),
          ownershipPercentage: Number(newInvestment.ownershipPercentage),
          expectedReturn: Number(newInvestment.expectedReturn),
          status: newInvestment.status
        })
      })

      if (response.ok) {
        setShowEditInvestment(false)
        setSelectedInvestment(null)
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error updating investment:', error)
    }
  }

  const handleDeleteInvestment = async (investmentId: string) => {
    if (!confirm('Are you sure you want to delete this investment? This action cannot be undone.')) return
    
    try {
      const response = await fetch(`/api/investors/investments/${investmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser?.email}`
        }
      })

      if (response.ok) {
        setShowViewInvestment(false)
        setSelectedInvestment(null)
        await fetchDashboardData()
        alert('Investment deleted successfully!')
      } else {
        alert('Failed to delete investment. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting investment:', error)
      alert('Error deleting investment. Please try again.')
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    
    try {
      const response = await fetch(`/api/investors/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          company: newUser.company,
          phone: newUser.phone
        })
      })

      if (response.ok) {
        setShowEditUser(false)
        setSelectedUser(null)
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
      const response = await fetch(`/api/investors/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser?.email}`
        }
      })

      if (response.ok) {
        alert('User deleted successfully!')
        setShowViewUser(false)
        setSelectedUser(null)
        fetchDashboardData()
      } else {
        alert('Failed to delete user. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error deleting user. Please try again.')
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
    const totalInvestment = investment.totalInvestment || investment.investmentAmount
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
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap space-x-1 md:space-x-6 px-4 md:px-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 md:py-4 px-4 md:px-6 font-medium text-sm transition-all duration-200 whitespace-nowrap rounded-xl ${
                  activeTab === 'overview'
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('investments')}
                className={`py-3 md:py-4 px-4 md:px-6 font-medium text-sm transition-all duration-200 whitespace-nowrap rounded-xl ${
                  activeTab === 'investments'
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Investments
              </button>
              {currentUser?.role === 'ADMIN' && (
                <>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`py-3 md:py-4 px-4 md:px-6 font-medium text-sm transition-all duration-200 whitespace-nowrap rounded-xl ${
                      activeTab === 'users'
                        ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`py-3 md:py-4 px-4 md:px-6 font-medium text-sm transition-all duration-200 whitespace-nowrap rounded-xl ${
                      activeTab === 'admin'
                        ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Admin
                  </button>
                </>
              )}
            </nav>
          </div>

          <div className="p-4 md:p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowCreateProject(true)}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center space-x-2 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                      >
                        <PlusIcon className="h-5 w-5" />
                        <span>New Project</span>
                      </button>
                      <button
                        onClick={() => setShowAssignInvestors(true)}
                        className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2.5 rounded-lg hover:from-green-700 hover:to-green-800 flex items-center space-x-2 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                      >
                        <UserIcon className="h-5 w-5" />
                        <span>Assign Investors</span>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Property
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Investment
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ownership
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expected Return
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Date
                        </th>
                        {currentUser?.role === 'ADMIN' && (
                          <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {investments.map((investment) => {
                        const waterfall = calculateWaterfall(investment)
                        return (
                          <tr key={investment.id} className="hover:bg-gray-50">
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{investment.propertyName || investment.name || 'Unnamed Property'}</div>
                                <div className="text-sm text-gray-500">{investment.propertyAddress}</div>
                                {investment.investmentType === 'ENTITY' && investment.entityName && (
                                  <div className="text-xs text-blue-600 font-medium mt-1">
                                    📋 {investment.entityName} ({investment.entityType})
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                investment.investmentType === 'ENTITY' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {investment.investmentType === 'ENTITY' ? '📋 Entity' : '👤 Direct'}
                              </span>
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{formatCurrency(investment.investmentAmount)}</div>
                              <div className="text-sm text-gray-500">of {formatCurrency(investment.totalInvestment || investment.investmentAmount)}</div>
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatPercentage(investment.ownershipPercentage)}
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{formatCurrency(waterfall.investorReturn)}</div>
                              <div className="text-sm text-gray-500">{formatPercentage(investment.expectedReturn || 0)} IRR</div>
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(investment.status)}`}>
                                {investment.status}
                              </span>
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(investment.startDate || new Date().toISOString())}
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => handleViewInvestmentDetails(investment.id)}
                                  className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300"
                                >
                                  View Details
                                </button>
                                {currentUser?.role === 'ADMIN' && (
                                  <>
                                    <button 
                                      onClick={() => {
                                        setSelectedInvestment(investment)
                                        setShowViewInvestment(true)
                                      }}
                                      className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
                                    >
                                      <EyeIcon className="h-4 w-4" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setSelectedInvestment(investment)
                                        setNewInvestment({
                                          projectId: investment.id,
                                          investorId: investment.investorId || '',
                                          investorEmail: investment.investorEmail || '',
                                          investmentAmount: investment.investmentAmount.toString(),
                                          ownershipPercentage: investment.ownershipPercentage.toString(),
                                          startDate: investment.startDate || new Date().toISOString(),
                                          expectedReturn: (investment.expectedReturn || 0).toString(),
                                          status: investment.status as any
                                        })
                                        setShowEditInvestment(true)
                                      }}
                                      className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteInvestment(investment.id)}
                                      className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-all duration-200"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
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
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-md hover:from-blue-700 hover:to-blue-800 flex items-center space-x-2 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
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
                              <button 
                                onClick={() => {
                                  setSelectedUser(user)
                                  setShowViewUser(true)
                                }}
                                className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors duration-200"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedUser(user)
                                  setNewUser({
                                    firstName: user.firstName,
                                    lastName: user.lastName,
                                    email: user.email,
                                    password: '',
                                    role: user.role as any,
                                    company: user.company || '',
                                    phone: user.phone || ''
                                  })
                                  setShowEditUser(true)
                                }}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors duration-200"
                              >
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
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-md hover:from-blue-700 hover:to-blue-800 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                      >
                        <PlusIcon className="h-5 w-5" />
                        <span>Create User Account</span>
                      </button>
                      <button
                        onClick={() => setShowCreateProject(true)}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2.5 rounded-md hover:from-green-700 hover:to-green-800 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
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
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  Create User
                </button>
                                  <button
                    type="button"
                    onClick={() => setShowCreateUser(false)}
                    className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-gray-800 px-6 py-2.5 rounded-lg hover:from-gray-500 hover:to-gray-600 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Project</h3>
              <button
                onClick={() => setShowCreateProject(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Project Name</label>
                  <input
                    type="text"
                    required
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Property Address</label>
                  <input
                    type="text"
                    required
                    value={newProject.propertyAddress}
                    onChange={(e) => setNewProject({...newProject, propertyAddress: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Project Cost</label>
                  <input
                    type="number"
                    required
                    value={newProject.totalProjectCost}
                    onChange={(e) => setNewProject({...newProject, totalProjectCost: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Amount Invested</label>
                  <input
                    type="number"
                    required
                    value={newProject.totalAmountInvested}
                    onChange={(e) => setNewProject({...newProject, totalAmountInvested: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Debt</label>
                  <input
                    type="number"
                    required
                    value={newProject.totalDebt}
                    onChange={(e) => setNewProject({...newProject, totalDebt: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Property Type</label>
                  <select
                    value={newProject.propertyType}
                    onChange={(e) => setNewProject({...newProject, propertyType: e.target.value as any})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="SINGLE_FAMILY">Single Family</option>
                    <option value="MULTI_FAMILY">Multi Family</option>
                    <option value="COMMERCIAL">Commercial</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bedrooms</label>
                  <input
                    type="number"
                    value={newProject.bedrooms}
                    onChange={(e) => setNewProject({...newProject, bedrooms: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bathrooms</label>
                  <input
                    type="number"
                    value={newProject.bathrooms}
                    onChange={(e) => setNewProject({...newProject, bathrooms: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Square Feet</label>
                  <input
                    type="number"
                    value={newProject.squareFeet}
                    onChange={(e) => setNewProject({...newProject, squareFeet: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Acquisition Date</label>
                  <input
                    type="date"
                    value={newProject.acquisitionDate}
                    onChange={(e) => setNewProject({...newProject, acquisitionDate: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Acquisition Price</label>
                  <input
                    type="number"
                    value={newProject.acquisitionPrice}
                    onChange={(e) => setNewProject({...newProject, acquisitionPrice: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Monthly Rent</label>
                  <input
                    type="number"
                    value={newProject.monthlyRent}
                    onChange={(e) => setNewProject({...newProject, monthlyRent: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Annual Expenses</label>
                  <input
                    type="number"
                    value={newProject.annualExpenses}
                    onChange={(e) => setNewProject({...newProject, annualExpenses: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  Create Project
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateProject(false)}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-gray-800 px-6 py-2.5 rounded-lg hover:from-gray-500 hover:to-gray-600 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Investors Modal */}
      {showAssignInvestors && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Assign Investors to Project</h3>
              <button
                onClick={() => setShowAssignInvestors(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateInvestment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Project</label>
                <select
                  required
                  value={newInvestment.projectId}
                  onChange={(e) => setNewInvestment({...newInvestment, projectId: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a Project</option>
                  {/* We'll populate this with projects from the database */}
                  <option value="project-1">2422 Joseph St. - Single Family</option>
                  <option value="project-2">2424 Joseph St - Multi Family</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Investor</label>
                <div className="flex space-x-2">
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
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Investor</option>
                    {users.filter(u => u.role === 'INVESTOR').map(user => (
                      <option key={user.id} value={user.email}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCreateInvestor(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    New
                  </button>
                </div>
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
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2.5 rounded-lg hover:from-green-700 hover:to-green-800 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  Assign Investor
                </button>
                <button
                  type="button"
                  onClick={() => setShowAssignInvestors(false)}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-gray-800 px-6 py-2.5 rounded-lg hover:from-gray-500 hover:to-gray-600 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Investor Modal */}
      {showCreateInvestor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Investor</h3>
              <button
                onClick={() => setShowCreateInvestor(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
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
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  Create Investor
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateInvestor(false)}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-gray-800 px-6 py-2.5 rounded-lg hover:from-gray-500 hover:to-gray-600 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Investment Modal */}
      {showViewInvestment && selectedInvestment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Investment Details</h3>
              <button
                onClick={() => {
                  setShowViewInvestment(false)
                  setSelectedInvestment(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Investment Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedInvestment.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Property Address</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedInvestment.propertyAddress}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Investment Amount</label>
                  <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedInvestment.investmentAmount)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Investment</label>
                  <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedInvestment.totalInvestment || selectedInvestment.investmentAmount)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ownership %</label>
                  <p className="mt-1 text-sm text-gray-900">{formatPercentage(selectedInvestment.ownershipPercentage)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expected Return</label>
                  <p className="mt-1 text-sm text-gray-900">{formatPercentage(selectedInvestment.expectedReturn || 0)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedInvestment.status)}`}>
                    {selectedInvestment.status}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(selectedInvestment.startDate || new Date().toISOString())}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Investor</label>
                <p className="mt-1 text-sm text-gray-900">{selectedInvestment.investorEmail}</p>
              </div>
              
              {selectedInvestment.distributions && selectedInvestment.distributions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Distributions</label>
                  <div className="mt-2 space-y-2">
                    {selectedInvestment.distributions.map((dist) => (
                      <div key={dist.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-900">{formatDate(dist.date)}</span>
                        <span className="text-sm text-gray-900">{formatCurrency(dist.amount)}</span>
                        <span className="text-sm text-gray-500">{dist.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowViewInvestment(false)
                    setShowEditInvestment(true)
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  Edit Investment
                </button>
                <button
                  onClick={() => {
                    setShowViewInvestment(false)
                    setSelectedInvestment(null)
                  }}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-gray-800 px-6 py-2.5 rounded-lg hover:from-gray-500 hover:to-gray-600 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Investment Modal */}
      {showEditInvestment && selectedInvestment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Investment</h3>
              <button
                onClick={() => {
                  setShowEditInvestment(false)
                  setSelectedInvestment(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateInvestment} className="space-y-4">
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
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  Update Investment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditInvestment(false)
                    setSelectedInvestment(null)
                  }}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-gray-800 px-6 py-2.5 rounded-lg hover:from-gray-500 hover:to-gray-600 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewUser && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
              <button
                onClick={() => {
                  setShowViewUser(false)
                  setSelectedUser(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  selectedUser.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                  selectedUser.role === 'MANAGER' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {selectedUser.role}
                </span>
              </div>
              
              {selectedUser.company && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.company}</p>
                </div>
              )}
              
              {selectedUser.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.phone}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(selectedUser.createdAt)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Login</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(selectedUser.lastLogin)}</p>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowViewUser(false)
                    setShowEditUser(true)
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  Edit User
                </button>
                <button
                  onClick={() => {
                    setShowViewUser(false)
                    setSelectedUser(null)
                  }}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-gray-800 px-6 py-2.5 rounded-lg hover:from-gray-500 hover:to-gray-600 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUser && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
              <button
                onClick={() => {
                  setShowEditUser(false)
                  setSelectedUser(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
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
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  Update User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditUser(false)
                    setSelectedUser(null)
                  }}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-gray-800 px-6 py-2.5 rounded-lg hover:from-gray-500 hover:to-gray-600 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
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