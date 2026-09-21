import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma, SocialPostStatus } from '@prisma/client'
import { requireSocialReviewer, errorResponse } from '@/lib/social/guard'
import { validateCaption } from '@/lib/social/compliance'
import { generateDrafts } from '@/lib/social/candidates'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_STATUSES: SocialPostStatus[] = [
  'DRAFT',
  'APPROVED',
  'PUBLISHING',
  'PUBLISHED',
  'REJECTED',
  'FAILED',
]

/**
 * GET /api/social/drafts?status=DRAFT&limit=50
 *
 * The review queue. Admin/manager only.
 */
export async function GET(request: NextRequest) {
  const gate = await requireSocialReviewer(request)
  if ('response' in gate) return gate.response

  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const limit = Math.min(Number.parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200)

    const where: Prisma.SocialPostWhereInput = {}
    if (statusParam && VALID_STATUSES.includes(statusParam as SocialPostStatus)) {
      where.status = statusParam as SocialPostStatus
    }

    const posts = await prisma.socialPost.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        reviewer: { select: { firstName: true, lastName: true, email: true } },
        insights: { orderBy: { capturedAt: 'desc' }, take: 1 },
      },
    })

    // Surface the compliance verdict alongside each draft so a reviewer sees
    // why something would be blocked before they try to approve it.
    return NextResponse.json({
      posts: posts.map((p) => ({
        ...p,
        compliance: validateCaption(p.caption, p.hashtags),
      })),
    })
  } catch (error) {
    console.error('[social] draft list failed:', error)
    return errorResponse('Could not load drafts', error)
  }
}

/**
 * POST /api/social/drafts
 *
 * Either regenerates drafts from the content sources ({ generate: true }), or
 * creates one manual draft. Admin/manager only.
 */
export async function POST(request: NextRequest) {
  const gate = await requireSocialReviewer(request)
  if ('response' in gate) return gate.response

  try {
    const body = await request.json().catch(() => ({}))

    if (body?.generate === true) {
      const kinds = Array.isArray(body.kinds) && body.kinds.length > 0 ? body.kinds : undefined
      const result = await generateDrafts(kinds)
      return NextResponse.json({ generated: result })
    }

    // Manual draft: whitelist the fields a caller may set. Status is never
    // caller-settable — a manual post still enters the queue as a DRAFT.
    const caption = typeof body.caption === 'string' ? body.caption : ''
    const hashtags = Array.isArray(body.hashtags)
      ? body.hashtags.filter((t: unknown): t is string => typeof t === 'string').slice(0, 30)
      : []
    const mediaUrls = Array.isArray(body.mediaUrls)
      ? body.mediaUrls.filter((u: unknown): u is string => typeof u === 'string' && u.startsWith('https://')).slice(0, 10)
      : []

    if (!caption.trim()) {
      return NextResponse.json({ error: 'A caption is required' }, { status: 400 })
    }

    const check = validateCaption(caption, hashtags)
    if (!check.ok) {
      return NextResponse.json({ error: 'Caption failed compliance', violations: check.violations }, { status: 422 })
    }

    const post = await prisma.socialPost.create({
      data: {
        kind: body.kind ?? 'NEIGHBORHOOD',
        format: mediaUrls.length >= 2 ? 'CAROUSEL' : 'IMAGE',
        status: 'DRAFT',
        caption,
        hashtags,
        mediaUrls,
        altText: typeof body.altText === 'string' ? body.altText : null,
        sourceKey: `manual:${gate.user.id}:${Date.now()}`,
        sourceRef: 'manual',
      },
    })
    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error('[social] draft create failed:', error)
    return errorResponse('Could not create draft', error)
  }
}
