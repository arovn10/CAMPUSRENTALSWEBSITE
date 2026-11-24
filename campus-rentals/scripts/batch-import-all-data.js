/**
 * Comprehensive Batch Import Script
 * 
 * Imports ALL data from investment summary:
 * - Entities (Campus Rentals LLC, Campus Rentals 2 LLC, Campus Rentals 3 LLC)
 * - Entity Owners (users and nested entities)
 * - Properties (with addresses matching)
 * - Entity Investments (linking entities to properties with investment amounts)
 * - Property Loans (all loans from debt schedule)
 * 
 * Run with: node scripts/batch-import-all-data.js
 * 
 * NOTE: This script will DELETE all existing entity investments and property loans
 * before importing new data. Investment dates will be set to the earliest loan
 * origination date for each property.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Property data with matching addresses
const propertyData = {
  '2422 Joseph St, New Orleans, LA 70115': {
    entityName: 'Campus Rentals LLC',
    investmentAmount: 247605.26,
    ownershipPercentage: 100, // Entity owns 100% of property
    currentValue: 826466.52,
    aliases: ['2422-24 Joseph', '2422 Joseph'],
    loans: [
      {
        lenderName: 'Metairie Bank',
        accountNumber: '7058931',
        originalAmount: 620000,
        currentBalance: 588149,
        maturityDate: new Date('2033-04-25'),
        monthlyPayment: 4658,
        loanType: 'Mortgage',
        loanDate: new Date('2023-04-25')
      },
      {
        lenderName: 'Metairie Bank',
        accountNumber: '7060299',
        originalAmount: 120953,
        currentBalance: 119571,
        maturityDate: new Date('2034-11-29'),
        monthlyPayment: 1012,
        loanType: 'Mortgage',
        loanDate: new Date('2024-05-29')
      }
    ]
  },
  '7700 Burthe St, New Orleans, LA 70118': {
    entityName: 'Campus Rentals LLC',
    investmentAmount: 215000, // Purchase $1,075,000 - Original loan $860,000
    ownershipPercentage: 100,
    currentValue: 1995277.42,
    loans: [
      {
        lenderName: 'Metairie Bank',
        accountNumber: '7058933',
        originalAmount: 860000,
        currentBalance: 831927,
        maturityDate: new Date('2033-04-25'),
        monthlyPayment: 5859,
        loanType: 'Mortgage',
        loanDate: new Date('2023-04-25')
      }
    ]
  },
  '7608 Zimpel St, New Orleans, LA 70118': {
    entityName: 'Campus Rentals LLC',
    investmentAmount: 71673.75,
    ownershipPercentage: 100,
    currentValue: 921181.42,
    aliases: ['7608 Zimple'],
    loans: [
      {
        lenderName: 'Metairie Bank',
        accountNumber: '7058935',
        originalAmount: 442500,
        currentBalance: 431389,
        maturityDate: new Date('2034-04-25'),
        monthlyPayment: 3299,
        loanType: 'Mortgage',
        loanDate: new Date('2023-04-25')
      }
    ]
  },
  '7500 Zimpel St, New Orleans, LA 70118': {
    entityName: 'Campus Rentals LLC',
    investmentAmount: 74037.57,
    ownershipPercentage: 100,
    currentValue: 1593387.90,
    aliases: ['7500 Zimple St', '7500 Zimpel', '1032 Cherokee'],
    loans: [
      {
        lenderName: 'Metairie Bank',
        accountNumber: '7059088',
        originalAmount: 832000,
        currentBalance: 811838,
        maturityDate: new Date('2034-08-01'),
        monthlyPayment: 6576,
        loanType: 'Mortgage',
        loanDate: new Date('2023-06-23')
      }
    ]
  },
  // Single consolidated property (loan x0141) — matches either 7504 or 7506 spellings
  '7504-7506 Zimpel St, New Orleans, LA 70118': {
    entityName: 'Campus Rentals LLC',
    investmentAmount: 148862.08,
    ownershipPercentage: 100,
    currentValue: 1658403.90,
    aliases: ['7506 Zimpel', '7506 Zimple', '7504 Zimpel', '7504 Zimple', '7504-7506'],
    loans: [
      {
        lenderName: 'Metairie Bank',
        accountNumber: '7060141',
        originalAmount: 577600,
        currentBalance: 571441,
        maturityDate: new Date('2034-12-15'),
        monthlyPayment: 3730,
        loanType: 'Mortgage',
        loanDate: new Date('2023-12-15')
      }
    ]
  },
  '1414 Audubon St, New Orleans, LA 70118': {
    entityName: 'Campus Rentals LLC',
    investmentAmount: 277121.02,
    ownershipPercentage: 100,
    currentValue: 1195867.90,
    loans: [
      {
        lenderName: 'Metairie Bank',
        accountNumber: '7060057',
        originalAmount: 631875,
        currentBalance: 610299,
        maturityDate: new Date('2033-10-30'),
        monthlyPayment: 5134,
        loanType: 'Mortgage',
        loanDate: new Date('2023-10-30')
      },
      {
        lenderName: 'Metairie Bank',
        accountNumber: '7060301',
        originalAmount: 140839,
        currentBalance: 140446,
        maturityDate: new Date('2034-11-29'),
        monthlyPayment: 1175,
        loanType: 'Mortgage',
        loanDate: new Date('2024-05-29')
      }
    ]
  },
  // CR2 Boca — Unit 106 (JD x5977)
  '460 NW 20th St Apt 106, Boca Raton, FL 33431': {
    entityName: 'Campus Rentals 2 LLC',
    investmentAmount: 31213.94,
    ownershipPercentage: 100,
    currentValue: 300000,
    aliases: ['460 NW 20th', 'Apt 106', 'Unit 106'],
    matchTokens: ['460', '106'],
    loans: [
      {
        lenderName: 'JD Bank',
        accountNumber: '9992205977',
        originalAmount: 198000,
        currentBalance: 190000,
        maturityDate: new Date('2029-02-01'),
        monthlyPayment: 1646,
        loanType: 'Mortgage',
        loanDate: new Date('2024-01-29')
      }
    ]
  },
  '7313-15 Freret St, New Orleans, LA': {
    entityName: 'Campus Rentals 2 LLC',
    investmentAmount: 61067.11,
    ownershipPercentage: 100,
    currentValue: 1703408.87,
    aliases: ['7313 Freret', '7315 Freret', '7313-15'],
    loans: [
      {
        lenderName: 'Planters Bank',
        accountNumber: '90150032996',
        originalAmount: 847556,
        currentBalance: 847556,
        maturityDate: new Date('2029-12-10'),
        monthlyPayment: 7327,
        loanType: 'Mortgage',
        loanDate: new Date('2024-09-27')
      }
    ]
  },
  // CR2 Boca — 490 Unit 105 (not Unit 1050 / 1110)
  '490 NW 20th St Apt 105, Boca Raton, FL 33431': {
    entityName: 'Campus Rentals 2 LLC',
    investmentAmount: 102764.58,
    ownershipPercentage: 100,
    aliases: ['490 NW 20th', 'Apt 105', 'Unit 105'],
    matchTokens: ['490', '105'],
    // Exclude fuzzy hits on 1050 / 1110
    excludeTokens: ['1050', '1110'],
    loans: []
  },
  '460 NW 20th St Unit 1110, Boca Raton, FL 33431': {
    entityName: 'Campus Rentals 2 LLC',
    investmentAmount: 5000,
    ownershipPercentage: 100,
    aliases: ['Unit 1110', '1110'],
    matchTokens: ['460', '1110'],
    loans: []
  },
  '1128 Lowerline St, New Orleans, LA': {
    entityName: 'Campus Rentals 3 LLC',
    investmentAmount: 138164.22,
    ownershipPercentage: 100,
    loans: [
      {
        lenderName: 'Planters Bank',
        accountNumber: '9000005122',
        originalAmount: 348984,
        currentBalance: 348984,
        maturityDate: new Date('2029-10-11'),
        monthlyPayment: 2200,
        loanType: 'Mortgage',
        loanDate: new Date('2024-10-11')
      }
    ]
  },
  '7900 Maple St, New Orleans, LA': {
    entityName: 'Campus Rentals LLC',
    investmentAmount: 1134918.50,
    ownershipPercentage: 100,
    loans: []
  }
}

// Entity ownership structure — emails must match live portal users
const entityStructure = {
  'Campus Rentals LLC': {
    type: 'LLC',
    owners: [
      { email: 'srovner@dial-law.com', ownershipPercentage: 51, investmentAmount: 0 }, // Steven
      { email: 'rovnerproperties@gmail.com', ownershipPercentage: 49, investmentAmount: 0 } // Alec
    ]
  },
  'Campus Rentals 2 LLC': {
    type: 'LLC',
    owners: [
      { entityName: 'Campus Rentals LLC', ownershipPercentage: 66.67, investmentAmount: 0 },
      { email: 'torres.samd@gmail.com', ownershipPercentage: 33.33, investmentAmount: 0 } // Sidney Torres V
    ]
  },
  'Campus Rentals 3 LLC': {
    type: 'LLC',
    owners: [
      { entityName: 'Campus Rentals LLC', ownershipPercentage: 50, investmentAmount: 0 },
      { email: 'torres.samd@gmail.com', ownershipPercentage: 50, investmentAmount: 0 }
    ]
  }
}

/** Normalize Zimpel/Zimple + collapse whitespace for matching */
function normalizeAddress(addr) {
  return String(addr || '')
    .toLowerCase()
    .replace(/zimpel/g, 'zimple')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Match a DB property address to propertyData without confusing Boca units
 * (105 vs 1050 vs 1110) or Zimpel spellings.
 */
function findPropertyData(address) {
  const raw = String(address || '').trim()
  if (propertyData[raw]) return propertyData[raw]

  const norm = normalizeAddress(raw)
  for (const [key, data] of Object.entries(propertyData)) {
    if (normalizeAddress(key) === norm) return data
    const aliases = data.aliases || []
    if (aliases.some((a) => norm.includes(normalizeAddress(a)))) {
      if (data.excludeTokens?.some((t) => norm.includes(String(t).toLowerCase()))) continue
      if (data.matchTokens?.length) {
        if (data.matchTokens.every((t) => norm.includes(String(t).toLowerCase()))) return data
        continue
      }
      return data
    }
    if (data.matchTokens?.length) {
      if (data.excludeTokens?.some((t) => norm.includes(String(t).toLowerCase()))) continue
      if (data.matchTokens.every((t) => norm.includes(String(t).toLowerCase()))) return data
    }
  }

  // Street-number + street-name fallback (first token of key before comma)
  for (const [key, data] of Object.entries(propertyData)) {
    if (data.matchTokens?.length) continue // already tried token-strict keys
    const streetKey = normalizeAddress(key.split(',')[0])
    if (streetKey && norm.includes(streetKey)) return data
  }
  return null
}

async function findOrCreateUser(email, firstName, lastName, role = 'INVESTOR') {
  let user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  })

  if (!user) {
    // Create user with a placeholder password (should be reset)
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash('TempPassword123!', 12)
    
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        password: hashedPassword,
        role,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date()
      }
    })
    console.log(`   ✅ Created user: ${email}`)
  }

  return user
}

