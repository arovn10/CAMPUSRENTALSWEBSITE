'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  UserIcon,
  DocumentTextIcon,
  LinkIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import DealTaskModal from '@/components/DealTaskModal'
import DealNoteModal from '@/components/DealNoteModal'
import DealContactModal from '@/components/DealContactModal'
import DealLocationMap from '@/components/DealLocationMap'

interface Deal {
  id: string
  name: string
  dealType: string
  status: string
  priority: string
  pipelineId?: string
  stageId?: string
  propertyId?: string
  description?: string
  location?: string
  estimatedValue?: number
  estimatedCloseDate?: string
  actualCloseDate?: string
  source?: string
  assignedToId?: string
  tags: string[]
  published?: boolean
  pipeline?: {
    id: string
    name: string
  }
  stage?: {
    id: string
    name: string
    color?: string
  }
  property?: {
    id: string
    propertyId: number
    name: string
    address: string
    photos?: Array<{ photoUrl: string }>
  }
  assignedTo?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  tasks: Task[]
  notes: Note[]
  relationships: Relationship[]
  dealTags: Array<{ tag: string }>
}

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  assignedToId?: string
  assignedTo?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

interface Note {
  id: string
  content: string
  isPrivate: boolean
  createdById: string
  createdBy: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  createdAt: string
}

interface Relationship {
  id: string
  role: string
  notes?: string
  contact?: {
    id: string
    firstName: string
    lastName: string
    email?: string
    company?: string
  }
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export default function DealDetailPage() {
  const router = useRouter()
  const params = useParams()
  const dealId = params.id as string

  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showLocationMap, setShowLocationMap] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [published, setPublished] = useState(false)
  const [updatingPublished, setUpdatingPublished] = useState(false)

