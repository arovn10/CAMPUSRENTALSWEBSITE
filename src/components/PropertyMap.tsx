import React, { useState } from 'react';
import Map, { Marker, NavigationControl, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Property } from '@/types/property';
import Image from 'next/image';

interface PropertyMapProps {
  properties: Property[];
}

export default function PropertyMap({ properties }: PropertyMapProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden">
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          longitude: -90.1300,
          latitude: 29.9400,
          zoom: 14
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        <NavigationControl />
        {properties.map((property) => {
          // Extract coordinates from address (you might want to use a geocoding service for this)
          const coordinates = {
            longitude: -90.1300, // Default to Tulane area
            latitude: 29.9400
          };

          return (
            <Marker
              key={property.property_id}
              longitude={coordinates.longitude}
              latitude={coordinates.latitude}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedProperty(property);
              }}
            >
              <div className="cursor-pointer">
                <div className="bg-white p-2 rounded-full shadow-lg">
                  <span className="text-primary-600 font-semibold">
                    ${property.price.toLocaleString()}
                  </span>
                </div>
              </div>
            </Marker>
          );
        })}

        {selectedProperty && (
          <Popup
            longitude={-90.1300}
            latitude={29.9400}
            onClose={() => setSelectedProperty(null)}
            closeButton={true}
            closeOnClick={false}
            anchor="bottom"
          >
            <div className="w-64">
              <h3 className="font-semibold text-lg">{selectedProperty.name}</h3>
              <p className="text-sm text-gray-600">{selectedProperty.address}</p>
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-sm">{selectedProperty.bedrooms} beds</span>
                <span className="text-sm">•</span>
                <span className="text-sm">{selectedProperty.bathrooms} baths</span>
              </div>
              <div className="mt-2">
                <span className="text-lg font-semibold text-primary-600">
                  ${selectedProperty.price.toLocaleString()}/mo
                </span>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
} 