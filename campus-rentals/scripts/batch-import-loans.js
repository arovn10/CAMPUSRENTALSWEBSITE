/**
 * Batch Import Loans Script
 * 
 * This script imports all loan data from the investment summary into the database.
 * Run with: node scripts/batch-import-loans.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Loan data mapped by property address
const loanData = {
  '2422 Joseph St, New Orleans, LA 70115': [
    {
      lenderName: 'Metairie Bank',
      accountNumber: '7058931',
      originalAmount: 620000,
      currentBalance: 588149,
      maturityDate: new Date('2025-04-25'),
      monthlyPayment: 4658,
      loanType: 'Mortgage',
      loanDate: new Date('2023-04-25')
    },
    {
      lenderName: 'Metairie Bank',
      accountNumber: '7060299',
      originalAmount: 120953,
      currentBalance: 119571,
      maturityDate: new Date('2026-11-29'),
      monthlyPayment: 1012,
      loanType: 'Mortgage',
      loanDate: new Date('2024-05-29')
    }
  ],
  '7700 Burthe St, New Orleans, LA 70118': [
    {
      lenderName: 'Metairie Bank',
      accountNumber: '7058933',
      originalAmount: 860000,
      currentBalance: 831927,
      maturityDate: new Date('2025-04-25'),
      monthlyPayment: 5859,
      loanType: 'Mortgage',
      loanDate: new Date('2023-04-25')
    }
  ],
  '7608 Zimpel St, New Orleans, LA 70118': [
    {
      lenderName: 'Metairie Bank',
      accountNumber: '7058935',
      originalAmount: 442500,
      currentBalance: 431389,
      maturityDate: new Date('2026-04-25'),
      monthlyPayment: 3299,
      loanType: 'Mortgage',
      loanDate: new Date('2023-04-25')
    }
  ],
  '7500 Zimple St, New Orleans, LA 70118': [
    {
      lenderName: 'Metairie Bank',
      accountNumber: '7059088',
      originalAmount: 832000,
      currentBalance: 811838,
      maturityDate: new Date('2026-08-01'),
      monthlyPayment: 6576,
      loanType: 'Mortgage',
      loanDate: new Date('2023-06-23')
    }
  ],
  '7506 Zimpel St, New Orleans, LA 70118': [
    {
      lenderName: 'Metairie Bank',
      accountNumber: '7060141',
      originalAmount: 577600,
      currentBalance: 571441,
      maturityDate: new Date('2026-12-15'),
      monthlyPayment: 3730,
      loanType: 'Mortgage',
      loanDate: new Date('2023-12-15')
    }
  ],
  '1414 Audubon St, New Orleans, LA 70118': [
    {
      lenderName: 'Metairie Bank',
      accountNumber: '7060057',
      originalAmount: 631875,
      currentBalance: 610299,
      maturityDate: new Date('2025-10-30'),
      monthlyPayment: 5134,
      loanType: 'Mortgage',
      loanDate: new Date('2023-10-30')
    },
    {
      lenderName: 'Metairie Bank',
      accountNumber: '7060301',
      originalAmount: 140839,
      currentBalance: 140446,
      maturityDate: new Date('2026-11-29'),
      monthlyPayment: 1175,
      loanType: 'Mortgage',
      loanDate: new Date('2024-05-29')
    }
  ],
  '460 NW 20th St, Boca Raton, FL 33496': [
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
  ],
  '7313-15 Freret St, New Orleans, LA': [
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
  ],
  '1128 Lowerline St, New Orleans, LA': [
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
}

async function findAdminUser() {
  const admin = await prisma.user.findFirst({
    where: {
      role: 'ADMIN'
    }
  })

  if (!admin) {
    throw new Error('No admin user found. Please create an admin user first.')
  }

  return admin.id
}

async function importLoans() {
  console.log('🚀 Starting loan import...\n')

  try {
    const adminUserId = await findAdminUser()
    console.log(`📋 Using admin user ID: ${adminUserId}\n`)

    let totalImported = 0
    let totalSkipped = 0

    // Get all properties
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        address: true,
        name: true
      }
    })

    console.log(`Found ${properties.length} properties in database\n`)

    for (const property of properties) {
      // Try to match property by address
      const addressToMatch = property.address.trim()
      const matchingLoans = loanData[addressToMatch] || 
                           loanData[Object.keys(loanData).find(key => 
                             addressToMatch.toLowerCase().includes(key.toLowerCase()) ||
                             key.toLowerCase().includes(addressToMatch.toLowerCase())
                           )] || []

      if (matchingLoans.length === 0) {
        console.log(`⏭️  Skipping ${property.name} (${property.address}) - no loan data found`)
        totalSkipped++
        continue
      }

      console.log(`\n📦 Processing: ${property.name} (${property.address})`)
      console.log(`   Found ${matchingLoans.length} loan(s) to import`)

      for (const loanInfo of matchingLoans) {
        // Check if loan already exists
        const existing = await prisma.propertyLoan.findFirst({
          where: {
            propertyId: property.id,
            accountNumber: loanInfo.accountNumber,
            lenderName: loanInfo.lenderName
          }
        })

        if (existing) {
          console.log(`   ⚠️  Loan ${loanInfo.accountNumber} already exists - skipping`)
          continue
        }

        try {
          const loan = await prisma.propertyLoan.create({
            data: {
              propertyId: property.id,
              lenderName: loanInfo.lenderName,
              accountNumber: loanInfo.accountNumber,
              originalAmount: loanInfo.originalAmount,
              currentBalance: loanInfo.currentBalance,
              interestRate: loanInfo.interestRate || null,
              loanDate: loanInfo.loanDate || null,
              maturityDate: loanInfo.maturityDate || null,
              monthlyPayment: loanInfo.monthlyPayment || null,
              loanType: loanInfo.loanType || null,
              notes: loanInfo.notes || null,
              isActive: true,
              createdBy: adminUserId
            }
          })

          console.log(`   ✅ Created loan: ${loan.lenderName} - ${loan.accountNumber} (${loan.originalAmount.toLocaleString()})`)
          totalImported++
        } catch (error) {
          console.error(`   ❌ Error creating loan ${loanInfo.accountNumber}:`, error.message)
        }
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

    console.log(`\n✅ Import complete!`)
    console.log(`   Total loans imported: ${totalImported}`)
    console.log(`   Properties skipped: ${totalSkipped}`)
    console.log(`   Total properties processed: ${properties.length}\n`)

  } catch (error) {
    console.error('❌ Error during import:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the import
importLoans()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

