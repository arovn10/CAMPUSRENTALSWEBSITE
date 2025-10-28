'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Property } from '@/types';

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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapRef.current) return;

    const initializeMap = async () => {
      try {
        // Dynamically import Leaflet - this will only run in browser
        const L = await import('leaflet').then(m => m.default);
        const { MapContainer, TileLayer } = await import('react-leaflet');
        
        // Only proceed if map container exists
        if (!mapRef.current || mapInstanceRef.current) return;

        // Configure Leaflet icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Initialize Leaflet map directly without react-leaflet for simpler SSR handling
        const map = L.map(mapRef.current).setView([center.lat, center.lng], zoom);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Add markers for each property
        const propertiesWithCoords = properties.filter(p => 
          typeof p.latitude === 'number' && typeof p.longitude === 'number'
        );

        propertiesWithCoords.forEach((property) => {
          const marker = L.marker([property.latitude, property.longitude]).addTo(map);
          
          const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: #10b981; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg); width: 12px; height: 12px; background-color: white; border-radius: 50%;"></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          });
          
          marker.setIcon(customIcon);
          
          const content = `
            <div style="max-width: 200px">
              <h3 style="font-weight: bold; margin: 0 0 4px 0">${property.name}</h3>
              <p style="margin: 0; font-size: 0.9em; color: #666">${property.address}</p>
            </div>
          `;
          
          marker.bindPopup(content);
          marker.on('click', () => {
            router.push(`/properties/${property.property_id}`);
          });
        });

      } catch (error) {
        console.error('Failed to initialize map:', error);
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [mounted, properties, center, zoom, router]);

  if (!mounted) {
    return (
      <div className="h-[400px] bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-2">Loading map...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="h-[400px] w-full rounded-lg" style={{ zIndex: 1 }} />;
}

