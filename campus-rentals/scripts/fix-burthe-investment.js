const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run() {
  try {
    const property = await prisma.property.findFirst({
      where: { address: { contains: '7700 Burthe St' } }
    })
    if (!property) {
      console.log('Property not found')
      return
    }
    const entity = await prisma.entity.findFirst({ where: { name: 'Campus Rentals LLC' } })
    if (!entity) {
      console.log('Entity not found')
      return
    }
    const existing = await prisma.entityInvestment.findFirst({
      where: { propertyId: property.id, entityId: entity.id }
    })
    if (existing) {
      const updated = await prisma.entityInvestment.update({
        where: { id: existing.id },
        data: { investmentAmount: 215000, ownershipPercentage: 100 }
      })
      console.log('Updated entity investment:', updated.id)
    } else {
      const created = await prisma.entityInvestment.create({
        data: {
          entityId: entity.id,
          propertyId: property.id,
          investmentAmount: 215000,
          ownershipPercentage: 100,
          status: 'ACTIVE'
        }
      })
      console.log('Created entity investment:', created.id)
    }
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

run()
