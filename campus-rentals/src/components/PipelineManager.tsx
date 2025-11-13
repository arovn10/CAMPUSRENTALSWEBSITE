'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface Pipeline {
  id: string
  name: string
  description?: string
  isDefault: boolean
  isActive: boolean
  stages: Stage[]
  _count?: {
    deals: number
  }
}

interface Stage {
  id: string
  name: string
  description?: string
  order: number
  color?: string
  isActive: boolean
}

interface PipelineManagerProps {
  onClose: () => void
  onPipelineChange?: () => void
}

export default function PipelineManager({ onClose, onPipelineChange }: PipelineManagerProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreatePipeline, setShowCreatePipeline] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null)
  const [editingStage, setEditingStage] = useState<{ pipelineId: string; stage: Stage | null } | null>(null)
  const [newPipeline, setNewPipeline] = useState({
    name: '',
    description: '',
    isDefault: false,
    stages: [] as { name: string; description: string; order: number; color: string }[],
  })
  const [newStage, setNewStage] = useState({
    name: '',
    description: '',
    order: 0,
    color: '#3B82F6',
  })

  useEffect(() => {
    fetchPipelines()
  }, [])

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('token') || localStorage.getItem('token')
    }
    return null
  }

  const fetchPipelines = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch('/api/investors/crm/pipelines', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPipelines(data)
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = getAuthToken()
      const response = await fetch('/api/investors/crm/pipelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newPipeline),
      })

      if (response.ok) {
        await fetchPipelines()
        setShowCreatePipeline(false)
        setNewPipeline({ name: '', description: '', isDefault: false, stages: [] })
        onPipelineChange?.()
      }
    } catch (error) {
      console.error('Error creating pipeline:', error)
      alert('Failed to create pipeline')
    }
  }

  const handleUpdatePipeline = async (pipeline: Pipeline) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/investors/crm/pipelines/${pipeline.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: pipeline.name,
          description: pipeline.description,
          isDefault: pipeline.isDefault,
          isActive: pipeline.isActive,
        }),
      })

      if (response.ok) {
        await fetchPipelines()
        setEditingPipeline(null)
        onPipelineChange?.()
      }
    } catch (error) {
      console.error('Error updating pipeline:', error)
      alert('Failed to update pipeline')
    }
  }

  const handleDeletePipeline = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pipeline?')) return

    try {
      const token = getAuthToken()
      const response = await fetch(`/api/investors/crm/pipelines/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await fetchPipelines()
        onPipelineChange?.()
      }
    } catch (error) {
      console.error('Error deleting pipeline:', error)
      alert('Failed to delete pipeline')
    }
  }

  const handleCreateStage = async (pipelineId: string) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/investors/crm/pipelines/${pipelineId}/stages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newStage),
      })

      if (response.ok) {
        await fetchPipelines()
        setEditingStage(null)
        setNewStage({ name: '', description: '', order: 0, color: '#3B82F6' })
        onPipelineChange?.()
      }
    } catch (error) {
      console.error('Error creating stage:', error)
      alert('Failed to create stage')
    }
  }

  const handleUpdateStage = async (pipelineId: string, stage: Stage) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/investors/crm/pipelines/${pipelineId}/stages/${stage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(stage),
      })

      if (response.ok) {
        await fetchPipelines()
        setEditingStage(null)
        onPipelineChange?.()
      }
    } catch (error) {
      console.error('Error updating stage:', error)
      alert('Failed to update stage')
    }
  }

  const handleDeleteStage = async (pipelineId: string, stageId: string) => {
    if (!confirm('Are you sure you want to delete this stage?')) return

    try {
      const token = getAuthToken()
      const response = await fetch(`/api/investors/crm/pipelines/${pipelineId}/stages/${stageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await fetchPipelines()
        onPipelineChange?.()
      }
    } catch (error) {
      console.error('Error deleting stage:', error)
      alert('Failed to delete stage')
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-slate-900">Manage Pipelines</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Pipelines</h3>
            <button
              onClick={() => setShowCreatePipeline(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              New Pipeline
            </button>
          </div>

          {showCreatePipeline && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-4">Create New Pipeline</h4>
              <form onSubmit={handleCreatePipeline} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newPipeline.name}
                    onChange={(e) => setNewPipeline({ ...newPipeline, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={newPipeline.description}
                    onChange={(e) => setNewPipeline({ ...newPipeline, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={newPipeline.isDefault}
                    onChange={(e) => setNewPipeline({ ...newPipeline, isDefault: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isDefault" className="text-sm text-slate-700">Set as default</label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreatePipeline(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {pipelines.map((pipeline) => (
              <div key={pipeline.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {editingPipeline?.id === pipeline.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingPipeline.name}
                          onChange={(e) => setEditingPipeline({ ...editingPipeline, name: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <textarea
                          value={editingPipeline.description || ''}
                          onChange={(e) => setEditingPipeline({ ...editingPipeline, description: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editingPipeline.isDefault}
                              onChange={(e) => setEditingPipeline({ ...editingPipeline, isDefault: e.target.checked })}
                              className="rounded"
                            />
                            <span className="text-sm">Default</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editingPipeline.isActive}
                              onChange={(e) => setEditingPipeline({ ...editingPipeline, isActive: e.target.checked })}
                              className="rounded"
                            />
                            <span className="text-sm">Active</span>
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdatePipeline(editingPipeline)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingPipeline(null)}
                            className="px-3 py-1 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold text-slate-900">{pipeline.name}</h4>
                          {pipeline.isDefault && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Default</span>
                          )}
                          {!pipeline.isActive && (
                            <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">Inactive</span>
                          )}
                        </div>
                        {pipeline.description && (
                          <p className="text-sm text-slate-600 mt-1">{pipeline.description}</p>
                        )}
                        {pipeline._count && (
                          <p className="text-xs text-slate-500 mt-1">{pipeline._count.deals} deals</p>
                        )}
                      </div>
                    )}
                  </div>
                  {editingPipeline?.id !== pipeline.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingPipeline(pipeline)}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeletePipeline(pipeline.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-slate-700">Stages</h5>
                    {editingStage?.pipelineId === pipeline.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Stage name"
                          value={newStage.name}
                          onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                          className="px-2 py-1 text-sm border border-slate-300 rounded"
                        />
                        <input
                          type="color"
                          value={newStage.color}
                          onChange={(e) => setNewStage({ ...newStage, color: e.target.value })}
                          className="h-8 w-16 border border-slate-300 rounded"
                        />
                        <button
                          onClick={() => handleCreateStage(pipeline.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setEditingStage(null)}
                          className="px-3 py-1 bg-slate-200 text-slate-700 text-sm rounded hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingStage({ pipelineId: pipeline.id, stage: null })}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add Stage
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pipeline.stages.map((stage) => (
                      <div
                        key={stage.id}
                        className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                        style={{
                          backgroundColor: stage.color ? `${stage.color}20` : '#E0E7FF',
                          color: stage.color || '#3B82F6',
                        }}
                      >
                        <span>{stage.name}</span>
                        <button
                          onClick={() => handleDeleteStage(pipeline.id, stage.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

