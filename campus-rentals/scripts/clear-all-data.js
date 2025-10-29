/**
 * Clear All Investment Data Script
 * 
 * Deletes ALL entity investments and property loans
 * Use this before reimporting data to start fresh
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearAllData() {
  try {
    console.log('🗑️  Clearing ALL investment data...')
    console.log('')
    
    // Delete entity investments
    const deletedInvestments = await prisma.entityInvestment.deleteMany({})
    console.log(`   ✅ Deleted ${deletedInvestments.count} entity investments`)
    
    // Delete property loans (check if model exists)
    let deletedLoans = { count: 0 }
    try {
      if (prisma.propertyLoan) {
        deletedLoans = await prisma.propertyLoan.deleteMany({})
      }
    } catch (error) {
      console.log(`   ⚠️  Could not delete loans: ${error.message}`)
    }
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
    console.log('✅ All data cleared successfully!')
    console.log('')
    console.log('Now run: node scripts/batch-import-all-data.js')
    
  } catch (error) {
    console.error('❌ Error clearing data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

clearAllData()

