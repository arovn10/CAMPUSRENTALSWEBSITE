'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [newUser, setNewUser] = useState({ email: '', firstName: '', lastName: '', role: 'INVESTOR', password: '' })

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      // Get auth token from sessionStorage
      const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token')
      const userStr = sessionStorage.getItem('currentUser')
      
      if (userStr) {
        const userData = JSON.parse(userStr)
        setUser(userData)
        setLoading(false)
        return
      }
      
      // Fallback to API call with token
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch('/api/auth/me', { headers })
      if (response.ok) {
        const data = await response.json()
        setUser(data.user || data)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && user?.role === 'ADMIN') {
      loadUsersAndProperties()
    }
  }, [loading, user])

  const getToken = () => sessionStorage.getItem('authToken') || sessionStorage.getItem('token') || ''

  const loadUsersAndProperties = async () => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }
      const [uRes, pRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/investors/properties', { headers })
      ])
      if (uRes.ok) setUsers(await uRes.json())
      if (pRes.ok) setProperties(await pRes.json())
    } catch {}
  }

  const createUser = async () => {
    const headers: HeadersInit = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }
    const res = await fetch('/api/admin/users', { method: 'POST', headers, body: JSON.stringify(newUser) })
    if (res.ok) {
      setNewUser({ email: '', firstName: '', lastName: '', role: 'INVESTOR', password: '' })
      loadUsersAndProperties()
    } else {
      alert('Failed to create user')
    }
  }

  const deleteUser = async (id: string) => {
    const headers: HeadersInit = { 'Authorization': `Bearer ${getToken()}` }
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers })
    if (res.ok) loadUsersAndProperties()
  }

  const updateAccess = async (id: string, propertyIds: string[]) => {
    const headers: HeadersInit = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }
    const res = await fetch(`/api/admin/users/${id}`, { method: 'PUT', headers, body: JSON.stringify({ propertyIds }) })
    if (!res.ok) alert('Failed to update access')
  }

  const handleCSVExport = async () => {
    try {
      setExporting(true)
      const response = await fetch('/api/investors/export-csv')
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `investments-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to export CSV. Please try again.')
      }
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Error exporting CSV. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user.firstName} {user.lastName}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Management */}
          <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2 lg:col-span-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Management</h3>
            <div className="grid md:grid-cols-5 gap-3 mb-4">
              <input className="border rounded px-3 py-2" placeholder="Email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} />
              <input className="border rounded px-3 py-2" placeholder="First name" value={newUser.firstName} onChange={e=>setNewUser({...newUser,firstName:e.target.value})} />
              <input className="border rounded px-3 py-2" placeholder="Last name" value={newUser.lastName} onChange={e=>setNewUser({...newUser,lastName:e.target.value})} />
              <select className="border rounded px-3 py-2" value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}>
                <option value="INVESTOR">INVESTOR</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <input className="border rounded px-3 py-2" placeholder="Temp password" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})} />
            </div>
            <button onClick={createUser} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create User</button>

            <div className="mt-6 overflow-auto">
              <table className="min-w-full divide-y">
                <thead>
                  <tr className="text-left text-sm text-gray-600">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Access</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map(u => {
                    const accessSet = new Set((u.propertyAccess || []).map((a:any)=>a.propertyId))
                    const toggle = (pid: string) => {
                      const next = new Set(accessSet)
                      if (next.has(pid)) next.delete(pid); else next.add(pid)
                      updateAccess(u.id, Array.from(next) as string[])
                    }
                    return (
                      <tr key={u.id} className="text-sm">
                        <td className="py-2 pr-4">{u.firstName} {u.lastName}</td>
                        <td className="py-2 pr-4">{u.email}</td>
                        <td className="py-2 pr-4">{u.role}</td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-2 max-w-xl">
                            {properties.map((p:any)=>(
                              <label key={p.propertyId || p.property?.id || p.propertyId} className="inline-flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded border">
                                <input type="checkbox" defaultChecked={accessSet.has(p.propertyId || p.propertyId || p.property?.id)} onChange={()=>toggle(p.propertyId || p.property?.id || p.propertyId)} />
                                <span>{p.propertyName || p.property?.name || p.name || p.propertyAddress}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="py-2">
                          <button onClick={()=>deleteUser(u.id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {/* CSV Export */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Data Export</h3>
            </div>
            <p className="text-gray-600 mb-4">Export all investments and investors by property to CSV</p>
            <button
              onClick={handleCSVExport}
              disabled={exporting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>

          {/* Password Management */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Password Management</h3>
            </div>
            <p className="text-gray-600 mb-4">Manage user passwords and account settings</p>
            <Link
              href="/admin/passwords"
              className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-center"
            >
              Manage Passwords
            </Link>
          </div>

          {/* Cache Management */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Cache Management</h3>
            </div>
            <p className="text-gray-600 mb-4">Manage system cache and performance</p>
            <Link
              href="/admin/cache"
              className="block w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 text-center"
            >
              Manage Cache
            </Link>
          </div>

          {/* Coordinate Cache */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Coordinate Cache</h3>
            </div>
            <p className="text-gray-600 mb-4">Manage geocoding coordinate cache</p>
            <Link
              href="/admin/coordinates"
              className="block w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200 text-center"
            >
              Manage Coordinates
            </Link>
          </div>

          {/* Waterfall Structure Management */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Waterfall Structures</h3>
            </div>
            <p className="text-gray-600 mb-4">Manage waterfall structures and apply them to properties</p>
            <Link
              href="/admin/waterfall-structures"
              className="block w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-center"
            >
              Manage Waterfall Structures
            </Link>
          </div>

          {/* System Stats */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">System Statistics</h3>
            </div>
            <p className="text-gray-600 mb-4">View system performance and statistics</p>
            <Link
              href="/investors/dashboard"
              className="block w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-center"
            >
              View Stats
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
