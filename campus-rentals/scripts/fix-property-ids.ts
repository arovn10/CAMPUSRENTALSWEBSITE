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
  // Collapse duplicates: choose the lowest main-site id for each name
  const NAME_TO_LOWEST_ID = Object.entries(MAIN_SITE_ID_TO_NAME).reduce<Record<string, number>>((acc, [idStr, name]) => {
    const id = Number(idStr)
    acc[name] = acc[name] ? Math.min(acc[name], id) : id
    return acc
  }, {})

  const names = new Set(Object.keys(NAME_TO_LOWEST_ID))
  const properties = await prisma.property.findMany({
    where: { name: { in: Array.from(names) } },
    select: { id: true, name: true, propertyId: true },
  })

  const nameToId = new Map(properties.map(p => [p.name, p.id]))

  const updates: Array<{ id: string, oldId: number | null, newId: number, name: string }> = []
  for (const [name, mainId] of Object.entries(NAME_TO_LOWEST_ID)) {
    const id = nameToId.get(name)
    if (!id) {
      console.warn(`Property not found by name: ${name}`)
      continue
    }
    const current = properties.find(p => p.id === id)!
    if (current.propertyId !== mainId) {
      updates.push({ id, oldId: current.propertyId as number | null, newId: mainId, name })
    }
  }

  if (updates.length === 0) {
    console.log('No propertyId updates needed.')
  } else {
    // First, free any conflicting propertyIds by setting them to null
    const targetIds = new Set(updates.map(u => u.newId))
    const conflicts = await prisma.property.findMany({
      where: { propertyId: { in: Array.from(targetIds) } },
      select: { id: true, name: true, propertyId: true },
    })
    let tmpCounter = 100001
    for (const c of conflicts) {
      const shouldOwn = updates.find(u => u.newId === c.propertyId && u.id === c.id)
      if (!shouldOwn) {
        const tmpId = tmpCounter++
        console.log(`Temporarily moving propertyId ${c.propertyId} from ${c.name} (${c.id}) to ${tmpId}`)
        await prisma.property.update({ where: { id: c.id }, data: { propertyId: tmpId } })
      }
    }

    console.log('Applying propertyId updates:')
    for (const u of updates) {
      console.log(` - ${u.name}: ${u.oldId ?? 'null'} -> ${u.newId}`)
      await prisma.property.update({ where: { id: u.id }, data: { propertyId: u.newId } })
    }
  }

  await prisma.$disconnect()
}

run().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1) })


