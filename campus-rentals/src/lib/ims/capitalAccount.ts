import { prisma } from '@/lib/prisma'
import {
  computeAccountMetrics,
  consolidate,
  type AccountFlows,
  type AccountMetrics,
  type CashFlow,
} from '@/lib/ims/metrics'

/**
 * Capital-account derivation — the single source of truth for an investor's
 * positions, derived live from the existing book of record (no materialized
 * tables). Used by GET /api/investors/capital-account AND by PDF statements,
 * so the portal screen and the mailed statement can never disagree.
 *
 * Sources, per property the investor touches:
 *  - Contributions: direct Investment.investmentAmount @ investmentDate, plus the
 *    investor's share of each EntityInvestment (owner contribution, dated at the
 *    entity's investment date).
 *  - Distributions: direct Distribution(userId) + EntityDistribution(userId).
 *    (WaterfallTierDistribution is intentionally NOT added — it is the detailed
 *    breakdown of the same money.)
 *  - Current value: property.currentValue × the investor's ownership fraction.
 */

export interface LedgerEntry {
  type: 'CONTRIBUTION' | 'DISTRIBUTION'
  amount: number
  date: Date
}

export interface CapitalAccountDeal {
  propertyId: string
  propertyName: string
  address: string | null
  dealStatus: string | null
  ownershipPercent: number
  metrics: AccountMetrics
  ledger: LedgerEntry[]
}

export interface CapitalAccountPayload {
  asOf: Date
  userId: string
  consolidated: AccountMetrics
  accounts: CapitalAccountDeal[]
}

export async function buildCapitalAccount(userId: string): Promise<CapitalAccountPayload> {
  const asOf = new Date()

  type Acc = {
    propertyId: string
    propertyName: string
    address: string | null
    dealStatus: string | null
    propertyCurrentValue: number
    ownershipFraction: number
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
      entity: { include: { entityInvestments: { include: { property: true } } } },
    },
  })
  for (const stake of ownerStakes) {
    const ownerPct = Number(stake.ownershipPercentage ?? 0) / 100
    const ownerContribution = Number(stake.investmentAmount ?? 0)
    const entityInvs = stake.entity?.entityInvestments ?? []
    const totalEntityInvested = entityInvs.reduce((s, ei) => s + Number(ei.investmentAmount ?? 0), 0)
    for (const ei of entityInvs) {
      if (!ei.property) continue
      const a = ensure(ei.property)
      a.ownershipFraction += ownerPct * (Number(ei.ownershipPercentage ?? 0) / 100)
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

  const accountFlows: AccountFlows[] = []
  const accounts: CapitalAccountDeal[] = Array.from(byProperty.values()).map((a) => {
    const flows: AccountFlows = {
      contributions: a.contributions,
      distributions: a.distributions,
      currentValue: a.propertyCurrentValue * Math.min(Math.max(a.ownershipFraction, 0), 1),
      asOf,
    }
    accountFlows.push(flows)
    const metrics = computeAccountMetrics(flows)
    const ledger: LedgerEntry[] = [
      ...a.contributions.map((c) => ({ type: 'CONTRIBUTION' as const, amount: c.amount, date: c.date })),
      ...a.distributions.map((d) => ({ type: 'DISTRIBUTION' as const, amount: d.amount, date: d.date })),
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
  return { asOf, userId, consolidated, accounts }
}
