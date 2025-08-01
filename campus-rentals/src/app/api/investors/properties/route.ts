import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    let properties;

    if (user.role === 'ADMIN') {
      // Admin can see all properties
      properties = await prisma.property.findMany({
        where: { isActive: true },
        include: {
          investments: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          distributions: true,
        },
        orderBy: { name: 'asc' },
      });
    } else {
      // Investors can only see properties they're invested in
      const investments = await prisma.investment.findMany({
        where: {
          userId: user.id,
          status: 'ACTIVE',
        },
        include: {
          property: {
            include: {
              distributions: {
                where: {
                  userId: user.id,
                },
              },
            },
          },
        },
      });

      properties = investments.map(investment => ({
        ...investment.property,
        investmentAmount: investment.investmentAmount,
        preferredReturn: investment.preferredReturn,
        startDate: investment.startDate,
        distributions: investment.property.distributions,
      }));
    }

    // Calculate financial metrics and add photos for each property
    const propertiesWithMetrics = properties.map(property => {
      const totalInvested = property.investments?.reduce((sum, inv) => sum + inv.investmentAmount, 0) || 0;
      const totalDistributions = property.distributions?.reduce((sum, dist) => sum + dist.amount, 0) || 0;
      
      // Simple IRR calculation (this would be more complex in production)
      const currentValue = property.price || 0;
      const totalReturn = currentValue + totalDistributions - totalInvested;
      const irr = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0;

      // Get photo for this property
      const photo = PROPERTY_PHOTOS[property.propertyId] || '/placeholder.png';

      return {
        id: property.id,
        propertyId: property.propertyId,
        name: property.name,
        address: property.address,
        price: property.price,
        photo: photo,
        investmentAmount: property.investmentAmount || totalInvested,
        totalReturn: totalReturn,
        irr: irr,
        distributions: property.distributions || [],
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: property.squareFeet,
        school: property.school,
        leaseTerms: property.leaseTerms,
      };
    });

    return NextResponse.json(propertiesWithMetrics);
  } catch (error) {
    console.error('Error fetching investor properties:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 