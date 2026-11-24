import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.log('Warming up cache...');
    
    // This will trigger the cache initialization if needed
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/properties`);
    
    if (response.ok) {
      const properties = await response.json();
      return NextResponse.json({ 
        message: 'Cache warmed up successfully',
        propertiesCount: properties.length 
      });
    } else {
      throw new Error('Failed to fetch properties');
    }
  } catch (error) {
    console.error('Error warming up cache:', error);
    return NextResponse.json(
      { error: 'Failed to warm up cache' },
      { status: 500 }
    );
  }
} 