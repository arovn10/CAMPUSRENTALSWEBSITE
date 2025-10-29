'use client'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircleIcon, XCircleIcon, EnvelopeIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  useEffect(() => {
    if (token) {
      verifyEmail(token)
    }
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'verify-email',
          token: verificationToken
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/investors/login')
        }, 3000)
      } else {
        setError(data.error || 'Email verification failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resendVerification = async () => {
    setResending(true)
    setResendMessage('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: searchParams.get('email')
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResendMessage('Verification email sent successfully')
      } else {
        setResendMessage(data.error || 'Failed to resend verification email')
      }
    } catch (error) {
      setResendMessage('Network error. Please try again.')
    } finally {
      setResending(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-slate-900">
              Email Verified Successfully
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Your email has been verified. You can now access all features of your account.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/investors/login')}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Continue to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center">
            <EnvelopeIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
            Verify Your Email
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {token ? 'Verifying your email address...' : 'Please verify your email address to continue'}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {loading && (
            <div className="text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-sm text-slate-600">Verifying your email...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Verification Failed
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!token && !loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <EnvelopeIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Check Your Email
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resend Verification */}
          {!token && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-4">
                  Didn't receive the email?
                </p>
                <button
                  onClick={resendVerification}
                  disabled={resending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {resending ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </button>
              </div>

              {resendMessage && (
                <div className={`border rounded-xl p-4 ${
                  resendMessage.includes('successfully') 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-sm ${
                    resendMessage.includes('successfully') 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {resendMessage}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => router.push('/investors/login')}
              className="text-sm text-blue-600 hover:text-blue-500 transition-colors duration-200"
            >
              Back to Login
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-800 mb-2">
            Need Help?
          </h3>
          <div className="text-sm text-slate-600 space-y-1">
            <p>• Check your spam/junk folder</p>
            <p>• Make sure you entered the correct email address</p>
            <p>• Contact support if you continue to have issues</p>
          </div>
        </div>
      </div>
    </div>
  )
}
