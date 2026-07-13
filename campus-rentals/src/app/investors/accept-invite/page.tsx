'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LockClosedIcon, UserIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

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
    return <div className="min-h-screen bg-ink-950 flex items-center justify-center text-ink-300">Checking your invitation…</div>
  }

  if (!valid) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-ink-950 flex items-center justify-center p-4">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-48 left-1/2 h-[36rem] w-[56rem] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
        </div>
        <div className="relative max-w-md w-full bg-white rounded-2xl shadow-lift ring-1 ring-white/10 p-8 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">Invitation not valid</h2>
          <p className="mt-2 text-sm text-ink-600">
            This invitation link is invalid or has expired. Please ask your administrator to send a new one.
          </p>
          <Link href="/investors/login" className="mt-4 inline-block text-sm font-semibold text-accent hover:text-[#4b9ba2] transition-colors">
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950 flex items-center justify-center py-12 px-4">
      {/* Ambient accent glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[36rem] w-[56rem] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative max-w-md w-full space-y-8">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Investor Portal
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Welcome to Campus Rentals</h2>
          <p className="mt-2 text-sm text-ink-300">Set up your investor portal account for {email}.</p>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl shadow-lift ring-1 ring-white/10 p-8 text-center">
            <CheckCircleIcon className="w-12 h-12 mx-auto text-accent" />
            <p className="mt-4 text-ink-800 font-semibold">Account created. Taking you to your portal…</p>
          </div>
        ) : (
          <form className="mt-8 space-y-5 bg-white rounded-2xl shadow-lift ring-1 ring-white/10 p-8" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">First name</label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-ink-200 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-ink-200 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">Create password</label>
              <div className="relative">
                <LockClosedIcon className="w-5 h-5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-ink-200 placeholder-ink-400 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">Confirm password</label>
              <div className="relative">
                <LockClosedIcon className="w-5 h-5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-ink-200 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold bg-accent hover:bg-[#4b9ba2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-glow"
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
    <Suspense fallback={<div className="p-8 text-center text-ink-500">Loading…</div>}>
      <AcceptInviteInner />
    </Suspense>
  )
}
