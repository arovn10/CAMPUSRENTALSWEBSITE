'use client'

import { useState, useEffect } from 'react'
import {
  PhotoIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StarIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface DealPhoto {
  id: string
  photoUrl: string
  fileName: string
  description?: string
  displayOrder: number
  isThumbnail: boolean
  fileSize?: number
  mimeType?: string
  uploadedBy: string
  uploader?: {
    firstName: string
    lastName: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

interface DealPhotoManagerProps {
  investmentId?: string // Optional - for backward compatibility
  propertyId?: string   // Preferred - links photos to property/deal
  onThumbnailChange?: (photoUrl: string | null) => void
}

export default function DealPhotoManager({ investmentId, propertyId, onThumbnailChange }: DealPhotoManagerProps) {
  const [photos, setPhotos] = useState<DealPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Get auth token
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('authToken') || localStorage.getItem('token') || ''
    }
    return ''
  }

  // Fetch photos
  const fetchPhotos = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build query string - prefer propertyId if provided
      const params = new URLSearchParams()
      if (propertyId) {
        params.append('propertyId', propertyId)
        console.log('[DealPhotoManager] Fetching photos for propertyId:', propertyId)
      } else if (investmentId) {
        params.append('investmentId', investmentId)
        console.log('[DealPhotoManager] Fetching photos for investmentId:', investmentId)
      } else {
        setError('propertyId or investmentId is required')
        setLoading(false)
        return
      }
      
      const response = await fetch(`/api/investors/deal-photos?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })

      console.log('[DealPhotoManager] Response status:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('[DealPhotoManager] Received photos:', data.photos?.length || 0, 'photos')
        console.log('[DealPhotoManager] Photos data:', data)
        
        setPhotos(data.photos || [])
        
        // Notify parent of thumbnail change
        const thumbnail = data.photos?.find((p: DealPhoto) => p.isThumbnail)
        if (onThumbnailChange) {
          onThumbnailChange(thumbnail?.photoUrl || null)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[DealPhotoManager] Error response:', errorData)
        setError(errorData.error || 'Failed to load photos')
      }
    } catch (err) {
      console.error('[DealPhotoManager] Error fetching photos:', err)
      setError('Failed to load photos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (propertyId || investmentId) {
      fetchPhotos()
    }
  }, [propertyId, investmentId])

  // Upload photo
  const handleUpload = async () => {
    if (!uploadFile) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      if (propertyId) {
        formData.append('propertyId', propertyId)
      } else if (investmentId) {
        formData.append('investmentId', investmentId)
      }
      if (uploadDescription) {
        formData.append('description', uploadDescription)
      }

      const response = await fetch('/api/investors/deal-photos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
      })

      if (response.ok) {
        await fetchPhotos()
        setShowUploadModal(false)
        setUploadFile(null)
        setUploadDescription('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Upload failed')
      }
    } catch (err) {
      console.error('Error uploading photo:', err)
      setError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // Delete photo
  const handleDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    try {
      const response = await fetch(`/api/investors/deal-photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })

      if (response.ok) {
        await fetchPhotos()
      } else {
        const errorData = await response.json()
        alert(`Failed to delete photo: ${errorData.error}`)
      }
    } catch (err) {
      console.error('Error deleting photo:', err)
      alert('Failed to delete photo')
    }
  }

  // Set thumbnail
  const handleSetThumbnail = async (photoId: string) => {
    try {
      const response = await fetch(`/api/investors/deal-photos/${photoId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isThumbnail: true })
      })

      if (response.ok) {
        await fetchPhotos()
      } else {
        const errorData = await response.json()
        alert(`Failed to set thumbnail: ${errorData.error}`)
      }
    } catch (err) {
      console.error('Error setting thumbnail:', err)
      alert('Failed to set thumbnail')
    }
  }

  // Move photo up
  const handleMoveUp = async (index: number) => {
    if (index === 0) return

    const newPhotos = [...photos]
    const temp = newPhotos[index]
    newPhotos[index] = newPhotos[index - 1]
    newPhotos[index - 1] = temp

    // Update display orders
    const photoIds = newPhotos.map(p => p.id)
    await updateOrder(photoIds)
  }

  // Move photo down
  const handleMoveDown = async (index: number) => {
    if (index === photos.length - 1) return

    const newPhotos = [...photos]
    const temp = newPhotos[index]
    newPhotos[index] = newPhotos[index + 1]
    newPhotos[index + 1] = temp

    // Update display orders
    const photoIds = newPhotos.map(p => p.id)
    await updateOrder(photoIds)
  }

  // Update photo order
  const updateOrder = async (photoIds: string[]) => {
    try {
      const response = await fetch('/api/investors/deal-photos/reorder', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoIds })
      })

      if (response.ok) {
        await fetchPhotos()
      } else {
        const errorData = await response.json()
        alert(`Failed to update order: ${errorData.error}`)
      }
    } catch (err) {
      console.error('Error updating order:', err)
      alert('Failed to update order')
    }
  }

  // Update description
  const handleUpdateDescription = async (photoId: string, description: string) => {
    try {
      const response = await fetch(`/api/investors/deal-photos/${photoId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ description })
      })

      if (response.ok) {
        await fetchPhotos()
      }
    } catch (err) {
      console.error('Error updating description:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Deal Photos</h3>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <PlusIcon className="h-5 w-5" />
          Upload Photo
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {photos.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
          <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No photos uploaded yet</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Upload your first photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="relative group border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition"
            >
              {/* Thumbnail badge */}
              {photo.isThumbnail && (
                <div className="absolute top-2 left-2 z-10 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                  <StarIconSolid className="h-3 w-3" />
                  Thumbnail
                </div>
              )}

              {/* Image */}
              <div className="aspect-video bg-gray-100 relative">
                <img
                  src={photo.photoUrl}
                  alt={photo.description || photo.fileName}
                  className="w-full h-full object-cover"
                />
                
                {/* Action buttons overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleSetThumbnail(photo.id)}
                    className={`p-2 rounded ${
                      photo.isThumbnail
                        ? 'bg-yellow-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    title="Set as thumbnail"
                  >
                    {photo.isThumbnail ? (
                      <StarIconSolid className="h-5 w-5" />
                    ) : (
                      <StarIcon className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="p-2 rounded bg-red-500 text-white hover:bg-red-600"
                    title="Delete photo"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Controls */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className={`p-1 rounded ${
                        index === 0
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title="Move up"
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === photos.length - 1}
                      className={`p-1 rounded ${
                        index === photos.length - 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title="Move down"
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">Order: {photo.displayOrder + 1}</span>
                </div>

                {/* Description */}
                <input
                  type="text"
                  value={photo.description || ''}
                  onChange={(e) => {
                    const newPhotos = [...photos]
                    newPhotos[index].description = e.target.value
                    setPhotos(newPhotos)
                  }}
                  onBlur={(e) => handleUpdateDescription(photo.id, e.target.value)}
                  placeholder="Add description..."
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Photo</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Enter photo description..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadFile(null)
                    setUploadDescription('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

