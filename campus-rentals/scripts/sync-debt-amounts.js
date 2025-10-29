/**
 * Sync Property Debt Amounts from Loans
 * 
 * This script ensures all property debtAmount fields match the sum of active loans
 * Run this if debt amounts get out of sync
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function syncDebtAmounts() {
  console.log('🔄 Syncing property debt amounts from loans...\n')
  
  const properties = await prisma.property.findMany({
    include: {
      loans: {
        where: {
          isActive: true
        }
      }
    }
  })

  let updated = 0
  let errors = 0

  for (const property of properties) {
    try {
      const totalDebt = property.loans.reduce((sum, loan) => sum + loan.currentBalance, 0)
      
      const debtDetails = property.loans.length > 0
        ? property.loans.map(loan => 
            `${loan.lenderName}: $${loan.currentBalance.toLocaleString()}`
          ).join('; ')
        : null

      if (property.debtAmount !== totalDebt) {
        await prisma.property.update({
          where: { id: property.id },
          data: {
            debtAmount: totalDebt,
            debtDetails: debtDetails
          }
        })
        
        console.log(`✅ ${property.name || property.address}: $${property.debtAmount.toLocaleString()} → $${totalDebt.toLocaleString()}`)
        updated++
      } else {
        console.log(`✓ ${property.name || property.address}: $${totalDebt.toLocaleString()} (already correct)`)
      }
    } catch (error) {
      console.error(`❌ Error updating ${property.name || property.address}:`, error.message)
      errors++
    }
  }

  console.log(`\n✅ Sync complete!`)
  console.log(`   Updated: ${updated} properties`)
  console.log(`   Already correct: ${properties.length - updated - errors}`)
  if (errors > 0) {
    console.log(`   Errors: ${errors}`)
  }
  
  await prisma.$disconnect()
}

syncDebtAmounts()

