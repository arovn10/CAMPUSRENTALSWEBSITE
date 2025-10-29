const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAddresses() {
  const properties = await prisma.property.findMany({
    where: {
      OR: [
        { address: { contains: '7608' } },
        { address: { contains: '7506' } },
        { address: { contains: 'Lowerline' } },
        { address: { contains: 'Joseph' } }
      ]
    },
    select: { id: true, address: true, name: true }
  })
  
  console.log('\nProperties found:')
  properties.forEach(p => {
    console.log(`  - ${p.name}: "${p.address}"`)
  })
  
  await prisma.$disconnect()
}

checkAddresses()

