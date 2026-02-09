'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChartBarIcon,
  ListBulletIcon,
  MapIcon,
  CalendarDaysIcon,
  ClockIcon,
  CubeIcon,
  FolderIcon,
  UserGroupIcon,
  CogIcon,
  DocumentChartBarIcon,
  EllipsisHorizontalIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

/* Nav: Overview, List, Map, Timeline, Upcoming Dates, Unit Summary, Deal Files, Contacts + Tasks, Reports, More */
const navigationTabs = [
  { id: 'overview', label: 'Overview', icon: ChartBarIcon, path: '/investors/pipeline-tracker', exact: true },
  { id: 'list', label: 'List', icon: ListBulletIcon, path: '/investors/pipeline-tracker/deals' },
  { id: 'map', label: 'Map', icon: MapIcon, path: '/investors/pipeline-tracker/maps' },
  { id: 'timeline', label: 'Timeline', icon: CalendarDaysIcon, path: '/investors/pipeline-tracker/deals', exact: false },
  { id: 'upcoming', label: 'Upcoming Dates', icon: ClockIcon, path: '/investors/pipeline-tracker', exact: false },
  { id: 'units', label: 'Unit Summary', icon: CubeIcon, path: '/investors/pipeline-tracker/more' },
  { id: 'files', label: 'Deal Files', icon: FolderIcon, path: '/investors/pipeline-tracker/more' },
  { id: 'contacts', label: 'Contacts', icon: UserGroupIcon, path: '/investors/pipeline-tracker/contacts' },
  { id: 'tasks', label: 'Tasks', icon: CogIcon, path: '/investors/pipeline-tracker/tasks' },
  { id: 'reports', label: 'Reports', icon: DocumentChartBarIcon, path: '/investors/pipeline-tracker/reports' },
  { id: 'more', label: 'More', icon: EllipsisHorizontalIcon, path: '/investors/pipeline-tracker/more' },
]

export default function PipelineTrackerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userStr = sessionStorage.getItem('currentUser')
        if (userStr) {
          try {
            const userData = JSON.parse(userStr)
            setCurrentUser(userData)
            if (userData.role === 'ADMIN' || userData.role === 'MANAGER') {
              setIsAuthorized(true)
              return
            }
            router.push('/investors/dashboard')
            return
          } catch (_) {
            // parse failed, fall through to API
          }
        }

        const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token')
        if (token) {
          try {
            const response = await fetch('/api/investors/me', {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
              const userData = await response.json()
              setCurrentUser(userData)
              if (userData.role === 'ADMIN' || userData.role === 'MANAGER') {
                setIsAuthorized(true)
                sessionStorage.setItem('currentUser', JSON.stringify(userData))
                return
              }
              router.push('/investors/dashboard')
              return
            }
          } catch (_) {}
        }

        router.push('/investors/login')
      } catch (error) {
        console.error('Error checking auth:', error)
        router.push('/investors/login')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!isAuthorized || !pathname) return
    const currentTab = navigationTabs.find((tab: { path: string; exact?: boolean }) => {
      if ((tab as { exact?: boolean }).exact) return pathname === tab.path
      if (pathname === tab.path) return true
      if (pathname.startsWith(tab.path + '/')) return true
      return false
    })
    if (currentTab) setActiveTab(currentTab.id)
    else setActiveTab('overview')
  }, [pathname, isAuthorized])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-accent" />
      </div>
    )
  }

  if (!isAuthorized) return null

  return (
    <div className="min-h-screen bg-[#f5f5f5] -mt-4 sm:-mt-6 lg:-mt-8">
      {/* Pipeline header: white bg, green border, title, ADMIN badge, tabs */}
      <header
        className="sticky top-0 z-50 bg-white border-b-2 border-accent shadow-sm"
      >
        <div className="max-w-full mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => router.push('/investors/dashboard')}
                className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-accent"
              >
                <span className="text-white font-bold text-xs sm:text-sm">CR</span>
              </div>
              <span className="font-semibold text-gray-900 text-sm sm:text-base hidden sm:inline">
                Deal Pipeline
              </span>
              {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200"
                  title="You can edit and use Deal Pipeline"
                >
                  ADMIN
                </span>
              )}
            </div>
          </div>
          {/* Nav tabs: horizontal scroll on small screens */}
          <nav className="flex gap-0.5 overflow-x-auto scrollbar-hide -mb-px pb-px" aria-label="Pipeline views">
            {navigationTabs.map((tab) => {
              const Icon = tab.icon
              const exact = (tab as { exact?: boolean }).exact
              const isActive = exact
                ? pathname === tab.path
                : pathname === tab.path || pathname.startsWith(tab.path + '/')
              return (
                <Link
                  key={tab.id}
                  href={tab.path}
                  className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-t-lg text-sm font-medium border-b-2 whitespace-nowrap flex-shrink-0 transition-colors ${
                    isActive ? 'bg-accent text-white border-accent' : 'text-gray-600 hover:bg-gray-100 border-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 pt-4 sm:pt-6 pb-8">
        {children}
      </main>
    </div>
  )
}

