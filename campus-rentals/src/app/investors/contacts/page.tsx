'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  ArrowLeftIcon,
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

export default function EntityManagementPage() {
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
      return sessionStorage.getItem('token') || localStorage.getItem('token')
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/investors/dashboard')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Entity Management</h1>
              <p className="mt-2 text-slate-600">Manage entities, view owners, and upload documents (EIN, tax forms, etc.)</p>
            </div>
            <button
              onClick={() => {
                setEditingEntity(null)
                resetForm()
                setShowCreateModal(true)
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Add Entity
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search entities by name, contact person, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Entities Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : entities.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <BuildingOfficeIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No entities found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entities.map((entity) => (
              <div key={entity.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">{entity.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {entity.type}
                      </span>
                      {!entity.isActive && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDocuments(entity)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View Documents"
                    >
                      <DocumentTextIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(entity)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Entity"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(entity.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete Entity"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {entity.taxId && (
                    <p className="text-slate-600">
                      <span className="font-medium">Tax ID:</span> {entity.taxId}
                    </p>
                  )}
                  {entity.contactPerson && (
                    <p className="text-slate-600">
                      <span className="font-medium">Contact:</span> {entity.contactPerson}
                    </p>
                  )}
                  {entity.contactEmail && (
                    <p className="text-slate-600 flex items-center gap-2">
                      <EnvelopeIcon className="h-4 w-4" />
                      {entity.contactEmail}
                    </p>
                  )}
                  {entity.contactPhone && (
                    <p className="text-slate-600 flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4" />
                      {entity.contactPhone}
                    </p>
                  )}
                  {entity.address && (
                    <p className="text-slate-600 flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4" />
                      {entity.address}
                    </p>
                  )}
                  {entity.entityOwners && entity.entityOwners.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">
                        {entity.entityOwners.length} owner(s)
                      </p>
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {editingEntity ? 'Edit Entity' : 'Add New Entity'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingEntity(null)
                      resetForm()
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Entity Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Entity Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {ENTITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tax ID (EIN)
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="XX-XXXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contact Person <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                    Active
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingEntity(null)
                      resetForm()
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Entity Documents</h2>
                    <p className="text-sm text-slate-600 mt-1">{selectedEntity.name}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowDocumentsModal(false)
                      setSelectedEntity(null)
                      setEntityDocuments([])
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Upload Form */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload Document</h3>
                  <form onSubmit={handleUploadDocument} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Document Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="title"
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., EIN Certificate, Tax Form 1120"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Document Type
                      </label>
                      <select
                        name="documentType"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {DOCUMENT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        File <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        name="file"
                        required
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={uploadingDocument}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {uploadingDocument ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <PaperClipIcon className="h-5 w-5" />
                          Upload Document
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Documents List */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Documents ({entityDocuments.length})</h3>
                  {entityDocuments.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No documents uploaded yet</p>
                  ) : (
                    <div className="space-y-2">
                      {entityDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{doc.title}</p>
                              <p className="text-sm text-slate-600">
                                {doc.documentType.replace(/_/g, ' ')} • {formatFileSize(doc.fileSize)} •{' '}
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </p>
                              {doc.description && (
                                <p className="text-xs text-slate-500 mt-1">{doc.description}</p>
                              )}
                            </div>
                          </div>
                          <a
                            href={doc.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
