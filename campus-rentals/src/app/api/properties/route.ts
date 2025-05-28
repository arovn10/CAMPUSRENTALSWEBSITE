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

// Fetch and cache all data
async function fetchAndCacheAllData() {
  console.log('Fetching fresh data from API...');
  
  try {
    // Clean old cache files first
    cleanOldCache();
    
    // Fetch all properties
    const rawProperties = await originalFetchProperties();
    console.log(`Fetched ${rawProperties.length} properties`);
    
    // Geocode properties to add coordinates
    console.log('Starting geocoding process...');
    console.log('First property before geocoding:', rawProperties[0]?.name, rawProperties[0]?.address);
    
    const properties = addCoordinatesToProperties(rawProperties);
    console.log('Geocoding completed');
    console.log('First property after geocoding:', properties[0]?.name, 'lat:', properties[0]?.latitude, 'lng:', properties[0]?.longitude);
    
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
    
    console.log('Saving geocoded properties to cache...');
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