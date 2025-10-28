'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Property } from '@/types';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import markerRetinaIcon from 'leaflet/dist/images/marker-icon-2x.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerRetinaIcon.src,
  shadowUrl: markerShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom marker icon for properties
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg); width: 12px; height: 12px; background-color: white; border-radius: 50%;"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
};

interface PropertyMapProps {
  properties: Property[];
  center: {
    lat: number;
    lng: number;
  };
  zoom?: number;
}

// Component to update map bounds
function MapUpdater({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  
  return null;
}

export default function PropertyMap({ properties, center, zoom = 14 }: PropertyMapProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [hasError, setHasError] = useState(false);
  const router = useRouter();

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
    try {
      router.push(`/properties/${property.property_id}`);
    } catch (error) {
      console.error('Error navigating to property:', error);
    }
  };

  const formatPrice = (price: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    } catch {
      return `$${price}`;
    }
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

  if (typeof window === 'undefined' || hasError) {
    return (
      <div className="h-[400px] bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-2">Map unavailable</p>
          <p className="text-sm text-gray-400">View properties in the list below</p>
        </div>
      </div>
    );
  }

  try {
    const propertyIcon = createCustomIcon('#10b981'); // Green color for properties

    return (
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
      
      <MapUpdater center={center} zoom={zoom} />

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
    );
  } catch (error) {
    console.error('Error rendering map:', error);
    return (
      <div className="h-[400px] bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-2">Map unavailable</p>
          <p className="text-sm text-gray-400">View properties in the list below</p>
        </div>
      </div>
    );
  }
}