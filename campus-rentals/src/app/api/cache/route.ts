import { NextRequest, NextResponse } from 'next/server';
import { 
  isCacheValid, 
  loadDataFromCache,
  loadGeocodingCache
} from '@/utils/serverCache';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const isValid = isCacheValid();
    const cachedData = loadDataFromCache();
    const geocodingCache = loadGeocodingCache();
    
    // Count cached images
    const imagesCacheDir = path.join(process.cwd(), 'public', 'cached-images');
    let cachedImagesCount = 0;
    
    if (fs.existsSync(imagesCacheDir)) {
      const files = fs.readdirSync(imagesCacheDir);
      cachedImagesCount = files.filter(file => 
        file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.webp')
      ).length;
    }
    
    // Calculate total photos from cached data
    let totalPhotos = 0;
    if (cachedData?.photos) {
      totalPhotos = Object.values(cachedData.photos).reduce((sum, photoArray) => sum + photoArray.length, 0);
    }
    
    return NextResponse.json({
      cacheValid: isValid,
      lastUpdated: cachedData?.metadata?.lastUpdated || null,
      propertiesCount: cachedData?.properties?.length || 0,
      photosCount: totalPhotos,
      cachedImagesCount,
      geocodingCacheCount: Object.keys(geocodingCache).length,
      geocodingAddresses: Object.keys(geocodingCache),
      amenitiesCount: cachedData?.amenities ? Object.keys(cachedData.amenities).length : 0
    });
  } catch (error) {
    console.error('Error checking cache status:', error);
    return NextResponse.json({
      error: 'Failed to check cache status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'refresh') {
      // Trigger cache refresh by calling the properties API
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/properties`);
      if (response.ok) {
        return NextResponse.json({ message: 'Cache refreshed successfully' });
      } else {
        throw new Error('Failed to refresh cache');
      }
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error managing cache:', error);
    return NextResponse.json(
      { error: 'Failed to manage cache' },
      { status: 500 }
    );
  }
} 