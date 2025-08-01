// Photo mapping based on the provided property data
export const PROPERTY_PHOTOS: { [key: number]: string } = {
  1: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/350A9684-5FDB-404A-8321-CC371FA823A3.jpg',
  2: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/C8D725A7-58EE-4E7A-B73A-2B4D92EA566A.jpg',
  6: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/FAE13088-D469-4A2D-BE0D-54235CC897A5.jpg',
  10: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/DFDFAA57-6C09-4631-91EE-6749113B6A67.jpg',
};

/**
 * Get photo URL for a property by its ID
 * @param propertyId - The property ID
 * @returns Photo URL or placeholder image URL
 */
export function getPropertyPhoto(propertyId: number): string {
  return PROPERTY_PHOTOS[propertyId] || '/placeholder.png';
}

/**
 * Get photos for multiple properties
 * @param propertyIds - Array of property IDs
 * @returns Object mapping property IDs to photo URLs
 */
export function getPropertyPhotos(propertyIds: number[]): { [key: number]: string } {
  const photos: { [key: number]: string } = {};
  
  for (const id of propertyIds) {
    photos[id] = getPropertyPhoto(id);
  }
  
  return photos;
}

/**
 * Check if a property has a photo
 * @param propertyId - The property ID
 * @returns True if property has a photo, false otherwise
 */
export function hasPropertyPhoto(propertyId: number): boolean {
  return !!PROPERTY_PHOTOS[propertyId];
}

/**
 * Get all property IDs that have photos
 * @returns Array of property IDs with photos
 */
export function getPropertiesWithPhotos(): number[] {
  return Object.keys(PROPERTY_PHOTOS).map(id => parseInt(id));
} 