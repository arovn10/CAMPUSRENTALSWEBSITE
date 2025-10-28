'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Property } from '@/types';

// Import Leaflet CSS dynamically to avoid SSR issues
if (typeof window !== 'undefined') {
  require('leaflet/dist/leaflet.css');
}

interface PropertyMapProps {
  properties: Property[];
  center: {
    lat: number;
    lng: number;
  };
  zoom?: number;
}

export default function PropertyMapClient({ properties, center, zoom = 14 }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter properties that have valid coordinates
  const propertiesWithCoords = properties.filter(property => 
    typeof property.latitude === 'number' && 
    typeof property.longitude === 'number' &&
    !isNaN(property.latitude) && 
    !isNaN(property.longitude) &&
    property.latitude >= -90 && 
    property.latitude <= 90 &&
    property.longitude >= -180 && 
    property.longitude <= 180
  );

  console.log(`Displaying ${propertiesWithCoords.length} properties with coordinates out of ${properties.length} total properties`);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapRef.current || mapInstanceRef.current) return;

    const initializeMap = async () => {
      try {
        // Dynamically import Leaflet - this will only run in browser
        const L = await import('leaflet').then(m => m.default);
        
        // Only proceed if map container exists and we haven't initialized
        if (!mapRef.current || mapInstanceRef.current) return;

        // Configure Leaflet icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Initialize Leaflet map directly
        const map = L.map(mapRef.current!).setView([center.lat, center.lng], zoom);
        mapInstanceRef.current = map;

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Add markers for each property
        propertiesWithCoords.forEach((property) => {
          const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: #10b981; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg); width: 12px; height: 12px; background-color: white; border-radius: 50%;"></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          });
          
          const marker = L.marker([property.latitude, property.longitude], {
            icon: customIcon
          }).addTo(map);
          
          const formatPrice = (price: number) => {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(price);
          };
          
          const content = `
            <div style="max-width: 200px">
              <h3 style="font-weight: bold; margin: 0 0 4px 0; font-size: 14px">${property.name}</h3>
              <p style="margin: 0 0 4px 0; font-size: 0.9em; color: #666">${property.address}</p>
              <p style="margin: 0; font-size: 0.85em; color: #10b981; font-weight: 600">${formatPrice(property.price)}</p>
            </div>
          `;
          
          marker.bindPopup(content);
          marker.on('click', () => {
            window.location.href = `/properties/${property.property_id}`;
          });
        });

      } catch (err) {
        console.error('Failed to initialize map:', err);
        setError('Failed to load map');
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mounted, propertiesWithCoords, center, zoom]);

  if (!mounted) {
    return (
      <div className="h-[400px] bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-2">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[400px] bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-2">Map unavailable</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (propertiesWithCoords.length === 0) {
    return (
      <div className="h-[400px] bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-2">No locations to display</p>
          <p className="text-sm text-gray-400">Refine filters or see the list below</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="h-[400px] w-full rounded-lg" style={{ zIndex: 0 }} />;
}
