'use client'

import { useState, useEffect } from 'react'
import {
  BellIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  BuildingOffice2Icon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

function typeIcon(type: string) {
  switch (type) {
    case 'DISTRIBUTION':
      return CurrencyDollarIcon
    case 'DOCUMENT_UPLOAD':
      return DocumentTextIcon
    case 'PROPERTY_UPDATE':
    case 'FUND_UPDATE':
      return BuildingOffice2Icon
    default:
      return BellIcon
  }
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    DISTRIBUTION: 'Distribution',
    DOCUMENT_UPLOAD: 'Document',
    PROPERTY_UPDATE: 'Property update',
    FUND_UPDATE: 'Fund update',
    SYSTEM: 'Update',
  }
  return labels[type] ?? type
}

export default function InvestorUpdatesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterRead, setFilterRead] = useState<'all' | 'unread'>('all')

  const load = async () => {
    const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token')
    if (!token) return
    try {
      setLoading(true)
      const res = await fetch('/api/investors/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load updates')
      const data = await res.json()
      setNotifications(Array.isArray(data) ? data : [])
    } catch (e) {
      setError('Failed to load updates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const markRead = async (id: string) => {
    const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch('/api/investors/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, isRead: true }),
      })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
      }
    } catch (_) {}
  }

  const markAllRead = async () => {
    const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token')
    if (!token) return
    const unread = notifications.filter((n) => !n.isRead)
    for (const n of unread) {
      try {
        await fetch('/api/investors/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: n.id, isRead: true }),
        })
      } catch (_) {}
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const filtered =
    filterRead === 'unread' ? notifications.filter((n) => !n.isRead) : notifications
  const unreadCount = notifications.filter((n) => !n.isRead).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-slate-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8" style={{ fontFamily: 'var(--font-sans)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">Updates</h1>
          <p className="text-[15px] text-slate-600 mt-1">Announcements, distributions, and document notices</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterRead(filterRead === 'all' ? 'unread' : 'all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              filterRead === 'unread'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {filterRead === 'unread' ? 'Unread only' : 'All'}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <CheckIcon className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-[15px]">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center">
            <BellIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">No updates</p>
            <p className="text-slate-500 text-sm mt-1">
              Distribution notices, new documents, and property updates will appear here.
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const Icon = typeIcon(n.type)
            const isExpanded = expandedId === n.id
            return (
              <div
                key={n.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${
                  n.isRead ? 'border-slate-200/80' : 'border-slate-300 bg-slate-50/50'
                }`}
              >
                <div
                  className="flex items-start gap-4 px-6 py-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : n.id)}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      n.isRead ? 'bg-slate-100' : 'bg-slate-200'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                        {typeLabel(n.type)}
                      </span>
                      <span className="text-[13px] text-slate-500">{formatDate(n.createdAt)}</span>
                      {!n.isRead && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                          New
                        </span>
                      )}
                    </div>
                    <p className={`mt-1 font-semibold ${n.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                      {n.title}
                    </p>
                    {isExpanded && (
                      <p className="mt-2 text-[15px] text-slate-600 whitespace-pre-wrap">{n.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markRead(n.id)
                        }}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                        title="Mark as read"
                      >
                        <CheckIcon className="w-5 h-5" />
                      </button>
                    )}
                    <span className="text-slate-400">
                      {isExpanded ? (
                        <ChevronUpIcon className="w-5 h-5" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5" />
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
