import { NextResponse } from 'next/server';
import { 
  saveDataToCache, 
  createCacheMetadata, 
  cleanOldCache,
  ensureCacheDirectories,
  downloadAndCacheImage
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

// Manual geocoding coordinates for New Orleans properties
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
  return properties.map(property => {
    const coords = NEW_ORLEANS_COORDINATES[property.address];
    if (coords) {
      console.log(`Adding coordinates to ${property.name}: lat=${coords.lat}, lng=${coords.lng}`);
      return {
        ...property,
        latitude: coords.lat,
        longitude: coords.lng
      };
    } else {
      console.log(`No coordinates found for ${property.name} at ${property.address}`);
      // Return default Tulane area coordinates
      return {
        ...property,
        latitude: 29.9400,
        longitude: -90.1200
      };
    }
  });
}

export async function POST() {
  try {
    console.log('=== FORCE REFRESH STARTED ===');
    
    // Ensure directories exist
    ensureCacheDirectories();
    
    // Clear existing cache files
    const dataCacheDir = path.join(process.cwd(), '.cache');
    if (fs.existsSync(dataCacheDir)) {
      const files = fs.readdirSync(dataCacheDir);
      files.forEach(file => {
        const filePath = path.join(dataCacheDir, file);
        fs.unlinkSync(filePath);
        console.log(`Deleted cache file: ${file}`);
      });
    }
    
    // Clean old image cache
    cleanOldCache();
    
    // Fetch fresh data from API
    console.log('Fetching fresh data from API...');
    const rawProperties = await originalFetchProperties();
    console.log(`Fetched ${rawProperties.length} properties`);
    
    if (rawProperties.length === 0) {
      throw new Error('No properties returned from API');
    }
    
    // Add coordinates to properties
    console.log('Adding coordinates to properties...');
    const properties = addCoordinatesToProperties(rawProperties);
    console.log('Geocoding completed');
    console.log('First property after geocoding:', properties[0]?.name, 'lat:', properties[0]?.latitude, 'lng:', properties[0]?.longitude);
    
    // Fetch photos and amenities for all properties
    const photos: Record<number, Photo[]> = {};
    const amenities: Record<number, PropertyAmenities | null> = {};
    
    console.log('Fetching photos and amenities...');
    
    // Process properties in smaller batches
    const batchSize = 3;
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(properties.length/batchSize)}`);
      
      await Promise.all(batch.map(async (property) => {
        try {
          console.log(`Processing property ${property.property_id}...`);
          
          // Fetch photos
          const propertyPhotos = await originalFetchPropertyPhotos(property.property_id);
          photos[property.property_id] = propertyPhotos;
          console.log(`  - Photos: ${propertyPhotos.length}`);
          
          // Fetch amenities
          const propertyAmenities = await originalFetchPropertyAmenities(property.property_id);
          amenities[property.property_id] = propertyAmenities;
          console.log(`  - Amenities: ${propertyAmenities ? 'found' : 'none'}`);
          
        } catch (error) {
          console.error(`Error processing property ${property.property_id}:`, error);
          photos[property.property_id] = [];
          amenities[property.property_id] = null;
        }
      }));
      
      // Small delay between batches
      if (i + batchSize < properties.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Create cache data
    const cacheData = {
      properties,
      photos,
      amenities,
      metadata: createCacheMetadata()
    };
    
    console.log('Saving to cache...');
    console.log(`Final data: ${properties.length} properties, ${Object.keys(photos).length} photo sets`);
    
    // Save to cache
    saveDataToCache(cacheData);
    
    // Cache images immediately (not in background)
    console.log('Starting immediate image caching...');
    const imageResults = await cacheImagesImmediately(photos);
    
    // Calculate total photos
    const totalPhotos = Object.values(photos).reduce((sum, photoArray) => sum + photoArray.length, 0);
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        propertiesCount: properties.length,
        photosCount: totalPhotos,
        amenitiesCount: Object.keys(amenities).length,
        imagesCached: imageResults.success,
        imagesFailed: imageResults.failed
      },
      message: 'Cache refreshed successfully'
    };
    
    console.log('Force refresh completed:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Force refresh failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Force refresh failed',
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
    
    await Promise.all(batch.map(async ({ propertyId, photo }) => {
      try {
        const cloudFrontUrl = s3ToCloudFrontUrl(photo.photoLink);
        await downloadAndCacheImage(cloudFrontUrl, propertyId, photo.photoId);
        results.success++;
        console.log(`✅ Cached: property-${propertyId}-photo-${photo.photoId}.jpg`);
      } catch (error) {
        console.error(`❌ Failed to cache image for property ${propertyId}, photo ${photo.photoId}:`, error);
        results.failed++;
      }
    }));
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`Image caching completed: ${results.success} success, ${results.failed} failed`);
  return results;
} 