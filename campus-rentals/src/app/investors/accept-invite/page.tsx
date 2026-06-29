'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LockClosedIcon, UserIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

const ACCENT = '#54AAB1'

function AcceptInviteInner() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') || ''

  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setChecking(false)
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`/api/auth?action=invite-info&token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (data?.valid) {
          setValid(true)
          setEmail(data.email || '')
          setFirstName(data.firstName || '')
          setLastName(data.lastName || '')
        }
      } catch {
        /* fall through to invalid */
      } finally {
        setChecking(false)
      }
    })()
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')

    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept-invite', token, password, firstName, lastName }),
      })
      const data = await res.json()
      if (res.ok && data?.token) {
        sessionStorage.setItem('authToken', data.token)
        if (data.user) sessionStorage.setItem('currentUser', JSON.stringify(data.user))
        setDone(true)
        setTimeout(() => router.push('/investors/dashboard'), 1500)
      } else {
        setError(data.error || 'Could not accept the invitation.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Checking your invitation…</div>
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900">Invitation not valid</h2>
          <p className="mt-2 text-sm text-slate-600">
            This invitation link is invalid or has expired. Please ask your administrator to send a new one.
          </p>
          <Link href="/investors/login" className="mt-4 inline-block text-sm font-semibold" style={{ color: ACCENT }}>
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">Welcome to Campus Rentals</h2>
          <p className="mt-2 text-sm text-slate-600">Set up your investor portal account for {email}.</p>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <CheckCircleIcon className="w-12 h-12 mx-auto" style={{ color: ACCENT }} />
            <p className="mt-4 text-slate-800 font-semibold">Account created. Taking you to your portal…</p>
          </div>
        ) : (
          <form className="mt-8 space-y-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-8" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">First name</label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2"
                    style={{ ['--tw-ring-color' as any]: ACCENT }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2"
                  style={{ ['--tw-ring-color' as any]: ACCENT }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Create password</label>
              <div className="relative">
                <LockClosedIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2"
                  style={{ ['--tw-ring-color' as any]: ACCENT }}
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Confirm password</label>
              <div className="relative">
                <LockClosedIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2"
                  style={{ ['--tw-ring-color' as any]: ACCENT }}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading…</div>}>
      <AcceptInviteInner />
    </Suspense>
  )
}
