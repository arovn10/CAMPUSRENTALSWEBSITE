import { NextResponse } from 'next/server';
import { 
  isCacheValid, 
  loadDataFromCache, 
  saveDataToCache, 
  downloadAndCacheImage, 
  getCachedImagePath, 
  createCacheMetadata, 
  cleanOldCache 
} from '@/utils/serverCache';
import { 
  fetchProperties as originalFetchProperties,
  fetchPropertyPhotos as originalFetchPropertyPhotos,
  fetchPropertyAmenities as originalFetchPropertyAmenities,
  s3ToCloudFrontUrl,
  Property,
  Photo,
  PropertyAmenities
} from '@/utils/api';

// Enhanced Photo interface with cached path
interface CachedPhoto extends Photo {
  cachedPath?: string;
}

// Fetch and cache all data (WITHOUT geocoding - that should only happen in force-refresh)
async function fetchAndCacheAllData() {
  console.log('Fetching fresh data from API...');
  
  try {
    // Clean old cache files first
    cleanOldCache();
    
    // Fetch all properties (no geocoding here)
    const properties = await originalFetchProperties();
    console.log(`Fetched ${properties.length} properties`);
    
    // Fetch photos and amenities for all properties
    const photos: Record<number, Photo[]> = {};
    const amenities: Record<number, PropertyAmenities | null> = {};
    
    // Process properties in batches to avoid overwhelming the server
    const batchSize = 5;
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (property) => {
        try {
          // Fetch photos
          const propertyPhotos = await originalFetchPropertyPhotos(property.property_id);
          photos[property.property_id] = propertyPhotos;
          
          // Fetch amenities
          const propertyAmenities = await originalFetchPropertyAmenities(property.property_id);
          amenities[property.property_id] = propertyAmenities;
          
          console.log(`Processed property ${property.property_id}: ${propertyPhotos.length} photos`);
        } catch (error) {
          console.error(`Error processing property ${property.property_id}:`, error);
          photos[property.property_id] = [];
          amenities[property.property_id] = null;
        }
      }));
      
      // Small delay between batches
      if (i + batchSize < properties.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Cache the data
    const cacheData = {
      properties,
      photos,
      amenities,
      metadata: createCacheMetadata()
    };
    
    console.log('Saving properties to cache...');
    saveDataToCache(cacheData);
    
    // Start background image caching (don't wait for it)
    cacheImagesInBackground(photos);
    
    return cacheData;
  } catch (error) {
    console.error('Error fetching and caching data:', error);
    throw error;
  }
}

// Background image caching
async function cacheImagesInBackground(photos: Record<number, Photo[]>) {
  console.log('Starting background image caching...');
  
  const allPhotos: Array<{ propertyId: number; photo: Photo }> = [];
  
  // Collect all photos
  Object.entries(photos).forEach(([propertyId, propertyPhotos]) => {
    propertyPhotos.forEach(photo => {
      allPhotos.push({ propertyId: parseInt(propertyId), photo });
    });
  });
  
  console.log(`Caching ${allPhotos.length} images in background...`);
  
  // Cache images in small batches to avoid overwhelming the system
  const batchSize = 3;
  for (let i = 0; i < allPhotos.length; i += batchSize) {
    const batch = allPhotos.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async ({ propertyId, photo }) => {
      try {
        const cloudFrontUrl = s3ToCloudFrontUrl(photo.photoLink);
        await downloadAndCacheImage(cloudFrontUrl, propertyId, photo.photoId);
      } catch (error) {
        console.error(`Error caching image for property ${propertyId}, photo ${photo.photoId}:`, error);
      }
    }));
    
    // Delay between batches
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('Background image caching completed');
}

// Get cached or fresh data
async function getCachedData() {
  if (isCacheValid()) {
    console.log('Using cached data');
    const cachedData = loadDataFromCache();
    if (cachedData) {
      return cachedData;
    }
  }
  
  console.log('Cache invalid or missing, fetching fresh data');
  return await fetchAndCacheAllData();
}

export async function GET() {
  try {
    const data = await getCachedData();
    return NextResponse.json(data.properties);
  } catch (error) {
    console.error('Error in properties API:', error);
    // Fallback to original API
    try {
      const properties = await originalFetchProperties();
      return NextResponse.json(properties);
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError);
      return NextResponse.json(
        { error: 'Failed to fetch properties' },
        { status: 500 }
      );
    }
  }
} 