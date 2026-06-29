import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  computeAccountMetrics,
  consolidate,
  type AccountFlows,
  type CashFlow,
} from '@/lib/ims/metrics'

export const dynamic = 'force-dynamic'

/**
 * GET /api/investors/capital-account[?userId=...]
 *
 * Derives the caller's capital account(s) live from the existing book of record
 * (no separate materialized tables): per-deal contributions, distributions, and
 * current value, plus the institutional metric set (XIRR/MOIC/TVPI/DPI/RVPI/CoC).
 *
 * Sources, per property the investor touches:
 *  - Contributions: direct Investment.investmentAmount @ investmentDate, and the
 *    investor's share of each EntityInvestment (owner contribution, dated at the
 *    entity's investment date).
 *  - Distributions: direct Distribution(userId) + EntityDistribution(userId).
 *    (WaterfallTierDistribution is intentionally NOT added here to avoid double
 *    counting — it is the detailed waterfall breakdown of the same money.)
 *  - Current value: property.currentValue × the investor's ownership fraction of
 *    that property (direct % + Σ entity-ownership × entity-investment %).
 *
 * Admin/manager may pass ?userId to view any investor; others see only themselves.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const isAdmin = auth.role === 'ADMIN' || auth.role === 'MANAGER'
  const requestedUserId = new URL(request.url).searchParams.get('userId')
  const userId = isAdmin && requestedUserId ? requestedUserId : auth.id

  try {
    const asOf = new Date()

    // Per-property accumulator
    type Acc = {
      propertyId: string
      propertyName: string
      address: string | null
      dealStatus: string | null
      propertyCurrentValue: number
      ownershipFraction: number // investor's % of the property (0..1)
      contributions: CashFlow[]
      distributions: CashFlow[]
    }
    const byProperty = new Map<string, Acc>()
    const ensure = (p: {
      id: string
      name: string
      address: string | null
      dealStatus: string | null
      currentValue: unknown
    }): Acc => {
      let a = byProperty.get(p.id)
      if (!a) {
        a = {
          propertyId: p.id,
          propertyName: p.name,
          address: p.address,
          dealStatus: p.dealStatus,
          propertyCurrentValue: Number(p.currentValue ?? 0),
          ownershipFraction: 0,
          contributions: [],
          distributions: [],
        }
        byProperty.set(p.id, a)
      }
      return a
    }

    // 1) Direct investments + their distributions
    const directInvestments = await prisma.investment.findMany({
      where: { userId },
      include: { property: true, distributions: true },
    })
    for (const inv of directInvestments) {
      if (!inv.property) continue
      const a = ensure(inv.property)
      a.ownershipFraction += Number(inv.ownershipPercentage ?? 0) / 100
      if (inv.investmentAmount != null) {
        a.contributions.push({
          amount: Number(inv.investmentAmount),
          date: inv.investmentDate ?? inv.createdAt,
        })
      }
      for (const d of inv.distributions) {
        a.distributions.push({ amount: Number(d.amount), date: d.distributionDate })
      }
    }

    // 2) Entity-held positions — the investor's share of each entity investment
    const ownerStakes = await prisma.entityOwner.findMany({
      where: { userId },
      include: {
        entity: {
          include: { entityInvestments: { include: { property: true } } },
        },
      },
    })
    for (const stake of ownerStakes) {
      const ownerPct = Number(stake.ownershipPercentage ?? 0) / 100 // investor's % of the entity
      const ownerContribution = Number(stake.investmentAmount ?? 0) // actual capital the investor put into the entity
      const entityInvs = stake.entity?.entityInvestments ?? []
      const totalEntityInvested = entityInvs.reduce(
        (s, ei) => s + Number(ei.investmentAmount ?? 0),
        0
      )
      for (const ei of entityInvs) {
        if (!ei.property) continue
        const a = ensure(ei.property)
        // Investor's ownership of THIS property via the entity:
        //   ownerPct × (entity's % of the property)
        a.ownershipFraction += ownerPct * (Number(ei.ownershipPercentage ?? 0) / 100)
        // Attribute the investor's entity contribution to this property,
        // proportional to the entity's investment in it (dated at the entity's investment).
        const share =
          totalEntityInvested > 0
            ? (Number(ei.investmentAmount ?? 0) / totalEntityInvested) * ownerContribution
            : ownerContribution / Math.max(entityInvs.length, 1)
        if (share > 0) {
          a.contributions.push({ amount: share, date: ei.investmentDate ?? ei.createdAt })
        }
      }
    }

    // 3) Entity distributions paid to this investor
    const entityDistributions = await prisma.entityDistribution.findMany({
      where: { userId },
      include: { entityInvestment: { include: { property: true } } },
    })
    for (const ed of entityDistributions) {
      const property = ed.entityInvestment?.property
      if (!property) continue
      const a = ensure(property)
      a.distributions.push({ amount: Number(ed.amount), date: ed.distributionDate })
    }

    // Build per-deal metrics + consolidated
    const accountFlows: AccountFlows[] = []
    const accounts = Array.from(byProperty.values()).map((a) => {
      const flows: AccountFlows = {
        contributions: a.contributions,
        distributions: a.distributions,
        currentValue: a.propertyCurrentValue * Math.min(Math.max(a.ownershipFraction, 0), 1),
        asOf,
      }
      accountFlows.push(flows)
      const metrics = computeAccountMetrics(flows)
      const ledger = [
        ...a.contributions.map((c) => ({ type: 'CONTRIBUTION', amount: c.amount, date: c.date })),
        ...a.distributions.map((d) => ({ type: 'DISTRIBUTION', amount: d.amount, date: d.date })),
      ].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())
      return {
        propertyId: a.propertyId,
        propertyName: a.propertyName,
        address: a.address,
        dealStatus: a.dealStatus,
        ownershipPercent: Math.round(a.ownershipFraction * 10000) / 100,
        metrics,
        ledger,
      }
    })

    const consolidated = consolidate(accountFlows)

    return NextResponse.json(
      { asOf, userId, consolidated, accounts },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[capital-account] failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to build capital account',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}
