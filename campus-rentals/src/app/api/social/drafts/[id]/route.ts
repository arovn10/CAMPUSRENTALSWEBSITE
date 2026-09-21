import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { requireSocialReviewer, errorResponse } from '@/lib/social/guard'
import { validateCaption } from '@/lib/social/compliance'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Fields a reviewer may change. Status transitions go through `action`. */
const EDITABLE = ['caption', 'hashtags', 'mediaUrls', 'altText', 'format', 'scheduledFor'] as const

/**
 * PATCH /api/social/drafts/:id
 *
 * Edit a draft, or act on it with { action: 'approve' | 'reject' | 'reset' }.
 * Admin/manager only. A post that is already PUBLISHED or PUBLISHING is frozen.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireSocialReviewer(request)
  if ('response' in gate) return gate.response

  try {
    const existing = await prisma.socialPost.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (existing.status === 'PUBLISHED' || existing.status === 'PUBLISHING') {
      return NextResponse.json(
        { error: `A ${existing.status.toLowerCase()} post cannot be edited` },
        { status: 409 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const data: Prisma.SocialPostUpdateInput = {}

    // Field whitelist — the request body is never spread into Prisma.
    for (const key of EDITABLE) {
      if (!(key in body)) continue
      const value = body[key]
      if (key === 'hashtags' && Array.isArray(value)) {
        data.hashtags = value.filter((t: unknown): t is string => typeof t === 'string').slice(0, 30)
      } else if (key === 'mediaUrls' && Array.isArray(value)) {
        data.mediaUrls = value
          .filter((u: unknown): u is string => typeof u === 'string' && u.startsWith('https://'))
          .slice(0, 10)
      } else if (key === 'scheduledFor') {
        data.scheduledFor = value ? new Date(String(value)) : null
      } else if (typeof value === 'string') {
        data[key] = value
      }
    }

    const action = typeof body.action === 'string' ? body.action : null

    if (action === 'approve') {
      const caption = (data.caption as string) ?? existing.caption
      const hashtags = (data.hashtags as string[]) ?? existing.hashtags
      const mediaUrls = (data.mediaUrls as string[]) ?? existing.mediaUrls

      const check = validateCaption(caption, hashtags)
      if (!check.ok) {
        return NextResponse.json(
          { error: 'Caption failed compliance', violations: check.violations },
          { status: 422 }
        )
      }
      if (mediaUrls.length === 0) {
        return NextResponse.json({ error: 'Attach media before approving' }, { status: 422 })
      }
      data.status = 'APPROVED'
      data.reviewer = { connect: { id: gate.user.id } }
      data.reviewedAt = new Date()
      data.rejectionReason = null
    } else if (action === 'reject') {
      data.status = 'REJECTED'
      data.reviewer = { connect: { id: gate.user.id } }
      data.reviewedAt = new Date()
      data.rejectionReason =
        typeof body.rejectionReason === 'string' ? body.rejectionReason.slice(0, 500) : null
    } else if (action === 'reset') {
      // Pull an approved-but-unsent or failed post back into the queue.
      data.status = 'DRAFT'
      data.failureReason = null
    }

    const post = await prisma.socialPost.update({ where: { id: params.id }, data })
    return NextResponse.json({ post, compliance: validateCaption(post.caption, post.hashtags) })
  } catch (error) {
    console.error('[social] draft update failed:', error)
    return errorResponse('Could not update draft', error)
  }
}

/**
 * DELETE /api/social/drafts/:id — remove a draft that will never be used.
 * Published posts are kept: their insight history is the record.
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireSocialReviewer(request)
  if ('response' in gate) return gate.response

  try {
    const existing = await prisma.socialPost.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status === 'PUBLISHED' || existing.status === 'PUBLISHING') {
      return NextResponse.json({ error: 'A published post cannot be deleted' }, { status: 409 })
    }
    await prisma.socialPost.delete({ where: { id: params.id } })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('[social] draft delete failed:', error)
    return errorResponse('Could not delete draft', error)
  }
}
