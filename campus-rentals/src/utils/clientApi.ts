import { Property } from './api';
import { s3ToCloudFrontUrl } from './api';

// Enhanced Photo interface with cached path
export interface CachedPhoto {
  propertyKey: number;
  photoLink: string;
  description: string;
  photoOrder: number | null;
  photoId: number;
  cachedPath?: string;
}

// Fetch properties from our cached API
export async function fetchProperties(): Promise<Property[]> {
  try {
    const response = await fetch('/api/properties');
    if (!response.ok) {
      throw new Error('Failed to fetch properties');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
}

// Fetch property photos from our cached API
export async function fetchPropertyPhotos(propertyId: number): Promise<CachedPhoto[]> {
  try {
    const response = await fetch(`/api/photos/${propertyId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch property photos');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching property photos:', error);
    return [];
  }
}

// Get optimized image URL (temporarily using CloudFront for better performance)
export function getOptimizedImageUrl(photo: CachedPhoto): string {
  // Temporarily use CloudFront for better performance
  // TODO: Fix cached image serving performance
  return s3ToCloudFrontUrl(photo.photoLink);
  
  // Original cached logic (commented out for now):
  // if (photo.cachedPath) {
  //   return photo.cachedPath;
  // }
  // return s3ToCloudFrontUrl(photo.photoLink);
} 