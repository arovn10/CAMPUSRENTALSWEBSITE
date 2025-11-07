import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get all followers for a property/deal
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: params.id },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Check if user has access to this property
    const userInvestment = await prisma.investment.findFirst({
      where: {
        propertyId: params.id,
        userId: user.id,
      },
    });

    // Check for entity investments - check both global and per-deal owners
    const userEntityInvestment = await prisma.entityInvestment.findFirst({
      where: {
        propertyId: params.id,
        OR: [
          {
            entity: {
              entityOwners: {
                some: { userId: user.id },
              },
            },
          },
          {
            entityInvestmentOwners: {
              some: { userId: user.id },
            },
          },
        ],
      },
    });

    // Check if user is a follower
    const userFollower = await prisma.dealFollower.findFirst({
      where: {
        propertyId: params.id,
        OR: [
          { userId: user.id },
          { contact: { email: user.email } },
        ],
      },
    });

    // Check access: admin/manager can see all, investors can see all, followers can see all
    const hasAccess =
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      !!userInvestment ||
      !!userEntityInvestment ||
      !!userFollower;

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all followers (only admins/managers see all, others see themselves)
    const where: any = { propertyId: params.id };
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      where.OR = [
        { userId: user.id },
        { contact: { email: user.email } },
      ];
    }

    const followers = await prisma.dealFollower.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        addedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            propertyId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ followers });
  } catch (error) {
    console.error('Error fetching followers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a follower to a property/deal
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and managers can add followers
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { contactId, userId, accessLevel, notes } = body;

    // Must provide either contactId or userId
    if (!contactId && !userId) {
      return NextResponse.json(
        { error: 'Either contactId or userId must be provided' },
        { status: 400 }
      );
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: params.id },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Check if follower already exists
    const existingFollower = await prisma.dealFollower.findFirst({
      where: {
        propertyId: params.id,
        OR: [
          { contactId: contactId || null },
          { userId: userId || null },
        ],
      },
    });

    if (existingFollower) {
      return NextResponse.json(
        { error: 'Follower already exists for this deal' },
        { status: 400 }
      );
    }

    const follower = await prisma.dealFollower.create({
      data: {
        propertyId: params.id,
        contactId: contactId || null,
        userId: userId || null,
        accessLevel: accessLevel || 'VIEW_ONLY',
        notes: notes || null,
        addedBy: user.id,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        addedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ follower }, { status: 201 });
  } catch (error) {
    console.error('Error adding follower:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

