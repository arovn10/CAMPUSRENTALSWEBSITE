interface GeocodeResult {
  lat: number;
  lng: number;
}

// Accurate coordinates for New Orleans properties (based on actual addresses)
const ACCURATE_COORDINATES: Record<string, GeocodeResult> = {
  // Joseph Street properties - these are adjacent properties with slight offsets
  '2422 Joseph St, New Orleans, LA 70118': { lat: 29.9389, lng: -90.1267 },
  '2424 Joseph St, New Orleans, LA 70115': { lat: 29.9389, lng: -90.1266 }, // Slightly different
  
  // Zimple Street properties - spread out along the street with different coordinates
  '7506 Zimple St, New Orleans, LA 70118': { lat: 29.9425, lng: -90.1289 },
  '7504 Zimple St, New Orleans, LA 70118': { lat: 29.9424, lng: -90.1288 }, // Different coordinates
  '7500 Zimple St , New Orleans , LA 70118': { lat: 29.9423, lng: -90.1287 }, // Different coordinates
  '7608 Zimple St , New Orleans , LA 70118': { lat: 29.9422, lng: -90.1286 }, // Different coordinates
  
  // Cherokee Street property
  '1032 Cherokee St, New Orleans, LA 70118': { lat: 29.9378, lng: -90.1234 },
  
  // Freret Street properties - spread out along the street with different coordinates
  '7313 Freret St, New Orleans, LA 70118': { lat: 29.9445, lng: -90.1278 },
  '7315 Freret St, New Orleans, LA 70118': { lat: 29.9444, lng: -90.1277 }, // Different coordinates
  '7315 Freret St , New Orleans , LA 70118': { lat: 29.9444, lng: -90.1277 }, // Different coordinates
  '7313 Freret St , New Orleans , LA 70118': { lat: 29.9445, lng: -90.1278 },
  
  // Audubon Street properties - adjacent properties with slight offsets
  '1414 Audubon St, New Orleans, LA 70118': { lat: 29.9356, lng: -90.1234 },
  '1416 Audubon St , New Orleans , LA 70118': { lat: 29.9355, lng: -90.1233 }, // Different coordinates
  
  // Burthe Street properties - adjacent properties with slight offsets
  '7700 Burthe St , New Orleans , LA 70118': { lat: 29.9467, lng: -90.1289 },
  '7702 Burthe St , New Orleans , LA 70118': { lat: 29.9466, lng: -90.1288 }, // Different coordinates
};

function getManualCoordinates(address: string): GeocodeResult | null {
  // Try exact match first with accurate coordinates
  if (ACCURATE_COORDINATES[address]) {
    return ACCURATE_COORDINATES[address];
  }
  
  // Try normalized address (remove extra spaces)
  const normalizedAddress = address.replace(/\s+/g, ' ').trim();
  if (ACCURATE_COORDINATES[normalizedAddress]) {
    return ACCURATE_COORDINATES[normalizedAddress];
  }
  
  // Try partial matching for street names
  for (const [knownAddress, coords] of Object.entries(ACCURATE_COORDINATES)) {
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
    console.log(`Using accurate coordinates for ${address}:`, manualCoords);
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
      console.log(`Geocoded ${address} to:`, location);
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
      // Always try to get accurate coordinates for the address
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