async function findOrCreateEntity(name, type, adminUserId) {
  let entity = await prisma.entity.findFirst({
    where: { name }
  })

  if (!entity) {
    entity = await prisma.entity.create({
      data: {
        name,
        type,
        isActive: true,
        createdBy: adminUserId
      }
    })
    console.log(`   ✅ Created entity: ${name}`)
  }

  return entity
}

async function clearOldData() {
  console.log('🗑️  Step 0: Clearing old data...')
  
  try {
    // Delete all entity investments (will recreate)
    const deletedInvestments = await prisma.entityInvestment.deleteMany({})
    console.log(`   ✅ Deleted ${deletedInvestments.count} entity investments`)
    
    // Delete all property loans (will recreate)
    const deletedLoans = await prisma.propertyLoan.deleteMany({})
    console.log(`   ✅ Deleted ${deletedLoans.count} property loans`)
    
    // Reset property debt amounts
    await prisma.property.updateMany({
      data: {
        debtAmount: 0,
        debtDetails: null
      }
    })
    console.log(`   ✅ Reset property debt amounts`)
    console.log('')
  } catch (error) {
    console.error('   ⚠️  Error clearing old data (continuing anyway):', error.message)
    console.log('')
  }
}

async function importAllData() {
  console.log('🚀 Starting comprehensive data import...\n')

  try {
    // Clear old data first
    await clearOldData()
    // Find or create admin user
    let adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (!adminUser) {
      adminUser = await findOrCreateUser('arovner@campusrentalsllc.com', 'Alec', 'Rovner', 'ADMIN')
    }

    console.log(`📋 Using admin user: ${adminUser.email} (${adminUser.id})\n`)

    // Step 1: Create/Update Users
    console.log('👥 Step 1: Setting up users...')
    // Live portal emails (do not invent placeholders)
    const steven = await findOrCreateUser('srovner@dial-law.com', 'Steven', 'Rovner', 'INVESTOR')
    let alec =
      (await prisma.user.findFirst({
        where: {
          OR: [
            { email: 'rovnerproperties@gmail.com' },
            { email: 'arovner@campusrentalsllc.com' },
          ],
        },
      })) || (await findOrCreateUser('rovnerproperties@gmail.com', 'Alec', 'Rovner', 'ADMIN'))
    let sam =
      (await prisma.user.findFirst({
        where: {
          OR: [
            { email: 'torres.samd@gmail.com' },
            { email: 'sam.torres@campusrentalsllc.com' },
          ],
        },
      })) || null
    if (!sam) {
      try {
        sam = await findOrCreateUser('torres.samd@gmail.com', 'Sidney', 'Torres V', 'INVESTOR')
      } catch (error) {
        console.log('   ⚠️  Could not create Sam user, skipping for now')
        sam = null
      }
    }
    console.log('')

    // Step 2: Create Entities
    console.log('🏢 Step 2: Creating entities...')
    const crLLC = await findOrCreateEntity('Campus Rentals LLC', 'LLC', adminUser.id)
    const cr2LLC = await findOrCreateEntity('Campus Rentals 2 LLC', 'LLC', adminUser.id)
    const cr3LLC = await findOrCreateEntity('Campus Rentals 3 LLC', 'LLC', adminUser.id)
    console.log('')

    // Step 3: Set up Entity Owners
    console.log('👤 Step 3: Setting up entity ownership...')
    
    // Campus Rentals LLC owners
    let crStevenOwner = await prisma.entityOwner.findFirst({
      where: {
        entityId: crLLC.id,
        userId: steven.id
      }
    })
    if (!crStevenOwner) {
      crStevenOwner = await prisma.entityOwner.create({
        data: {
          entityId: crLLC.id,
          userId: steven.id,
          ownershipPercentage: 51,
          investmentAmount: 0,
          isActive: true
        }
      })
    } else {
      crStevenOwner = await prisma.entityOwner.update({
        where: { id: crStevenOwner.id },
        data: { ownershipPercentage: 51, isActive: true }
      })
    }

    let crAlecOwner = await prisma.entityOwner.findFirst({
      where: {
        entityId: crLLC.id,
        userId: alec.id
      }
    })
    if (!crAlecOwner) {
      crAlecOwner = await prisma.entityOwner.create({
        data: {
          entityId: crLLC.id,
          userId: alec.id,
          ownershipPercentage: 49,
          investmentAmount: 0,
          isActive: true
        }
      })
    } else {
      crAlecOwner = await prisma.entityOwner.update({
        where: { id: crAlecOwner.id },
        data: { ownershipPercentage: 49, isActive: true }
      })
    }

    // Campus Rentals 2 LLC — CR LLC (66.67%) + Sidney Torres (33.33%)
    const upsertEntityOwner = async ({ entityId, userId = null, investorEntityId = null, ownershipPercentage }) => {
      const where = userId
        ? { entityId, userId }
        : { entityId, investorEntityId }
      let row = await prisma.entityOwner.findFirst({ where })
      const data = {
        entityId,
        userId,
        investorEntityId,
        ownershipPercentage,
        investmentAmount: 0,
        isActive: true,
      }
      if (!row) row = await prisma.entityOwner.create({ data })
      else row = await prisma.entityOwner.update({ where: { id: row.id }, data })
      return row
    }
    await upsertEntityOwner({ entityId: cr2LLC.id, investorEntityId: crLLC.id, ownershipPercentage: 66.67 })
    if (sam) await upsertEntityOwner({ entityId: cr2LLC.id, userId: sam.id, ownershipPercentage: 33.33 })

    // Campus Rentals 3 LLC — CR LLC (50%) + Sidney Torres (50%)
    await upsertEntityOwner({ entityId: cr3LLC.id, investorEntityId: crLLC.id, ownershipPercentage: 50 })
    if (sam) await upsertEntityOwner({ entityId: cr3LLC.id, userId: sam.id, ownershipPercentage: 50 })
    
    console.log('   ✅ Entity ownership configured (including nested CR2/CR3)\n')

    // Step 4: Import Properties and Entity Investments
    console.log('🏠 Step 4: Processing properties and investments...')
    
    const properties = await prisma.property.findMany({
      select: { id: true, address: true, name: true }
    })

    let propertiesProcessed = 0
    let loansImported = 0

    for (const property of properties) {
      const matchingData = findPropertyData(property.address)

      if (!matchingData) {
        console.log(`⏭️  Skipping ${property.name} (${property.address}) - no matching data`)
        continue
      }

      console.log(`\n📦 Processing: ${property.name}`)
      console.log(`   Address: ${property.address}`)
      console.log(`   Entity: ${matchingData.entityName}`)

      if (matchingData.currentValue != null) {
        await prisma.property.update({
          where: { id: property.id },
          data: { currentValue: matchingData.currentValue },
        })
      }
      console.log(`   Investment: ${matchingData.investmentAmount.toLocaleString()}`)

      // Find the entity
      let entity = null
      if (matchingData.entityName === 'Campus Rentals LLC') {
        entity = crLLC
      } else if (matchingData.entityName === 'Campus Rentals 2 LLC') {
        entity = cr2LLC
      } else if (matchingData.entityName === 'Campus Rentals 3 LLC') {
        entity = cr3LLC
      }

      if (!entity) {
        console.log(`   ⚠️  Entity not found: ${matchingData.entityName}`)
        continue
      }

      // Import loans first to determine investment date
      let earliestLoanDate = null
      if (matchingData.loans && matchingData.loans.length > 0) {
        // Find earliest loan date first
        for (const loanInfo of matchingData.loans) {
          if (loanInfo.loanDate) {
            if (!earliestLoanDate || loanInfo.loanDate < earliestLoanDate) {
              earliestLoanDate = loanInfo.loanDate
            }
          }
        }

        // Import all loans
        for (const loanInfo of matchingData.loans) {
          await prisma.propertyLoan.create({
            data: {
              propertyId: property.id,
              lenderName: loanInfo.lenderName,
              accountNumber: loanInfo.accountNumber,
              originalAmount: loanInfo.originalAmount,
              currentBalance: loanInfo.currentBalance,
              interestRate: null,
              loanDate: loanInfo.loanDate || null,
              maturityDate: loanInfo.maturityDate || null,
              monthlyPayment: loanInfo.monthlyPayment || null,
              loanType: loanInfo.loanType || null,
              isActive: true,
              createdBy: adminUser.id
            }
          })
          console.log(`   ✅ Imported loan: ${loanInfo.lenderName} - ${loanInfo.accountNumber}`)
          loansImported++
        }

        // Update property debt amount
        const activeLoans = await prisma.propertyLoan.findMany({
          where: {
            propertyId: property.id,
            isActive: true
          }
        })

        const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.currentBalance, 0)

        await prisma.property.update({
          where: { id: property.id },
          data: {
            debtAmount: totalDebt,
            debtDetails: activeLoans.map(loan => 
              `${loan.lenderName}: $${loan.currentBalance.toLocaleString()}`
            ).join('; ')
          }
        })

        console.log(`   💰 Updated property debt: ${totalDebt.toLocaleString()}`)
      }

      // Create Entity Investment with investment date set to earliest loan date
      const investmentDate = earliestLoanDate || new Date() // Use first loan date, or current date if no loans
      
      await prisma.entityInvestment.create({
        data: {
          entityId: entity.id,
          propertyId: property.id,
          investmentAmount: matchingData.investmentAmount,
          ownershipPercentage: matchingData.ownershipPercentage,
          status: 'ACTIVE',
          investmentDate: investmentDate
        }
      })
      // Ensure default statuses on property
      await prisma.property.update({
        where: { id: property.id },
        data: {
          dealStatus: 'STABILIZED',
          fundingStatus: 'FUNDED'
        }
      })
      
      if (earliestLoanDate) {
        console.log(`   ✅ Created entity investment (date: ${investmentDate.toISOString().split('T')[0]})`)
      } else {
        console.log(`   ✅ Created entity investment`)
      }

      propertiesProcessed++
    }

    console.log(`\n✅ Import complete!`)
    console.log(`   Properties processed: ${propertiesProcessed}`)
    console.log(`   Loans imported: ${loansImported}`)
    console.log(`   Entities: Campus Rentals LLC, Campus Rentals 2 LLC, Campus Rentals 3 LLC`)
    console.log(`\n📝 Next Steps:`)
    console.log(`   1. Update user emails if they don't match (Sam Torres, Alec)`)
    console.log(`   2. Set up nested entity ownership for Campus Rentals 2 LLC and 3 LLC`)
    console.log(`   3. Verify all investment amounts match your records`)
    console.log(`   4. Run Prisma migration: npx prisma migrate dev`)

  } catch (error) {
    console.error('❌ Error during import:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the import
importAllData()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

