import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchProperties as fetchExternalProperties } from '@/utils/api';

// Photo mapping based on the provided property data
const PROPERTY_PHOTOS: { [key: number]: string } = {
  1: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/350A9684-5FDB-404A-8321-CC371FA823A3.jpg',
  2: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/C8D725A7-58EE-4E7A-B73A-2B4D92EA566A.jpg',
  6: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/FAE13088-D469-4A2D-BE0D-54235CC897A5.jpg',
  10: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/DFDFAA57-6C09-4631-91EE-6749113B6A67.jpg',
};

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Fetch properties from the same external API as the main website
    const externalProperties = await fetchExternalProperties();
    
    if (!externalProperties || externalProperties.length === 0) {
      return NextResponse.json([]);
    }

    let properties;

    if (user.role === 'ADMIN') {
      // Admin can see all properties
      properties = externalProperties;
    } else {
      // Investors can only see properties they're invested in
      const userInvestments = await prisma.investment.findMany({
        where: {
          userId: user.id,
          status: 'ACTIVE',
        },
        include: {
          distributions: true,
        },
      });

      // Map external properties to user investments
      const investedPropertyIds = userInvestments.map(inv => inv.propertyId);
      properties = externalProperties.filter(prop => 
        investedPropertyIds.includes(prop.property_id.toString())
      );
    }

    // Calculate financial metrics and add photos for each property
    const propertiesWithMetrics = await Promise.all(
      properties.map(async (property) => {
        // Get investment data for this property
        const investment = await prisma.investment.findFirst({
          where: {
            propertyId: property.property_id.toString(),
            userId: user.id,
            status: 'ACTIVE',
          },
          include: {
            distributions: true,
          },
        });

        // Get property from database for additional data
        const dbProperty = await prisma.property.findUnique({
          where: { propertyId: property.property_id },
        });

        const totalInvested = investment?.investmentAmount || 0;
        const totalDistributions = investment?.distributions.reduce((sum, dist) => sum + dist.amount, 0) || 0;
        
        // Use current value from database if available, otherwise use price
        const currentValue = dbProperty?.currentValue || property.price || 0;
        const totalReturn = currentValue + totalDistributions - totalInvested;
        const irr = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0;

        // Get photo for this property - prioritize actual photos from API
        const photo = property.photo || PROPERTY_PHOTOS[property.property_id] || '/placeholder.png';

        return {
          id: property.property_id.toString(),
          propertyId: property.property_id,
          name: property.name,
          address: property.address,
          description: property.description,
          price: property.price,
          photo: photo,
          investmentAmount: totalInvested,
          totalReturn: totalReturn,
          irr: irr,
          distributions: investment?.distributions || [],
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          squareFeet: property.squareFeet,
          school: property.school,
          leaseTerms: property.leaseTerms,
          latitude: property.latitude,
          longitude: property.longitude,
          // Additional data from database if available
          propertyType: dbProperty?.propertyType || 'SINGLE_FAMILY',
          acquisitionDate: dbProperty?.acquisitionDate,
          acquisitionPrice: dbProperty?.acquisitionPrice,
          currentValue: currentValue,
          occupancyRate: dbProperty?.occupancyRate,
          monthlyRent: dbProperty?.monthlyRent,
          annualExpenses: dbProperty?.annualExpenses,
          capRate: dbProperty?.capRate,
        };
      })
    );

    return NextResponse.json(propertiesWithMetrics);
  } catch (error) {
    console.error('Error fetching investor properties:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 