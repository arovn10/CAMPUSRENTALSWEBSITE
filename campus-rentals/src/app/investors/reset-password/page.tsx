'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LockClosedIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

const ACCENT = '#54AAB1'

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">Set a new password</h2>
          <p className="mt-2 text-sm text-slate-600">Choose a new password for your investor account.</p>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <CheckCircleIcon className="w-12 h-12 mx-auto" style={{ color: ACCENT }} />
            <p className="mt-4 text-slate-800 font-semibold">Your password has been reset.</p>
            <p className="mt-1 text-sm text-slate-500">Redirecting you to sign in…</p>
            <Link href="/investors/login" className="mt-4 inline-block text-sm font-semibold" style={{ color: ACCENT }}>
              Go to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-8" onSubmit={submit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                New password
              </label>
              <div className="relative">
                <LockClosedIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2"
                  style={{ ['--tw-ring-color' as any]: ACCENT }}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-2">
                Confirm new password
              </label>
              <div className="relative">
                <LockClosedIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="confirm"
                  name="confirm"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2"
                  style={{ ['--tw-ring-color' as any]: ACCENT }}
                  placeholder="Re-enter your password"
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
              {loading ? 'Resetting…' : 'Reset password'}
            </button>

            <p className="text-center text-sm text-slate-500">
              <Link href="/investors/login" className="font-semibold" style={{ color: ACCENT }}>
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
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  )
}
