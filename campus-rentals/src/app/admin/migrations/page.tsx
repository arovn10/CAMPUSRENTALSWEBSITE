'use client'

import { useState } from 'react'
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

  const runPhase2Migration = async () => {
    setRunning(true)
    setResult(null)
    setError(null)

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token')
      
      const response = await fetch('/api/admin/migrate/phase2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || data.message || 'Migration failed')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run migration')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Database Migrations</h1>
          
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
                    Running...
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

