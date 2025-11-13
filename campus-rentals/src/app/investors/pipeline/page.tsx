'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import AcquisitionsSection from '@/components/pipeline/AcquisitionsSection'
import DevelopmentSection from '@/components/pipeline/DevelopmentSection'
import AssetManagementSection from '@/components/pipeline/AssetManagementSection'

type PipelineSection = 'ACQUISITIONS' | 'DEVELOPMENT' | 'ASSET_MANAGEMENT'

export default function PipelinePage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<PipelineSection>('ACQUISITIONS')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is admin
    const token = sessionStorage.getItem('token') || localStorage.getItem('token')
    if (!token) {
      router.push('/investors/login')
      return
    }

    // Decode token to get user info (simplified - in production use proper JWT decode)
    try {
      const userStr = sessionStorage.getItem('user') || localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
        if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
          router.push('/investors/dashboard')
          return
        }
        
        // Auto-sync properties to deals
        syncProperties(token)
      }
    } catch (error) {
      console.error('Error parsing user:', error)
      router.push('/investors/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  const syncProperties = async (token: string) => {
    try {
      const response = await fetch('/api/investors/crm/sync-properties', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const result = await response.json()
        console.log('Properties synced:', result.message)
      }
    } catch (error) {
      console.error('Error syncing properties:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) {
    return null
  }

  const sections = [
    {
      id: 'ACQUISITIONS' as PipelineSection,
      name: 'Acquisitions',
      icon: BuildingOfficeIcon,
      description: 'Source, track, and close deals with automated pipeline management',
      color: 'blue',
    },
    {
      id: 'DEVELOPMENT' as PipelineSection,
      name: 'Development',
      icon: WrenchScrewdriverIcon,
      description: 'Manage timelines, budgets, and construction projects',
      color: 'green',
    },
    {
      id: 'ASSET_MANAGEMENT' as PipelineSection,
      name: 'Asset Management',
      icon: ChartBarIcon,
      description: 'Track portfolio performance, operations, and relationships',
      color: 'purple',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Deal Pipeline</h1>
              <p className="text-sm text-slate-600 mt-1">
                Manage deals from acquisition through development to asset management
              </p>
            </div>
            <button
              onClick={() => router.push('/investors/dashboard')}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`
                    flex items-center gap-3 px-6 py-4 border-b-2 transition-colors
                    ${
                      isActive
                        ? `border-${section.color}-600 text-${section.color}-600 bg-${section.color}-50`
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">{section.name}</div>
                    <div className="text-xs text-slate-500 hidden md:block">{section.description}</div>
                  </div>
                  {isActive && (
                    <ArrowRightIcon className="h-4 w-4 ml-auto hidden md:block" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Section Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === 'ACQUISITIONS' && <AcquisitionsSection />}
        {activeSection === 'DEVELOPMENT' && <DevelopmentSection />}
        {activeSection === 'ASSET_MANAGEMENT' && <AssetManagementSection />}
      </div>
    </div>
  )
}

