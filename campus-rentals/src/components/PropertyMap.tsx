'use client';

import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { Property } from '@/types';
import { useMemo, useState, useEffect } from 'react';

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
  selectedSchool?: string;
}

const UNIVERSITIES = [
  {
    name: 'Tulane University',
    position: { lat: 29.94, lng: -90.12 },
    icon: {
      url: '/university-marker.png',
      scaledSize: {
        width: 30,
        height: 30,
        equals: () => false
      }
    }
  },
  {
    name: 'Loyola University',
    position: { lat: 29.9346, lng: -90.1215 },
    icon: {
      url: '/university-marker.png',
      scaledSize: {
        width: 30,
        height: 30,
        equals: () => false
      }
    }
  },
  {
    name: 'Florida Atlantic University',
    position: { lat: 26.1194, lng: -80.1417 },
    icon: {
      url: '/university-marker.png',
      scaledSize: {
        width: 30,
        height: 30,
        equals: () => false
      }
    }
  }
];

export default function PropertyMap({ properties, center, zoom = 12, selectedSchool }: PropertyMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(zoom);

  useEffect(() => {
    if (selectedSchool && map) {
      const selectedUniversity = UNIVERSITIES.find(u => u.name === selectedSchool);
      if (selectedUniversity) {
        // Set the center to the selected school
        setMapCenter(selectedUniversity.position);
        // Set a higher zoom level for better visibility
        setMapZoom(15);
        
        // Create a circle with 1-mile radius
        const circle = new google.maps.Circle({
          center: selectedUniversity.position,
          radius: 1609.34, // 1 mile in meters
          map: null
        });
        
        // Get the bounds of the circle and fit the map to it
        const circleBounds = circle.getBounds();
        if (circleBounds) {
          map.fitBounds(circleBounds);
        }
      }
    } else if (map) {
      // Reset to default view when no school is selected
      setMapCenter(center);
      setMapZoom(zoom);
    }
  }, [selectedSchool, map, center, zoom]);

  const onLoad = (map: google.maps.Map) => {
    setMap(map);
  };

  const onUnmount = () => {
    setMap(null);
  };

  return (
    <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={mapZoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {/* University Markers - Only show selected school or all if none selected */}
        {UNIVERSITIES.map((university) => {
          if (!selectedSchool || university.name === selectedSchool) {
            return (
              <Marker
                key={university.name}
                position={university.position}
                title={university.name}
                icon={university.icon}
                label={{
                  text: university.name,
                  className: 'text-sm font-semibold text-gray-800'
                }}
              />
            );
          }
          return null;
        })}
        
        {/* Property Markers - Show all properties */}
        {properties.map((property) => {
          if (
            typeof property.latitude === 'number' && 
            typeof property.longitude === 'number' &&
            !isNaN(property.latitude) && 
            !isNaN(property.longitude) &&
            property.latitude >= -90 && 
            property.latitude <= 90 &&
            property.longitude >= -180 && 
            property.longitude <= 180
          ) {
            return (
              <Marker
                key={property.property_id}
                position={{
                  lat: property.latitude,
                  lng: property.longitude
                }}
                title={property.address}
                icon={{
                  url: '/property-marker.png',
                  scaledSize: {
                    width: 25,
                    height: 25,
                    equals: () => false
                  }
                }}
              />
            );
          }
          return null;
        })}
      </GoogleMap>
    </LoadScript>
  );
} 