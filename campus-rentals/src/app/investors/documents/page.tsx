'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DocumentTextIcon,
  FolderIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  DocumentDuplicateIcon,
  ReceiptRefundIcon,
  BriefcaseIcon,
  ChartBarIcon,
  FunnelIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

type DocType = string

interface Doc {
  id: string
  title: string
  documentType: DocType
  entityType: string
  entityId?: string
  entityName: string
  uploadedAt: string
  fileSize: number
  filePath?: string
  fileName?: string
  mimeType?: string
}

const TAX_TYPES = ['TAX_DOCUMENT']
const RECEIPT_TYPES = ['RECEIPT', 'EXPENSE']
const OFFERING_TYPES = ['PPM', 'OFFERING_MEMORANDUM', 'OPERATING_AGREEMENT']
const DEAL_TYPES = ['CONTRACT', 'APPRAISAL', 'TITLE_REPORT', 'ENVIRONMENTAL_REPORT', 'INSURANCE', 'OTHER']
const STATEMENT_TYPES = ['FINANCIAL_STATEMENT']

function getCategory(docType: DocType): 'receipts' | 'tax' | 'offering' | 'deal' | 'statement' {
  if (RECEIPT_TYPES.includes(docType)) return 'receipts'
  if (TAX_TYPES.includes(docType)) return 'tax'
  if (OFFERING_TYPES.includes(docType)) return 'offering'
  if (STATEMENT_TYPES.includes(docType)) return 'statement'
  return 'deal'
}

function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    receipts: 'Receipts & expenses',
    tax: 'Tax documents',
    offering: 'Offering & PPM',
    deal: 'Deal documents',
    statement: 'Investor statements',
  }
  return labels[cat] ?? 'Other'
}

