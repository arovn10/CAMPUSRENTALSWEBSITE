interface GeocodeResult {
  lat: number;
  lng: number;
}

// Manual geocoding fallback for New Orleans addresses
const NEW_ORLEANS_COORDINATES: Record<string, GeocodeResult> = {
  // Joseph Street properties
  '2422 Joseph St, New Orleans, LA 70118': { lat: 29.9389, lng: -90.1267 },
  '2424 Joseph St, New Orleans, LA 70115': { lat: 29.9389, lng: -90.1267 },
  
  // Zimple Street properties
  '7506 Zimple St, New Orleans, LA 70118': { lat: 29.9425, lng: -90.1289 },
  '7504 Zimple St, New Orleans, LA 70118': { lat: 29.9425, lng: -90.1289 },
  '7500 Zimple St , New Orleans , LA 70118': { lat: 29.9425, lng: -90.1289 },
  '7608 Zimple St , New Orleans , LA 70118': { lat: 29.9425, lng: -90.1289 },
  
  // Cherokee Street properties
  '1032 Cherokee St, New Orleans, LA 70118': { lat: 29.9378, lng: -90.1234 },
  
  // Freret Street properties
  '7313 Freret St, New Orleans, LA 70118': { lat: 29.9445, lng: -90.1278 },
  '7315 Freret St, New Orleans, LA 70118': { lat: 29.9445, lng: -90.1278 },
  '7315 Freret St , New Orleans , LA 70118': { lat: 29.9445, lng: -90.1278 },
  '7313 Freret St , New Orleans , LA 70118': { lat: 29.9445, lng: -90.1278 },
  
  // Audubon Street properties
  '1414 Audubon St, New Orleans, LA 70118': { lat: 29.9356, lng: -90.1234 },
  '1416 Audubon St , New Orleans , LA 70118': { lat: 29.9356, lng: -90.1234 },
  
  // Burthe Street properties
  '7700 Burthe St , New Orleans , LA 70118': { lat: 29.9467, lng: -90.1289 },
  '7702 Burthe St , New Orleans , LA 70118': { lat: 29.9467, lng: -90.1289 },
};

function getManualCoordinates(address: string): GeocodeResult | null {
  // Try exact match first
  if (NEW_ORLEANS_COORDINATES[address]) {
    return NEW_ORLEANS_COORDINATES[address];
  }
  
  // Try normalized address (remove extra spaces)
  const normalizedAddress = address.replace(/\s+/g, ' ').trim();
  if (NEW_ORLEANS_COORDINATES[normalizedAddress]) {
    return NEW_ORLEANS_COORDINATES[normalizedAddress];
  }
  
  // Try partial matching for street names
  for (const [knownAddress, coords] of Object.entries(NEW_ORLEANS_COORDINATES)) {
    if (address.includes(knownAddress.split(',')[0]) || knownAddress.includes(address.split(',')[0])) {
      return coords;
    }
  }
  
  return null;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  // Try manual coordinates first
  const manualCoords = getManualCoordinates(address);
  if (manualCoords) {
    console.log(`Using manual coordinates for ${address}:`, manualCoords);
    return manualCoords;
  }
  
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('Google Maps API key not found, using fallback coordinates');
    // Return default Tulane area coordinates as fallback
    return { lat: 29.9400, lng: -90.1200 };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    
    if (!response.ok) {
      console.error('Geocoding API request failed:', response.status);
      return manualCoords || { lat: 29.9400, lng: -90.1200 };
    }

    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } else {
      console.warn('Geocoding failed for address:', address, 'Status:', data.status);
      return manualCoords || { lat: 29.9400, lng: -90.1200 };
    }
  } catch (error) {
    console.error('Error geocoding address:', address, error);
    return manualCoords || { lat: 29.9400, lng: -90.1200 };
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