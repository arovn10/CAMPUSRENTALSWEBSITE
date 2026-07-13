'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LockClosedIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

function ResetPasswordInner() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('This reset link is invalid or missing its token. Request a new one from the login page.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', token, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.push('/investors/login'), 2500)
      } else {
        setError(data.error || 'Could not reset your password. The link may have expired.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
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
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Set a new password</h2>
          <p className="mt-2 text-sm text-ink-300">Choose a new password for your investor account.</p>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl shadow-lift ring-1 ring-white/10 p-8 text-center">
            <CheckCircleIcon className="w-12 h-12 mx-auto text-accent" />
            <p className="mt-4 text-ink-800 font-semibold">Your password has been reset.</p>
            <p className="mt-1 text-sm text-ink-500">Redirecting you to sign in…</p>
            <Link href="/investors/login" className="mt-4 inline-block text-sm font-semibold text-accent hover:text-[#4b9ba2] transition-colors">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-5 bg-white rounded-2xl shadow-lift ring-1 ring-white/10 p-8" onSubmit={submit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-700 mb-2">
                New password
              </label>
              <div className="relative">
                <LockClosedIcon className="w-5 h-5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-ink-200 placeholder-ink-400 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-ink-700 mb-2">
                Confirm new password
              </label>
              <div className="relative">
                <LockClosedIcon className="w-5 h-5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="confirm"
                  name="confirm"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-ink-200 placeholder-ink-400 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  placeholder="Re-enter your password"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold bg-accent hover:bg-[#4b9ba2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-glow"
            >
              {loading ? 'Resetting…' : 'Reset password'}
            </button>

            <p className="text-center text-sm text-ink-500">
              <Link href="/investors/login" className="font-semibold text-accent hover:text-[#4b9ba2] transition-colors">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-500">Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  )
}