  useEffect(() => {
    if (dealId) {
      fetchDeal()
    }
  }, [dealId])

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || sessionStorage.getItem('token') || localStorage.getItem('token')
    }
    return null
  }

  const fetchDeal = async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/investors/crm/deals/${dealId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDeal(data)
        setPublished(data.published || false)
      } else {
        router.push('/investors/pipeline-tracker/deals')
      }
    } catch (error) {
      console.error('Error fetching deal:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePublished = async () => {
    if (!deal) return
    
    setUpdatingPublished(true)
    try {
      const token = getAuthToken()
      const newPublished = !published
      const response = await fetch(`/api/investors/crm/deals/${dealId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          published: newPublished
        }),
      })

      if (response.ok) {
        setPublished(newPublished)
        setDeal({ ...deal, published: newPublished })
      } else {
        const error = await response.json()
        alert(`Failed to update published status: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating published status:', error)
      alert('Failed to update published status')
    } finally {
      setUpdatingPublished(false)
    }
  }

  const handleDeleteDeal = async () => {
    if (!confirm('Are you sure you want to delete this deal?')) return

    try {
      const token = getAuthToken()
      const response = await fetch(`/api/investors/crm/deals/${dealId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        router.push('/investors/pipeline-tracker/deals')
      }
    } catch (error) {
      console.error('Error deleting deal:', error)
      alert('Failed to delete deal')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Deal not found</p>
          <button
            onClick={() => router.push('/investors/pipeline-tracker/deals')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Deals
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/investors/pipeline-tracker/deals')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Deals
          </button>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{deal.name}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                {deal.stage && (
                  <span
                    className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium"
                    style={{
                      backgroundColor: deal.stage.color ? `${deal.stage.color}20` : '#E0E7FF',
                      color: deal.stage.color || '#3B82F6',
                    }}
                  >
                    {deal.stage.name}
                  </span>
                )}
                <span
                  className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                    deal.priority === 'URGENT'
                      ? 'bg-red-100 text-red-700'
                      : deal.priority === 'HIGH'
                      ? 'bg-orange-100 text-orange-700'
                      : deal.priority === 'MEDIUM'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {deal.priority}
                </span>
                <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                  {deal.dealType}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Publish Toggle */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg">
                <label className="text-xs sm:text-sm font-medium text-slate-700">Published:</label>
                <button
                  onClick={handleTogglePublished}
                  disabled={updatingPublished}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    published ? 'bg-blue-600' : 'bg-gray-200'
                  } ${updatingPublished ? 'opacity-50 cursor-not-allowed' : ''}`}
                  role="switch"
                  aria-checked={published}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      published ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs text-slate-600">
                  {published ? 'Yes' : 'No'}
                </span>
              </div>
              <button
                onClick={handleDeleteDeal}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-4">Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(deal.location || deal.property?.address) && (
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">Location</p>
                    <button
                      onClick={() => setShowLocationMap(true)}
                      className="flex items-center gap-2 text-slate-900 font-medium hover:text-blue-600 transition-colors group mt-1"
                    >
                      <MapPinIcon className="h-4 w-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0" />
                      <span className="underline decoration-dotted text-sm sm:text-base break-words">
                        {deal.property?.address || deal.location}
                      </span>
                    </button>
                  </div>
                )}
                {deal.estimatedValue && (
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">Estimated Value</p>
                    <p className="text-slate-900 font-medium text-sm sm:text-base">
                      ${deal.estimatedValue.toLocaleString()}
                    </p>
                  </div>
                )}
                {deal.estimatedCloseDate && (
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">Estimated Close Date</p>
                    <p className="text-slate-900 font-medium text-sm sm:text-base">
                      {new Date(deal.estimatedCloseDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {deal.source && (
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">Source</p>
                    <p className="text-slate-900 font-medium text-sm sm:text-base">{deal.source}</p>
                  </div>
                )}
                {deal.assignedTo && (
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">Assigned To</p>
                    <p className="text-slate-900 font-medium text-sm sm:text-base">
                      {deal.assignedTo.firstName} {deal.assignedTo.lastName}
                    </p>
                  </div>
                )}
              </div>
              {deal.description && (
                <div className="mt-4">
                  <p className="text-xs sm:text-sm text-slate-500 mb-1">Description</p>
                  <p className="text-slate-700 text-sm sm:text-base">{deal.description}</p>
                </div>
              )}
              {deal.dealTags.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs sm:text-sm text-slate-500 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {deal.dealTags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm"
                      >
                        {tag.tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tasks */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Tasks</h2>
                <button
                  onClick={() => {
                    setEditingTask(null)
                    setShowTaskModal(true)
                  }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
                >
                  <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  Add Task
                </button>
              </div>
              <div className="space-y-3">
                {deal.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    onClick={() => {
                      setEditingTask(task)
                      setShowTaskModal(true)
                    }}
                  >
                    <div className="mt-1 flex-shrink-0">
                      {task.status === 'COMPLETED' ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      ) : task.status === 'IN_PROGRESS' ? (
                        <ClockIcon className="h-5 w-5 text-blue-600" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm sm:text-base">{task.title}</p>
                      {task.description && (
                        <p className="text-xs sm:text-sm text-slate-600 mt-1">{task.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-slate-500">
                        <span
                          className={`px-2 py-1 rounded ${
                            task.priority === 'URGENT'
                              ? 'bg-red-100 text-red-700'
                              : task.priority === 'HIGH'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        )}
                        {task.assignedTo && (
                          <span className="break-words">
                            Assigned to: {task.assignedTo.firstName} {task.assignedTo.lastName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {deal.tasks.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No tasks yet</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Notes</h2>
                <button
                  onClick={() => {
                    setEditingNote(null)
                    setShowNoteModal(true)
                  }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
                >
                  <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  Add Note
                </button>
              </div>
              <div className="space-y-4">
                {deal.notes.map((note) => (
                  <div key={note.id} className="p-3 sm:p-4 bg-slate-50 rounded-lg">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-slate-900">
                          {note.createdBy.firstName} {note.createdBy.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {note.isPrivate && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                          Private
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap break-words">{note.content}</p>
                  </div>
                ))}
                {deal.notes.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No notes yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Property Link */}
            {deal.property && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">Linked Property</h3>
                <div>
                  <p className="font-medium text-slate-900 text-sm sm:text-base">{deal.property.name}</p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 break-words">{deal.property.address}</p>
                  <button
                    onClick={() => router.push(`/investors/investments/${deal.propertyId}`)}
                    className="mt-3 flex items-center gap-2 text-blue-600 hover:text-blue-700 text-xs sm:text-sm"
                  >
                    <LinkIcon className="h-4 w-4" />
                    View Property
                  </button>
                </div>
              </div>
            )}

            {/* Contacts */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">Contacts</h3>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                {deal.relationships.map((rel) => (
                  <div key={rel.id} className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-900 text-sm sm:text-base">
                      {rel.contact
                        ? `${rel.contact.firstName} ${rel.contact.lastName}`
                        : rel.user
                        ? `${rel.user.firstName} ${rel.user.lastName}`
                        : 'Unknown'}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">{rel.role}</p>
                    {rel.contact?.company && (
                      <p className="text-xs text-slate-500 mt-1 break-words">{rel.contact.company}</p>
                    )}
                    {rel.notes && (
                      <p className="text-xs text-slate-500 mt-1 break-words">{rel.notes}</p>
                    )}
                  </div>
                ))}
                {deal.relationships.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No contacts yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showTaskModal && (
        <DealTaskModal
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false)
            setEditingTask(null)
          }}
          dealId={dealId}
          task={editingTask}
          onSuccess={fetchDeal}
        />
      )}

      {showNoteModal && (
        <DealNoteModal
          isOpen={showNoteModal}
          onClose={() => {
            setShowNoteModal(false)
            setEditingNote(null)
          }}
          dealId={dealId}
          note={editingNote}
          onSuccess={fetchDeal}
        />
      )}

      {showContactModal && (
        <DealContactModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          dealId={dealId}
          onSuccess={fetchDeal}
        />
      )}

      {showLocationMap && (deal.location || deal.property?.address) && (
        <DealLocationMap
          isOpen={showLocationMap}
          onClose={() => setShowLocationMap(false)}
          address={deal.property?.address || deal.location || ''}
          dealName={deal.name}
        />
      )}
    </div>
  )
}
