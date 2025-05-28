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
        
        // Add cached paths to photos
        const photosWithCache: CachedPhoto[] = photos.map(photo => ({
          ...photo,
          cachedPath: getCachedImagePath(propertyId, photo.photoId) || undefined
        }));
        
        return NextResponse.json(photosWithCache);
      }
    }

    // Fallback to original API
    const photos = await originalFetchPropertyPhotos(propertyId);
    const photosWithCache: CachedPhoto[] = photos.map(photo => ({
      ...photo,
      cachedPath: getCachedImagePath(propertyId, photo.photoId) || undefined
    }));
    
    return NextResponse.json(photosWithCache);
  } catch (error) {
    console.error('Error in photos API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
} 