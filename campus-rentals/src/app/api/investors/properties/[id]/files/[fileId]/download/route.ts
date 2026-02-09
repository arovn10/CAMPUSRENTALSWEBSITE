import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isLocalPath, dealFileExists, createDealFileReadStream } from '@/lib/dealFileStorage'

/**
 * GET - Stream a deal file that is stored locally (not S3).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, fileId } = await params
    const file = await prisma.dealFile.findUnique({
      where: { id: fileId },
      include: {
        property: {
          include: {
            investments: { where: { userId: user.id } },
            entityInvestments: {
              include: { entityOwners: { where: { userId: user.id } } },
            },
            followers: {
              where: {
                OR: [
                  { userId: user.id },
                  { contact: { email: user.email } },
                ],
              },
            },
          },
        },
      },
    })

    if (!file || file.propertyId !== id) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const hasAccess =
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      file.property.investments.length > 0 ||
      file.property.entityInvestments.some((ei: any) => ei.entityOwners.length > 0) ||
      file.property.followers.length > 0

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!isLocalPath(file.filePath)) {
      return NextResponse.json({ error: 'Use signed URL for this file' }, { status: 400 })
    }

    if (!dealFileExists(file.filePath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
    }

    const stream = createDealFileReadStream(file.filePath)
    const headers = new Headers()
    headers.set('Content-Type', file.mimeType || 'application/octet-stream')
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`)
    if (file.fileSize) headers.set('Content-Length', String(file.fileSize))

    return new NextResponse(stream as any, { status: 200, headers })
  } catch (error) {
    console.error('Error streaming deal file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
