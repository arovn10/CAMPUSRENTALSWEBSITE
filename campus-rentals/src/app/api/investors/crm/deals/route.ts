import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/investors/crm/deals - Fetch all deals (shared data - investors see their deals, admins see all)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get('pipelineId');
    const stageId = searchParams.get('stageId');
    const search = searchParams.get('search');

    const where: any = {};

    // If user is investor, only show deals for properties they've invested in
    if (user.role === 'INVESTOR') {
      // Get property IDs where user has investments
      const userInvestments = await prisma.investment.findMany({
        where: { userId: user.id },
        select: { propertyId: true },
      });

      // Get property IDs from entity investments where user is an owner
      const entityInvestments = await prisma.entityInvestment.findMany({
        include: {
          entity: {
            include: {
              entityOwners: {
                where: { userId: user.id },
              },
            },
          },
          entityInvestmentOwners: {
            where: { userId: user.id },
          },
        },
      });

      const propertyIds = new Set<string>();
      userInvestments.forEach((inv) => propertyIds.add(inv.propertyId));
      entityInvestments.forEach((ei) => {
        if (ei.entity.entityOwners.length > 0 || ei.entityInvestmentOwners.length > 0) {
          propertyIds.add(ei.propertyId);
        }
      });

      if (propertyIds.size === 0) {
        return NextResponse.json([]);
      }

      where.propertyId = { in: Array.from(propertyIds) };
    } else if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    if (stageId) {
      where.stageId = stageId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const deals = await prisma.deal.findMany({
      where,
      include: {
        pipeline: true,
        stage: true,
        property: {
          select: {
            id: true,
            propertyId: true,
            name: true,
            address: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            notes: true,
            relationships: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(deals);
  } catch (error: any) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/investors/crm/deals - Create a new deal
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      dealType,
      status,
      priority,
      pipelineId,
      stageId,
      propertyId,
      description,
      location,
      estimatedValue,
      estimatedCloseDate,
      actualCloseDate,
      source,
      assignedToId,
      tags,
      metadata,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Deal name is required' },
        { status: 400 }
      );
    }

    const deal = await prisma.deal.create({
      data: {
        name,
        dealType: dealType || 'ACQUISITION',
        status: status || 'NEW',
        priority: priority || 'MEDIUM',
        pipelineId,
        stageId,
        propertyId,
        description,
        location,
        estimatedValue,
        estimatedCloseDate: estimatedCloseDate ? new Date(estimatedCloseDate) : null,
        actualCloseDate: actualCloseDate ? new Date(actualCloseDate) : null,
        source,
        assignedToId,
        tags: tags || [],
        metadata: metadata || {},
      },
      include: {
        pipeline: true,
        stage: true,
        property: {
          select: {
            id: true,
            propertyId: true,
            name: true,
            address: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create deal tags if provided
    if (tags && tags.length > 0) {
      await prisma.dealTag.createMany({
        data: tags.map((tag: string) => ({
          dealId: deal.id,
          tag,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json(deal, { status: 201 });
  } catch (error: any) {
    console.error('Error creating deal:', error);
    return NextResponse.json(
      { error: 'Failed to create deal', details: error.message },
      { status: 500 }
    );
  }
}

