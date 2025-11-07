'use client';

import { useState, useEffect } from 'react';
import {
  UserPlusIcon,
  XMarkIcon,
  TrashIcon,
  UserIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  tags: string[];
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Follower {
  id: string;
  contactId?: string;
  userId?: string;
  accessLevel: string;
  notes?: string;
  contact?: Contact;
  user?: User;
  addedByUser?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface DealFollowersManagerProps {
  propertyId: string;
  authToken: string;
  readOnly?: boolean;
}

export default function DealFollowersManager({
  propertyId,
  authToken,
  readOnly = false,
}: DealFollowersManagerProps) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    contactId: '',
    userId: '',
    accessLevel: 'VIEW_ONLY',
    notes: '',
  });
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [newContactData, setNewContactData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    title: '',
  });

  useEffect(() => {
    fetchFollowers();
    if (!readOnly) {
      fetchContacts();
      fetchUsers();
    }
  }, [propertyId]);

  const fetchFollowers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/investors/properties/${propertyId}/followers`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFollowers(data.followers || []);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/investors/users', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateContact = async () => {
    if (!newContactData.firstName || !newContactData.lastName) {
      alert('First name and last name are required');
      return;
    }

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(newContactData),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchContacts();
        setFormData({ ...formData, contactId: data.contact.id });
        setShowCreateContact(false);
        setNewContactData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          company: '',
          title: '',
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create contact');
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Failed to create contact');
    }
  };

  const handleAddFollower = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactId && !formData.userId) {
      alert('Please select a contact or user');
      return;
    }

    try {
      const response = await fetch(`/api/investors/properties/${propertyId}/followers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchFollowers();
        setShowAddModal(false);
        setFormData({
          contactId: '',
          userId: '',
          accessLevel: 'VIEW_ONLY',
          notes: '',
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add follower');
      }
    } catch (error) {
      console.error('Error adding follower:', error);
      alert('Failed to add follower');
    }
  };

  const handleRemoveFollower = async (followerId: string) => {
    if (!confirm('Are you sure you want to remove this follower?')) return;

    try {
      const response = await fetch(
        `/api/investors/properties/${propertyId}/followers/${followerId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      if (response.ok) {
        await fetchFollowers();
      }
    } catch (error) {
      console.error('Error removing follower:', error);
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      !searchTerm ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(
    (u) =>
      !searchTerm ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <UserPlusIcon className="h-6 w-6 mr-2 text-blue-600" />
            Deal Followers
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Non-investors who have access to view this deal
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Add Follower
          </button>
        )}
      </div>

      {followers.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No followers yet</p>
          {!readOnly && (
            <p className="text-sm text-gray-500 mt-1">Click "Add Follower" to grant access</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {followers.map((follower) => (
            <div
              key={follower.id}
              className="border rounded-lg p-4 flex justify-between items-start"
            >
              <div className="flex-1">
                {follower.contact ? (
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {follower.contact.firstName} {follower.contact.lastName}
                    </h4>
                    {follower.contact.title && (
                      <p className="text-sm text-gray-600">{follower.contact.title}</p>
                    )}
                    {follower.contact.company && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <BuildingOfficeIcon className="h-4 w-4" />
                        {follower.contact.company}
                      </p>
                    )}
                    {follower.contact.email && (
                      <p className="text-sm text-gray-500">{follower.contact.email}</p>
                    )}
                  </div>
                ) : follower.user ? (
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {follower.user.firstName} {follower.user.lastName}
                    </h4>
                    <p className="text-sm text-gray-500">{follower.user.email}</p>
                  </div>
                ) : null}
                <div className="mt-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {follower.accessLevel}
                  </span>
                </div>
                {follower.notes && (
                  <p className="text-sm text-gray-600 mt-2">Note: {follower.notes}</p>
                )}
                {follower.addedByUser && (
                  <p className="text-xs text-gray-400 mt-2">
                    Added by {follower.addedByUser.firstName} {follower.addedByUser.lastName}
                  </p>
                )}
              </div>
              {!readOnly && (
                <button
                  onClick={() => handleRemoveFollower(follower.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors ml-4"
                  title="Remove follower"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Follower Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Add Follower to Deal</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddFollower} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Contacts or Users
                </label>
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {!showCreateContact ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Contact
                      </label>
                      <select
                        value={formData.contactId}
                        onChange={(e) => {
                          setFormData({ ...formData, contactId: e.target.value, userId: '' });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Choose a contact...</option>
                        {filteredContacts.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.firstName} {contact.lastName}
                            {contact.company && ` - ${contact.company}`}
                            {contact.email && ` (${contact.email})`}
                          </option>
                        ))}
                      </select>
                      {filteredContacts.length === 0 && searchTerm && (
                        <p className="text-xs text-gray-500 mt-1">No contacts found matching "{searchTerm}"</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Or Select User
                      </label>
                      <select
                        value={formData.userId}
                        onChange={(e) => {
                          setFormData({ ...formData, userId: e.target.value, contactId: '' });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Choose a user...</option>
                        {filteredUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(filteredContacts.length === 0 && searchTerm) && (
                    <div className="border-t pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          // Pre-fill name from search term if it looks like a name
                          const searchParts = searchTerm.trim().split(/\s+/);
                          if (searchParts.length >= 2) {
                            setNewContactData({
                              ...newContactData,
                              firstName: searchParts[0],
                              lastName: searchParts.slice(1).join(' '),
                            });
                          } else if (searchParts.length === 1) {
                            setNewContactData({
                              ...newContactData,
                              firstName: searchParts[0],
                              lastName: '',
                            });
                          }
                          setShowCreateContact(true);
                        }}
                        className="w-full px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <UserPlusIcon className="h-5 w-5 mr-2" />
                        Create New Contact: {searchTerm}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium text-gray-900">Create New Contact</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={newContactData.firstName}
                        onChange={(e) => setNewContactData({ ...newContactData, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={newContactData.lastName}
                        onChange={(e) => setNewContactData({ ...newContactData, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newContactData.email}
                        onChange={(e) => setNewContactData({ ...newContactData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={newContactData.phone}
                        onChange={(e) => setNewContactData({ ...newContactData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        value={newContactData.company}
                        onChange={(e) => setNewContactData({ ...newContactData, company: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={newContactData.title}
                        onChange={(e) => setNewContactData({ ...newContactData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateContact(false);
                        setNewContactData({
                          firstName: '',
                          lastName: '',
                          email: '',
                          phone: '',
                          company: '',
                          title: '',
                        });
                      }}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateContact}
                      className="flex-1 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg"
                    >
                      Create Contact
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Level
                </label>
                <select
                  value={formData.accessLevel}
                  onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="VIEW_ONLY">View Only</option>
                  <option value="DOCUMENTS">Documents Access</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Why does this person have access?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                >
                  Add Follower
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

