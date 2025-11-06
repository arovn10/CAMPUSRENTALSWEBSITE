import { Property } from '@/types';
import { s3ToCloudFrontUrl } from './api';
import apiService from '../services/api';

// Enhanced Photo interface with cached path
export interface CachedPhoto {
  propertyKey: number;
  photoLink: string;
  description: string;
  photoOrder: number | null;
  photoId: number;
  cachedPath?: string;
}

// Client-side cache for properties (in-memory)
let propertiesCache: { data: Property[]; timestamp: number } | null = null;
const CLIENT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch properties from our cached API (prioritizes local cache)
export async function fetchProperties(): Promise<Property[]> {
  try {
    // Check in-memory cache first
    if (propertiesCache && Date.now() - propertiesCache.timestamp < CLIENT_CACHE_DURATION) {
      return propertiesCache.data;
    }

    // First try our local cached API (browser will use cache based on server headers)
    const response = await fetch('/api/properties', {
      cache: 'default', // Let browser handle caching based on server Cache-Control headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch properties from cache');
    }
    
    const cachedProperties = await response.json();
    
    // If we have cached properties, return them and update in-memory cache
    if (cachedProperties && cachedProperties.length > 0) {
      propertiesCache = { data: cachedProperties, timestamp: Date.now() };
      return cachedProperties;
    }
    
    // Fallback to external API if cache is empty
    console.log('Cache empty, fetching from external API...');
    const external = await apiService.property.getProperties();
    if (external && external.length > 0) {
      propertiesCache = { data: external, timestamp: Date.now() };
      return external;
    }

    // Final fallback to bundled test data (ensures map/cards still work)
    const testData = await import('@/app/api/properties/test-data.json');
    return testData.default as Property[];
  } catch (error) {
    console.error('Error fetching properties from cache, trying external API:', error);
    try {
      // Fallback to external API
      const external = await apiService.property.getProperties();
      if (external && external.length > 0) {
        propertiesCache = { data: external, timestamp: Date.now() };
        return external;
      }
      const testData = await import('@/app/api/properties/test-data.json');
      return testData.default as Property[];
    } catch (externalError) {
      console.error('Error fetching properties from external API:', externalError);
      const testData = await import('@/app/api/properties/test-data.json');
      return testData.default as Property[];
    }
  }
}

// Client-side cache for photos (in-memory)
const photosCache: Map<number, { data: CachedPhoto[]; timestamp: number }> = new Map();
const PHOTOS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Fetch property photos from our cached API (prioritizes local cache)
export async function fetchPropertyPhotos(propertyId: number): Promise<CachedPhoto[]> {
  try {
    // Check in-memory cache first
    const cached = photosCache.get(propertyId);
    if (cached && Date.now() - cached.timestamp < PHOTOS_CACHE_DURATION) {
      return cached.data;
    }

    // First try our local cached API (browser will use cache based on server headers)
    const response = await fetch(`/api/photos/${propertyId}`, {
      cache: 'default', // Let browser handle caching based on server Cache-Control headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch property photos from cache');
    }
    
    const cachedPhotos = await response.json();
    
    // If we have cached photos, return them and update in-memory cache
    if (cachedPhotos && cachedPhotos.length > 0) {
      photosCache.set(propertyId, { data: cachedPhotos, timestamp: Date.now() });
      return cachedPhotos;
    }
    
    // Fallback to external API if cache is empty
    console.log(`Cache empty for property ${propertyId}, fetching from external API...`);
    const external = await apiService.photo.getPropertyPhotos(propertyId);
    if (external && external.length > 0) {
      photosCache.set(propertyId, { data: external, timestamp: Date.now() });
      return external;
    }
    return [];
  } catch (error) {
    console.error('Error fetching property photos from cache, trying external API:', error);
    try {
      // Fallback to external API
      const external = await apiService.photo.getPropertyPhotos(propertyId);
      if (external && external.length > 0) {
        photosCache.set(propertyId, { data: external, timestamp: Date.now() });
        return external;
      }
      return [];
    } catch (externalError) {
      console.error('Error fetching property photos from external API:', externalError);
      return [];
    }
  }
}

// Get optimized image URL (using cached images for better performance)
export function getOptimizedImageUrl(photo: CachedPhoto): string {
  // Use cached images if available, otherwise use the photo link directly
  if (photo.cachedPath) {
    return photo.cachedPath;
  }
  // Return the photo link directly since we now allow S3 URLs in Next.js config
  return photo.photoLink;
}

// Simplified external API access for essential functions only
export const externalAPI = {
  // Direct access to external API for essential functions
  properties: apiService.property,
  photos: apiService.photo,
  
  // Utility functions
  clearCache: apiService.utils.clearCache,
  getCacheStats: apiService.utils.getCacheStats,
}; 