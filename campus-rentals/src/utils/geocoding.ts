interface GeocodeResult {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('Google Maps API key not found');
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    
    if (!response.ok) {
      console.error('Geocoding API request failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } else {
      console.warn('Geocoding failed for address:', address, 'Status:', data.status);
      return null;
    }
  } catch (error) {
    console.error('Error geocoding address:', address, error);
    return null;
  }
}

export async function geocodeProperties(properties: any[]): Promise<any[]> {
  const geocodedProperties = await Promise.all(
    properties.map(async (property) => {
      // Skip if already has valid coordinates
      if (
        typeof property.latitude === 'number' &&
        typeof property.longitude === 'number' &&
        !isNaN(property.latitude) &&
        !isNaN(property.longitude)
      ) {
        return property;
      }

      // Try to geocode the address
      const coords = await geocodeAddress(property.address);
      if (coords) {
        return {
          ...property,
          latitude: coords.lat,
          longitude: coords.lng
        };
      }

      // Return property without coordinates if geocoding fails
      return property;
    })
  );

  return geocodedProperties;
} 