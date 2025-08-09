import { NextRequest, NextResponse } from 'next/server';
import { getCoordinates, batchGeocodeAddresses, clearCoordinateCache, getCoordinateCacheStats } from '@/utils/coordinateCache';
import { fetchProperties } from '@/utils/api';

export async function GET() {
  try {
    const stats = getCoordinateCacheStats();
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting coordinate cache stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, addresses } = body;

    switch (action) {
      case 'geocode-single': {
        const { address } = body;
        if (!address) {
          return NextResponse.json(
            { success: false, error: 'Address is required' },
            { status: 400 }
          );
        }

        const coordinates = await getCoordinates(address);
        return NextResponse.json({
          success: true,
          address,
          coordinates
        });
      }

      case 'geocode-batch': {
        if (!addresses || !Array.isArray(addresses)) {
          return NextResponse.json(
            { success: false, error: 'Addresses array is required' },
            { status: 400 }
          );
        }

        const results = await batchGeocodeAddresses(addresses);
        return NextResponse.json({
          success: true,
          results
        });
      }

      case 'geocode-all-properties': {
        console.log('🗺️ Starting to geocode all properties...');
        
        // Fetch all properties
        const properties = await fetchProperties();
        console.log(`📍 Found ${properties.length} properties to geocode`);

        if (properties.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'No properties found to geocode'
          });
        }

        // Extract unique addresses
        const addresses = [...new Set(properties.map(p => p.address))];
        console.log(`📍 Geocoding ${addresses.length} unique addresses...`);

        // Geocode all addresses
        const results = await batchGeocodeAddresses(addresses, (completed, total) => {
          console.log(`🔄 Geocoding progress: ${completed}/${total}`);
        });

        const successCount = results.filter(r => r.coordinates !== null).length;
        const failureCount = results.filter(r => r.coordinates === null).length;

        console.log(`✅ Geocoding completed: ${successCount} successful, ${failureCount} failed`);

        return NextResponse.json({
          success: true,
          message: `Geocoded ${successCount} addresses successfully, ${failureCount} failed`,
          results: {
            total: addresses.length,
            successful: successCount,
            failed: failureCount,
            details: results
          }
        });
      }

      case 'clear': {
        clearCoordinateCache();
        return NextResponse.json({
          success: true,
          message: 'Coordinate cache cleared'
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in coordinate cache API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
