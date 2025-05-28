import { NextResponse } from 'next/server';
import { 
  isCacheValid, 
  loadDataFromCache 
} from '@/utils/serverCache';
import { 
  fetchProperties as originalFetchProperties
} from '@/utils/api';

export async function GET() {
  try {
    console.log('=== PROPERTIES DEBUG ===');
    
    // Get cached data
    if (isCacheValid()) {
      const cachedData = loadDataFromCache();
      if (cachedData) {
        console.log('Using cached data');
        console.log(`Properties count: ${cachedData.properties.length}`);
        
        // Log first few properties with their school values
        cachedData.properties.slice(0, 3).forEach((prop, index) => {
          console.log(`Property ${index + 1}:`, {
            id: prop.property_id,
            name: prop.name,
            school: prop.school,
            address: prop.address
          });
        });
        
        return NextResponse.json({
          source: 'cache',
          count: cachedData.properties.length,
          properties: cachedData.properties.map(p => ({
            property_id: p.property_id,
            name: p.name,
            school: p.school,
            address: p.address,
            bedrooms: p.bedrooms,
            price: p.price
          }))
        });
      }
    }
    
    // Fallback to original API
    console.log('Using original API');
    const properties = await originalFetchProperties();
    console.log(`Original API properties count: ${properties.length}`);
    
    return NextResponse.json({
      source: 'original_api',
      count: properties.length,
      properties: properties.map(p => ({
        property_id: p.property_id,
        name: p.name,
        school: p.school,
        address: p.address,
        bedrooms: p.bedrooms,
        price: p.price
      }))
    });
    
  } catch (error) {
    console.error('Properties debug error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 