'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function MigrationsPage() {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = () => {
      try {
        const userStr = sessionStorage.getItem('currentUser')
        const token = sessionStorage.getItem('authToken') || 
                     sessionStorage.getItem('token') || 
                     localStorage.getItem('authToken') || 
                     localStorage.getItem('token')
        
        if (userStr) {
          const userData = JSON.parse(userStr)
          setUser(userData)
          
          // Verify user is ADMIN
          if (userData.role !== 'ADMIN') {
            setError('Admin access required. You must be logged in as an ADMIN user.')
          }
        } else if (!token) {
          setError('Please log in to access this page.')
        }
      } catch (err) {
        console.error('Error checking auth:', err)
        setError('Error checking authentication. Please log in again.')
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [])

  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')

  // Insurance/Tax Docs Migration state
  const [docsJobId, setDocsJobId] = useState<string | null>(null)
  const [docsProgress, setDocsProgress] = useState(0)
  const [docsStatusMessage, setDocsStatusMessage] = useState('')
  const [docsRunning, setDocsRunning] = useState(false)
  const [docsResult, setDocsResult] = useState<any>(null)
  const [docsError, setDocsError] = useState<string | null>(null)

  useEffect(() => {
    // Poll for status if job is running
    if (jobId && running) {
      const interval = setInterval(async () => {
        try {
          const token = sessionStorage.getItem('authToken') || 
                       sessionStorage.getItem('token') || 
                       localStorage.getItem('authToken') || 
                       localStorage.getItem('token')
          
          if (!token) return

          const response = await fetch(`/api/admin/migrate/phase2/status?jobId=${jobId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const job = await response.json()
            setProgress(job.progress || 0)
            setStatusMessage(job.message || '')

            if (job.status === 'completed') {
              setRunning(false)
              setResult(job.results)
              clearInterval(interval)
            } else if (job.status === 'failed') {
              setRunning(false)
              setError(job.error || 'Migration failed')
              clearInterval(interval)
            }
          }
        } catch (err) {
          console.error('Error checking status:', err)
        }
      }, 2000) // Poll every 2 seconds

      return () => clearInterval(interval)
    }
  }, [jobId, running])

  // Poll for insurance/tax docs migration status
  useEffect(() => {
    if (docsJobId && docsRunning) {
      const interval = setInterval(async () => {
        try {
          const token = sessionStorage.getItem('authToken') || 
                       sessionStorage.getItem('token') || 
                       localStorage.getItem('authToken') || 
                       localStorage.getItem('token')
          
          if (!token) return

          const response = await fetch(`/api/admin/migrate/insurance-tax-docs/status?jobId=${docsJobId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const job = await response.json()
            setDocsProgress(job.progress || 0)
            setDocsStatusMessage(job.message || '')

            if (job.status === 'completed') {
              setDocsRunning(false)
              setDocsResult(job.results)
              clearInterval(interval)
            } else if (job.status === 'failed') {
              setDocsRunning(false)
              setDocsError(job.error || 'Migration failed')
              clearInterval(interval)
            }
          }
        } catch (err) {
          console.error('Error checking docs migration status:', err)
        }
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [docsJobId, docsRunning])

  const runPhase2Migration = async () => {
    setRunning(true)
    setResult(null)
    setError(null)
    setProgress(0)
    setStatusMessage('Starting migration...')

    try {
      // Get token using the same pattern as other admin pages
      let token = sessionStorage.getItem('authToken') || 
                  sessionStorage.getItem('token') || 
                  localStorage.getItem('authToken') || 
                  localStorage.getItem('token')
      
      // If no token found, try to get from currentUser
      if (!token) {
        const userStr = sessionStorage.getItem('currentUser')
        if (userStr) {
          // Try to refresh token by calling /api/auth/me
          try {
            const response = await fetch('/api/auth/me', {
              headers: {
                'Content-Type': 'application/json'
              }
            })
            if (response.ok) {
              const data = await response.json()
              if (data.token) {
                token = data.token
                sessionStorage.setItem('authToken', token)
              }
            }
          } catch (err) {
            console.error('Error refreshing token:', err)
          }
        }
      }
      
      if (!token) {
        setError('No authentication token found. Please log in at /investors/login and try again.')
        setRunning(false)
        return
      }
      
      // Verify user is ADMIN
      if (user && user.role !== 'ADMIN') {
        setError('Admin access required. You must be logged in as an ADMIN user.')
        setRunning(false)
        return
      }
      
      // Start migration (returns immediately with job ID)
      const response = await fetch('/api/admin/migrate/phase2/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 200))
        setError(`Server error (${response.status}): The server returned an unexpected response.`)
        setRunning(false)
        return
      }

      const data = await response.json()

      if (response.ok && data.jobId) {
        setJobId(data.jobId)
        setStatusMessage('Migration started. Monitoring progress...')
        // Status polling will be handled by useEffect
      } else {
        if (response.status === 401) {
          setError('Authentication failed. Please log out and log back in.')
        } else if (response.status === 403) {
          setError('Admin access required. You must be logged in as an ADMIN user.')
        } else {
          setError(data.error || data.message || data.details || 'Failed to start migration')
        }
        setRunning(false)
      }
    } catch (err: any) {
      console.error('Migration error:', err)
      setError(err.message || 'Failed to start migration. Check your connection and try again.')
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <XCircleIcon className="h-6 w-6 text-red-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">Authentication Required</h3>
                  <p className="text-sm text-red-800 mb-4">
                    You must be logged in to access this page.
                  </p>
                  <button
                    onClick={() => router.push('/investors/login')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 mb-2">Admin Access Required</h3>
                  <p className="text-sm text-yellow-800">
                    Your role is <strong>{user.role}</strong>. Only ADMIN users can run database migrations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Database Migrations</h1>
            <div className="text-sm text-gray-600">
              Logged in as: <span className="font-semibold">{user.firstName} {user.lastName}</span> ({user.role})
            </div>
          </div>
          
          {/* Phase 2 Migration */}
          <div className="border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Phase 2: TermSheet Student Housing</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Adds student housing fields, universities, document templates, Excel integration, and more
                </p>
              </div>
              <button
                onClick={runPhase2Migration}
                disabled={running}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  running
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {running ? (
                  <span className="flex items-center">
                    <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                    Running... {progress > 0 && `${progress}%`}
                  </span>
                ) : (
                  'Run Migration'
                )}
              </button>
            </div>

            {/* Migration Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">What this migration does:</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>Adds student housing fields to deals table (beds, units, distance to campus, etc.)</li>
                <li>Creates universities table (pre-populated with Tulane & FAU)</li>
                <li>Creates document template tables for automated document generation</li>
                <li>Creates Excel integration tables for underwriting model sync</li>
                <li>Creates custom fields and saved views tables</li>
                <li>Creates task template tables for reusable workflows</li>
              </ul>
              <p className="text-sm text-green-700 font-medium mt-3">
                ✓ Safe to run multiple times (idempotent) - NO DATA WILL BE DELETED
              </p>
            </div>

            {/* Progress */}
            {running && (progress > 0 || statusMessage) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">{statusMessage}</span>
                  <span className="text-sm text-blue-700">{progress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-2">Migration Successful!</h3>
                    {result.verification && (
                      <div className="text-sm text-green-800 space-y-1">
                        <p>✓ {result.verification.newColumns} new columns added to deals table</p>
                        <p>✓ {result.verification.newTables} new tables created</p>
                        <p>✓ {result.verification.universities} universities in database</p>
                        
                        {result.verification.universityDetails && result.verification.universityDetails.length > 0 && (
                          <div className="mt-3">
                            <p className="font-medium">Universities:</p>
                            <ul className="list-disc list-inside ml-2">
                              {result.verification.universityDetails.map((uni: any) => (
                                <li key={uni.id}>
                                  {uni.name} ({uni.shortName}) - {uni.city}, {uni.state}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <XCircleIcon className="h-6 w-6 text-red-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-2">Migration Failed</h3>
                    <p className="text-sm text-red-800">{error}</p>
                    <p className="text-xs text-red-600 mt-2">
                      No data was modified - migration was rolled back
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Insurance/Tax Documents Migration */}
          <div className="border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Insurance & Tax Documents</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Adds document upload fields to insurance and property tax tables
                </p>
              </div>
              <button
                onClick={runInsuranceTaxDocsMigration}
                disabled={docsRunning}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  docsRunning
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {docsRunning ? (
                  <span className="flex items-center">
                    <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                    Running... {docsProgress > 0 && `${docsProgress}%`}
                  </span>
                ) : (
                  'Run Migration'
                )}
              </button>
            </div>

            {/* Migration Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">What this migration does:</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>Adds documentUrl, documentFileName, and documentS3Key columns to insurance table</li>
                <li>Adds documentUrl, documentFileName, and documentS3Key columns to property_taxes table</li>
                <li>Creates indexes for better query performance</li>
              </ul>
              <p className="text-sm text-green-700 font-medium mt-3">
                ✓ Safe to run multiple times (idempotent) - NO DATA WILL BE DELETED
              </p>
            </div>

            {/* Progress */}
            {docsRunning && (docsProgress > 0 || docsStatusMessage) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">{docsStatusMessage}</span>
                  <span className="text-sm text-blue-700">{docsProgress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${docsProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Results */}
            {docsResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-2">Migration Successful!</h3>
                    <div className="text-sm text-green-800 space-y-1">
                      <p>✓ {docsResult.insuranceColumns} columns added to insurance table</p>
                      <p>✓ {docsResult.taxColumns} columns added to property_taxes table</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {docsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <XCircleIcon className="h-6 w-6 text-red-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-2">Migration Failed</h3>
                    <p className="text-sm text-red-800">{docsError}</p>
                    <p className="text-xs text-red-600 mt-2">
                      No data was modified - migration was rolled back
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">Important Notes</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Migrations are safe to run multiple times (idempotent)</li>
                  <li>• No existing data will be deleted or modified</li>
                  <li>• Only adds new tables and columns</li>
                  <li>• Requires ADMIN role to run</li>
                  <li>• Run migrations during low-traffic periods if possible</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

