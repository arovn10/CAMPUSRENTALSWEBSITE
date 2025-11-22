'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email?: string
  company?: string
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface DealContactModalProps {
  isOpen: boolean
  onClose: () => void
  dealId: string
  onSuccess?: () => void
}

export default function DealContactModal({
  isOpen,
  onClose,
  dealId,
  onSuccess,
}: DealContactModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<'contact' | 'user'>('contact')
  const [formData, setFormData] = useState({
    contactId: '',
    userId: '',
    role: '',
    notes: '',
  })

  useEffect(() => {
    if (isOpen) {
      fetchContacts()
      fetchUsers()
    }
  }, [isOpen])

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('token') || localStorage.getItem('token')
    }
    return null
  }

  const fetchContacts = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch('/api/investors/contacts', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setContacts(data)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Handle both { users: [...] } and [...] formats
        setUsers(Array.isArray(data) ? data : (data?.users || []))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = getAuthToken()
      const response = await fetch('/api/investors/crm/relationships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          dealId,
          contactId: selectedType === 'contact' ? formData.contactId : null,
          userId: selectedType === 'user' ? formData.userId : null,
          role: formData.role,
          notes: formData.notes,
        }),
      })

      if (response.ok) {
        onSuccess?.()
        onClose()
        setFormData({
          contactId: '',
          userId: '',
          role: '',
          notes: '',
        })
        setSelectedType('contact')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add contact')
      }
    } catch (error) {
      console.error('Error adding contact:', error)
      alert('Failed to add contact')
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(
    (contact) =>
      !searchTerm ||
      `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredUsers = users.filter(
    (user) =>
      !searchTerm ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-slate-900">Add Contact to Deal</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contact Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="contact"
                  checked={selectedType === 'contact'}
                  onChange={(e) => setSelectedType(e.target.value as 'contact' | 'user')}
                  className="rounded"
                />
                <span>Contact</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="user"
                  checked={selectedType === 'user'}
                  onChange={(e) => setSelectedType(e.target.value as 'contact' | 'user')}
                  className="rounded"
                />
                <span>User</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Search {selectedType === 'contact' ? 'Contact' : 'User'}
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${selectedType === 'contact' ? 'contacts' : 'users'}...`}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
            {selectedType === 'contact' ? (
              <div className="divide-y divide-slate-200">
                {filteredContacts.map((contact) => (
                  <label
                    key={contact.id}
                    className={`block p-3 cursor-pointer hover:bg-slate-50 ${
                      formData.contactId === contact.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="contact"
                      value={contact.id}
                      checked={formData.contactId === contact.id}
                      onChange={(e) =>
                        setFormData({ ...formData, contactId: e.target.value, userId: '' })
                      }
                      className="mr-3"
                    />
                    <div>
                      <p className="font-medium text-slate-900">
                        {contact.firstName} {contact.lastName}
                      </p>
                      {contact.email && (
                        <p className="text-sm text-slate-600">{contact.email}</p>
                      )}
                      {contact.company && (
                        <p className="text-xs text-slate-500">{contact.company}</p>
                      )}
                    </div>
                  </label>
                ))}
                {filteredContacts.length === 0 && (
                  <p className="p-4 text-sm text-slate-500 text-center">No contacts found</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredUsers.map((user) => (
                  <label
                    key={user.id}
                    className={`block p-3 cursor-pointer hover:bg-slate-50 ${
                      formData.userId === user.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="user"
                      value={user.id}
                      checked={formData.userId === user.id}
                      onChange={(e) =>
                        setFormData({ ...formData, userId: e.target.value, contactId: '' })
                      }
                      className="mr-3"
                    />
                    <div>
                      <p className="font-medium text-slate-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-slate-600">{user.email}</p>
                    </div>
                  </label>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="p-4 text-sm text-slate-500 text-center">No users found</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Role *
            </label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="e.g., Banker, Attorney, Broker, Advisor"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!formData.contactId && !formData.userId)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

