import { NextRequest, NextResponse } from 'next/server';

// Photo mapping based on the provided property data
const PROPERTY_PHOTOS: { [key: number]: string } = {
  1: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/350A9684-5FDB-404A-8321-CC371FA823A3.jpg',
  2: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/C8D725A7-58EE-4E7A-B73A-2B4D92EA566A.jpg',
  3: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/FAE13088-D469-4A2D-BE0D-54235CC897A5.jpg',
  4: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/DFDFAA57-6C09-4631-91EE-6749113B6A67.jpg',
  5: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/350A9684-5FDB-404A-8321-CC371FA823A3.jpg',
  6: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/FAE13088-D469-4A2D-BE0D-54235CC897A5.jpg',
  7: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/C8D725A7-58EE-4E7A-B73A-2B4D92EA566A.jpg',
  8: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/DFDFAA57-6C09-4631-91EE-6749113B6A67.jpg',
  9: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/350A9684-5FDB-404A-8321-CC371FA823A3.jpg',
  10: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/DFDFAA57-6C09-4631-91EE-6749113B6A67.jpg',
  11: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/FAE13088-D469-4A2D-BE0D-54235CC897A5.jpg',
  12: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/C8D725A7-58EE-4E7A-B73A-2B4D92EA566A.jpg',
  13: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/DFDFAA57-6C09-4631-91EE-6749113B6A67.jpg',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyIds = searchParams.get('ids');

    if (!propertyIds) {
      return NextResponse.json(
        { error: 'Property IDs are required' },
        { status: 400 }
      );
    }

    const ids = propertyIds.split(',').map(id => parseInt(id.trim()));
    const photos: { [key: number]: string } = {};

    // Fetch photos for each property ID
    for (const id of ids) {
      if (PROPERTY_PHOTOS[id]) {
        photos[id] = PROPERTY_PHOTOS[id];
      } else {
        // Generate a placeholder image URL for properties without photos
        photos[id] = `/placeholder.png`;
      }
    }

    return NextResponse.json({
      success: true,
      photos,
    });
  } catch (error) {
    console.error('Error fetching property photos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { propertyIds } = await request.json();

    if (!propertyIds || !Array.isArray(propertyIds)) {
      return NextResponse.json(
        { error: 'Property IDs array is required' },
        { status: 400 }
      );
    }

    const photos: { [key: number]: string } = {};

    // Fetch photos for each property ID
    for (const id of propertyIds) {
      if (PROPERTY_PHOTOS[id]) {
        photos[id] = PROPERTY_PHOTOS[id];
      } else {
        // Generate a placeholder image URL for properties without photos
        photos[id] = `/placeholder.png`;
      }
    }

    return NextResponse.json({
      success: true,
      photos,
    });
  } catch (error) {
    console.error('Error fetching property photos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 