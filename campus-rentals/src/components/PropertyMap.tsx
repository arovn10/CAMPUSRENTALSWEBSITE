'use client';

import { Property } from '@/types';
import { useState } from 'react';

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

  // For now, create a simple OpenStreetMap embed with a list of addresses
  // We'll replace this with a proper Leaflet map once SSR issues are resolved
  return (
    <div className="space-y-4">
      <div className="h-[400px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center border border-gray-700">
        <div className="text-white text-center p-8">
          <h3 className="text-2xl font-bold mb-4">Property Locations</h3>
          <p className="text-gray-300 mb-6">
            {propertiesWithCoords.length} properties found near {propertiesWithCoords[0]?.school || 'campus'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {propertiesWithCoords.map((property) => (
              <div key={property.property_id} className="bg-gray-700 p-3 rounded-lg">
                <p className="font-semibold text-accent">{property.name}</p>
                <p className="text-gray-400 text-xs">{property.address}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
