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

interface Property {
  id: string
  name: string
  address: string
  waterfallStructures?: WaterfallStructure[]
  entityInvestments?: EntityInvestment[]
}

interface EntityInvestment {
  id: string
  investmentAmount: number
  ownershipPercentage: number
  status: string
  investmentDate: string
  entityName: string
  entityType: string
  entityOwners: EntityOwner[]
}

interface EntityOwner {
  id: string
  userId: string
  userName: string
  userEmail: string
  ownershipPercentage: number
  investmentAmount: number
}

interface WaterfallStructure {
  id: string
  name: string
  description?: string
  isActive: boolean
  propertyId?: string
  waterfallTiers: WaterfallTier[]
  createdAt: string
}

interface WaterfallTier {
  id: string
  tierNumber: number
  tierName: string
  tierType: string
  priority: number
  returnRate?: number
  catchUpPercentage?: number
  promotePercentage?: number
}

export default function WaterfallStructureManagement() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])
  const [globalWaterfallStructures, setGlobalWaterfallStructures] = useState<WaterfallStructure[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string>('')
  const [selectedGlobalStructure, setSelectedGlobalStructure] = useState<string>('')
  const [applying, setApplying] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchUser()
    fetchProperties()
    fetchGlobalWaterfallStructures()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/admin/properties')
      if (response.ok) {
        const data = await response.json()
        setProperties(data)
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
    }
  }

  const fetchGlobalWaterfallStructures = async () => {
    try {
      const response = await fetch('/api/investors/global-waterfall-structures')
      if (response.ok) {
        const data = await response.json()
        setGlobalWaterfallStructures(data)
      }
    } catch (error) {
      console.error('Error fetching global waterfall structures:', error)
    }
  }

  const handleApplyWaterfallStructure = async () => {
    if (!selectedProperty || !selectedGlobalStructure) {
      setMessage({ type: 'error', text: 'Please select both a property and a global waterfall structure.' })
      return
    }

    try {
      setApplying(true)
      setMessage(null)

      // Find the property in our local state to get entity investments
      const property = properties.find(p => p.id === selectedProperty)
      if (!property) {
        throw new Error('Property not found')
      }
      
      if (!property.entityInvestments || property.entityInvestments.length === 0) {
        setMessage({ type: 'error', text: 'This property has no entity investments to apply the waterfall structure to.' })
        return
      }

      // Apply the waterfall structure to the first entity investment
      const entityInvestmentId = property.entityInvestments[0].id
      
      const response = await fetch('/api/investors/apply-waterfall-structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          waterfallStructureId: selectedGlobalStructure,
          entityInvestmentId: entityInvestmentId
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Waterfall structure applied successfully!' })
        setSelectedProperty('')
        setSelectedGlobalStructure('')
        // Refresh properties to show updated waterfall structures
        fetchProperties()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to apply waterfall structure')
      }
    } catch (error) {
      console.error('Error applying waterfall structure:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to apply waterfall structure' 
      })
    } finally {
      setApplying(false)
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Waterfall Structure Management</h1>
              <p className="text-gray-600 mt-2">Apply global waterfall structures to properties</p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              ← Back to Admin Dashboard
            </Link>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Apply Waterfall Structure */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Apply Global Waterfall Structure</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Property
                </label>
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a property...</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name} - {property.address}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Global Waterfall Structure
                </label>
                <select
                  value={selectedGlobalStructure}
                  onChange={(e) => setSelectedGlobalStructure(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a global structure...</option>
                  {globalWaterfallStructures.map((structure) => (
                    <option key={structure.id} value={structure.id}>
                      {structure.name} ({structure.waterfallTiers.length} tiers)
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleApplyWaterfallStructure}
                disabled={applying || !selectedProperty || !selectedGlobalStructure}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {applying ? 'Applying...' : 'Apply Waterfall Structure'}
              </button>
            </div>
          </div>

          {/* Global Waterfall Structures */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Global Structures</h2>
            
            {globalWaterfallStructures.length === 0 ? (
              <p className="text-gray-500">No global waterfall structures available.</p>
            ) : (
              <div className="space-y-4">
                {globalWaterfallStructures.map((structure) => (
                  <div key={structure.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">{structure.name}</h3>
                    {structure.description && (
                      <p className="text-sm text-gray-600 mt-1">{structure.description}</p>
                    )}
                    <div className="mt-2">
                      <span className="text-sm text-gray-500">
                        {structure.waterfallTiers.length} tiers
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs text-gray-500">Tiers:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {structure.waterfallTiers.map((tier) => (
                          <span
                            key={tier.id}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {tier.tierName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Properties with Waterfall Structures */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Properties and Their Waterfall Structures</h2>
          
          {properties.length === 0 ? (
            <p className="text-gray-500">No properties found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waterfall Structures
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {properties.map((property) => (
                    <tr key={property.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {property.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {property.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {property.waterfallStructures && property.waterfallStructures.length > 0 ? (
                          <div className="space-y-1">
                            {property.waterfallStructures.map((structure) => (
                              <div key={structure.id} className="text-xs">
                                <span className="font-medium">{structure.name}</span>
                                <span className="text-gray-400 ml-2">
                                  ({structure.waterfallTiers.length} tiers)
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">No waterfall structures</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Link
                          href={`/investors/investments/${property.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
