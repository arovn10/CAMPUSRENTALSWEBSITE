import fs from 'fs';
import path from 'path';
import { Property, Photo, PropertyAmenities } from './api';

const CACHE_DIR = path.join(process.cwd(), 'public', 'cached-images');
const DATA_CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Geocoding cache interface
interface GeocodeCache {
  [address: string]: {
    lat: number;
    lng: number;
    timestamp: number;
  };
}

// Ensure cache directories exist
export function ensureCacheDirectories() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_CACHE_DIR)) {
    fs.mkdirSync(DATA_CACHE_DIR, { recursive: true });
  }
}

// Cache metadata interface
interface CacheMetadata {
  timestamp: number;
  lastUpdated: string;
}

// Data cache interface
interface DataCache {
  properties: Property[];
  photos: Record<number, Photo[]>;
  amenities: Record<number, PropertyAmenities | null>;
  metadata: CacheMetadata;
}

// Get cache file paths
function getCacheFilePath(type: 'data' | 'metadata' | 'geocoding'): string {
  return path.join(DATA_CACHE_DIR, `${type}.json`);
}

// Check if cache is valid (less than 24 hours old)
export function isCacheValid(): boolean {
  try {
    const metadataPath = getCacheFilePath('metadata');
    if (!fs.existsSync(metadataPath)) {
      return false;
    }
    
    const metadata: CacheMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const now = Date.now();
    return (now - metadata.timestamp) < CACHE_DURATION;
  } catch (error) {
    console.error('Error checking cache validity:', error);
    return false;
  }
}

// Save data to cache
export function saveDataToCache(data: DataCache): void {
  try {
    ensureCacheDirectories();
    
    const dataPath = getCacheFilePath('data');
    const metadataPath = getCacheFilePath('metadata');
    
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    fs.writeFileSync(metadataPath, JSON.stringify(data.metadata, null, 2));
    
    console.log('Data cached successfully');
  } catch (error) {
    console.error('Error saving data to cache:', error);
  }
}

// Load data from cache
export function loadDataFromCache(): DataCache | null {
  try {
    const dataPath = getCacheFilePath('data');
    if (!fs.existsSync(dataPath)) {
      return null;
    }
    
    const data: DataCache = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    return data;
  } catch (error) {
    console.error('Error loading data from cache:', error);
    return null;
  }
}

// Download and cache an image
export async function downloadAndCacheImage(imageUrl: string, propertyId: number, photoId: number): Promise<string | null> {
  try {
    ensureCacheDirectories();
    
    // Sanitize and create a safe filename - always use .jpg extension
    const filename = `property-${propertyId}-photo-${photoId}.jpg`;
    const localPath = path.join(CACHE_DIR, filename);
    
    // Check if file already exists
    if (fs.existsSync(localPath)) {
      return `/cached-images/${filename}`;
    }
    
    // Validate URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Invalid image URL');
    }
    
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    // Ensure the buffer is valid
    if (!buffer || buffer.byteLength === 0) {
      throw new Error('Empty image data received');
    }
    
    // Write file safely
    fs.writeFileSync(localPath, Buffer.from(buffer));
    
    console.log(`Image cached: ${filename}`);
    return `/cached-images/${filename}`;
  } catch (error) {
    console.error(`Error downloading and caching image for property ${propertyId}, photo ${photoId}:`, error);
    return null;
  }
}

// Get cached image path
export function getCachedImagePath(propertyId: number, photoId: number): string | null {
  try {
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    
    for (const ext of extensions) {
      const filename = `property-${propertyId}-photo-${photoId}.${ext}`;
      const localPath = path.join(CACHE_DIR, filename);
      
      if (fs.existsSync(localPath)) {
        return `/cached-images/${filename}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached image path:', error);
    return null;
  }
}

// Clean old cache files
export function cleanOldCache(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      return;
    }
    
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    
    files.forEach(file => {
      const filePath = path.join(CACHE_DIR, file);
      const stats = fs.statSync(filePath);
      
      // Delete files older than 48 hours (keep some buffer)
      if (now - stats.mtime.getTime() > CACHE_DURATION * 2) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old cached file: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning old cache:', error);
  }
}

// Create cache metadata
export function createCacheMetadata(): CacheMetadata {
  return {
    timestamp: Date.now(),
    lastUpdated: new Date().toISOString()
  };
}

// Geocoding cache functions
export function loadGeocodingCache(): GeocodeCache {
  try {
    const geocodingPath = getCacheFilePath('geocoding');
    if (!fs.existsSync(geocodingPath)) {
      return {};
    }
    
    const cache: GeocodeCache = JSON.parse(fs.readFileSync(geocodingPath, 'utf-8'));
    return cache;
  } catch (error) {
    console.error('Error loading geocoding cache:', error);
    return {};
  }
}

export function saveGeocodingCache(cache: GeocodeCache): void {
  try {
    ensureCacheDirectories();
    const geocodingPath = getCacheFilePath('geocoding');
    fs.writeFileSync(geocodingPath, JSON.stringify(cache, null, 2));
    console.log('Geocoding cache saved successfully');
  } catch (error) {
    console.error('Error saving geocoding cache:', error);
  }
}

export function getCachedCoordinates(address: string): { lat: number; lng: number } | null {
  try {
    const cache = loadGeocodingCache();
    const cached = cache[address];
    
    if (cached) {
      console.log(`✅ Using cached coordinates for ${address}: lat=${cached.lat}, lng=${cached.lng}`);
      return { lat: cached.lat, lng: cached.lng };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached coordinates:', error);
    return null;
  }
}

export function cacheCoordinates(address: string, lat: number, lng: number): void {
  try {
    const cache = loadGeocodingCache();
    cache[address] = {
      lat,
      lng,
      timestamp: Date.now()
    };
    saveGeocodingCache(cache);
    console.log(`💾 Cached coordinates for ${address}: lat=${lat}, lng=${lng}`);
  } catch (error) {
    console.error('Error caching coordinates:', error);
  }
}

// Initialize geocoding cache with known coordinates
export function initializeGeocodingCache(): void {
  console.log('🗺️ Initializing geocoding cache with known coordinates...');
  
  const knownCoordinates: Record<string, { lat: number; lng: number }> = {
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
  
  const cache = loadGeocodingCache();
  let newEntries = 0;
  
  Object.entries(knownCoordinates).forEach(([address, coords]) => {
    if (!cache[address]) {
      cache[address] = {
        lat: coords.lat,
        lng: coords.lng,
        timestamp: Date.now()
      };
      newEntries++;
    }
  });
  
  if (newEntries > 0) {
    saveGeocodingCache(cache);
    console.log(`✅ Added ${newEntries} new coordinate entries to geocoding cache`);
  } else {
    console.log('✅ Geocoding cache already contains all known coordinates');
  }
} 