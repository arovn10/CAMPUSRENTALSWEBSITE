import fs from 'fs';
import path from 'path';

interface CachedCoordinate {
  address: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface CoordinateCache {
  [address: string]: CachedCoordinate;
}

const CACHE_FILE = path.join(process.cwd(), '.cache', 'coordinates.json');
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

// Ensure cache directory exists
function ensureCacheDir() {
  const cacheDir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

// Load coordinates from cache
function loadCache(): CoordinateCache {
  try {
    ensureCacheDir();
    if (fs.existsSync(CACHE_FILE)) {
      const cacheData = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(cacheData);
    }
  } catch (error) {
    console.error('Error loading coordinate cache:', error);
  }
  return {};
}

// Save coordinates to cache
function saveCache(cache: CoordinateCache) {
  try {
    ensureCacheDir();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Error saving coordinate cache:', error);
  }
}

// Check if cached coordinate is still valid
function isCacheValid(cached: CachedCoordinate): boolean {
  return Date.now() - cached.timestamp < CACHE_DURATION;
}

// Geocode address using Google Maps API
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Google Maps API key not found');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    } else {
      console.warn(`Geocoding failed for address: ${address}, status: ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Error geocoding address ${address}:`, error);
    return null;
  }
}

// Get coordinates for an address (from cache or geocoding)
export async function getCoordinates(address: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!address || typeof address !== 'string') {
    return null;
  }

  // Normalize address for consistent caching
  const normalizedAddress = address.toLowerCase().trim();
  
  // Load cache
  const cache = loadCache();
  
  // Check if we have valid cached coordinates
  if (cache[normalizedAddress] && isCacheValid(cache[normalizedAddress])) {
    const cached = cache[normalizedAddress];
    return {
      latitude: cached.latitude,
      longitude: cached.longitude
    };
  }

  // Geocode the address
  console.log(`Geocoding address: ${address}`);
  const coordinates = await geocodeAddress(address);

  if (coordinates) {
    // Cache the result
    cache[normalizedAddress] = {
      address: address,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      timestamp: Date.now()
    };
    
    saveCache(cache);
    
    return {
      latitude: coordinates.lat,
      longitude: coordinates.lng
    };
  }

  return null;
}

// Batch geocode multiple addresses
export async function batchGeocodeAddresses(
  addresses: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Array<{ address: string; coordinates: { latitude: number; longitude: number } | null }>> {
  const results: Array<{ address: string; coordinates: { latitude: number; longitude: number } | null }> = [];
  
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    const coordinates = await getCoordinates(address);
    results.push({ address, coordinates });
    
    if (onProgress) {
      onProgress(i + 1, addresses.length);
    }
    
    // Add delay between requests to avoid rate limiting
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Clear the coordinate cache
export function clearCoordinateCache(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
      console.log('Coordinate cache cleared');
    }
  } catch (error) {
    console.error('Error clearing coordinate cache:', error);
  }
}

// Get cache statistics
export function getCoordinateCacheStats(): { totalCached: number; cacheSize: string; lastUpdated: Date | null } {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cache = loadCache();
      const stats = fs.statSync(CACHE_FILE);
      
      return {
        totalCached: Object.keys(cache).length,
        cacheSize: (stats.size / 1024).toFixed(2) + ' KB',
        lastUpdated: stats.mtime
      };
    }
  } catch (error) {
    console.error('Error getting cache stats:', error);
  }
  
  return {
    totalCached: 0,
    cacheSize: '0 KB',
    lastUpdated: null
  };
}
