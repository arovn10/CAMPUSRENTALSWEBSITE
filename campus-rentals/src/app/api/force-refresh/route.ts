import { NextResponse } from 'next/server';
import { 
  saveDataToCache, 
  createCacheMetadata, 
  cleanOldCache,
  ensureCacheDirectories
} from '@/utils/serverCache';
import { 
  fetchProperties as originalFetchProperties,
  fetchPropertyPhotos as originalFetchPropertyPhotos,
  fetchPropertyAmenities as originalFetchPropertyAmenities,
  Property,
  Photo,
  PropertyAmenities
} from '@/utils/api';
import fs from 'fs';
import path from 'path';

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
    const properties = await originalFetchProperties();
    console.log(`Fetched ${properties.length} properties`);
    
    if (properties.length === 0) {
      throw new Error('No properties returned from API');
    }
    
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
    
    // Calculate total photos
    const totalPhotos = Object.values(photos).reduce((sum, photoArray) => sum + photoArray.length, 0);
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        propertiesCount: properties.length,
        photosCount: totalPhotos,
        amenitiesCount: Object.keys(amenities).length
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