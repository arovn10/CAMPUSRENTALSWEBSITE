'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'

interface Property {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  dealStatus: string | null
  currentValue: number | null
}

export default function PipelineMaps() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || sessionStorage.getItem('token') || localStorage.getItem('token')
    }
    return null
  }

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true)
      const token = getAuthToken()
      if (!token) {
        console.error('No auth token available')
        setLoading(false)
        return
      }

      const response = await fetch('/api/investors/crm/deals', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const uniqueProperties = new Map<string, Property>()
        data.forEach((deal: any) => {
          if (deal.property && !uniqueProperties.has(deal.property.id)) {
            uniqueProperties.set(deal.property.id, {
              id: deal.property.id,
              name: deal.property.name || deal.name,
              address: deal.property.address || null,
              latitude: deal.property.latitude || null,
              longitude: deal.property.longitude || null,
              dealStatus: deal.dealStatus || null,
              currentValue: deal.currentValue || deal.property.currentValue || null,
            })
          }
        })
        setProperties(Array.from(uniqueProperties.values()))
      } else {
        console.error('Failed to fetch properties:', response.status)
        setProperties([])
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
      setProperties([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const filteredProperties = properties.filter((property) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      property.name?.toLowerCase().includes(searchLower) ||
      property.address?.toLowerCase().includes(searchLower)
    )
  })

  const propertiesWithCoords = filteredProperties.filter(
    (p) => p.latitude && p.longitude
  )

  // Use OpenStreetMap with Leaflet for geocoding and mapping
  const mapUrl = propertiesWithCoords.length > 0
    ? `https://www.openstreetmap.org/?mlat=${propertiesWithCoords[0].latitude}&mlon=${propertiesWithCoords[0].longitude}&zoom=12`
    : 'https://www.openstreetmap.org'

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search properties..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm sm:text-base"
        />
      </div>

      {/* Map and Properties List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Map */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-secondary mb-4">Property Locations</h3>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
          ) : propertiesWithCoords.length === 0 ? (
            <div className="text-center py-12">
              <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-text">No properties with coordinates found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${propertiesWithCoords[0]?.longitude - 0.01},${propertiesWithCoords[0]?.latitude - 0.01},${propertiesWithCoords[0]?.longitude + 0.01},${propertiesWithCoords[0]?.latitude + 0.01}&layer=mapnik&marker=${propertiesWithCoords[0]?.latitude},${propertiesWithCoords[0]?.longitude}`}
                />
              </div>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-2 bg-gradient-to-r from-accent to-primary text-white rounded-lg hover:from-accent/90 hover:to-primary/90 transition-all shadow-md hover:shadow-lg text-center text-sm sm:text-base"
              >
                Open in OpenStreetMap
              </a>
            </div>
          )}
        </div>

        {/* Properties List */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-secondary mb-4">Properties</h3>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-12">
              <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-text">No properties found</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  onClick={() => setSelectedProperty(property)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedProperty?.id === property.id
                      ? 'border-accent bg-accent/5 shadow-md'
                      : 'border-gray-200 hover:border-accent/50 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-secondary mb-1">{property.name}</h4>
                      {property.address && (
                        <div className="flex items-center gap-1 text-sm text-text mb-2">
                          <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{property.address}</span>
                        </div>
                      )}
                      {property.currentValue && (
                        <p className="text-sm font-medium text-accent">
                          {formatCurrency(property.currentValue)}
                        </p>
                      )}
                    </div>
                    {property.latitude && property.longitude ? (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        Has Location
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        No Coordinates
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

