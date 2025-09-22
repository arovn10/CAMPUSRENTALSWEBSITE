'use client'

import { useState } from 'react'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

interface PasswordManagementProps {
  users: User[]
  onPasswordChanged: () => void
}

export default function PasswordManagement({ users, onPasswordChanged }: PasswordManagementProps) {
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [resetMethod, setResetMethod] = useState<'user' | 'email'>('user')

  const handleUserPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/investors/users/${selectedUser}/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPassword,
          confirmPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Password updated successfully for ${data.userEmail}`)
        setNewPassword('')
        setConfirmPassword('')
        setSelectedUser('')
        onPasswordChanged()
      } else {
        setError(data.error || 'Failed to update password')
      }
    } catch (error) {
      setError('Network error occurred')
    }

    setLoading(false)
  }

  const handleEmailPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/investors/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          newPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Password reset successfully for ${data.userEmail}`)
        setEmail('')
        setNewPassword('')
        setConfirmPassword('')
        onPasswordChanged()
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch (error) {
      setError('Network error occurred')
    }

    setLoading(false)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Password Management</h2>
      
      {/* Method Selection */}
      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setResetMethod('user')}
            className={`px-4 py-2 rounded ${
              resetMethod === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Select User
          </button>
          <button
            onClick={() => setResetMethod('email')}
            className={`px-4 py-2 rounded ${
              resetMethod === 'email' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Enter Email
          </button>
        </div>
      </div>

      {/* User Selection Method */}
      {resetMethod === 'user' && (
        <form onSubmit={handleUserPasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email}) - {user.role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new password (min 8 characters)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm new password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !selectedUser}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      )}

      {/* Email Method */}
      {resetMethod === 'email' && (
        <form onSubmit={handleEmailPasswordReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter user's email address"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new password (min 8 characters)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm new password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      )}

      {/* Messages */}
      {message && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  )
}
