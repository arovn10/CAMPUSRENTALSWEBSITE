'use client';

import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { Property } from '@/types';
import { useState } from 'react';

const containerStyle = {
  width: '100%',
  height: '400px'
};

interface PropertyMapProps {
  properties: Property[];
  center: {
    lat: number;
    lng: number;
  };
  zoom?: number;
}

export default function PropertyMap({ properties, center, zoom = 12 }: PropertyMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = (map: google.maps.Map) => {
    setMap(map);
  };

  const onUnmount = () => {
    setMap(null);
  };

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

  return (
    <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {/* Property Markers */}
        {propertiesWithCoords.map((property) => (
          <Marker
            key={property.property_id}
            position={{
              lat: property.latitude!,
              lng: property.longitude!
            }}
            title={`${property.name} - ${property.address}`}
            icon={{
              url: '/property-marker.png',
              scaledSize: {
                width: 25,
                height: 25,
                equals: () => false
              }
            }}
          />
        ))}
      </GoogleMap>
    </LoadScript>
  );
} 