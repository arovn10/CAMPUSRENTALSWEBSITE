import { NextResponse } from 'next/server';

export async function GET() {
  try {
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