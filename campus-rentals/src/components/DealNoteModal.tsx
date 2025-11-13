'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface DealNoteModalProps {
  isOpen: boolean
  onClose: () => void
  dealId: string
  note?: any
  authToken: string
  onSuccess: () => void
}

export default function DealNoteModal({
  isOpen,
  onClose,
  dealId,
  note,
  authToken,
  onSuccess,
}: DealNoteModalProps) {
  const [formData, setFormData] = useState({
    content: '',
    isPrivate: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (note) {
      setFormData({
        content: note.content || '',
        isPrivate: note.isPrivate || false,
      })
    } else {
      setFormData({
        content: '',
        isPrivate: false,
      })
    }
  }, [note, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = note
        ? `/api/investors/crm/notes/${note.id}`
        : '/api/investors/crm/notes'
      const method = note ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...formData,
          dealId,
        }),
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save note')
      }
    } catch (error: any) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">
              {note ? 'Edit Note' : 'Create New Note'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Note Content *
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your note..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPrivate"
              checked={formData.isPrivate}
              onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
            />
            <label htmlFor="isPrivate" className="ml-2 text-sm text-slate-700">
              Private note (only visible to you)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : note ? 'Update Note' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

