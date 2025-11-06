import { NextRequest, NextResponse } from 'next/server';
import { 
  isCacheValid,
  loadDataFromCache,
  saveDataToCache,
  createCacheMetadata,
  cleanOldCache,
  clearMemoryCache
} from '@/utils/serverCache';
import { 
  fetchProperties as originalFetchProperties,
  fetchPropertyPhotos as originalFetchPropertyPhotos,
  fetchPropertyAmenities as originalFetchPropertyAmenities,
  Property,
  Photo,
  PropertyAmenities
} from '@/utils/api';
import { getCoordinates } from '@/utils/coordinateCache';
import { s3ToCloudFrontUrl } from '@/utils/api';
import { downloadAndCacheImage } from '@/utils/serverCache';

// Fetch and cache all data (same as in properties route)
async function fetchAndCacheAllData() {
  console.log('🔄 Comprehensive data refresh from API (regular cache refresh)...');
  console.log('📋 Refreshing ALL property data: bedrooms, bathrooms, price, descriptions, etc.');
  
  try {
    // Clean old cache files first
    cleanOldCache();
    
    // Fetch ALL properties with all fields
    console.log('📡 Fetching fresh property data from backend...');
    const properties = await originalFetchProperties();
    console.log(`✅ Fetched ${properties.length} properties with ALL data fields`);
    
    if (properties.length === 0) {
      console.warn('⚠️ No properties returned from API');
      throw new Error('No properties available from backend API');
    }

    // Load existing cache to get previously geocoded coordinates
    const existingCache = loadDataFromCache();
    const cachedCoordinates = existingCache?.coordinates || {};
    
    // Geocode properties that don't have coordinates
    console.log('🗺️ Geocoding property addresses...');
    let geocodedCount = 0;
    let skippedCount = 0;
    let cachedCount = 0;
    
    for (const property of properties) {
      // Check if property already has valid coordinates
      if (property.latitude && property.longitude && 
          !isNaN(property.latitude) && !isNaN(property.longitude) &&
          property.latitude >= -90 && property.latitude <= 90 &&
          property.longitude >= -180 && property.longitude <= 180) {
        skippedCount++;
        continue;
      }

      // First check cached coordinates
      if (property.address && cachedCoordinates[property.address]) {
        const cached = cachedCoordinates[property.address];
        property.latitude = cached.latitude;
        property.longitude = cached.longitude;
        cachedCount++;
        console.log(`   📍 Using cached coordinates for ${property.address}: ${cached.latitude}, ${cached.longitude}`);
        continue;
      }

      // Geocode the address if not in cache
      const coordinates = await getCoordinates(property.address);
      if (coordinates) {
        property.latitude = coordinates.latitude;
        property.longitude = coordinates.longitude;
        geocodedCount++;
        console.log(`   ✅ Geocoded: ${property.address} -> ${coordinates.latitude}, ${coordinates.longitude}`);
      } else {
        console.log(`   ❌ Failed to geocode: ${property.address}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`🗺️ Geocoding completed: ${geocodedCount} geocoded, ${cachedCount} from cache, ${skippedCount} already had coordinates`);
    
    // Fetch photos and amenities for ALL properties
    const photos: Record<number, Photo[]> = {};
    const amenities: Record<number, PropertyAmenities | null> = {};
    
    console.log('📸 Fetching photos and amenities for all properties...');
    
    // Process properties in batches to avoid overwhelming the server
    const batchSize = 5;
    let processedCount = 0;
    let totalPhotos = 0;
    let totalAmenities = 0;
    
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      console.log(`  📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(properties.length/batchSize)}`);
      
      await Promise.all(batch.map(async (property) => {
        try {
          // Fetch ALL photos
          const propertyPhotos = await originalFetchPropertyPhotos(property.property_id);
          photos[property.property_id] = propertyPhotos;
          totalPhotos += propertyPhotos.length;
          
          // Fetch ALL amenities
          const propertyAmenities = await originalFetchPropertyAmenities(property.property_id);
          amenities[property.property_id] = propertyAmenities;
          if (propertyAmenities) totalAmenities++;
          
          console.log(`    ✅ Property ${property.property_id}: ${propertyPhotos.length} photos, ${propertyAmenities ? 'amenities' : 'no amenities'}`);
          processedCount++;
        } catch (error) {
          console.error(`❌ Error processing property ${property.property_id}:`, error);
          photos[property.property_id] = [];
          amenities[property.property_id] = null;
        }
      }));
      
      // Small delay between batches
      if (i + batchSize < properties.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('📊 Comprehensive refresh summary:');
    console.log(`   ✅ Properties: ${processedCount}/${properties.length}`);
    console.log(`   ✅ Photos: ${totalPhotos} total`);
    console.log(`   ✅ Amenities: ${totalAmenities} properties with amenities`);
    
    // Build coordinates cache from properties
    const coordinates: Record<string, { latitude: number; longitude: number }> = {};
    properties.forEach(property => {
      if (property.address && property.latitude && property.longitude) {
        coordinates[property.address] = {
          latitude: property.latitude,
          longitude: property.longitude
        };
      }
    });
    
    // Cache ALL the refreshed data including coordinates
    const cacheData = {
      properties,
      photos,
      amenities,
      coordinates,
      metadata: createCacheMetadata()
    };
    
    console.log('💾 Saving comprehensive data to cache...');
    console.log(`   🏠 ${properties.length} properties with all fields`);
    console.log(`   📸 ${Object.keys(photos).length} photo collections`);
    console.log(`   🏠 ${Object.keys(amenities).length} amenity datasets`);
    console.log(`   🗺️ ${Object.keys(coordinates).length} geocoded addresses`);
    
    saveDataToCache(cacheData);
    console.log('✅ All data cached successfully');
    
    // Start background image caching (don't wait for it)
    cacheImagesInBackground(photos);
    
    return cacheData;
  } catch (error) {
    console.error('❌ Error in comprehensive data fetch and cache:', error);
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

// This endpoint is called by the scheduled job at midnight CST
export async function POST(request: NextRequest) {
  try {
    // Verify this is an authorized request (from cron job or admin)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'campus-rentals-cache-refresh';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Starting scheduled cache refresh at midnight CST...');
    
    // Clear memory cache to force fresh load
    clearMemoryCache();
    
    // Force refresh by fetching and caching all data
    const cacheData = await fetchAndCacheAllData();
    
    return NextResponse.json({
      success: true,
      message: 'Cache refreshed successfully',
      timestamp: new Date().toISOString(),
      propertiesCount: cacheData.properties.length,
      photosCount: Object.keys(cacheData.photos).length,
      coordinatesCount: Object.keys(cacheData.coordinates || {}).length,
    });
  } catch (error) {
    console.error('❌ Error in scheduled cache refresh:', error);
    return NextResponse.json(
      { 
        error: 'Cache refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Allow GET for manual refresh (with auth)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'campus-rentals-cache-refresh';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Manual cache refresh triggered...');
    
    // Clear memory cache to force fresh load
    clearMemoryCache();
    
    // Force refresh by fetching and caching all data
    const cacheData = await fetchAndCacheAllData();
    
    return NextResponse.json({
      success: true,
      message: 'Cache refreshed successfully',
      timestamp: new Date().toISOString(),
      propertiesCount: cacheData.properties.length,
      photosCount: Object.keys(cacheData.photos).length,
      coordinatesCount: Object.keys(cacheData.coordinates || {}).length,
    });
  } catch (error) {
    console.error('❌ Error in manual cache refresh:', error);
    return NextResponse.json(
      { 
        error: 'Cache refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

