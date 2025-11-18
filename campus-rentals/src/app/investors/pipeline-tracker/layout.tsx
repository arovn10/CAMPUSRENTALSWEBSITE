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
  { id: 'properties', label: 'Properties', icon: BuildingOfficeIcon, path: '/investors/pipeline-tracker/properties' },
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

  useEffect(() => {
    // Determine active tab based on current path
    const currentTab = navigationTabs.find(tab => pathname === tab.path || pathname?.startsWith(tab.path + '/'))
    if (currentTab) {
      setActiveTab(currentTab.id)
    }
  }, [pathname])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/investors/dashboard')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CR</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-1 flex-1 justify-center">
              {navigationTabs.map((tab) => {
                const isActive = activeTab === tab.id
                const Icon = tab.icon
                return (
                  <Link
                    key={tab.id}
                    href={tab.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

