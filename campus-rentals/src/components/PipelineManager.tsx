'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, XMarkIcon, PencilIcon, TrashIcon, GripVerticalIcon } from '@heroicons/react/24/outline'

interface PipelineManagerProps {
  authToken: string
  onPipelineCreated?: () => void
}

export default function PipelineManager({ authToken, onPipelineCreated }: PipelineManagerProps) {
  const [showModal, setShowModal] = useState(false)
  const [pipelines, setPipelines] = useState<any[]>([])
  const [editingPipeline, setEditingPipeline] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
    stages: [{ name: '', order: 0, color: '#3B82F6' }],
  })

  useEffect(() => {
    fetchPipelines()
  }, [])

  const fetchPipelines = async () => {
    try {
      const response = await fetch('/api/investors/crm/pipelines', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setPipelines(data.pipelines || [])
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingPipeline
        ? `/api/investors/crm/pipelines/${editingPipeline.id}`
        : '/api/investors/crm/pipelines'
      const method = editingPipeline ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchPipelines()
        onPipelineCreated?.()
        setShowModal(false)
        setEditingPipeline(null)
        setFormData({
          name: '',
          description: '',
          isDefault: false,
          stages: [{ name: '', order: 0, color: '#3B82F6' }],
        })
      }
    } catch (error) {
      console.error('Error saving pipeline:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pipeline?')) return

    try {
      const response = await fetch(`/api/investors/crm/pipelines/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      if (response.ok) {
        fetchPipelines()
      }
    } catch (error) {
      console.error('Error deleting pipeline:', error)
    }
  }

  const addStage = () => {
    setFormData({
      ...formData,
      stages: [
        ...formData.stages,
        { name: '', order: formData.stages.length, color: '#3B82F6' },
      ],
    })
  }

  const removeStage = (index: number) => {
    setFormData({
      ...formData,
      stages: formData.stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })),
    })
  }

  const updateStage = (index: number, field: string, value: any) => {
    const newStages = [...formData.stages]
    newStages[index] = { ...newStages[index], [field]: value }
    setFormData({ ...formData, stages: newStages })
  }

  return (
    <>
      <button
        onClick={() => {
          setEditingPipeline(null)
          setFormData({
            name: '',
            description: '',
            isDefault: false,
            stages: [{ name: '', order: 0, color: '#3B82F6' }],
          })
          setShowModal(true)
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
      >
        <PlusIcon className="h-5 w-5" />
        New Pipeline
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingPipeline ? 'Edit Pipeline' : 'Create New Pipeline'}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingPipeline(null)
                  }}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pipeline Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Acquisition Pipeline"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Pipeline description..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 text-sm text-slate-700">
                  Set as default pipeline
                </label>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-slate-900">Stages</h4>
                  <button
                    type="button"
                    onClick={addStage}
                    className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                  >
                    <PlusIcon className="h-4 w-4 inline mr-1" />
                    Add Stage
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.stages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <GripVerticalIcon className="h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={stage.name}
                        onChange={(e) => updateStage(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Stage name"
                      />
                      <input
                        type="color"
                        value={stage.color}
                        onChange={(e) => updateStage(index, 'color', e.target.value)}
                        className="w-12 h-10 border border-slate-300 rounded-lg cursor-pointer"
                      />
                      {formData.stages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStage(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingPipeline(null)
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingPipeline ? 'Update Pipeline' : 'Create Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

