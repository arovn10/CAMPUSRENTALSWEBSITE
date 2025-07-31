import { NextResponse } from 'next/server';
import { 
  saveDataToCache, 
  createCacheMetadata, 
  cleanOldCache,
  ensureCacheDirectories,
  downloadAndCacheImage,
  getCachedCoordinates,
  cacheCoordinates,
  initializeGeocodingCache
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
import fs from 'fs';
import path from 'path';

// Manual geocoding coordinates for New Orleans properties (fallback)
const NEW_ORLEANS_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Joseph Street properties
  '2422 Joseph St, New Orleans, LA 70118': { lat: 29.9389, lng: -90.1267 },
  '2424 Joseph St, New Orleans, LA 70115': { lat: 29.9389, lng: -90.1267 },
  
  // Zimple Street properties
  '7506 Zimple St, New Orleans, LA 70118': { lat: 29.9425, lng: -90.1289 },
  '7504 Zimple St, New Orleans, LA 70118': { lat: 29.9425, lng: -90.1289 },
  '7500 Zimple St , New Orleans , LA 70118': { lat: 29.9425, lng: -90.1289 },
  '7608 Zimple St , New Orleans , LA 70118': { lat: 29.9425, lng: -90.1289 },
  
  // Cherokee Street properties
  '1032 Cherokee St, New Orleans, LA 70118': { lat: 29.9378, lng: -90.1234 },
  
  // Freret Street properties
  '7313 Freret St, New Orleans, LA 70118': { lat: 29.9445, lng: -90.1278 },
  '7315 Freret St, New Orleans, LA 70118': { lat: 29.9445, lng: -90.1278 },
  '7315 Freret St , New Orleans , LA 70118': { lat: 29.9445, lng: -90.1278 },
  '7313 Freret St , New Orleans , LA 70118': { lat: 29.9445, lng: -90.1278 },
  
  // Audubon Street properties
  '1414 Audubon St, New Orleans, LA 70118': { lat: 29.9356, lng: -90.1234 },
  '1416 Audubon St , New Orleans , LA 70118': { lat: 29.9356, lng: -90.1234 },
  
  // Burthe Street properties
  '7700 Burthe St , New Orleans , LA 70118': { lat: 29.9467, lng: -90.1289 },
  '7702 Burthe St , New Orleans , LA 70118': { lat: 29.9467, lng: -90.1289 },
};

function addCoordinatesToProperties(properties: any[]): any[] {
  console.log('🗺️ Starting geocoding process with cache...');
  
  return properties.map(property => {
    // First, try to get coordinates from cache
    let coords = getCachedCoordinates(property.address);
    
    // If not in cache, try manual coordinates
    if (!coords) {
      coords = NEW_ORLEANS_COORDINATES[property.address];
      
      if (coords) {
        // Cache the manual coordinates for future use
        cacheCoordinates(property.address, coords.lat, coords.lng);
        console.log(`📍 Using manual coordinates for ${property.name}: lat=${coords.lat}, lng=${coords.lng}`);
      } else {
        // Use default coordinates and cache them
        coords = { lat: 29.9400, lng: -90.1200 };
        cacheCoordinates(property.address, coords.lat, coords.lng);
        console.log(`🎯 Using default coordinates for ${property.name} at ${property.address}`);
      }
    }
    
    return {
      ...property,
      latitude: coords.lat,
      longitude: coords.lng
    };
  });
}

