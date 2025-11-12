'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DealTaskModal from '@/components/DealTaskModal'
import DealNoteModal from '@/components/DealNoteModal'
import DealContactModal from '@/components/DealContactModal'
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  TagIcon,
  DocumentIcon,
  ChatBubbleLeftIcon,
  XMarkIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import DealFileManager from '@/components/DealFileManager'

interface Deal {
  id: string
  name: string
  propertyId?: string
  pipelineId?: string
  stageId?: string
  dealType: string
  status: string
  priority: string
  askingPrice?: number
  offerPrice?: number
  purchasePrice?: number
  estimatedValue?: number
  capRate?: number
  noi?: number
  sourcedDate?: string
  underContractDate?: string
  dueDiligenceEnd?: string
  closingDate?: string
  expectedClosing?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  description?: string
  notes?: string
  tags: string[]
  source?: string
  sourceContactId?: string
  assignedTo?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  stage?: {
    id: string
    name: string
    color?: string
  }
  pipeline?: {
    id: string
    name: string
  }
  tasks?: Array<{
    id: string
    title: string
    description?: string
    status: string
    priority: string
    dueDate?: string
    completedDate?: string
    assignedTo?: {
      id: string
      firstName: string
      lastName: string
    }
    creator: {
      id: string
      firstName: string
      lastName: string
    }
  }>
  activities?: Array<{
    id: string
    activityType: string
    title: string
    description?: string
    createdAt: string
    user: {
      id: string
      firstName: string
      lastName: string
    }
  }>
  dealNotes?: Array<{
    id: string
    content: string
    isPrivate: boolean
    createdAt: string
    creator: {
      id: string
      firstName: string
      lastName: string
    }
  }>
  relationships?: Array<{
    id: string
    role: string
    notes?: string
    contact: {
      id: string
      firstName: string
      lastName: string
      email?: string
      phone?: string
      company?: string
      title?: string
    }
  }>
}

