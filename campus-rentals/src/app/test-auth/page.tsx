'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
  KeyIcon,
  EnvelopeIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline'

export default function AuthTestPage() {
  const router = useRouter()
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const isProduction = typeof process !== 'undefined' && process.env.NODE_ENV === 'production'
  useEffect(() => {
    if (isProduction) router.replace('/')
  }, [router, isProduction])

  if (isProduction) return null

  const runTest = async (testName: string, testFunction: () => Promise<any>) => {
    setLoading(prev => ({ ...prev, [testName]: true }))
    try {
      const result = await testFunction()
      setTestResults(prev => ({ ...prev, [testName]: { success: true, data: result } }))
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      }))
    } finally {
      setLoading(prev => ({ ...prev, [testName]: false }))
    }
  }

  const testLogin = async () => {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: 'test@example.com',
        password: 'testpassword'
      })
    })
    return await response.json()
  }

  const testRegister = async () => {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      })
    })
    return await response.json()
  }

  const testPasswordReset = async () => {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'request-password-reset',
        email: 'test@example.com'
      })
    })
    return await response.json()
  }

  const testUserManagement = async () => {
    const token = sessionStorage.getItem('authToken')
    if (!token) throw new Error('No auth token found')
    
    const response = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return await response.json()
  }

  const testFileUpload = async () => {
    const token = sessionStorage.getItem('authToken')
    if (!token) throw new Error('No auth token found')
    
    const formData = new FormData()
    const testFile = new Blob(['test content'], { type: 'text/plain' })
    formData.append('file', testFile, 'test.txt')
    formData.append('category', 'DOCUMENT')
    
    const response = await fetch('/api/files', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    return await response.json()
  }

  const testEmailService = async () => {
    const response = await fetch('/api/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test Email</h1><p>This is a test email from Campus Rentals.</p>'
      })
    })
    return await response.json()
  }

  const getStatusIcon = (testName: string) => {
    const result = testResults[testName]
    if (loading[testName]) {
      return <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
    }
    if (!result) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />
    }
    return result.success ? 
      <CheckCircleIcon className="h-5 w-5 text-green-500" /> : 
      <XCircleIcon className="h-5 w-5 text-red-500" />
  }

  const getStatusText = (testName: string) => {
    const result = testResults[testName]
    if (loading[testName]) return 'Running...'
    if (!result) return 'Not tested'
    return result.success ? 'Success' : 'Failed'
  }

  const getStatusColor = (testName: string) => {
    const result = testResults[testName]
    if (loading[testName]) return 'text-blue-600'
    if (!result) return 'text-gray-500'
    return result.success ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center">
            <ArrowRightOnRectangleIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-6 text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
            Authentication System Test Suite
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Comprehensive testing of all authentication and user management features
          </p>
        </div>

        {/* Test Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Login Test */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <ArrowRightOnRectangleIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Login Test</h3>
                  <p className="text-sm text-slate-500">Test user authentication</p>
                </div>
              </div>
              {getStatusIcon('login')}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Status:</span>
                <span className={`text-sm font-medium ${getStatusColor('login')}`}>
                  {getStatusText('login')}
                </span>
              </div>
              <button
                onClick={() => runTest('login', testLogin)}
                disabled={loading.login}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
              >
                Run Login Test
              </button>
              {testResults.login && (
                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                  {testResults.login.success ? 
                    'Login endpoint responding correctly' : 
                    testResults.login.error
                  }
                </div>
              )}
            </div>
          </div>

          {/* Registration Test */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <UserPlusIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Registration Test</h3>
                  <p className="text-sm text-slate-500">Test user registration</p>
                </div>
              </div>
              {getStatusIcon('register')}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Status:</span>
                <span className={`text-sm font-medium ${getStatusColor('register')}`}>
                  {getStatusText('register')}
                </span>
              </div>
              <button
                onClick={() => runTest('register', testRegister)}
                disabled={loading.register}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors duration-200"
              >
                Run Registration Test
              </button>
              {testResults.register && (
                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                  {testResults.register.success ? 
                    'Registration endpoint working' : 
                    testResults.register.error
                  }
                </div>
              )}
            </div>
          </div>

          {/* Password Reset Test */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <KeyIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Password Reset</h3>
                  <p className="text-sm text-slate-500">Test password reset flow</p>
                </div>
              </div>
              {getStatusIcon('passwordReset')}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Status:</span>
                <span className={`text-sm font-medium ${getStatusColor('passwordReset')}`}>
                  {getStatusText('passwordReset')}
                </span>
              </div>
              <button
                onClick={() => runTest('passwordReset', testPasswordReset)}
                disabled={loading.passwordReset}
                className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors duration-200"
              >
                Run Password Reset Test
              </button>
              {testResults.passwordReset && (
                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                  {testResults.passwordReset.success ? 
                    'Password reset endpoint working' : 
                    testResults.passwordReset.error
                  }
                </div>
              )}
            </div>
          </div>

          {/* User Management Test */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <UserPlusIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">User Management</h3>
                  <p className="text-sm text-slate-500">Test user management API</p>
                </div>
              </div>
              {getStatusIcon('userManagement')}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Status:</span>
                <span className={`text-sm font-medium ${getStatusColor('userManagement')}`}>
                  {getStatusText('userManagement')}
                </span>
              </div>
              <button
                onClick={() => runTest('userManagement', testUserManagement)}
                disabled={loading.userManagement}
                className="w-full py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors duration-200"
              >
                Run User Management Test
              </button>
              {testResults.userManagement && (
                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                  {testResults.userManagement.success ? 
                    'User management API working' : 
                    testResults.userManagement.error
                  }
                </div>
              )}
            </div>
          </div>

          {/* File Upload Test */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <DocumentArrowUpIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">File Upload</h3>
                  <p className="text-sm text-slate-500">Test file upload system</p>
                </div>
              </div>
              {getStatusIcon('fileUpload')}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Status:</span>
                <span className={`text-sm font-medium ${getStatusColor('fileUpload')}`}>
                  {getStatusText('fileUpload')}
                </span>
              </div>
              <button
                onClick={() => runTest('fileUpload', testFileUpload)}
                disabled={loading.fileUpload}
                className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors duration-200"
              >
                Run File Upload Test
              </button>
              {testResults.fileUpload && (
                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                  {testResults.fileUpload.success ? 
                    'File upload system working' : 
                    testResults.fileUpload.error
                  }
                </div>
              )}
            </div>
          </div>

          {/* Email Service Test */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-pink-100 p-2 rounded-lg">
                  <EnvelopeIcon className="h-6 w-6 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Email Service</h3>
                  <p className="text-sm text-slate-500">Test email functionality</p>
                </div>
              </div>
              {getStatusIcon('emailService')}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Status:</span>
                <span className={`text-sm font-medium ${getStatusColor('emailService')}`}>
                  {getStatusText('emailService')}
                </span>
              </div>
              <button
                onClick={() => runTest('emailService', testEmailService)}
                disabled={loading.emailService}
                className="w-full py-2 px-4 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors duration-200"
              >
                Run Email Service Test
              </button>
              {testResults.emailService && (
                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                  {testResults.emailService.success ? 
                    'Email service working' : 
                    testResults.emailService.error
                  }
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-12 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Test Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.keys(testResults).map(testName => (
              <div key={testName} className="text-center">
                <div className="text-sm font-medium text-slate-600 capitalize">
                  {testName.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div className="mt-1">
                  {getStatusIcon(testName)}
                </div>
                <div className={`text-xs font-medium ${getStatusColor(testName)}`}>
                  {getStatusText(testName)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => router.push('/investors/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Go to Login
          </button>
          <button
            onClick={() => router.push('/admin/users')}
            className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors duration-200 font-medium"
          >
            User Management
          </button>
        </div>
      </div>
    </div>
  )
}
