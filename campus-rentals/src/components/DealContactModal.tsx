'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface DealContactModalProps {
  isOpen: boolean
  onClose: () => void
  dealId: string
  authToken: string
  onSuccess: () => void
}

export default function DealContactModal({
  isOpen,
  onClose,
  dealId,
  authToken,
  onSuccess,
}: DealContactModalProps) {
  const [contacts, setContacts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContact, setSelectedContact] = useState<string>('')
  const [role, setRole] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchContacts()
    }
  }, [isOpen])

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/investors/contacts', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContact || !role) {
      setError('Please select a contact and specify their role')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/investors/crm/relationships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          dealId,
          contactId: selectedContact,
          role,
          notes,
        }),
      })

      if (response.ok) {
        onSuccess()
        onClose()
        setSelectedContact('')
        setRole('')
        setNotes('')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to add contact')
      }
    } catch (error: any) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter((contact) =>
    `${contact.firstName} ${contact.lastName} ${contact.email || ''} ${contact.company || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Add Contact to Deal</h3>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Search Contacts
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or company..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Contact *
            </label>
            <div className="max-h-48 overflow-y-auto border border-slate-300 rounded-lg">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setSelectedContact(contact.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-200 last:border-0 ${
                      selectedContact === contact.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="font-medium text-slate-900">
                      {contact.firstName} {contact.lastName}
                    </div>
                    {contact.company && (
                      <div className="text-sm text-slate-600">{contact.company}</div>
                    )}
                    {contact.email && (
                      <div className="text-sm text-slate-500">{contact.email}</div>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-slate-400">
                  No contacts found
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Role *
            </label>
            <input
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Broker, Lender, Attorney, Inspector"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes about this relationship..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedContact || !role}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

