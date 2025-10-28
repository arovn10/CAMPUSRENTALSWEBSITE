'use client';

import { Property } from '@/types';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Only import CSS - this is safe for SSR
import 'leaflet/dist/leaflet.css';

// Leaflet imports MUST be lazy-loaded to avoid SSR errors
let LeafletComponents: any = null;
let LeafletLib: any = null;

async function loadLeaflet() {
  if (typeof window === 'undefined') return; // Don't load on server
  if (LeafletComponents) return LeafletComponents; // Already loaded
  
  const reactLeaflet = await import('react-leaflet');
  LeafletLib = await import('leaflet').then(m => m.default);
  
  // Fix default icon paths
  if (LeafletLib) {
    delete (LeafletLib.Icon.Default.prototype as any)._getIconUrl;
    LeafletLib.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }
  
  LeafletComponents = reactLeaflet;
  return reactLeaflet;
}

interface PropertyMapProps {
  properties: Property[];
  center: {
    lat: number;
    lng: number;
  };
  zoom?: number;
}

export default function PropertyMap({ properties, center, zoom = 14 }: PropertyMapProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [mounted, setMounted] = useState(false);
  const [components, setComponents] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Load Leaflet only in browser
    if (typeof window !== 'undefined') {
      loadLeaflet().then(comps => {
        if (comps) {
          setComponents(comps);
          setMounted(true);
        }
      });
    }
  }, []);

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

  const handleMarkerClick = (property: Property) => {
    router.push(`/properties/${property.property_id}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Available Soon';
    }
  };

  if (!mounted || !components) {
    return (
      <div className="h-[400px] bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-2">Loading map...</p>
          <p className="text-sm text-gray-400">View properties in the list below</p>
        </div>
      </div>
    );
  }

  // If there are no properties with coordinates, render a friendly placeholder
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

  // Create custom marker icon using the lazy-loaded Leaflet library
  const propertyIcon = LeafletLib?.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: #10b981; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg); width: 12px; height: 12px; background-color: white; border-radius: 50%;"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });

  const { MapContainer, TileLayer, Marker, Popup } = components;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '400px', width: '100%', borderRadius: '8px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Property Markers */}
        {propertiesWithCoords.map((property) => (
          <Marker
            key={property.property_id}
            position={[property.latitude, property.longitude]}
            icon={propertyIcon}
            eventHandlers={{
              click: () => handleMarkerClick(property),
            }}
          >
            <Popup>
              <div className="max-w-xs bg-white rounded-lg shadow-lg p-4">
                <div className="flex items-start space-x-3">
                  {property.photo && (
                    <img
                      src={property.photo}
                      alt={property.name}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {property.name}
                    </h3>
                    <p className="text-xs text-gray-600 truncate">
                      {property.address}
                    </p>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {property.bedrooms} bed, {property.bathrooms} bath
                      </span>
                      <span className="text-xs font-semibold text-green-600">
                        {formatPrice(property.price)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Available: {formatDate(property.leaseTerms)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <button
                    onClick={() => handleMarkerClick(property)}
                    className="w-full px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
