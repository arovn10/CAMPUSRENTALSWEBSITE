'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface DealCreateModalProps {
  isOpen: boolean
  onClose: () => void
  authToken: string
  onSuccess: () => void
  pipelines?: any[]
  properties?: any[]
  contacts?: any[]
  users?: any[]
}

export default function DealCreateModal({
  isOpen,
  onClose,
  authToken,
  onSuccess,
  pipelines = [],
  properties = [],
  contacts = [],
  users = [],
}: DealCreateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    propertyId: '',
    pipelineId: '',
    stageId: '',
    dealType: 'ACQUISITION',
    status: 'UNDER_CONTRACT',
    priority: 'MEDIUM',
    askingPrice: '',
    offerPrice: '',
    purchasePrice: '',
    estimatedValue: '',
    capRate: '',
    noi: '',
    sourcedDate: '',
    underContractDate: '',
    dueDiligenceEnd: '',
    closingDate: '',
    expectedClosing: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    description: '',
    notes: '',
    source: '',
    sourceContactId: '',
    assignedTo: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPipeline, setSelectedPipeline] = useState<any>(null)

  useEffect(() => {
    if (formData.pipelineId) {
      const pipeline = pipelines.find(p => p.id === formData.pipelineId)
      setSelectedPipeline(pipeline)
      if (pipeline?.stages?.length > 0 && !formData.stageId) {
        setFormData(prev => ({ ...prev, stageId: pipeline.stages[0].id }))
      }
    }
  }, [formData.pipelineId, pipelines])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload: any = {
        ...formData,
        askingPrice: formData.askingPrice ? parseFloat(formData.askingPrice) : null,
        offerPrice: formData.offerPrice ? parseFloat(formData.offerPrice) : null,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : null,
        capRate: formData.capRate ? parseFloat(formData.capRate) : null,
        noi: formData.noi ? parseFloat(formData.noi) : null,
        propertyId: formData.propertyId || null,
        pipelineId: formData.pipelineId || null,
        stageId: formData.stageId || null,
        sourceContactId: formData.sourceContactId || null,
        assignedTo: formData.assignedTo || null,
      }

      const response = await fetch('/api/investors/crm/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        onSuccess()
        onClose()
        // Reset form
        setFormData({
          name: '',
          propertyId: '',
          pipelineId: '',
          stageId: '',
          dealType: 'ACQUISITION',
          status: 'UNDER_CONTRACT',
          priority: 'MEDIUM',
          askingPrice: '',
          offerPrice: '',
          purchasePrice: '',
          estimatedValue: '',
          capRate: '',
          noi: '',
          sourcedDate: '',
          underContractDate: '',
          dueDiligenceEnd: '',
          closingDate: '',
          expectedClosing: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          description: '',
          notes: '',
          source: '',
          sourceContactId: '',
          assignedTo: '',
        })
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create deal')
      }
    } catch (error: any) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8">
        <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Create New Deal</h3>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Deal Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter deal name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Pipeline
              </label>
              <select
                value={formData.pipelineId}
                onChange={(e) => setFormData({ ...formData, pipelineId: e.target.value, stageId: '' })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Pipeline</option>
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPipeline && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Stage
                </label>
                <select
                  value={formData.stageId}
                  onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Stage</option>
                  {selectedPipeline.stages?.map((stage: any) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Deal Type
              </label>
              <select
                value={formData.dealType}
                onChange={(e) => setFormData({ ...formData, dealType: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ACQUISITION">Acquisition</option>
                <option value="DEVELOPMENT">Development</option>
                <option value="REFINANCE">Refinance</option>
                <option value="DISPOSITION">Disposition</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Link to Property (Optional)
              </label>
              <select
                value={formData.propertyId}
                onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No Property Link</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name || property.address}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Assigned To
              </label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="font-semibold text-slate-900 mb-4">Financial Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Asking Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.askingPrice}
                  onChange={(e) => setFormData({ ...formData, askingPrice: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Offer Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.offerPrice}
                  onChange={(e) => setFormData({ ...formData, offerPrice: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Purchase Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Estimated Value
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.estimatedValue}
                  onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cap Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.capRate}
                  onChange={(e) => setFormData({ ...formData, capRate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  NOI
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.noi}
                  onChange={(e) => setFormData({ ...formData, noi: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="font-semibold text-slate-900 mb-4">Location</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="font-semibold text-slate-900 mb-4">Important Dates</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sourced Date
                </label>
                <input
                  type="date"
                  value={formData.sourcedDate}
                  onChange={(e) => setFormData({ ...formData, sourcedDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Under Contract Date
                </label>
                <input
                  type="date"
                  value={formData.underContractDate}
                  onChange={(e) => setFormData({ ...formData, underContractDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Due Diligence End
                </label>
                <input
                  type="date"
                  value={formData.dueDiligenceEnd}
                  onChange={(e) => setFormData({ ...formData, dueDiligenceEnd: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expected Closing
                </label>
                <input
                  type="date"
                  value={formData.expectedClosing}
                  onChange={(e) => setFormData({ ...formData, expectedClosing: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Closing Date
                </label>
                <input
                  type="date"
                  value={formData.closingDate}
                  onChange={(e) => setFormData({ ...formData, closingDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="font-semibold text-slate-900 mb-4">Additional Information</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Source
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="How was this deal sourced?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Source Contact
                </label>
                <select
                  value={formData.sourceContactId}
                  onChange={(e) => setFormData({ ...formData, sourceContactId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No Contact</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Deal description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Internal Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Internal notes..."
                />
              </div>
            </div>
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
              disabled={loading || !formData.name}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