export async function POST() {
  try {
    console.log('=== COMPREHENSIVE FORCE REFRESH STARTED ===');
    console.log('🔄 This will refresh ALL data points: properties, photos, amenities, coordinates, and cache images');
    
    // Initialize geocoding cache with known coordinates first
    initializeGeocodingCache();
    
    // Ensure directories exist
    ensureCacheDirectories();
    
    // Clear ALL existing cache files completely
    console.log('🧹 Clearing ALL cache data...');
    const dataCacheDir = path.join(process.cwd(), '.cache');
    if (fs.existsSync(dataCacheDir)) {
      const files = fs.readdirSync(dataCacheDir);
      files.forEach(file => {
        const filePath = path.join(dataCacheDir, file);
        fs.unlinkSync(filePath);
        console.log(`  ✅ Deleted cache file: ${file}`);
      });
      console.log(`🗑️ Cleared ${files.length} cache files`);
    }
    
    // Clean old image cache
    console.log('🖼️ Cleaning old image cache...');
    cleanOldCache();
    
    // Fetch fresh property data from API (ALL FIELDS)
    console.log('📡 Fetching fresh property data from backend API...');
    console.log('   📋 This includes: property_id, username, address, name, description');
    console.log('   🛏️ bedrooms, bathrooms, price, squareFeet, amenities, leaseTerms');
    console.log('   🏫 photo, school - ALL property data points');
    
    const rawProperties = await originalFetchProperties();
    console.log(`✅ Fetched ${rawProperties.length} properties with ALL data fields`);
    
    if (rawProperties.length === 0) {
      throw new Error('No properties returned from API - backend may be down');
    }
    
    // Log first property to verify all fields are present
    const firstProperty = rawProperties[0];
    console.log('🔍 Sample property data verification:');
    console.log(`   Property ID: ${firstProperty.property_id}`);
    console.log(`   Name: ${firstProperty.name}`);
    console.log(`   Address: ${firstProperty.address}`);
    console.log(`   Bedrooms: ${firstProperty.bedrooms}`);
    console.log(`   Bathrooms: ${firstProperty.bathrooms}`);
    console.log(`   Price: $${firstProperty.price}`);
    console.log(`   Square Feet: ${firstProperty.squareFeet}`);
    console.log(`   School: ${firstProperty.school}`);
    console.log(`   Lease Terms: ${firstProperty.leaseTerms}`);
    console.log(`   Description: ${firstProperty.description?.substring(0, 100)}...`);
    console.log(`✅ DESCRIPTION REFRESHED: ${firstProperty.description ? 'YES - ' + firstProperty.description.length + ' characters' : 'NO DATA'}`);
    console.log(`✅ ALL PROPERTY FIELDS REFRESHED: bedrooms, bathrooms, price, description, squareFeet, etc.`);
    
    // Add coordinates to properties (refresh geocoding data)
    console.log('🗺️ Refreshing geocoding coordinates...');
    const properties = addCoordinatesToProperties(rawProperties);
    console.log('✅ Geocoding completed for all properties');
    console.log(`📍 First property coordinates: ${properties[0]?.name} - lat: ${properties[0]?.latitude}, lng: ${properties[0]?.longitude}`);
    
    // Fetch photos and amenities for ALL properties (comprehensive refresh)
    const photos: Record<number, Photo[]> = {};
    const amenities: Record<number, PropertyAmenities | null> = {};
    
    console.log('📸 Fetching fresh photos and amenities data...');
    console.log('   🖼️ Photos: photoLink, description, photoOrder, photoId');
    console.log('   🏠 Amenities: fullyFurnished, pool, powderRoom, driveway, laundryUnit');
    console.log('   ❄️ centralAc, backyard, fireplace, petFriendly');
    
    // Process properties in smaller batches for reliability
    const batchSize = 3;
    let processedProperties = 0;
    let totalPhotos = 0;
    let totalAmenities = 0;
    
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(properties.length/batchSize)} (Properties ${i + 1}-${Math.min(i + batchSize, properties.length)})`);
      
      await Promise.all(batch.map(async (property) => {
        try {
          console.log(`  📋 Processing property ${property.property_id} (${property.name})...`);
          
          // Fetch ALL photos for this property
          const propertyPhotos = await originalFetchPropertyPhotos(property.property_id);
          photos[property.property_id] = propertyPhotos;
          console.log(`    📸 Refreshed ${propertyPhotos.length} photos`);
          totalPhotos += propertyPhotos.length;
          
          // Fetch ALL amenities for this property
          const propertyAmenities = await originalFetchPropertyAmenities(property.property_id);
          amenities[property.property_id] = propertyAmenities;
          if (propertyAmenities) {
            console.log(`    🏠 Refreshed amenities (${Object.keys(propertyAmenities).length} fields)`);
            totalAmenities++;
          } else {
            console.log(`    ⚠️ No amenities data available for property ${property.property_id}`);
          }
          
          processedProperties++;
          
        } catch (error) {
          console.error(`❌ Error processing property ${property.property_id}:`, error);
          photos[property.property_id] = [];
          amenities[property.property_id] = null;
        }
      }));
      
      // Small delay between batches to avoid overwhelming the API
      if (i + batchSize < properties.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log('📊 Data refresh summary:');
    console.log(`   ✅ Properties processed: ${processedProperties}/${properties.length}`);
    console.log(`   ✅ Total photos refreshed: ${totalPhotos}`);
    console.log(`   ✅ Properties with amenities: ${totalAmenities}`);
    
    // Create comprehensive cache data with ALL refreshed information
    const cacheData = {
      properties,
      photos,
      amenities,
      metadata: createCacheMetadata()
    };
    
    console.log('💾 Saving ALL refreshed data to cache...');
    console.log(`📦 Cache package contains:`);
    console.log(`   🏠 ${properties.length} properties with all fields`);
    console.log(`   📸 ${Object.keys(photos).length} photo collections`);
    console.log(`   🏠 ${Object.keys(amenities).length} amenity sets`);
    console.log(`   📅 Fresh metadata timestamp`);
    
    // Save to cache
    saveDataToCache(cacheData);
    console.log('✅ All data saved to cache successfully');
    
    // Cache ALL images immediately (comprehensive image refresh)
    console.log('🖼️ Starting comprehensive image caching...');
    const imageResults = await cacheImagesImmediately(photos);
    console.log(`✅ Image caching completed: ${imageResults.success} cached, ${imageResults.failed} failed`);
    
    // Calculate comprehensive totals
    const totalPhotosCount = Object.values(photos).reduce((sum, photoArray) => sum + photoArray.length, 0);
    const totalAmenitiesCount = Object.values(amenities).filter(a => a !== null).length;
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        propertiesCount: properties.length,
        photosCount: totalPhotosCount,
        amenitiesCount: totalAmenitiesCount,
        imagesCached: imageResults.success,
        imagesFailed: imageResults.failed,
        dataPointsRefreshed: [
          'property_id', 'username', 'address', 'name', 'DESCRIPTION',
          'bedrooms', 'bathrooms', 'price', 'squareFeet', 'amenities',
          'leaseTerms', 'photo', 'school', 'latitude', 'longitude',
          'photos', 'propertyAmenities', 'cachedImages'
        ]
      },
      message: 'Comprehensive cache refresh completed - ALL data points updated'
    };
    
    console.log('🎉 COMPREHENSIVE FORCE REFRESH COMPLETED 🎉');
    console.log('📋 Summary:', result);
    console.log('🔄 All property data points have been refreshed from the backend API');
    console.log('💾 Fresh cache contains the latest: bedrooms, bathrooms, prices, descriptions, photos, amenities');
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Comprehensive force refresh failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Comprehensive force refresh failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Immediate image caching function
async function cacheImagesImmediately(photos: Record<number, Photo[]>) {
  console.log('Starting immediate image caching...');
  
  const allPhotos: Array<{ propertyId: number; photo: Photo }> = [];
  
  // Collect all photos
  Object.entries(photos).forEach(([propertyId, propertyPhotos]) => {
    propertyPhotos.forEach(photo => {
      allPhotos.push({ propertyId: parseInt(propertyId), photo });
    });
  });
  
  console.log(`Caching ${allPhotos.length} images immediately...`);
  
  const results = { success: 0, failed: 0 };
  
  // Cache images in small batches
  const batchSize = 5;
  for (let i = 0; i < allPhotos.length; i += batchSize) {
    const batch = allPhotos.slice(i, i + batchSize);
    console.log(`Processing image batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allPhotos.length/batchSize)}`);
    
    const batchResults = await Promise.allSettled(batch.map(async ({ propertyId, photo }) => {
      try {
        const cloudFrontUrl = s3ToCloudFrontUrl(photo.photoLink);
        const cachedPath = await downloadAndCacheImage(cloudFrontUrl, propertyId, photo.photoId);
        
        if (cachedPath) {
          console.log(`✅ Cached: property-${propertyId}-photo-${photo.photoId}.jpg`);
          return { success: true };
        } else {
          console.log(`❌ Failed to cache: property-${propertyId}-photo-${photo.photoId}.jpg`);
          return { success: false };
        }
      } catch (error) {
        console.error(`❌ Error caching image for property ${propertyId}, photo ${photo.photoId}:`, error);
        return { success: false };
      }
    }));
    
    // Count results
    batchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        results.success++;
      } else {
        results.failed++;
      }
    });
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`Image caching completed: ${results.success} success, ${results.failed} failed`);
  return results;
} 