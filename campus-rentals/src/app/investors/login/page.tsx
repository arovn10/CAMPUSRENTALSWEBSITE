'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'login',
          ...formData
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Store user data in session storage
        sessionStorage.setItem('currentUser', JSON.stringify(data.user))
        sessionStorage.setItem('authToken', data.token)
        
        // Redirect to dashboard
        router.push('/investors/dashboard')
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotPasswordLoading(true)
    setForgotPasswordMessage('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'request-password-reset',
          email: forgotPasswordEmail
        })
      })

      const data = await response.json()

      if (response.ok) {
        setForgotPasswordMessage(
          data.message || 'If an account exists for that email, a password reset link is on its way.'
        )
        setForgotPasswordEmail('')
      } else {
        setForgotPasswordMessage(data.error || 'Something went wrong. Please try again.')
      }
    } catch (error) {
      setForgotPasswordMessage('Network error. Please try again.')
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Ambient accent glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[36rem] w-[56rem] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative max-w-md w-full">
        {/* Brand block */}
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-ink-900 ring-1 ring-white/10 shadow-glow flex items-center justify-center">
            <BuildingOffice2Icon className="h-7 w-7 text-accent" />
          </div>
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Investor Portal
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Campus Rentals
          </h2>
          <p className="mt-2 text-sm text-ink-300">
            {showForgotPassword ? 'Request a link to reset your password' : 'Sign in to your investment portal'}
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 rounded-2xl bg-white p-6 sm:p-8 shadow-lift ring-1 ring-white/10">
        {/* Login Form */}
        {!showForgotPassword ? (
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-ink-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-ink-200 placeholder-ink-400 text-ink-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent focus:z-10 sm:text-sm bg-white"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-ink-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-ink-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-ink-200 placeholder-ink-400 text-ink-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent focus:z-10 sm:text-sm bg-white"
                    placeholder="Enter your password"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      className="text-ink-400 hover:text-ink-600 transition-colors duration-200 p-1"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="font-medium text-accent hover:text-[#4b9ba2] transition-colors duration-200"
                >
                  Forgot your password?
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 text-sm font-semibold rounded-xl text-white bg-accent hover:bg-[#4b9ba2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-glow"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-ink-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/register')}
                  className="font-medium text-accent hover:text-[#4b9ba2] transition-colors duration-200"
                >
                  Contact us to get started
                </button>
              </p>
            </div>
          </form>
        ) : (
          /* Forgot Password Form */
          <form className="space-y-6" onSubmit={handleForgotPassword}>
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-ink-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-ink-400" />
                </div>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-ink-200 placeholder-ink-400 text-ink-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent focus:z-10 sm:text-sm bg-white"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {forgotPasswordMessage && (
              <div className={`border rounded-xl p-4 ${
                forgotPasswordMessage.includes('sent')
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm ${
                  forgotPasswordMessage.includes('sent')
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {forgotPasswordMessage}
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false)
                  setForgotPasswordMessage('')
                  setForgotPasswordEmail('')
                }}
                className="flex-1 py-3 px-4 text-sm font-semibold rounded-xl text-ink-700 bg-ink-100 hover:bg-ink-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors duration-200"
              >
                Back to Login
              </button>
              <button
                type="submit"
                disabled={forgotPasswordLoading}
                className="flex-1 py-3 px-4 text-sm font-semibold rounded-xl text-white bg-accent hover:bg-[#4b9ba2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-glow"
              >
                {forgotPasswordLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto"></div>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </div>
          </form>
        )}
        </div>

        {/* Security Notice */}
        <div className="mt-8 flex items-start justify-center gap-2 text-ink-400">
          <LockClosedIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="text-xs leading-relaxed text-center max-w-xs">
            Your connection is encrypted and secure. We use industry-standard security measures to protect your account.
          </p>
        </div>
      </div>
    </div>
  )
}