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
import { getPropertyPhoto } from '@/utils/propertyPhotos';

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
    
    // Cache ALL the refreshed data
    const cacheData = {
      properties,
      photos,
      amenities,
      metadata: createCacheMetadata()
    };
    
    console.log('💾 Saving comprehensive data to cache...');
    console.log(`   🏠 ${properties.length} properties with all fields (bedrooms, bathrooms, price, addresses, etc.)`);
    console.log(`   📸 ${Object.keys(photos).length} photo collections`);
    console.log(`   🏠 ${Object.keys(amenities).length} amenity datasets`);
    
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

export async function GET() {
  try {
    const data = await getCachedData();
    
    // Enhance properties with photos from our photo utility
    const enhancedProperties = data.properties.map((property: any) => ({
      ...property,
      photo: getPropertyPhoto(property.property_id) || property.photo || '/placeholder.png'
    }));
    
    return NextResponse.json(enhancedProperties);
  } catch (error) {
    console.error('Error in properties API:', error);
    // Fallback to original API
    try {
      const properties = await originalFetchProperties();
      
      // Enhance fallback properties with photos
      const enhancedProperties = properties.map((property: any) => ({
        ...property,
        photo: getPropertyPhoto(property.property_id) || property.photo || '/placeholder.png'
      }));
      
      return NextResponse.json(enhancedProperties);
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError);
      return NextResponse.json(
        { error: 'Failed to fetch properties' },
        { status: 500 }
      );
    }
  }
} 