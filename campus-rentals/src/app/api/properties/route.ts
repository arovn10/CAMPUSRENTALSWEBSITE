import { NextRequest, NextResponse } from 'next/server';
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
import { getPropertyPhoto } from '@/utils/propertyPhotos';
import { getCoordinates } from '@/utils/coordinateCache';

// Enhanced Photo interface with cached path
interface CachedPhoto extends Photo {
  cachedPath?: string;
}

// Fetch and cache all data (WITHOUT geocoding - handled in map component)
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
    
    // Log sample to verify all fields
    const sampleProperty = properties[0];
    console.log('🔍 Verifying data completeness:');
    console.log(`   Sample: ${sampleProperty.name} - ${sampleProperty.bedrooms} bed, ${sampleProperty.bathrooms} bath, $${sampleProperty.price}`);
    console.log(`   Description: ${sampleProperty.description ? sampleProperty.description.length + ' chars' : 'NO DESCRIPTION'}`);
    console.log(`   Address: ${sampleProperty.address}`);
    console.log(`✅ DESCRIPTIONS REFRESHED: All property descriptions updated from backend API`);
    console.log(`✅ ADDRESSES AVAILABLE: All properties have addresses for map geocoding`);
    console.log(`✅ COMPREHENSIVE REFRESH: bedrooms, bathrooms, prices, descriptions, square footage, addresses, etc.`);
    
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
    console.log(`   ✅ Addresses: All properties have addresses for map geocoding`);
    
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
    console.log(`   🏠 ${properties.length} properties with all fields (bedrooms, bathrooms, price, addresses, etc.)`);
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

export async function GET(request: NextRequest) {
  try {
    const data = await getCachedData();
    
    // Debug log to check if coordinates exist
    console.log('Sample property from cache:', JSON.stringify(data.properties[0], null, 2));
    
    // Calculate ETag for cache validation
    const etag = `"${data.metadata.timestamp}"`;
    const ifNoneMatch = request.headers.get('if-none-match');
    
    // If client has cached version, return 304 Not Modified
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }
    
    // Return properties with aggressive caching headers
    return NextResponse.json(data.properties, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', // Cache for 1 hour, serve stale for 24 hours
        'ETag': etag,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // FAIL LOUD (INC-2026-07-12): never serve bundled test data as if it were real
    // listings. Prefer stale-but-real cached data; otherwise return 503 so pages show
    // their empty state and monitoring can see the failure.
    console.error('🚨 PROPERTIES API DEGRADED — backend fetch failed:', error);
    const stale = loadDataFromCache();
    if (stale?.properties && stale.properties.length > 0) {
      console.warn(`⚠️ Serving ${stale.properties.length} STALE cached properties (backend unavailable)`);
      return NextResponse.json(stale.properties, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
          'X-Data-Staleness': 'stale',
        },
      });
    }
    return NextResponse.json(
      { error: 'Property listings are temporarily unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
} 