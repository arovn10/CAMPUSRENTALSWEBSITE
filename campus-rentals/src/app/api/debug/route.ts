import { NextResponse } from 'next/server';
import { 
  isCacheValid, 
  loadDataFromCache 
} from '@/utils/serverCache';
import { 
  fetchProperties as originalFetchProperties,
  fetchPropertyPhotos as originalFetchPropertyPhotos,
  fetchPropertyAmenities as originalFetchPropertyAmenities
} from '@/utils/api';

export async function GET() {
  try {
    console.log('=== COMPREHENSIVE DEBUG ENDPOINT CALLED ===');
    
    // Test original API first
    console.log('🔍 Testing backend API connectivity...');
    let originalAPIData = null;
    let originalAPIError = null;
    
    try {
      const originalProperties = await originalFetchProperties();
      console.log(`✅ Backend API returned ${originalProperties.length} properties`);
      
      // Test a sample property's additional data
      if (originalProperties.length > 0) {
        const sampleProperty = originalProperties[0];
        console.log('🔍 Sample property data verification:');
        console.log(`   ID: ${sampleProperty.property_id}`);
        console.log(`   Name: ${sampleProperty.name}`);
        console.log(`   Bedrooms: ${sampleProperty.bedrooms}`);
        console.log(`   Bathrooms: ${sampleProperty.bathrooms}`);
        console.log(`   Price: $${sampleProperty.price}`);
        console.log(`   Square Feet: ${sampleProperty.squareFeet}`);
        console.log(`   School: ${sampleProperty.school}`);
        console.log(`   Address: ${sampleProperty.address}`);
        console.log(`   Description: ${sampleProperty.description?.substring(0, 50)}...`);
        console.log(`   Lease Terms: ${sampleProperty.leaseTerms}`);
        console.log(`✅ DESCRIPTION STATUS: ${sampleProperty.description ? sampleProperty.description.length + ' characters' : 'NO DESCRIPTION'}`);
        console.log(`📝 DESCRIPTION SAMPLE: "${sampleProperty.description?.substring(0, 100)}..."`);
        
        // Test photos for sample property
        try {
          const samplePhotos = await originalFetchPropertyPhotos(sampleProperty.property_id);
          console.log(`   Photos: ${samplePhotos.length} available`);
        } catch (photoError) {
          console.error(`   Photos error: ${photoError}`);
        }
        
        // Test amenities for sample property
        try {
          const sampleAmenities = await originalFetchPropertyAmenities(sampleProperty.property_id);
          console.log(`   Amenities: ${sampleAmenities ? Object.keys(sampleAmenities).length + ' fields' : 'none'}`);
        } catch (amenityError) {
          console.error(`   Amenities error: ${amenityError}`);
        }
        
        originalAPIData = {
          working: true,
          propertiesCount: originalProperties.length,
          firstProperty: {
            property_id: sampleProperty.property_id,
            name: sampleProperty.name,
            bedrooms: sampleProperty.bedrooms,
            bathrooms: sampleProperty.bathrooms,
            price: sampleProperty.price,
            squareFeet: sampleProperty.squareFeet,
            school: sampleProperty.school,
            address: sampleProperty.address,
            description: sampleProperty.description,
            leaseTerms: sampleProperty.leaseTerms,
            amenities: sampleProperty.amenities
          },
          allDataFields: [
            'property_id', 'username', 'address', 'name', 'description',
            'bedrooms', 'bathrooms', 'price', 'squareFeet', 'amenities',
            'leaseTerms', 'photo', 'school'
          ]
        };
      } else {
        originalAPIData = {
          working: true,
          propertiesCount: 0,
          firstProperty: null,
          message: 'No properties returned from backend'
        };
      }
    } catch (error) {
      console.error('❌ Backend API error:', error);
      originalAPIError = error instanceof Error ? error.message : 'Unknown error';
      originalAPIData = {
        working: false,
        error: originalAPIError
      };
    }
    
    // Check cached data
    console.log('💾 Checking cache status...');
    const cacheValid = isCacheValid();
    console.log(`Cache valid: ${cacheValid}`);
    
    let cacheData = null;
    if (cacheValid) {
      const cachedData = loadDataFromCache();
      if (cachedData) {
        console.log('✅ Cache data loaded successfully');
        console.log(`Cached properties: ${cachedData.properties.length}`);
        console.log(`Cached photos keys: ${Object.keys(cachedData.photos).length}`);
        console.log(`Cache metadata:`, cachedData.metadata);
        
        // Verify cached data completeness
        if (cachedData.properties.length > 0) {
          const cachedSample = cachedData.properties[0];
          console.log('🔍 Cached data verification:');
          console.log(`   Cached sample: ${cachedSample.name} - ${cachedSample.bedrooms} bed, ${cachedSample.bathrooms} bath, $${cachedSample.price}`);
        }
        
        cacheData = {
          valid: true,
          hasData: true,
          propertiesCount: cachedData.properties.length,
          photosKeysCount: Object.keys(cachedData.photos).length,
          amenitiesKeysCount: Object.keys(cachedData.amenities).length,
          metadata: cachedData.metadata,
          firstProperty: cachedData.properties.length > 0 ? {
            property_id: cachedData.properties[0].property_id,
            name: cachedData.properties[0].name,
            bedrooms: cachedData.properties[0].bedrooms,
            bathrooms: cachedData.properties[0].bathrooms,
            price: cachedData.properties[0].price,
            squareFeet: cachedData.properties[0].squareFeet,
            school: cachedData.properties[0].school,
            latitude: cachedData.properties[0].latitude,
            longitude: cachedData.properties[0].longitude
          } : null
        };
      } else {
        console.log('⚠️ Cache valid but no data found');
        cacheData = {
          valid: true,
          hasData: false
        };
      }
    } else {
      console.log('❌ Cache is invalid');
      cacheData = {
        valid: false,
        hasData: false
      };
    }
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      originalAPI: originalAPIData,
      cache: cacheData,
      dataPointsTracked: [
        'property_id', 'username', 'address', 'name', 'description',
        'bedrooms', 'bathrooms', 'price', 'squareFeet', 'amenities',
        'leaseTerms', 'photo', 'school', 'latitude', 'longitude',
        'photos', 'propertyAmenities'
      ],
      environment: {
        nodeEnv: process.env.NODE_ENV,
        cwd: process.cwd()
      }
    };
    
    console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 