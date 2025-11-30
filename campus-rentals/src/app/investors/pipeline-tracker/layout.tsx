'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  HomeIcon,
  FolderIcon,
  UserGroupIcon,
  CogIcon,
  BuildingOfficeIcon,
  MapIcon,
  ChartBarIcon,
  EllipsisHorizontalIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

const navigationTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, path: '/investors/pipeline-tracker' },
  { id: 'deals', label: 'Deals', icon: FolderIcon, path: '/investors/pipeline-tracker/deals' },
  { id: 'contacts', label: 'Contacts', icon: UserGroupIcon, path: '/investors/pipeline-tracker/contacts' },
  { id: 'tasks', label: 'Tasks', icon: CogIcon, path: '/investors/pipeline-tracker/tasks' },
  { id: 'maps', label: 'Maps', icon: MapIcon, path: '/investors/pipeline-tracker/maps' },
  { id: 'reports', label: 'Reports', icon: ChartBarIcon, path: '/investors/pipeline-tracker/reports' },
  { id: 'more', label: 'More', icon: EllipsisHorizontalIcon, path: '/investors/pipeline-tracker/more' },
]

export default function PipelineTrackerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is admin or manager
    const checkAuth = async () => {
      try {
        const userStr = sessionStorage.getItem('currentUser')
        if (userStr) {
          const userData = JSON.parse(userStr)
          if (userData.role === 'ADMIN' || userData.role === 'MANAGER') {
            setIsAuthorized(true)
          } else {
            // Redirect investors to their dashboard
            router.push('/investors/dashboard')
            return
          }
        } else {
          // Try to fetch user from API
          const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token')
          if (token) {
            const response = await fetch('/api/investors/me', {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })
            if (response.ok) {
              const userData = await response.json()
              if (userData.role === 'ADMIN' || userData.role === 'MANAGER') {
                setIsAuthorized(true)
                sessionStorage.setItem('currentUser', JSON.stringify(userData))
              } else {
                router.push('/investors/dashboard')
                return
              }
            } else {
              router.push('/investors/login')
              return
            }
          } else {
            router.push('/investors/login')
            return
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        router.push('/investors/login')
        return
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (!isAuthorized || !pathname) return
    
    // Determine active tab based on current path
    // Check exact match first, then prefix match
    const currentTab = navigationTabs.find(tab => {
      if (pathname === tab.path) return true
      // For nested routes, check if pathname starts with the tab path followed by /
      if (pathname.startsWith(tab.path + '/')) return true
      return false
    })
    if (currentTab) {
      setActiveTab(currentTab.id)
    } else {
      // Default to dashboard if no match
      setActiveTab('dashboard')
    }
  }, [pathname, isAuthorized])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-gray-900 border-b border-gray-800 relative z-50">
        <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-3 z-10 flex-shrink-0">
              <button
                onClick={() => router.push('/investors/dashboard')}
                className="text-white hover:text-gray-200 transition-colors relative z-20 p-1 sm:p-0"
                aria-label="Back to dashboard"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="h-7 w-7 sm:h-8 sm:w-8 bg-gradient-to-br from-accent to-primary rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xs sm:text-sm">CR</span>
              </div>
            </div>

            {/* Navigation Tabs - Mobile: Scrollable, Desktop: Centered */}
            <div className="flex items-center space-x-1 flex-1 justify-center overflow-x-auto scrollbar-hide px-2 sm:px-0 min-w-0">
              {navigationTabs.map((tab) => {
                const isActive = activeTab === tab.id
                const Icon = tab.icon
                return (
                  <Link
                    key={tab.id}
                    href={tab.path}
                    className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? 'bg-gradient-to-r from-accent to-primary text-white shadow-md'
                        : 'text-gray-300 hover:text-accent hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium hidden sm:inline">{tab.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </main>
    </div>
  )
}

