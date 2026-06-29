import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/investors/k1/allocations?year=YYYY   (ADMIN/MANAGER)
 *
 * Pre-computes each investor's distribution allocation for the tax year, broken
 * out by distribution type (rental income / sale proceeds / refinance / other),
 * combining direct Distribution + EntityDistribution. This is the worksheet the
 * CPA uses to prepare each LP's K-1; the portal then e-delivers the final PDF.
 *
 * Record-only: derived live from the book of record, no tax advice implied.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const yearParam = new URL(request.url).searchParams.get('year')
  const year = Number(yearParam) || new Date().getFullYear() - 1
  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year + 1, 0, 1))

  try {
    const [directDist, entityDist, users] = await Promise.all([
      prisma.distribution.findMany({
        where: { distributionDate: { gte: start, lt: end } },
        select: { userId: true, amount: true, distributionType: true },
      }),
      prisma.entityDistribution.findMany({
        where: { distributionDate: { gte: start, lt: end } },
        select: { userId: true, amount: true, distributionType: true },
      }),
      prisma.user.findMany({
        select: { id: true, firstName: true, lastName: true, email: true, taxId: true, entityName: true },
      }),
    ])

    type Bucket = {
      userId: string
      rentalIncome: number
      saleProceeds: number
      refinance: number
      other: number
      total: number
    }
    const byUser = new Map<string, Bucket>()
    const ensure = (userId: string): Bucket => {
      let b = byUser.get(userId)
      if (!b) {
        b = { userId, rentalIncome: 0, saleProceeds: 0, refinance: 0, other: 0, total: 0 }
        byUser.set(userId, b)
      }
      return b
    }
    const add = (userId: string, type: string, amount: number) => {
      const b = ensure(userId)
      if (type === 'RENTAL_INCOME') b.rentalIncome += amount
      else if (type === 'SALE_PROCEEDS') b.saleProceeds += amount
      else if (type === 'REFINANCE') b.refinance += amount
      else b.other += amount
      b.total += amount
    }
    for (const d of directDist) add(d.userId, d.distributionType, Number(d.amount))
    for (const d of entityDist) add(d.userId, d.distributionType, Number(d.amount))

    const userById = new Map(users.map((u) => [u.id, u]))
    const allocations = Array.from(byUser.values())
      .map((b) => {
        const u = userById.get(b.userId)
        return {
          ...b,
          investorName: u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email : b.userId,
          email: u?.email ?? null,
          taxId: u?.taxId ? `***${String(u.taxId).slice(-4)}` : null, // masked
          entityName: u?.entityName ?? null,
        }
      })
      .filter((a) => a.total !== 0)
      .sort((a, b) => b.total - a.total)

    const totals = allocations.reduce(
      (acc, a) => ({
        rentalIncome: acc.rentalIncome + a.rentalIncome,
        saleProceeds: acc.saleProceeds + a.saleProceeds,
        refinance: acc.refinance + a.refinance,
        other: acc.other + a.other,
        total: acc.total + a.total,
      }),
      { rentalIncome: 0, saleProceeds: 0, refinance: 0, other: 0, total: 0 }
    )

    return NextResponse.json({ year, allocations, totals }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[k1/allocations] failed:', error)
    return NextResponse.json(
      { error: 'Failed to compute K-1 allocations', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    )
  }
}
