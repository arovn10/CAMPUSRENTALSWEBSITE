'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'

/**
 * Instagram review queue for @campusrentalsllc.
 *
 * Nothing on this page publishes directly. Approving a post marks it APPROVED;
 * the publish cron picks it up on the next cycle, subject to the rolling cap
 * and the minimum gap. That separation is deliberate — an approval is a content
 * judgement, not a send button.
 */

interface ComplianceViolation {
  code: string
  match?: string
  message: string
}

interface SocialPostRow {
  id: string
  kind: string
  format: string
  status: string
  caption: string
  hashtags: string[]
  mediaUrls: string[]
  altText: string | null
  sourceRef: string | null
  publishedAt: string | null
  igPermalink: string | null
  failureReason: string | null
  rejectionReason: string | null
  createdAt: string
  compliance: { ok: boolean; violations: ComplianceViolation[] }
  insights?: Array<{ reach: number; likes: number; saved: number; shares: number }>
}

interface Stats {
  drafts: number
  approved: number
  published: number
  failed: number
  followers: number | null
  followersChange30d: number | null
  hoursSinceLastPublish: number | null
  meanReachMature: number | null
  publishingEnabled: boolean
  instagramConfigured: boolean
  maxMediaPerWindow: number
  windowHours: number
  cadence: { allowed: number; reason?: string }
}

const STATUS_TABS = ['DRAFT', 'APPROVED', 'PUBLISHED', 'FAILED', 'REJECTED'] as const

