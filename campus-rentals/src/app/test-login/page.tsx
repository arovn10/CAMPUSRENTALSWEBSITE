'use client'

import { useState } from 'react'

export default function TestLogin() {
  const [email, setEmail] = useState('srovner@dia-law.com')
  const [password, setPassword] = useState('15Saratoga!')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const handleTestLogin = async () => {
    setLoading(true)
    setResult('')
    setError('')

    try {
      console.log('Testing login with:', { email, password })
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (response.ok && data.success) {
        setResult(`✅ Login successful! User: ${data.user.firstName} ${data.user.lastName} (${data.user.role})`)
      } else {
        setError(`❌ Login failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(`❌ Network error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTestStats = async () => {
    setLoading(true)
    setResult('')
    setError('')

    try {
      console.log('Testing investor stats...')
      
      const response = await fetch(`/api/investors/stats?auth=${email}`)
      console.log('Stats response status:', response.status)
      const data = await response.json()
      console.log('Stats response data:', data)

      if (response.ok) {
        setResult(`✅ Stats successful! Total invested: $${data.totalInvested?.toLocaleString()}, Active investments: ${data.activeInvestments}`)
      } else {
        setError(`❌ Stats failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Stats error:', error)
      setError(`❌ Stats network error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Login Test Page</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Credentials</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-y-4">
            <button
              onClick={handleTestLogin}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Login API'}
            </button>
            
            <button
              onClick={handleTestStats}
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Investor Stats API'}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{result}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Open your browser's developer console (F12)</li>
            <li>Click "Test Login API" to test the login endpoint</li>
            <li>Click "Test Investor Stats API" to test the stats endpoint</li>
            <li>Check the console for detailed logs</li>
            <li>If login works here but not on the main login page, there's a frontend issue</li>
          </ol>
        </div>
      </div>
    </div>
  )
} 