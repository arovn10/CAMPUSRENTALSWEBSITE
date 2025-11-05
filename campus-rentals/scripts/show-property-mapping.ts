import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function showMapping() {
  const props = await prisma.property.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      propertyId: true,
      address: true,
    },
    orderBy: { propertyId: 'asc' },
  })

  console.log('\nProperty Name -> Old Backend propertyId mapping:')
  console.log('='.repeat(80))
  console.log('Old propertyId | Property Name (Dashboard)                    | Address')
  console.log('-'.repeat(80))
  
  props.forEach((p) => {
    const propId = p.propertyId?.toString().padStart(2, ' ') || 'N/A'
    const name = (p.name || 'N/A').padEnd(45, ' ')
    const address = p.address || 'N/A'
    console.log(`${propId.padEnd(14)} | ${name} | ${address}`)
  })
  
  console.log('='.repeat(80))
  console.log(`\nTotal properties: ${props.length}`)
  
  await prisma.$disconnect()
}

showMapping().catch(console.error)

