'use client';

import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Property } from '@/types';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

interface GeocodedProperty extends Property {
  geocodedLat?: number;
  geocodedLng?: number;
}

export default function PropertyMap({ properties, center, zoom = 14 }: PropertyMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [hoveredProperty, setHoveredProperty] = useState<GeocodedProperty | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<GeocodedProperty | null>(null);
  const [geocodedProperties, setGeocodedProperties] = useState<GeocodedProperty[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(true);
  const router = useRouter();

  const onLoad = (map: google.maps.Map) => {
    setMap(map);
  };

  const onUnmount = () => {
    setMap(null);
  };

  // Geocode addresses using Google Maps Geocoding API
  useEffect(() => {
    const geocodeProperties = async () => {
      setIsGeocoding(true);
      const geocoder = new google.maps.Geocoder();
      const geocoded: GeocodedProperty[] = [];

      for (const property of properties) {
        try {
          const result = await geocoder.geocode({ address: property.address });
          if (result.results.length > 0) {
            const location = result.results[0].geometry.location;
            geocoded.push({
              ...property,
              geocodedLat: location.lat(),
              geocodedLng: location.lng()
            });
          } else {
            // Fallback to original coordinates if geocoding fails
            geocoded.push({
              ...property,
              geocodedLat: property.latitude,
              geocodedLng: property.longitude
            });
          }
        } catch (error) {
          console.error(`Error geocoding ${property.address}:`, error);
          // Fallback to original coordinates
          geocoded.push({
            ...property,
            geocodedLat: property.latitude,
            geocodedLng: property.longitude
          });
        }
      }

      setGeocodedProperties(geocoded);
      setIsGeocoding(false);
    };

    if (properties.length > 0 && window.google) {
      geocodeProperties();
    }
  }, [properties]);

  // Filter properties that have valid coordinates
  const propertiesWithCoords = geocodedProperties.filter(property => 
    typeof property.geocodedLat === 'number' && 
    typeof property.geocodedLng === 'number' &&
    !isNaN(property.geocodedLat) && 
    !isNaN(property.geocodedLng) &&
    property.geocodedLat >= -90 && 
    property.geocodedLat <= 90 &&
    property.geocodedLng >= -180 && 
    property.geocodedLng <= 180
  );

  console.log(`Displaying ${propertiesWithCoords.length} properties with coordinates out of ${properties.length} total properties`);

  const handleMarkerMouseOver = (property: GeocodedProperty) => {
    setHoveredProperty(property);
  };

  const handleMarkerMouseOut = () => {
    setHoveredProperty(null);
  };

  const handleMarkerClick = (property: GeocodedProperty) => {
    setSelectedProperty(property);
    // Navigate to property page
    router.push(`/properties/${property.property_id}`);
  };

  const handleInfoWindowClose = () => {
    setSelectedProperty(null);
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

  if (isGeocoding) {
    return (
      <div className="h-[400px] rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-300">Geocoding property addresses...</p>
        </div>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        }}
      >
        {/* Property Markers */}
        {propertiesWithCoords.map((property) => (
          <Marker
            key={property.property_id}
            position={{
              lat: property.geocodedLat!,
              lng: property.geocodedLng!
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
            onMouseOver={() => handleMarkerMouseOver(property)}
            onMouseOut={handleMarkerMouseOut}
            onClick={() => handleMarkerClick(property)}
          />
        ))}

        {/* Hover Preview InfoWindow */}
        {hoveredProperty && !selectedProperty && (
          <InfoWindow
            position={{
              lat: hoveredProperty.geocodedLat!,
              lng: hoveredProperty.geocodedLng!
            }}
            onCloseClick={() => setHoveredProperty(null)}
            options={{
              pixelOffset: new google.maps.Size(0, -40),
              disableAutoPan: true
            }}
          >
            <div className="max-w-xs bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-start space-x-3">
                {hoveredProperty.photo && (
                  <img
                    src={hoveredProperty.photo}
                    alt={hoveredProperty.name}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {hoveredProperty.name}
                  </h3>
                  <p className="text-xs text-gray-600 truncate">
                    {hoveredProperty.address}
                  </p>
                  <div className="mt-1 flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {hoveredProperty.bedrooms} bed, {hoveredProperty.bathrooms} bath
                    </span>
                    <span className="text-xs font-semibold text-green-600">
                      {formatPrice(hoveredProperty.price)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {formatDate(hoveredProperty.leaseTerms)}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-center">
                <span className="text-xs text-blue-600 font-medium">
                  Click to view details →
                </span>
              </div>
            </div>
          </InfoWindow>
        )}

        {/* Selected Property InfoWindow */}
        {selectedProperty && (
          <InfoWindow
            position={{
              lat: selectedProperty.geocodedLat!,
              lng: selectedProperty.geocodedLng!
            }}
            onCloseClick={handleInfoWindowClose}
            options={{
              pixelOffset: new google.maps.Size(0, -40)
            }}
          >
            <div className="max-w-sm bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-start space-x-3">
                {selectedProperty.photo && (
                  <img
                    src={selectedProperty.photo}
                    alt={selectedProperty.name}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {selectedProperty.name}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {selectedProperty.address}
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Bedrooms:</span>
                      <span className="text-xs font-medium">{selectedProperty.bedrooms}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Bathrooms:</span>
                      <span className="text-xs font-medium">{selectedProperty.bathrooms}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Price:</span>
                      <span className="text-xs font-semibold text-green-600">
                        {formatPrice(selectedProperty.price)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Available:</span>
                      <span className="text-xs font-medium">
                        {formatDate(selectedProperty.leaseTerms)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600 line-clamp-2">
                  {selectedProperty.description}
                </p>
                <div className="mt-2 text-center">
                  <span className="text-xs text-blue-600 font-medium">
                    Navigating to property page...
                  </span>
                </div>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
} 