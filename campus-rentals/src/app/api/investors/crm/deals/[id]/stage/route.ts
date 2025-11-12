import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// PUT /api/investors/crm/deals/[id]/stage - Update deal stage
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { stageId } = body

    const oldDeal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: { stage: true },
    })

    if (!oldDeal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: {
        stageId: stageId || null,
      },
      include: {
        stage: true,
      },
    })

    // Log activity if stage changed
    if (oldDeal.stageId !== deal.stageId) {
      await prisma.dealActivity.create({
        data: {
          dealId: deal.id,
          activityType: 'STAGE_CHANGED',
          title: 'Stage changed',
          description: `Deal moved from ${oldDeal.stage?.name || 'No Stage'} to ${deal.stage?.name || 'No Stage'}`,
          performedBy: user.id,
          metadata: {
            oldStageId: oldDeal.stageId,
            newStageId: deal.stageId,
          },
        },
      })
    }

    return NextResponse.json({ deal })
  } catch (error: any) {
    console.error('Error updating deal stage:', error)
    return NextResponse.json(
      { error: 'Failed to update deal stage', details: error.message },
      { status: 500 }
    )
  }
}

