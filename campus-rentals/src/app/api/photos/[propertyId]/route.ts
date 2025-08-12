import { NextRequest, NextResponse } from 'next/server';
import { 
  isCacheValid, 
  loadDataFromCache, 
  getCachedImagePath
} from '@/utils/serverCache';
import { 
  fetchPropertyPhotos as originalFetchPropertyPhotos,
  Photo
} from '@/utils/api';

// Local photo mapping for fallback
const LOCAL_PROPERTY_PHOTOS: { [key: number]: string[] } = {
  1: ['https://abodebucket.s3.us-east-2.amazonaws.com/uploads/350A9684-5FDB-404A-8321-CC371FA823A3.jpg'],
  2: ['https://abodebucket.s3.us-east-2.amazonaws.com/uploads/C8D725A7-58EE-4E7A-B73A-2B4D92EA566A.jpg'],
  3: ['https://abodebucket.s3.us-east-2.amazonaws.com/uploads/FAE13088-D469-4A2D-BE0D-54235CC897A5.jpg'],
  4: ['https://abodebucket.s3.us-east-2.amazonaws.com/uploads/DFDFAA57-6C09-4631-91EE-6749113B6A67.jpg'],
  5: ['https://abodebucket.s3.us-east-2.amazonaws.com/uploads/350A9684-5FDB-404A-8321-CC371FA823A3.jpg'],
  6: ['https://abodebucket.s3.us-east-2.amazonaws.com/uploads/FAE13088-D469-4A2D-BE0D-54235CC897A5.jpg'],
  7: ['https://abodebucket.s3.us-east-2.amazonaws.com/uploads/C8D725A7-58EE-4E7A-B73A-2B4D92EA566A.jpg'],
  8: ['https://abodebucket.s3.us-east-2.amazonaws.com/uploads/DFDFAA57-6C09-4631-91EE-6749113B6A67.jpg'],
  9: ['https://abodebucket.s3.us-east-2.amazonaws.com/uploads/350A9684-5FDB-404A-8321-CC371FA823A3.jpg'],
  10: ['https://abodebucket.s3.us-east-2.amazonaws.com/uploads/DFDFAA57-6C09-4631-91EE-6749113B6A67.jpg'],
  11: ['https://abodebucket.s3.us-east-2.amazonaws.com/uploads/FAE13088-D469-4A2D-BE0D-54235CC897A5.jpg'],
  12: ['https://abodebucket.s3.us-east-2.amazonaws.com/uploads/C8D725A7-58EE-4E7A-B73A-2B4D92EA566A.jpg'],
  13: ['https://abodebucket.s3.us-east-2.amazonaws.com/uploads/DFDFAA57-6C09-4631-91EE-6749113B6A67.jpg'],
};

// Function to get local photos for a property
function getLocalPropertyPhotos(propertyId: number): Photo[] {
  const photoUrls = LOCAL_PROPERTY_PHOTOS[propertyId];
  if (!photoUrls) return [];
  
  return photoUrls.map((url, index) => ({
    photoId: index + 1,
    photoLink: url,
    propertyKey: propertyId,
    description: `Property ${propertyId} photo ${index + 1}`,
    photoOrder: index + 1
  }));
}

// Enhanced Photo interface with cached path
interface CachedPhoto extends Photo {
  cachedPath?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const propertyId = parseInt(params.propertyId);
    
    if (isNaN(propertyId)) {
      return NextResponse.json(
        { error: 'Invalid property ID' },
        { status: 400 }
      );
    }

    // Try to get from cache first
    if (isCacheValid()) {
      const cachedData = loadDataFromCache();
      if (cachedData && cachedData.photos[propertyId]) {
        const photos = cachedData.photos[propertyId];
        
        // Don't add cached paths since the files don't exist
        // Return photos without cached paths
        const photosWithoutCache: CachedPhoto[] = photos.map(photo => ({
          ...photo,
          cachedPath: undefined // Don't use cached paths that don't exist
        }));
        
        return NextResponse.json(photosWithoutCache);
      }
    }

          // Fallback to original API
      try {
        const photos = await originalFetchPropertyPhotos(propertyId);
        console.log(`External API returned ${photos.length} photos for property ${propertyId}:`, photos);
        
        // Don't add cached paths since the files don't exist
        // Return photos with S3 URLs directly
        const photosWithoutCache: CachedPhoto[] = photos.map(photo => ({
          ...photo,
          cachedPath: undefined // Don't use cached paths that don't exist
        }));
        
        return NextResponse.json(photosWithoutCache);
    } catch (externalApiError) {
      console.log(`External API failed for property ${propertyId}, using local photo mapping...`);
      
      // Fallback to local photo mapping
      const localPhotos = getLocalPropertyPhotos(propertyId);
      console.log(`Using local photos for property ${propertyId}:`, localPhotos);
      if (localPhotos.length > 0) {
        // Convert to CachedPhoto format but without cached paths
        const localPhotosWithCache: CachedPhoto[] = localPhotos.map(photo => ({
          ...photo,
          cachedPath: undefined // Don't use cached paths that don't exist
        }));
        return NextResponse.json(localPhotosWithCache);
      }
      
      // If no local photos, return empty array
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error in photos API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
} 