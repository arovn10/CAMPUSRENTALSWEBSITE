'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  UserIcon,
  FolderIcon,
  CalendarIcon,
  FlagIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'

interface Task {
  id: string
  dealId: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string | null
  assignedToId: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  deal?: {
    id: string
    name: string
  }
  assignedTo?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

interface Deal {
  id: string
  name: string
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'] as const
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-700 border-gray-300',
  MEDIUM: 'bg-accent/10 text-accent border-accent/20',
  HIGH: 'bg-primary/10 text-primary border-primary/20',
  URGENT: 'bg-red-100 text-red-700 border-red-300',
}

const STATUS_COLORS = {
  TODO: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-accent/10 text-accent',
  BLOCKED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export default function PipelineTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({
    dealId: '',
    title: '',
    description: '',
    status: 'TODO' as const,
    priority: 'MEDIUM' as const,
    dueDate: '',
    assignedToId: '',
  })

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || sessionStorage.getItem('token') || localStorage.getItem('token')
    }
    return null
  }

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const token = getAuthToken()
      if (!token) {
        console.error('No auth token available')
        setLoading(false)
        return
      }

      let url = '/api/investors/crm/tasks?'
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (priorityFilter) params.append('priority', priorityFilter)
      url += params.toString()

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        let filtered = data
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          filtered = data.filter((task: Task) =>
            task.title?.toLowerCase().includes(searchLower) ||
            task.description?.toLowerCase().includes(searchLower) ||
            task.deal?.name?.toLowerCase().includes(searchLower) ||
            task.assignedTo?.firstName?.toLowerCase().includes(searchLower) ||
            task.assignedTo?.lastName?.toLowerCase().includes(searchLower)
          )
        }
        setTasks(filtered)
      } else {
        console.error('Failed to fetch tasks:', response.status)
        setTasks([])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, priorityFilter])

  const fetchDeals = useCallback(async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        console.error('No auth token available')
        return
      }

      // Fetch deals the same way as the CRM deals tab
      const response = await fetch('/api/investors/crm/deals', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const deals = await response.json()
        // API returns array directly (same as CRMDealPipeline)
        const dealsArray = Array.isArray(deals) ? deals : []
        // Extract just id and name for the dropdown
        const dealsForDropdown = dealsArray.map((deal: any) => ({
          id: deal.id,
          name: deal.name || deal.property?.name || `Deal ${deal.id}`
        }))
        setDeals(dealsForDropdown)
        console.log('Fetched deals for tasks:', dealsForDropdown.length, 'deals')
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to fetch deals:', response.status, response.statusText, errorData)
        setDeals([])
      }
    } catch (error) {
      console.error('Error fetching deals:', error)
      setDeals([])
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch('/api/investors/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Handle both { users: [...] } and [...] formats
        setUsers(Array.isArray(data) ? data : (data?.users || []))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
    fetchDeals()
    fetchUsers()
  }, [fetchTasks, fetchDeals, fetchUsers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = getAuthToken()
      if (!token) return

      const url = editingTask
        ? `/api/investors/crm/tasks/${editingTask.id}`
        : '/api/investors/crm/tasks'
      const method = editingTask ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          assignedToId: formData.assignedToId || null,
          dueDate: formData.dueDate || null,
        }),
      })

      if (response.ok) {
        await fetchTasks()
        setShowModal(false)
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save task')
      }
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Failed to save task')
    }
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setFormData({
      dealId: task.dealId,
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignedToId: task.assignedToId || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`/api/investors/crm/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await fetchTasks()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete task')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Failed to delete task')
    }
  }

  const handleStatusChange = async (task: Task, newStatus: Task['status']) => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`/api/investors/crm/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        await fetchTasks()
      }
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      dealId: '',
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: '',
      assignedToId: '',
    })
    setEditingTask(null)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  }

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter && task.status !== statusFilter) return false
    if (priorityFilter && task.priority !== priorityFilter) return false
    return true
  })

  const tasksByStatus = {
    TODO: filteredTasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: filteredTasks.filter(t => t.status === 'IN_PROGRESS'),
    BLOCKED: filteredTasks.filter(t => t.status === 'BLOCKED'),
    COMPLETED: filteredTasks.filter(t => t.status === 'COMPLETED'),
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm sm:text-base"
            />
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm sm:text-base"
          >
            <option value="">All Statuses</option>
            {TASK_STATUSES.map(status => (
              <option key={status} value={status}>{status.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm sm:text-base"
          >
            <option value="">All Priorities</option>
            {TASK_PRIORITIES.map(priority => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="px-4 py-2 bg-gradient-to-r from-accent to-primary text-white rounded-lg hover:from-accent/90 hover:to-primary/90 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>
      </div>

      {/* Tasks Kanban Board */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'] as const).map((status) => (
            <div key={status} className="bg-gray-50 rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-secondary capitalize">{status.replace('_', ' ')}</h3>
                <span className="px-2 py-1 text-xs font-medium bg-white rounded-full border border-gray-200">
                  {tasksByStatus[status].length}
                </span>
              </div>
              <div className="space-y-3">
                {tasksByStatus[status].map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-secondary text-sm flex-1">{task.title}</h4>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleEdit(task)}
                          className="p-1 text-accent hover:bg-accent/10 rounded transition-colors"
                          aria-label="Edit task"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          aria-label="Delete task"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-xs text-text mb-2 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs rounded border ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                      {task.deal && (
                        <span className="flex items-center gap-1 text-xs text-text">
                          <FolderIcon className="h-3 w-3" />
                          {task.deal.name}
                        </span>
                      )}
                    </div>
                    {task.dueDate && (
                      <div className={`flex items-center gap-1 text-xs mb-2 ${isOverdue(task.dueDate) ? 'text-red-600' : 'text-text'}`}>
                        <CalendarIcon className="h-3 w-3" />
                        {formatDate(task.dueDate)}
                        {isOverdue(task.dueDate) && <span className="text-red-600">(Overdue)</span>}
                      </div>
                    )}
                    {task.assignedTo && (
                      <div className="flex items-center gap-1 text-xs text-text">
                        <UserIcon className="h-3 w-3" />
                        {task.assignedTo.firstName} {task.assignedTo.lastName}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task, e.target.value as Task['status'])}
                        className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-accent focus:border-accent"
                      >
                        {TASK_STATUSES.map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                {tasksByStatus[status].length === 0 && (
                  <div className="text-center py-8 text-sm text-text">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg sm:text-xl font-semibold text-secondary">
                {editingTask ? 'Edit Task' : 'Create Task'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Deal *
                </label>
                <select
                  required
                  value={formData.dealId}
                  onChange={(e) => setFormData({ ...formData, dealId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm sm:text-base"
                >
                  <option value="">Select a deal</option>
                  {deals.map(deal => (
                    <option key={deal.id} value={deal.id}>{deal.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm sm:text-base"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm sm:text-base"
                  >
                    {TASK_STATUSES.map(status => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm sm:text-base"
                  >
                    {TASK_PRIORITIES.map(priority => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Assign To
                  </label>
                  <select
                    value={formData.assignedToId}
                    onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm sm:text-base"
                  >
                    <option value="">Unassigned</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-text bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-accent to-primary text-white rounded-lg hover:from-accent/90 hover:to-primary/90 transition-all shadow-md hover:shadow-lg text-sm sm:text-base"
                >
                  {editingTask ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

