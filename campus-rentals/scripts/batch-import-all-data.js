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
  '7500 Zimple St, New Orleans, LA 70118': {
    entityName: 'Campus Rentals LLC',
    investmentAmount: 74037.57,
    ownershipPercentage: 100,
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
  '7506 Zimpel St, New Orleans, LA 70118': {
    entityName: 'Campus Rentals LLC',
    investmentAmount: 148862.08,
    ownershipPercentage: 100,
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
  '460 NW 20th St, Boca Raton, FL 33496': {
    entityName: 'Campus Rentals LLC',
    investmentAmount: 31213.94,
    ownershipPercentage: 100,
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
  '490 NW 20th St Apt 105, Boca Raton, FL': {
    entityName: 'Campus Rentals LLC',
    investmentAmount: 206000,
    ownershipPercentage: 100,
    loans: []
  },
  '7313-15 Freret St, New Orleans, LA': {
    entityName: 'Campus Rentals 2 LLC',
    investmentAmount: 61067.11,
    ownershipPercentage: 100,
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
  '490 NW 20th St Unit 1050, Boca Raton, FL': {
    entityName: 'Campus Rentals 2 LLC',
    investmentAmount: 102764.58,
    ownershipPercentage: 100,
    loans: []
  },
  '460 NW 20th St Unit 1110, Boca Raton, FL': {
    entityName: 'Campus Rentals 2 LLC',
    investmentAmount: 5000,
    ownershipPercentage: 100,
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

// Entity ownership structure
const entityStructure = {
  'Campus Rentals LLC': {
    type: 'LLC',
    owners: [
      { email: 'rovnerproperties@gmail.com', ownershipPercentage: 51, investmentAmount: 0 }, // Steven
      { email: 'alec.rovner@campusrentalsllc.com', ownershipPercentage: 49, investmentAmount: 0 } // Alec - UPDATE email if different
    ]
  },
  'Campus Rentals 2 LLC': {
    type: 'LLC',
    owners: [
      { entityName: 'Campus Rentals LLC', ownershipPercentage: 66.67, investmentAmount: 0 },
      { email: 'sam.torres@example.com', ownershipPercentage: 33.33, investmentAmount: 0 } // Sam Torres - adjust email
    ]
  },
  'Campus Rentals 3 LLC': {
    type: 'LLC',
    owners: [
      { entityName: 'Campus Rentals LLC', ownershipPercentage: 50, investmentAmount: 0 },
      { email: 'sam.torres@example.com', ownershipPercentage: 50, investmentAmount: 0 }
    ]
  }
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
      adminUser = await findOrCreateUser('rovnerproperties@gmail.com', 'Steven', 'Rovner', 'ADMIN')
    }

    console.log(`📋 Using admin user: ${adminUser.email} (${adminUser.id})\n`)

    // Step 1: Create/Update Users
    console.log('👥 Step 1: Setting up users...')
    const steven = await findOrCreateUser('rovnerproperties@gmail.com', 'Steven', 'Rovner', 'ADMIN')
    // For Alec, use a unique email or create account manually first
    // For now, using a placeholder - UPDATE THIS EMAIL
    let alec
    try {
      alec = await findOrCreateUser('alec.rovner@campusrentalsllc.com', 'Alec', 'Rovner', 'ADMIN')
    } catch (error) {
      console.log('   ⚠️  Could not create Alec user, will use Steven for now')
      alec = steven
    }
    // Sam Torres - UPDATE THIS EMAIL
    let sam
    try {
      sam = await findOrCreateUser('sam.torres@campusrentalsllc.com', 'Sidney', 'Torres V', 'INVESTOR')
    } catch (error) {
      console.log('   ⚠️  Could not create Sam user, skipping for now')
      sam = null
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

    // Campus Rentals 2 LLC - CR LLC as owner (nested entity)
    // Note: This requires entity-to-entity ownership which may need special handling
    // For now, we'll track this separately
    
    // Campus Rentals 3 LLC - CR LLC as owner (nested entity)
    
    console.log('   ✅ Entity ownership configured\n')

    // Step 4: Import Properties and Entity Investments
    console.log('🏠 Step 4: Processing properties and investments...')
    
    const properties = await prisma.property.findMany({
      select: { id: true, address: true, name: true }
    })

    let propertiesProcessed = 0
    let loansImported = 0

    for (const property of properties) {
      const addressToMatch = property.address.trim().toLowerCase()
      // Try exact match first
      let matchingData = propertyData[property.address.trim()]
      
      // Try fuzzy match with normalized addresses (handle Zimpel vs Zimple)
      if (!matchingData) {
        const normalizedAddress = addressToMatch.replace(/zimpel/g, 'zimple').replace(/zimple/g, 'zimpel')
        matchingData = propertyData[Object.keys(propertyData).find(key => {
          const keyLower = key.toLowerCase()
          const normalizedKey = keyLower.replace(/zimpel/g, 'zimple').replace(/zimple/g, 'zimpel')
          return addressToMatch === keyLower || 
                 normalizedAddress === normalizedKey ||
                 addressToMatch.includes(keyLower.split(',')[0]) ||
                 keyLower.includes(addressToMatch.split(',')[0])
        })]
      }

      if (!matchingData) {
        console.log(`⏭️  Skipping ${property.name} (${property.address}) - no matching data`)
        continue
      }

      console.log(`\n📦 Processing: ${property.name}`)
      console.log(`   Address: ${property.address}`)
      console.log(`   Entity: ${matchingData.entityName}`)
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

