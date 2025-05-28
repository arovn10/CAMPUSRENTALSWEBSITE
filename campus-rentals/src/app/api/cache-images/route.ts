import { NextResponse } from 'next/server';
import { 
  loadDataFromCache, 
  downloadAndCacheImage, 
  getCachedImagePath 
} from '@/utils/serverCache';
import { s3ToCloudFrontUrl } from '@/utils/api';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    console.log('=== MANUAL IMAGE CACHING STARTED ===');
    
    // Load cached data
    const cachedData = loadDataFromCache();
    if (!cachedData || !cachedData.photos) {
      return NextResponse.json({
        success: false,
        error: 'No cached photo data found'
      }, { status: 400 });
    }
    
    const photos = cachedData.photos;
    console.log(`Found ${Object.keys(photos).length} property photo sets`);
    
    // Collect all photos
    const allPhotos: Array<{ propertyId: number; photo: any; index: number }> = [];
    Object.entries(photos).forEach(([propertyId, propertyPhotos]) => {
      propertyPhotos.forEach((photo, index) => {
        allPhotos.push({ propertyId: parseInt(propertyId), photo, index });
      });
    });
    
    console.log(`Total photos to cache: ${allPhotos.length}`);
    
    const results = {
      total: allPhotos.length,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    // Check cached images directory
    const cachedImagesDir = path.join(process.cwd(), 'public', 'cached-images');
    if (!fs.existsSync(cachedImagesDir)) {
      fs.mkdirSync(cachedImagesDir, { recursive: true });
      console.log('Created cached-images directory');
    }
    
    // Cache images in small batches
    const batchSize = 5;
    for (let i = 0; i < allPhotos.length; i += batchSize) {
      const batch = allPhotos.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allPhotos.length/batchSize)}`);
      
      await Promise.all(batch.map(async ({ propertyId, photo, index }) => {
        try {
          const cloudFrontUrl = s3ToCloudFrontUrl(photo.photoLink);
          console.log(`Caching image ${index + 1} for property ${propertyId}: ${photo.photoId}`);
          
          await downloadAndCacheImage(cloudFrontUrl, propertyId, photo.photoId);
          
          // Verify the image was cached
          const cachedPath = getCachedImagePath(propertyId, photo.photoId);
          if (cachedPath && fs.existsSync(cachedPath)) {
            console.log(`✅ Successfully cached: property-${propertyId}-photo-${photo.photoId}.jpg`);
            results.success++;
          } else {
            console.log(`❌ Failed to cache: property-${propertyId}-photo-${photo.photoId}.jpg`);
            results.failed++;
            results.errors.push(`Failed to cache property-${propertyId}-photo-${photo.photoId}.jpg`);
          }
        } catch (error) {
          console.error(`Error caching image for property ${propertyId}, photo ${photo.photoId}:`, error);
          results.failed++;
          results.errors.push(`Property ${propertyId}, Photo ${photo.photoId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }));
      
      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('=== IMAGE CACHING COMPLETED ===');
    console.log(`Results: ${results.success} success, ${results.failed} failed`);
    
    return NextResponse.json({
      success: true,
      results,
      message: `Image caching completed: ${results.success}/${results.total} images cached successfully`
    });
    
  } catch (error) {
    console.error('Manual image caching failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Manual image caching failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 