'use client'

import { useEffect, useState, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

// Import Leaflet CSS dynamically to avoid SSR issues
if (typeof window !== 'undefined') {
  require('leaflet/dist/leaflet.css')
}

interface DealLocationMapProps {
  isOpen: boolean
  onClose: () => void
  address: string
  dealName?: string
}

export default function DealLocationMap({ isOpen, onClose, address, dealName }: DealLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)

  // Geocode address when modal opens
  useEffect(() => {
    if (!isOpen || !address) return

    const geocodeAddress = async () => {
      setLoading(true)
      setError(null)

      try {
        // Check cache first
        const cacheKey = `geo:${address}`
        const cached = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null
        if (cached) {
          const coords = JSON.parse(cached)
          setCoordinates(coords)
          setLoading(false)
          return
        }

        // Use OpenStreetMap Nominatim for geocoding
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'CampusRentals/1.0' // Required by Nominatim
          }
        })

        if (!res.ok) {
          throw new Error('Geocoding request failed')
        }

        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const { lat, lon } = data[0]
          const coords = { lat: parseFloat(lat), lng: parseFloat(lon) }
          
          // Cache the result
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(cacheKey, JSON.stringify(coords))
          }
          
          setCoordinates(coords)
        } else {
          throw new Error('Address not found')
        }
      } catch (err: any) {
        console.error('Geocoding failed:', err)
        setError(err.message || 'Failed to geocode address')
        // Use default coordinates (New Orleans area) as fallback
        setCoordinates({ lat: 29.9400, lng: -90.1200 })
      } finally {
        setLoading(false)
      }
    }

    geocodeAddress()
  }, [isOpen, address])

  // Initialize map when coordinates are available
  useEffect(() => {
    if (!mounted || !isOpen || !coordinates || !mapRef.current) return

    const initializeMap = async () => {
      try {
        // Dynamically import Leaflet
        const L = await import('leaflet').then(m => m.default)

        // Only proceed if map container exists
        if (!mapRef.current) return

        // If map already exists, just update it
        if (mapInstanceRef.current) {
          // Update marker position
          if (markerRef.current) {
            markerRef.current.setLatLng([coordinates.lat, coordinates.lng])
          }
          mapInstanceRef.current.setView([coordinates.lat, coordinates.lng], 15)
          return
        }

        // Configure Leaflet icons
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        })

        // Initialize Leaflet map
        const map = L.map(mapRef.current).setView([coordinates.lat, coordinates.lng], 15)
        mapInstanceRef.current = map

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map)

        // Add marker
        const marker = L.marker([coordinates.lat, coordinates.lng]).addTo(map)
        markerRef.current = marker

        // Add popup with address
        const popupContent = `
          <div style="max-width: 250px">
            ${dealName ? `<h3 style="font-weight: bold; margin: 0 0 4px 0; font-size: 14px">${dealName}</h3>` : ''}
            <p style="margin: 0; font-size: 0.9em; color: #666">${address}</p>
          </div>
        `
        marker.bindPopup(popupContent).openPopup()

      } catch (err) {
        console.error('Failed to initialize map:', err)
        setError('Failed to load map')
      }
    }

    initializeMap()

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      markerRef.current = null
    }
  }, [mounted, isOpen, coordinates, dealName, address])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Location</h3>
            {address && (
              <p className="text-sm text-slate-600 mt-1">{address}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="p-6">
          {loading ? (
            <div className="h-[500px] bg-slate-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Geocoding address...</p>
              </div>
            </div>
          ) : error && !coordinates ? (
            <div className="h-[500px] bg-slate-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-600 mb-2">Error: {error}</p>
                <p className="text-sm text-slate-500">Unable to display location on map</p>
              </div>
            </div>
          ) : (
            <div ref={mapRef} className="h-[500px] w-full rounded-lg" style={{ zIndex: 0 }} />
          )}
        </div>
      </div>
    </div>
  )
}

