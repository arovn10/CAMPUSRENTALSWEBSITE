'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface Property {
  id: string
  name: string
  address: string | null
  dealStatus: string | null
  fundingStatus: string | null
  currentValue: number | null
  totalCost: number | null
  acquisitionDate: string | null
  occupancyRate: number | null
  capRate: number | null
}

export default function PipelineProperties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

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

      // Fetch from deals which have properties
      const response = await fetch('/api/investors/crm/deals', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Extract unique properties from deals
        const uniqueProperties = new Map<string, Property>()
        data.forEach((deal: any) => {
          if (deal.property && !uniqueProperties.has(deal.property.id)) {
            uniqueProperties.set(deal.property.id, {
              id: deal.property.id,
              name: deal.property.name || deal.name,
              address: deal.property.address || null,
              dealStatus: deal.dealStatus || null,
              fundingStatus: deal.fundingStatus || null,
              currentValue: deal.currentValue || deal.property.currentValue || null,
              totalCost: deal.totalCost || deal.property.totalCost || null,
              acquisitionDate: deal.acquisitionDate || deal.property.acquisitionDate || null,
              occupancyRate: deal.occupancyRate || deal.property.occupancyRate || null,
              capRate: deal.capRate || deal.property.capRate || null,
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A'
    return `${value.toFixed(1)}%`
  }

  const filteredProperties = properties.filter((property) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      property.name?.toLowerCase().includes(searchLower) ||
      property.address?.toLowerCase().includes(searchLower) ||
      property.dealStatus?.toLowerCase().includes(searchLower)
    )
  })

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

      {/* Properties Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-text">No properties found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProperties.map((property) => (
            <div
              key={property.id}
              className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-secondary mb-1">{property.name}</h3>
                  {property.address && (
                    <div className="flex items-center gap-1 text-sm text-text">
                      <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{property.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-text mb-1">Current Value</p>
                    <p className="font-semibold text-secondary flex items-center gap-1">
                      <CurrencyDollarIcon className="h-4 w-4 text-accent" />
                      {formatCurrency(property.currentValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text mb-1">Total Cost</p>
                    <p className="font-semibold text-secondary flex items-center gap-1">
                      <CurrencyDollarIcon className="h-4 w-4 text-primary" />
                      {formatCurrency(property.totalCost)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-text mb-1">Occupancy</p>
                    <p className="font-semibold text-secondary flex items-center gap-1">
                      <ChartBarIcon className="h-4 w-4 text-accent" />
                      {formatPercent(property.occupancyRate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text mb-1">Cap Rate</p>
                    <p className="font-semibold text-secondary flex items-center gap-1">
                      <ChartBarIcon className="h-4 w-4 text-primary" />
                      {formatPercent(property.capRate)}
                    </p>
                  </div>
                </div>

                {property.acquisitionDate && (
                  <div>
                    <p className="text-xs text-text mb-1">Acquisition Date</p>
                    <p className="font-semibold text-secondary flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4 text-accent" />
                      {formatDate(property.acquisitionDate)}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                  {property.dealStatus && (
                    <span className="px-2 py-1 text-xs bg-accent/10 text-accent rounded-full border border-accent/20">
                      {property.dealStatus}
                    </span>
                  )}
                  {property.fundingStatus && (
                    <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full border border-primary/20">
                      {property.fundingStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

