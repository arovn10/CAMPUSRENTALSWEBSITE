import { NextRequest, NextResponse } from 'next/server';
import { 
  loadDataFromCache,
  isCacheValid
} from '@/utils/serverCache';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = parseInt(params.id);
    
    if (isNaN(propertyId)) {
      return NextResponse.json(
        { error: 'Invalid property ID' },
        { status: 400 }
      );
    }

    // Load from cache (lightning fast)
    if (isCacheValid()) {
      const cachedData = loadDataFromCache();
      if (cachedData) {
        // Find the property
        const property = cachedData.properties.find(p => p.property_id === propertyId);
        
        if (property) {
          // Get photos and amenities from cache
          const photos = cachedData.photos[propertyId] || [];
          const amenities = cachedData.amenities[propertyId] || null;
          const isBuilding =
            property.isBuildingGroup ||
            property.isBuilding ||
            property.propertyTypeCategory === 'MultiUnit';
          const relatedUnits = isBuilding
            ? cachedData.properties.filter((p) => {
                if (property.unitIds && property.unitIds.length > 0) {
                  return property.unitIds.includes(p.property_id);
                }
                return p.buildingId === property.property_id && p.property_id !== property.property_id;
              })
            : [];
          
          // Calculate ETag for cache validation
          const etag = `"property-${propertyId}-${cachedData.metadata.timestamp}"`;
          const ifNoneMatch = request.headers.get('if-none-match');
          
          if (ifNoneMatch === etag) {
            return new NextResponse(null, { status: 304 });
          }
          
          return NextResponse.json({
            property,
            photos,
            amenities,
            units: relatedUnits,
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
              'ETag': etag,
              'Content-Type': 'application/json',
            },
          });
        }
      }
    }
    
    // If not in cache or cache invalid, return 404
    return NextResponse.json(
      { error: 'Property not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

