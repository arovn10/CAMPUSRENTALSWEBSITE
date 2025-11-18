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
            <div key={entity.id} className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{entity.name}</h3>
                  <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {entity.type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewDocuments(entity)}
                    className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"
                    title="View Documents"
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
                  <div>Tax ID: {entity.taxId}</div>
                )}
                {entity.contactPerson && (
                  <div>Contact: {entity.contactPerson}</div>
                )}
                {entity.contactEmail && (
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="h-4 w-4" />
                    <a href={`mailto:${entity.contactEmail}`} className="text-accent hover:text-primary hover:underline transition-colors">
                      {entity.contactEmail}
                    </a>
                  </div>
                )}
                {entity.contactPhone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4" />
                    <a href={`tel:${entity.contactPhone}`} className="text-accent hover:text-primary hover:underline transition-colors">
                      {entity.contactPhone}
                    </a>
                  </div>
                )}
                {entity.address && (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4" />
                    <span>{entity.address}</span>
                  </div>
                )}
                {entity.entityOwners && entity.entityOwners.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    {entity.entityOwners.length} owner(s)
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

      {/* Documents Modal */}
      {showDocumentsModal && selectedEntity && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Documents - {selectedEntity.name}
              </h2>
              <button
                onClick={() => {
                  setShowDocumentsModal(false)
                  setSelectedEntity(null)
                  setEntityDocuments([])
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUploadDocument} className="mb-6 p-4 bg-slate-50 rounded-lg space-y-4">
                <h3 className="font-semibold text-slate-900">Upload Document</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Document Type</label>
                  <select
                    name="documentType"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>{type.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
                  <input
                    type="file"
                    name="file"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploadingDocument}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {uploadingDocument ? 'Uploading...' : 'Upload Document'}
                </button>
              </form>

              <div className="space-y-2">
                {entityDocuments.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No documents uploaded yet</p>
                ) : (
                  entityDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <PaperClipIcon className="h-5 w-5 text-slate-400" />
                        <div>
                          <div className="font-medium text-slate-900">{doc.title}</div>
                          <div className="text-sm text-slate-500">
                            {doc.fileName} • {(doc.fileSize / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </div>
                      <a
                        href={doc.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        View
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


