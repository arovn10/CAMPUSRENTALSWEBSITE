import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'fs'
import { join } from 'path'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { documentFileExists } from '@/lib/documentStorage'

/**
 * GET /api/admin/documents/missing-files
 * Lists document DB rows whose filePath does not resolve on disk (loan PDFs, etc.).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const docs = await prisma.document.findMany({
      select: {
        id: true,
        title: true,
        fileName: true,
        filePath: true,
        documentType: true,
        entityType: true,
        entityId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const missing = docs.filter((doc) => {
      const filePath = doc.filePath
      if (!filePath || filePath.endsWith('/')) return true
      const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath
      if (documentFileExists(relativePath)) return false
      const publicPath = join(process.cwd(), 'public', relativePath)
      const publicAlt = join(process.cwd(), 'public', filePath)
      return !existsSync(publicPath) && !existsSync(publicAlt)
    })

    return NextResponse.json({
      total: docs.length,
      missingCount: missing.length,
      missing,
    })
  } catch (error) {
    console.error('missing-files check failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