function authHeaders(): HeadersInit {
  const token =
    sessionStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

export default function SocialReviewPage() {
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>('DRAFT')
  const [posts, setPosts] = useState<SocialPostRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [postsRes, statsRes] = await Promise.all([
        fetch(`/api/social/drafts?status=${tab}&limit=100`, { headers: authHeaders() }),
        fetch('/api/social/stats', { headers: authHeaders() }),
      ])
      if (postsRes.status === 401 || postsRes.status === 403) {
        setError('Admin or manager access required.')
        setPosts([])
        return
      }
      const postsJson = await postsRes.json()
      const statsJson = await statsRes.json()
      setPosts(postsJson.posts ?? [])
      setStats(statsRes.ok ? statsJson : null)
    } catch {
      setError('Could not load the review queue.')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  async function act(id: string, action: 'approve' | 'reject' | 'reset', extra?: Record<string, unknown>) {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/social/drafts/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ action, ...extra }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(
          json.violations
            ? `Blocked: ${json.violations.map((v: ComplianceViolation) => v.message).join(' ')}`
            : json.error || 'Action failed'
        )
      } else {
        await load()
      }
    } catch {
      setError('Action failed.')
    } finally {
      setBusyId(null)
    }
  }

  async function saveCaption(id: string) {
    const caption = editing[id]
    if (caption === undefined) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/social/drafts/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ caption }),
      })
      if (res.ok) {
        setEditing((e) => {
          const next = { ...e }
          delete next[id]
          return next
        })
        await load()
      } else {
        setError('Could not save the caption.')
      }
    } finally {
      setBusyId(null)
    }
  }

  async function generate() {
    setLoading(true)
    try {
      await fetch('/api/social/drafts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ generate: true }),
      })
      await load()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Instagram review queue</h1>
          <p className="mt-2 text-sm text-gray-600">
            @campusrentalsllc. Nothing publishes without approval here, and an approved post still
            waits for the next publish cycle.
          </p>
        </header>

        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Drafts" value={stats.drafts} />
            <Stat label="Approved" value={stats.approved} />
            <Stat label="Published" value={stats.published} />
            <Stat
              label="Followers"
              value={stats.followers ?? '—'}
              hint={
                stats.followersChange30d !== null
                  ? `${stats.followersChange30d >= 0 ? '+' : ''}${stats.followersChange30d} in 30d`
                  : 'no history yet'
              }
            />
          </div>
        )}

        {stats && !stats.publishingEnabled && (
          <Banner tone="warn">
            Publishing is OFF (<code>SOCIAL_PUBLISHING_ENABLED</code> is not &quot;true&quot;). Drafts can be
            reviewed and approved; nothing will reach Instagram.
          </Banner>
        )}
        {stats && !stats.instagramConfigured && (
          <Banner tone="warn">
            Instagram credentials are not configured yet. Complete the Meta setup in
            <code> docs/META-BUSINESS-SETUP.md</code>, then store the token.
          </Banner>
        )}
        {stats?.cadence.reason && stats.publishingEnabled && (
          <Banner tone="info">Publishing paused: {stats.cadence.reason}.</Banner>
        )}
        {error && <Banner tone="error">{error}</Banner>}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
          <button
            onClick={generate}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Generate drafts
          </button>
        </div>

        {loading ? (
          <p className="py-12 text-center text-gray-500">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="py-12 text-center text-gray-500">Nothing in {tab.toLowerCase()}.</p>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-gray-100 px-2 py-1 font-medium text-gray-700">{post.kind}</span>
                  <span className="rounded bg-gray-100 px-2 py-1 text-gray-600">{post.format}</span>
                  {post.sourceRef && <span className="text-gray-400">#{post.sourceRef}</span>}
                  {post.igPermalink && (
                    <a
                      href={post.igPermalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View on Instagram
                    </a>
                  )}
                </div>

                {post.mediaUrls.length > 0 ? (
                  <div className="mb-3 flex gap-2 overflow-x-auto">
                    {post.mediaUrls.slice(0, 6).map((url) => (
                      <div key={url} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        <Image src={url} alt="" fill sizes="96px" className="object-cover" unoptimized />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <PhotoIcon className="h-4 w-4" />
                    No media attached — add an image before this can be approved.
                  </div>
                )}

                {editing[post.id] !== undefined ? (
                  <div className="mb-3">
                    <textarea
                      value={editing[post.id]}
                      onChange={(e) => setEditing((s) => ({ ...s, [post.id]: e.target.value }))}
                      rows={6}
                      className="w-full rounded-lg border border-gray-300 p-3 text-sm"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => saveCaption(post.id)}
                        disabled={busyId === post.id}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() =>
                          setEditing((s) => {
                            const next = { ...s }
                            delete next[post.id]
                            return next
                          })
                        }
                        className="rounded-lg px-3 py-1.5 text-sm text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 whitespace-pre-wrap text-sm text-gray-800">{post.caption}</p>
                )}

                {post.hashtags.length > 0 && (
                  <p className="mb-3 text-sm text-blue-600">
                    {post.hashtags.map((t) => `#${t}`).join(' ')}
                  </p>
                )}

                {!post.compliance.ok && (
                  <div className="mb-3 rounded-lg bg-red-50 p-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-red-800">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      Blocked by compliance
                    </p>
                    <ul className="mt-1 list-inside list-disc text-sm text-red-700">
                      {post.compliance.violations.map((v, i) => (
                        <li key={i}>
                          {v.message}
                          {v.match && <code className="ml-1 rounded bg-red-100 px-1">{v.match}</code>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {post.failureReason && (
                  <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    Publish failed: {post.failureReason}
                  </p>
                )}

                {post.insights?.[0] && (
                  <p className="mb-3 text-sm text-gray-500">
                    Reach {post.insights[0].reach} · {post.insights[0].likes} likes ·{' '}
                    {post.insights[0].saved} saves · {post.insights[0].shares} shares
                  </p>
                )}

                {post.status !== 'PUBLISHED' && post.status !== 'PUBLISHING' && (
                  <div className="flex flex-wrap gap-2">
                    {post.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => act(post.id, 'approve')}
                          disabled={busyId === post.id || !post.compliance.ok || post.mediaUrls.length === 0}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => act(post.id, 'reject')}
                          disabled={busyId === post.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
                        >
                          <XCircleIcon className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
                    {(post.status === 'APPROVED' || post.status === 'FAILED' || post.status === 'REJECTED') && (
                      <button
                        onClick={() => act(post.id, 'reset')}
                        disabled={busyId === post.id}
                        className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
                      >
                        Back to draft
                      </button>
                    )}
                    <button
                      onClick={() => setEditing((s) => ({ ...s, [post.id]: post.caption }))}
                      className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Edit caption
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function Banner({ tone, children }: { tone: 'warn' | 'info' | 'error'; children: React.ReactNode }) {
  const tones = {
    warn: 'bg-amber-50 text-amber-900 ring-amber-200',
    info: 'bg-blue-50 text-blue-900 ring-blue-200',
    error: 'bg-red-50 text-red-900 ring-red-200',
  }
  return <div className={`mb-4 rounded-lg px-4 py-3 text-sm ring-1 ${tones[tone]}`}>{children}</div>
}
