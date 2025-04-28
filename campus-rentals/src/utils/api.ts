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
    const response = await fetch('https://abode-backend.onrender.com/api/property/campusrentalsnola', {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch properties');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
}

export async function fetchPropertyPhotos(propertyId: number): Promise<Photo[]> {
  try {
    const response = await fetch(`https://abode-backend.onrender.com/api/photos/get/${propertyId}`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch property photos');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching property photos:', error);
    return [];
  }
}

export async function fetchPropertyAmenities(propertyId: number): Promise<PropertyAmenities | null> {
  try {
    const response = await fetch(`https://abode-backend.onrender.com/api/amenities/${propertyId}`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch property amenities');
    }
    return await response.json();
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