function typeLabel(docType: string): string {
  return docType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

const DOCUMENT_TYPE_OPTIONS = [
  'RECEIPT',
  'EXPENSE',
  'TAX_DOCUMENT',
  'PPM',
  'OFFERING_MEMORANDUM',
  'OPERATING_AGREEMENT',
  'FINANCIAL_STATEMENT',
  'CONTRACT',
  'APPRAISAL',
  'INSURANCE',
  'OTHER',
]

const CATEGORY_FILTERS = ['all', 'receipts', 'tax', 'offering', 'deal', 'statement'] as const

const MAX_MB = 25

export default function InvestorDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filter, setFilter] = useState<typeof CATEGORY_FILTERS[number]>('all')
  const [isAdmin, setIsAdmin] = useState(false)
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [quickReceipt, setQuickReceipt] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    title: '',
    documentType: 'RECEIPT',
    entityId: 'company',
    description: '',
    file: null as File | null,
  })

  const token = typeof window !== 'undefined' ? sessionStorage.getItem('authToken') || sessionStorage.getItem('token') : null
  const currentUser = typeof window !== 'undefined' ? (() => {
    try {
      return JSON.parse(sessionStorage.getItem('currentUser') || '{}')
    } catch { return {} }
  })() : {}

  const loadDocs = useCallback(async () => {
    if (!token) return
    const res = await fetch(`/api/investors/documents${isAdmin ? '?scope=all' : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setDocs(Array.isArray(data) ? data : [])
    }
  }, [token, isAdmin])

  useEffect(() => {
    if (!token) return
    const admin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER'
    setIsAdmin(!!admin)
    setLoading(true)
    loadDocs().finally(() => setLoading(false))
  }, [token, currentUser?.role, loadDocs])

  useEffect(() => {
    if (!isAdmin || !token) return
    fetch('/api/investors/properties', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((list) => {
        if (!Array.isArray(list)) return
        const seen = new Set<string>()
        const props: { id: string; name: string }[] = []
        for (const i of list) {
          const id = (i.property?.id || i.propertyId) as string
          if (id && !seen.has(id)) {
            seen.add(id)
            props.push({
              id,
              name: i.property?.name || i.propertyName || i.property?.address || id,
            })
          }
        }
        setProperties(props)
      })
      .catch(() => {})
  }, [isAdmin, token])

  const setFile = useCallback((file: File | null) => {
    if (!file) {
      setUploadForm((f) => ({ ...f, file: null }))
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_MB}MB.`)
      return
    }
    const base = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name
    setUploadForm((f) => ({
      ...f,
      file,
      title: f.title || base.replace(/[-_]/g, ' ').trim() || file.name,
    }))
    setError('')
  }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadForm.file || !token) {
      setError('Please choose a file to upload.')
      return
    }
    if (!uploadForm.title.trim()) {
      setError('Please add a title (or we’ll use the file name).')
      return
    }
    if (!uploadForm.entityId) {
      setError('Please choose where to save this (Company or a property).')
      return
    }
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.set('title', uploadForm.title.trim())
      formData.set('documentType', uploadForm.documentType)
      formData.set('entityType', 'PROPERTY')
      formData.set('entityId', uploadForm.entityId)
      if (uploadForm.description) formData.set('description', uploadForm.description)
      formData.set('file', uploadForm.file)
      formData.set('visibleToInvestor', uploadForm.entityId === 'company' ? 'false' : 'true')
      const res = await fetch('/api/investors/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }
      setSuccess('Document saved.')
      setUploadForm({ title: '', documentType: 'RECEIPT', entityId: 'company', description: '', file: null })
      setShowUpload(false)
      setQuickReceipt(false)
      await loadDocs()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: any) {
      setError(err.message || 'Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Delete this document? This cannot be undone.')) return
    setError('')
    try {
      const res = await fetch(`/api/investors/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        await loadDocs()
        setSuccess('Document deleted.')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Could not delete. Try again.')
      }
    } catch {
      setError('Could not delete. Try again.')
    }
  }

  const filtered = filter === 'all' ? docs : docs.filter((d) => getCategory(d.documentType) === filter)
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  const formatSize = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`)

  const downloadUrl = (doc: Doc) => `/api/investors/documents/${doc.id}/download`

  const handleDownload = async (doc: Doc) => {
    if (!token) return
    try {
      const res = await fetch(downloadUrl(doc), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.fileName || doc.title || 'document'
      a.click()
      URL.revokeObjectURL(url)
    } catch (_) {}
  }

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (!isAdmin) return
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setFile(file)
      setShowUpload(true)
      setQuickReceipt(true)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-slate-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8" style={{ fontFamily: 'var(--font-sans)' }}>
      <div>
        <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">Documents & receipts</h1>
        <p className="text-[15px] text-slate-600 mt-1">
          Upload receipts, tax docs, and deal files. Everything in one place.
        </p>
      </div>

      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-[15px] flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-[15px] flex justify-between items-center">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="text-red-500 hover:text-red-700 p-1">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-[18px] font-semibold text-slate-900">Upload</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUpload(true)
                  setQuickReceipt(true)
                  setUploadForm((f) => ({ ...f, documentType: 'RECEIPT', entityId: 'company', title: '', file: null }))
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
              >
                <ReceiptRefundIcon className="w-5 h-5" />
                Upload receipt
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpload(!showUpload)
                  if (!showUpload) setQuickReceipt(false)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
              >
                <PlusIcon className="w-5 h-5" />
                {showUpload ? 'Cancel' : 'Upload document'}
              </button>
            </div>
          </div>

          {showUpload && (
            <form onSubmit={handleUpload} className="p-6 space-y-4 border-t border-slate-100">
              <div
                onDragEnter={onDrag}
                onDragLeave={onDrag}
                onDragOver={onDrag}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                  dragActive ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  id="doc-file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="doc-file" className="cursor-pointer block">
                  <ArrowUpTrayIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-700 font-medium">
                    {uploadForm.file ? (
                      <span className="text-emerald-600">{uploadForm.file.name}</span>
                    ) : (
                      'Drop a file here or click to choose'
                    )}
                  </p>
                  <p className="text-slate-500 text-sm mt-1">PDF, Word, Excel, images (JPG, PNG, HEIC). Max {MAX_MB}MB.</p>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Office supplies receipt"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={uploadForm.documentType}
                    onChange={(e) => setUploadForm((f) => ({ ...f, documentType: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900"
                  >
                    {DOCUMENT_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{typeLabel(t)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Save to</label>
                <select
                  value={uploadForm.entityId}
                  onChange={(e) => setUploadForm((f) => ({ ...f, entityId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900"
                >
                  <option value="company">Company / General (receipts & expenses)</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {uploadForm.entityId === 'company'
                    ? 'Only you and other admins see this.'
                    : 'Investors in this property will see this document.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. March 2025"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !uploadForm.file}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading…' : 'Save document'}
              </button>
            </form>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <FunnelIcon className="w-5 h-5 text-slate-500" />
        <span className="text-sm font-medium text-slate-600">Category:</span>
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {f === 'all' ? 'All' : categoryLabel(f)}
          </button>
        ))}
      </div>

      {['receipts', 'tax', 'offering', 'statement', 'deal'].map((cat) => {
        const sectionDocs = filter === 'all' ? docs.filter((d) => getCategory(d.documentType) === cat) : (filter === cat ? filtered : [])
        if (sectionDocs.length === 0) return null

        const Icon =
          cat === 'receipts'
            ? ReceiptRefundIcon
            : cat === 'tax'
              ? ReceiptRefundIcon
              : cat === 'offering'
                ? BriefcaseIcon
                : cat === 'statement'
                  ? ChartBarIcon
                  : DocumentDuplicateIcon

        return (
          <div key={cat} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/80 flex items-center gap-2">
              <Icon className="w-5 h-5 text-slate-600" />
              <h2 className="text-[18px] font-semibold text-slate-900">{categoryLabel(cat)}</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {sectionDocs.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/80">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      {(doc.mimeType || '').startsWith('image/') ? (
                        <PhotoIcon className="w-5 h-5 text-slate-600" />
                      ) : (
                        <DocumentTextIcon className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-[13px] text-slate-500 flex-wrap">
                        <span>{typeLabel(doc.documentType)}</span>
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {formatDate(doc.uploadedAt)}
                        </span>
                        {doc.fileSize > 0 && <span>{formatSize(doc.fileSize)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Download
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center">
          <FolderIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">No documents yet</p>
          <p className="text-slate-500 text-sm mt-1">
            {isAdmin
              ? 'Upload receipts, tax docs, or deal files using the buttons above.'
              : 'Documents and statements will appear here when they’re shared with you.'}
          </p>
        </div>
      )}
    </div>
  )
}
