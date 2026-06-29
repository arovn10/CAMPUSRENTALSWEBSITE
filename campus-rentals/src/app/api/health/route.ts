import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Always run dynamically — this is a liveness/readiness probe, never cached.
export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 * Lightweight health probe for uptime monitoring and the deploy pipeline.
 * Returns 200 only when the app can reach its database; 503 otherwise.
 */
export async function GET() {
  const startedAt = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json(
      { status: 'ok', db: 'up', latencyMs: Date.now() - startedAt },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[health] DB check failed:', error)
    return NextResponse.json(
      { status: 'degraded', db: 'down', latencyMs: Date.now() - startedAt },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
