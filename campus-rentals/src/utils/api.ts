/**
 * Property/photo/amenity API using the same Abode backend logic as abodingo-website.
 * All calls go through abodeClient (same paths, error handling, and response parsing).
 */
import { abodeApi } from '@/lib/abodeClient';

export interface Photo {
  propertyKey: number;
  photoLink: string;
  description: string;
  photoOrder: number | null;
  photoId: number;
}

export interface Property {
  property_id: number;
  username: string;
  address: string;
  name: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  price: number;
  squareFeet: number;
  amenities: string | null;
  leaseTerms: string;
  photo: string | null;
  school: string;
  photoUrl?: string | null;
  latitude: number;
  longitude: number;
}

export interface PropertyAmenities {
  fullyFurnished: boolean;
  pool: boolean;
  powderRoom: boolean;
  driveway: boolean;
  laundryUnit: boolean;
  centralAc: boolean;
  backyard: boolean;
  fireplace: boolean;
  petFriendly: boolean;
  propertyId: number;
}

export async function fetchProperties(): Promise<Property[]> {
  try {
    const data = await abodeApi.properties.getByUsername('campusrentalsnola');
    return Array.isArray(data) ? (data as Property[]) : [];
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
}

export async function fetchPropertyPhotos(propertyId: number): Promise<Photo[]> {
  try {
    const data = await abodeApi.photos.get(propertyId);
    return Array.isArray(data) ? (data as Photo[]) : [];
  } catch (error) {
    console.error('Error fetching property photos:', error);
    return [];
  }
}

export async function fetchPropertyAmenities(propertyId: number): Promise<PropertyAmenities | null> {
  try {
    const data = await abodeApi.amenities.getByPropertyId(propertyId);
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as PropertyAmenities) : null;
  } catch (error) {
    console.error('Error fetching property amenities:', error);
    return null;
  }
}

/**
 * Rewrites S3 URLs to use the CloudFront domain for faster CDN delivery.
 * @param url The S3 URL to rewrite
 * @returns The CloudFront URL
 */
export function s3ToCloudFrontUrl(url: string): string {
  if (!url) return url;
  return url.replace(
    /^https:\/\/abodebucket\.s3\.us-east-2\.amazonaws\.com/,
    'https://d1m1syk7iv23tg.cloudfront.net'
  );
} 