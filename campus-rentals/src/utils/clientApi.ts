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

// Fetch properties from our cached API (prioritizes local cache)
export async function fetchProperties(): Promise<Property[]> {
  try {
    // First try our local cached API
    const response = await fetch('/api/properties');
    if (!response.ok) {
      throw new Error('Failed to fetch properties from cache');
    }
    const cachedProperties = await response.json();
    
    // If we have cached properties, return them
    if (cachedProperties && cachedProperties.length > 0) {
      return cachedProperties;
    }
    
    // Fallback to external API if cache is empty
    console.log('Cache empty, fetching from external API...');
    const external = await apiService.property.getProperties();
    if (external && external.length > 0) return external;

    // Final fallback to bundled test data (ensures map/cards still work)
    const testData = await import('@/app/api/properties/test-data.json');
    return testData.default as Property[];
  } catch (error) {
    console.error('Error fetching properties from cache, trying external API:', error);
    try {
      // Fallback to external API
      const external = await apiService.property.getProperties();
      if (external && external.length > 0) return external;
      const testData = await import('@/app/api/properties/test-data.json');
      return testData.default as Property[];
    } catch (externalError) {
      console.error('Error fetching properties from external API:', externalError);
      const testData = await import('@/app/api/properties/test-data.json');
      return testData.default as Property[];
    }
  }
}

// Fetch property photos from our cached API (prioritizes local cache)
export async function fetchPropertyPhotos(propertyId: number): Promise<CachedPhoto[]> {
  try {
    // First try our local cached API
    const response = await fetch(`/api/photos/${propertyId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch property photos from cache');
    }
    const cachedPhotos = await response.json();
    
    // If we have cached photos, return them
    if (cachedPhotos && cachedPhotos.length > 0) {
      return cachedPhotos;
    }
    
    // Fallback to external API if cache is empty
    console.log(`Cache empty for property ${propertyId}, fetching from external API...`);
    return await apiService.photo.getPropertyPhotos(propertyId);
  } catch (error) {
    console.error('Error fetching property photos from cache, trying external API:', error);
    try {
      // Fallback to external API
      return await apiService.photo.getPropertyPhotos(propertyId);
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