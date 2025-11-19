'use client'

import { useState, useEffect } from 'react'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  DocumentTextIcon,
  XMarkIcon,
  PaperClipIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'

interface Entity {
  id: string
  name: string
  type: string
  address?: string
  taxId?: string
  contactPerson?: string
  contactEmail?: string
  contactPhone?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  entityOwners?: Array<{
    id: string
    ownershipPercentage: number
    investmentAmount: number
    user?: {
      id: string
      firstName: string
      lastName: string
      email: string
    }
    investorEntity?: {
      id: string
      name: string
      type: string
    }
  }>
}

interface EntityDocument {
  id: string
  title: string
  description?: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  documentType: string
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

const ENTITY_TYPES = ['LLC', 'CORPORATION', 'PARTNERSHIP', 'TRUST', 'OPERATOR', 'FUND', 'PROPERTY', 'USER']
const DOCUMENT_TYPES = ['TAX_DOCUMENT', 'OFFERING_MEMORANDUM', 'OPERATING_AGREEMENT', 'FINANCIAL_STATEMENT', 'OTHER']

export default function CRMContacts() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [entityDocuments, setEntityDocuments] = useState<EntityDocument[]>([])
  const [showDocumentsModal, setShowDocumentsModal] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'LLC',
    address: '',
    taxId: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    isActive: true,
  })

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || sessionStorage.getItem('token') || localStorage.getItem('token')
    }
    return null
  }

  useEffect(() => {
    fetchEntities()
  }, [searchTerm])

  const fetchEntities = async () => {
    try {
      setLoading(true)
      const token = getAuthToken()
      const response = await fetch('/api/investors/entities', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        let filtered = data
        if (searchTerm) {
          filtered = data.filter((e: Entity) =>
            e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }
        setEntities(filtered)
      }
    } catch (error) {
      console.error('Error fetching entities:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEntityDocuments = async (entityId: string) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/investors/entities/${entityId}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setEntityDocuments(data)
      }
    } catch (error) {
      console.error('Error fetching entity documents:', error)
    }
  }

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = getAuthToken()
      const url = editingEntity ? `/api/investors/entities/${editingEntity.id}` : '/api/investors/entities'
      const method = editingEntity ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchEntities()
        setShowCreateModal(false)
        setEditingEntity(null)
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save entity')
      }
    } catch (error) {
      console.error('Error saving entity:', error)
      alert('Failed to save entity')
    }
  }

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity)
    setFormData({
      name: entity.name,
      type: entity.type,
      address: entity.address || '',
      taxId: entity.taxId || '',
      contactPerson: entity.contactPerson || '',
      contactEmail: entity.contactEmail || '',
      contactPhone: entity.contactPhone || '',
      isActive: entity.isActive,
    })
    setShowCreateModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entity? This action cannot be undone.')) return

    try {
      const token = getAuthToken()
      const response = await fetch(`/api/investors/entities/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await fetchEntities()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete entity')
      }
    } catch (error) {
      console.error('Error deleting entity:', error)
      alert('Failed to delete entity')
    }
  }

  const handleViewDocuments = async (entity: Entity) => {
    setSelectedEntity(entity)
    await fetchEntityDocuments(entity.id)
    setShowDocumentsModal(true)
  }

  const handleUploadDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedEntity) return

    const uploadForm = new FormData(e.currentTarget)
    const file = uploadForm.get('file') as File

    if (!file) {
      alert('Please select a file')
      return
    }

    setUploadingDocument(true)
    try {
      const token = getAuthToken()
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('title', uploadForm.get('title') as string)
      uploadFormData.append('description', uploadForm.get('description') as string || '')
      uploadFormData.append('documentType', uploadForm.get('documentType') as string || 'OTHER')

      const response = await fetch(`/api/investors/entities/${selectedEntity.id}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: uploadFormData,
      })

      if (response.ok) {
        await fetchEntityDocuments(selectedEntity.id)
        e.currentTarget.reset()
        alert('Document uploaded successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to upload document')
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Failed to upload document')
    } finally {
      setUploadingDocument(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'LLC',
      address: '',
      taxId: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      isActive: true,
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Entity Management</h1>
        <p className="text-slate-600 mt-2">Manage entities, view owners, and upload documents (EIN, tax forms, etc.)</p>
      </div>

      {/* Search and Add */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search entities by name, contact person, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingEntity(null)
            setShowCreateModal(true)
          }}
          className="px-4 py-2 bg-gradient-to-r from-accent to-primary text-white rounded-lg hover:from-accent/90 hover:to-primary/90 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Entity
        </button>
      </div>

      {/* Entities Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entities.map((entity) => (
            <div 
              key={entity.id} 
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => handleViewDocuments(entity)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{entity.name}</h3>
                  <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {entity.type}
                  </span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleViewDocuments(entity)}
                    className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"
                    title="View Details & Documents"
                  >
                    <DocumentTextIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(entity)}
                    className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(entity.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                {entity.taxId && (
                  <div className="font-medium">Tax ID: <span className="font-normal">{entity.taxId}</span></div>
                )}
                {entity.contactPerson && (
                  <div>Contact: <span className="font-medium">{entity.contactPerson}</span></div>
                )}
                {entity.contactEmail && (
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
                    <a href={`mailto:${entity.contactEmail}`} className="text-accent hover:text-primary hover:underline transition-colors truncate" onClick={(e) => e.stopPropagation()}>
                      {entity.contactEmail}
                    </a>
                  </div>
                )}
                {entity.contactPhone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 flex-shrink-0" />
                    <a href={`tel:${entity.contactPhone}`} className="text-accent hover:text-primary hover:underline transition-colors" onClick={(e) => e.stopPropagation()}>
                      {entity.contactPhone}
                    </a>
                  </div>
                )}
                {entity.address && (
                  <div className="flex items-start gap-2">
                    <MapPinIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{entity.address}</span>
                  </div>
                )}
                {entity.entityOwners && entity.entityOwners.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-medium">{entity.entityOwners.length}</span> owner(s)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingEntity ? 'Edit Entity' : 'Create Entity'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingEntity(null)
                  resetForm()
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Entity Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Entity Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {ENTITY_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tax ID</label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingEntity(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-accent to-primary text-white rounded-lg hover:from-accent/90 hover:to-primary/90 transition-all shadow-md hover:shadow-lg"
                >
                  {editingEntity ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entity Detail Modal - Comprehensive Document Hub */}
      {showDocumentsModal && selectedEntity && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto my-8 shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedEntity.name}</h2>
                  <p className="text-sm text-slate-500 mt-1">Entity Document Hub</p>
                </div>
              <button
                onClick={() => {
                  setShowDocumentsModal(false)
                  setSelectedEntity(null)
                  setEntityDocuments([])
                }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                  <XMarkIcon className="h-6 w-6" />
              </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Entity Information Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
                  Entity Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Entity Type</label>
                    <p className="text-base font-medium text-slate-900 mt-1">{selectedEntity.type}</p>
                  </div>
                  {selectedEntity.taxId && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tax ID (EIN)</label>
                      <p className="text-base font-medium text-slate-900 mt-1">{selectedEntity.taxId}</p>
                    </div>
                  )}
                  {selectedEntity.address && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</label>
                      <p className="text-base text-slate-900 mt-1 flex items-start gap-2">
                        <MapPinIcon className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        {selectedEntity.address}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information Section */}
              {(selectedEntity.contactPerson || selectedEntity.contactEmail || selectedEntity.contactPhone) && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <EnvelopeIcon className="h-5 w-5 text-emerald-600" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedEntity.contactPerson && (
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Person</label>
                        <p className="text-base font-medium text-slate-900 mt-1">{selectedEntity.contactPerson}</p>
                      </div>
                    )}
                    {selectedEntity.contactEmail && (
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                        <a href={`mailto:${selectedEntity.contactEmail}`} className="text-base text-blue-600 hover:text-blue-700 hover:underline mt-1 block">
                          {selectedEntity.contactEmail}
                        </a>
                      </div>
                    )}
                    {selectedEntity.contactPhone && (
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</label>
                        <a href={`tel:${selectedEntity.contactPhone}`} className="text-base text-blue-600 hover:text-blue-700 hover:underline mt-1 block">
                          {selectedEntity.contactPhone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Entity Owners Section */}
              {selectedEntity.entityOwners && selectedEntity.entityOwners.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <UsersIcon className="h-5 w-5 text-purple-600" />
                    Entity Owners ({selectedEntity.entityOwners.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedEntity.entityOwners.map((owner, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-4 border border-purple-100">
                        <div className="flex items-center justify-between">
                          <div>
                            {owner.user && (
                              <p className="font-medium text-slate-900">
                                {owner.user.firstName} {owner.user.lastName}
                              </p>
                            )}
                            {owner.investorEntity && (
                              <p className="font-medium text-slate-900">{owner.investorEntity.name}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-purple-600">{owner.ownershipPercentage}%</p>
                            <p className="text-xs text-slate-500">{formatCurrency(owner.investmentAmount)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents Section */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-amber-600" />
                  Documents ({entityDocuments.length})
                </h3>

                {/* Upload Form */}
                <form onSubmit={handleUploadDocument} className="mb-6 p-4 bg-white rounded-lg border border-amber-200 space-y-4">
                  <h4 className="font-semibold text-slate-900">Upload New Document</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                  <input
                    type="text"
                    name="title"
                    required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Document Type</label>
                  <select
                    name="documentType"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>{type.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                      <textarea
                        name="description"
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
                  <input
                    type="file"
                    name="file"
                    required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  />
                    </div>
                </div>
                <button
                  type="submit"
                  disabled={uploadingDocument}
                    className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {uploadingDocument ? 'Uploading...' : 'Upload Document'}
                </button>
              </form>

                {/* Documents List */}
                <div className="space-y-3">
                {entityDocuments.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-amber-200">
                      <DocumentTextIcon className="h-12 w-12 text-amber-300 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium">No documents uploaded yet</p>
                      <p className="text-sm text-slate-400 mt-1">Upload documents using the form above</p>
                    </div>
                ) : (
                  entityDocuments.map((doc) => (
                      <div key={doc.id} className="bg-white rounded-lg p-4 border border-amber-200 hover:border-amber-300 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <PaperClipIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-900 mb-1">{doc.title}</div>
                              {doc.description && (
                                <div className="text-sm text-slate-600 mb-2">{doc.description}</div>
                              )}
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>{doc.fileName}</span>
                                <span>•</span>
                                <span>{(doc.fileSize / 1024).toFixed(2)} KB</span>
                                <span>•</span>
                                <span>{doc.documentType.replace('_', ' ')}</span>
                                <span>•</span>
                                <span>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <a
                        href={doc.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                            className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex-shrink-0"
                      >
                        View
                      </a>
                        </div>
                    </div>
                  ))
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


