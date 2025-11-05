import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mapping provided by Alec: Old main-site propertyId -> Property name in our DB
const MAIN_SITE_ID_TO_NAME: Record<number, string> = {
  1: '2422 Joseph St',
  2: '2422 Joseph St',
  3: '7506 Zimple St',
  4: '7506 Zimple St',
  5: '7500 Zimple St/1032 Cherokee St',
  6: '7313-15 Freret St',
  7: '1414 Audubon St',
  8: '7500 Zimple St/1032 Cherokee St',
  9: '1414 Audubon St',
  10: '7700 Burthe St',
  12: '7608 Zimple St',
  13: '7313-15 Freret St',
}

async function run() {
  const names = new Set(Object.values(MAIN_SITE_ID_TO_NAME))
  const properties = await prisma.property.findMany({
    where: { name: { in: Array.from(names) } },
    select: { id: true, name: true, propertyId: true },
  })

  const nameToId = new Map(properties.map(p => [p.name, p.id]))

  const updates: Array<{ id: string, oldId: number | null, newId: number }> = []
  for (const [mainIdStr, name] of Object.entries(MAIN_SITE_ID_TO_NAME)) {
    const mainId = Number(mainIdStr)
    const id = nameToId.get(name)
    if (!id) {
      console.warn(`Property not found by name: ${name}`)
      continue
    }
    const current = properties.find(p => p.id === id)!
    if (current.propertyId !== mainId) {
      updates.push({ id, oldId: current.propertyId as number | null, newId: mainId })
    }
  }

  if (updates.length === 0) {
    console.log('No propertyId updates needed.')
  } else {
    console.log('Applying propertyId updates:')
    for (const u of updates) {
      console.log(` - ${u.id} (${properties.find(p => p.id === u.id)?.name}): ${u.oldId ?? 'null'} -> ${u.newId}`)
      await prisma.property.update({ where: { id: u.id }, data: { propertyId: u.newId } })
    }
  }

  await prisma.$disconnect()
}

run().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1) })


