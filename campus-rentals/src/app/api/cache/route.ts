import { NextRequest, NextResponse } from 'next/server';
import { 
  isCacheValid, 
  loadDataFromCache 
} from '@/utils/serverCache';

export async function GET() {
  try {
    const isValid = isCacheValid();
    const cachedData = loadDataFromCache();
    
    const status = {
      isValid,
      hasData: !!cachedData,
      lastUpdated: cachedData?.metadata.lastUpdated || null,
      propertiesCount: cachedData?.properties.length || 0,
      photosCount: cachedData ? Object.values(cachedData.photos).flat().length : 0
    };
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting cache status:', error);
    return NextResponse.json(
      { error: 'Failed to get cache status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'refresh') {
      // Trigger cache refresh by calling the properties API
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/properties`);
      if (response.ok) {
        return NextResponse.json({ message: 'Cache refreshed successfully' });
      } else {
        throw new Error('Failed to refresh cache');
      }
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error managing cache:', error);
    return NextResponse.json(
      { error: 'Failed to manage cache' },
      { status: 500 }
    );
  }
} 