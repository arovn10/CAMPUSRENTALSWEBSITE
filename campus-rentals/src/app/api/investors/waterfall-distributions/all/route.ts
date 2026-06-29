import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { canAccessProperty } from '@/lib/access'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get propertyId from query params to filter distributions
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    // Non-admins may not pull every distribution system-wide; they must scope to a
    // property they can access. Admin/manager keep the unscoped view.
    const isAdmin = user.role === 'ADMIN' || user.role === 'MANAGER'
    if (!isAdmin) {
      if (!propertyId) {
        return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
      }
      if (!(await canAccessProperty(user, propertyId))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Build where clause to filter by property
    const whereClause: any = {}

    if (propertyId) {
      // Only get distributions for structures tied to this specific property
      whereClause.waterfallStructure = {
        propertyId: propertyId
      }
    }

    // Get waterfall distributions filtered by property
    const distributions = await prisma.waterfallDistribution.findMany({
      where: whereClause,
      include: {
        waterfallStructure: {
          include: {
            waterfallTiers: {
              include: {
                tierDistributions: {
                  include: {
                    user: true,
                    entityInvestment: {
                      include: {
                        entity: true
                      }
                    }
                  }
                }
              }
            },
            property: true
          }
        }
      },
      orderBy: { distributionDate: 'desc' }
    })
    
    return NextResponse.json(distributions)
  } catch (error) {
    console.error('Error fetching waterfall distributions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 