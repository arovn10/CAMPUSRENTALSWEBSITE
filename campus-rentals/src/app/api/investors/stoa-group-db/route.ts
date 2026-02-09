/**
 * Group DB – master data API (admin/manager only).
 * Returns entities, investors, properties, and contacts with rollup totals.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Group DB is admin-only' }, { status: 403 })
    }

    const fetchEntities = () =>
      prisma.entity.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { entityInvestments: true, entityOwners: true } },
          entityInvestments: { select: { investmentAmount: true } },
        },
        orderBy: { name: 'asc' },
      })
    const fetchUsers = () =>
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          company: true,
          entityName: true,
          entityType: true,
          _count: { select: { investments: true, entities: true } },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      })
    const fetchProperties = () =>
      prisma.property.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { investments: true, entityInvestments: true } },
        },
        orderBy: { name: 'asc' },
      })
    const fetchContacts = () =>
      prisma.contact.findMany({
        include: {
          creator: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      })

    const results = await Promise.allSettled([
      fetchEntities(),
      fetchUsers(),
      fetchProperties(),
      fetchContacts(),
    ])

    const entities = results[0].status === 'fulfilled' ? results[0].value : []
    const users = results[1].status === 'fulfilled' ? results[1].value : []
    const properties = results[2].status === 'fulfilled' ? results[2].value : []
    const contacts = results[3].status === 'fulfilled' ? results[3].value : []

    if (results[0].status === 'rejected') console.error('Group DB entities error:', results[0].reason)
    if (results[1].status === 'rejected') console.error('Group DB users error:', results[1].reason)
    if (results[2].status === 'rejected') console.error('Group DB properties error:', results[2].reason)
    if (results[3].status === 'rejected') console.error('Group DB contacts error:', results[3].reason)

    if (results.every((r) => r.status === 'rejected')) {
      throw (results[0] as PromiseRejectedResult).reason
    }

    const entityRollups = entities.map((e) => {
      const totalInvested = e.entityInvestments.reduce((s, i) => s + (i.investmentAmount ?? 0), 0)
      return {
        id: e.id,
        name: e.name,
        type: e.type,
        address: e.address,
        taxId: e.taxId,
        stateOfFormation: e.stateOfFormation ?? null,
        formationDate: e.formationDate ?? null,
        contactPerson: e.contactPerson,
        contactEmail: e.contactEmail,
        contactPhone: e.contactPhone,
        isActive: e.isActive,
        propertyCount: e._count.entityInvestments,
        ownerCount: e._count.entityOwners,
        totalInvested: Math.round(totalInvested),
      }
    })

    const investorRollups = await Promise.all(
      users.map(async (u) => {
        const invTotal = await prisma.investment.aggregate({
          where: { userId: u.id },
          _sum: { investmentAmount: true },
        })
        const directInvested = invTotal._sum.investmentAmount ?? 0
        return {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          company: u.company,
          entityName: u.entityName,
          entityType: u.entityType,
          investmentCount: u._count.investments,
          entityCount: u._count.entities,
          totalInvested: Math.round(directInvested),
        }
      })
    )

    const propertyRollups = properties.map((p) => {
      const invCount = p._count.investments + p._count.entityInvestments
      return {
        id: p.id,
        propertyId: p.propertyId,
        name: p.name,
        address: p.address,
        dealStatus: p.dealStatus,
        fundingStatus: p.fundingStatus,
        currentValue: p.currentValue,
        totalCost: p.totalCost,
        investmentCount: invCount,
      }
    })

    const contactList = contacts.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      company: c.company,
      title: c.title,
      tags: c.tags,
      createdBy: c.creator ? `${c.creator.firstName} ${c.creator.lastName}` : null,
    }))

    return NextResponse.json({
      entities: entityRollups,
      investors: investorRollups,
      properties: propertyRollups,
      contacts: contactList,
    })
  } catch (e: any) {
    console.error('Group DB API error:', e)
    const message = e?.message ?? String(e)
    return NextResponse.json(
      { error: 'Failed to load Group DB', details: message },
      { status: 500 }
    )
  }
}