export default function DealDetailPage() {
  const router = useRouter()
  const params = useParams()
  const dealId = params.id as string

  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'notes' | 'contacts' | 'documents' | 'activity'>('overview')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [editingNote, setEditingNote] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    fetchDeal()
    fetchUsers()
  }, [dealId])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/investors/users', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const getAuthToken = () => {
    const user = sessionStorage.getItem('currentUser')
    if (user) {
      const userData = JSON.parse(user)
      return sessionStorage.getItem('authToken') || userData.email || ''
    }
    return ''
  }

  const fetchDeal = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/investors/crm/deals/${dealId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setDeal(data.deal)
      }
    } catch (error) {
      console.error('Error fetching deal:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date?: string) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700 border-red-300'
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'LOW': return 'bg-blue-100 text-blue-700 border-blue-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700'
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700'
      case 'CANCELLED': return 'bg-gray-100 text-gray-700'
      case 'BLOCKED': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading deal...</p>
        </div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Deal not found</p>
          <button
            onClick={() => router.push('/investors/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200/40 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/investors/dashboard')}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{deal.name}</h1>
                {deal.address && (
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                    <MapPinIcon className="h-4 w-4" />
                    {deal.address}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {deal.stage && (
                <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                  {deal.stage.name}
                </span>
              )}
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${getPriorityColor(deal.priority)}`}>
                {deal.priority}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: DocumentIcon },
              { id: 'tasks', label: 'Tasks', icon: CheckCircleIcon },
              { id: 'notes', label: 'Notes', icon: ChatBubbleLeftIcon },
              { id: 'contacts', label: 'Contacts', icon: UserIcon },
              { id: 'documents', label: 'Documents', icon: DocumentIcon },
              { id: 'activity', label: 'Activity', icon: ClockIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Financials */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Financial Information</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Asking Price</p>
                    <p className="text-lg font-semibold text-slate-900">{formatCurrency(deal.askingPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Offer Price</p>
                    <p className="text-lg font-semibold text-slate-900">{formatCurrency(deal.offerPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Purchase Price</p>
                    <p className="text-lg font-semibold text-slate-900">{formatCurrency(deal.purchasePrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Estimated Value</p>
                    <p className="text-lg font-semibold text-slate-900">{formatCurrency(deal.estimatedValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Cap Rate</p>
                    <p className="text-lg font-semibold text-slate-900">{deal.capRate ? `${deal.capRate}%` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">NOI</p>
                    <p className="text-lg font-semibold text-slate-900">{formatCurrency(deal.noi)}</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Important Dates</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Sourced Date</p>
                    <p className="text-sm font-medium text-slate-900">{formatDate(deal.sourcedDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Under Contract</p>
                    <p className="text-sm font-medium text-slate-900">{formatDate(deal.underContractDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Due Diligence End</p>
                    <p className="text-sm font-medium text-slate-900">{formatDate(deal.dueDiligenceEnd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Expected Closing</p>
                    <p className="text-sm font-medium text-slate-900">{formatDate(deal.expectedClosing)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Closing Date</p>
                    <p className="text-sm font-medium text-slate-900">{formatDate(deal.closingDate)}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {deal.description && (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Description</h2>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{deal.description}</p>
                </div>
              )}

              {/* Notes */}
              {deal.notes && (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Internal Notes</h2>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{deal.notes}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Info */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Info</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Deal Type</p>
                    <p className="text-sm font-medium text-slate-900">{deal.dealType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Status</p>
                    <p className="text-sm font-medium text-slate-900">{deal.status}</p>
                  </div>
                  {deal.assignedTo && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Assigned To</p>
                      <p className="text-sm font-medium text-slate-900">
                        {deal.assignedTo.firstName} {deal.assignedTo.lastName}
                      </p>
                    </div>
                  )}
                  {deal.source && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Source</p>
                      <p className="text-sm font-medium text-slate-900">{deal.source}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {deal.tags && deal.tags.length > 0 && (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {deal.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Statistics</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Tasks</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {deal.tasks?.filter(t => t.status !== 'COMPLETED').length || 0} active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Notes</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {deal.dealNotes?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Contacts</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {deal.relationships?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Activities</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {deal.activities?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Tasks</h2>
              <button
                onClick={() => {
                  setEditingTask(null)
                  setShowTaskModal(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span className="hidden sm:inline">New Task</span>
              </button>
            </div>
            <div className="space-y-3">
              {deal.tasks && deal.tasks.length > 0 ? (
                deal.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900">{task.title}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              Due: {formatDate(task.dueDate)}
                            </span>
                          )}
                          {task.assignedTo && (
                            <span className="flex items-center gap-1">
                              <UserIcon className="h-4 w-4" />
                              {task.assignedTo.firstName} {task.assignedTo.lastName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingTask(task)
                            setShowTaskModal(true)
                          }}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No tasks yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Notes</h2>
              <button
                onClick={() => {
                  setEditingNote(null)
                  setShowNoteModal(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span className="hidden sm:inline">New Note</span>
              </button>
            </div>
            <div className="space-y-4">
              {deal.dealNotes && deal.dealNotes.length > 0 ? (
                deal.dealNotes.map((note) => (
                  <div
                    key={note.id}
                    className="border border-slate-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {note.creator.firstName} {note.creator.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(note.createdAt)}</p>
                      </div>
                      {note.isPrivate && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                          Private
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No notes yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Contacts</h2>
              <button
                onClick={() => setShowContactModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Add Contact</span>
              </button>
            </div>
            <div className="space-y-3">
              {deal.relationships && deal.relationships.length > 0 ? (
                deal.relationships.map((rel) => (
                  <div
                    key={rel.id}
                    className="border border-slate-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">
                          {rel.contact.firstName} {rel.contact.lastName}
                        </h4>
                        <p className="text-sm text-slate-600 mb-2">{rel.role}</p>
                        {rel.contact.company && (
                          <p className="text-sm text-slate-500">{rel.contact.company}</p>
                        )}
                        {rel.contact.email && (
                          <p className="text-sm text-slate-500">{rel.contact.email}</p>
                        )}
                        {rel.contact.phone && (
                          <p className="text-sm text-slate-500">{rel.contact.phone}</p>
                        )}
                        {rel.notes && (
                          <p className="text-sm text-slate-600 mt-2">{rel.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <UserIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No contacts yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && deal.propertyId && (
          <DealFileManager
            propertyId={deal.propertyId}
            authToken={getAuthToken()}
            readOnly={false}
          />
        )}

        {activeTab === 'activity' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Activity Feed</h2>
            <div className="space-y-4">
              {deal.activities && deal.activities.length > 0 ? (
                deal.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 pb-4 border-b border-slate-200 last:border-0"
                  >
                    <div className="p-2 bg-blue-100 rounded-full">
                      <ClockIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-900">{activity.title}</p>
                        <span className="text-xs text-slate-500">{formatDate(activity.createdAt)}</span>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-slate-600">{activity.description}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        by {activity.user.firstName} {activity.user.lastName}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <ClockIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No activity yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <DealTaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false)
          setEditingTask(null)
        }}
        dealId={dealId}
        task={editingTask}
        authToken={getAuthToken()}
        onSuccess={() => {
          fetchDeal()
        }}
        users={users}
      />

      <DealNoteModal
        isOpen={showNoteModal}
        onClose={() => {
          setShowNoteModal(false)
          setEditingNote(null)
        }}
        dealId={dealId}
        note={editingNote}
        authToken={getAuthToken()}
        onSuccess={() => {
          fetchDeal()
        }}
      />

      <DealContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        dealId={dealId}
        authToken={getAuthToken()}
        onSuccess={() => {
          fetchDeal()
        }}
      />
    </div>
  )
}

