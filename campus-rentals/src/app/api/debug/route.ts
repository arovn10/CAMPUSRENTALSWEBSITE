import { NextResponse } from 'next/server';
import { 
  isCacheValid, 
  loadDataFromCache 
} from '@/utils/serverCache';
import { 
  fetchProperties as originalFetchProperties,
  fetchPropertyPhotos as originalFetchPropertyPhotos
} from '@/utils/api';

export async function GET() {
  try {
    console.log('=== DEBUG ENDPOINT CALLED ===');
    
    // Test original API directly
    console.log('Testing original API...');
    const originalProperties = await originalFetchProperties();
    console.log(`Original API returned ${originalProperties.length} properties`);
    
    // Check cache status
    const cacheValid = isCacheValid();
    console.log(`Cache valid: ${cacheValid}`);
    
    // Load cached data
    const cachedData = loadDataFromCache();
    console.log(`Cached data exists: ${!!cachedData}`);
    
    if (cachedData) {
      console.log(`Cached properties: ${cachedData.properties.length}`);
      console.log(`Cached photos keys: ${Object.keys(cachedData.photos).length}`);
      console.log(`Cache metadata:`, cachedData.metadata);
    }
    
    // Test a specific property's photos
    let testPhotos = [];
    if (originalProperties.length > 0) {
      const testPropertyId = originalProperties[0].property_id;
      console.log(`Testing photos for property ${testPropertyId}...`);
      testPhotos = await originalFetchPropertyPhotos(testPropertyId);
      console.log(`Photos for property ${testPropertyId}: ${testPhotos.length}`);
    }
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      originalAPI: {
        working: true,
        propertiesCount: originalProperties.length,
        firstProperty: originalProperties[0] || null,
        testPhotosCount: testPhotos.length
      },
      cache: {
        valid: cacheValid,
        hasData: !!cachedData,
        propertiesCount: cachedData?.properties.length || 0,
        photosKeysCount: cachedData ? Object.keys(cachedData.photos).length : 0,
        metadata: cachedData?.metadata || null
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        cwd: process.cwd()
      }
    };
    
    console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 