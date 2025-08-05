const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupDistributions() {
  try {
    console.log('Starting cleanup of all distributions...')
    
    // Delete all waterfall tier distributions first (due to foreign key constraints)
    const deletedTierDistributions = await prisma.waterfallTierDistribution.deleteMany({})
    console.log(`Deleted ${deletedTierDistributions.count} waterfall tier distributions`)
    
    // Delete all waterfall distributions
    const deletedDistributions = await prisma.waterfallDistribution.deleteMany({})
    console.log(`Deleted ${deletedDistributions.count} waterfall distributions`)
    
    // Delete all legacy distributions
    const deletedLegacyDistributions = await prisma.distribution.deleteMany({})
    console.log(`Deleted ${deletedLegacyDistributions.count} legacy distributions`)
    
    console.log('Cleanup completed successfully!')
  } catch (error) {
    console.error('Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupDistributions() 