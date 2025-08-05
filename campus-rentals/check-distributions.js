const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDistributions() {
  try {
    console.log('Checking all distributions in database...')
    
    // Check waterfall distributions
    const waterfallDistributions = await prisma.waterfallDistribution.findMany({
      include: {
        waterfallStructure: {
          select: {
            id: true,
            name: true,
            propertyId: true
          }
        }
      }
    })
    
    console.log(`Found ${waterfallDistributions.length} waterfall distributions:`)
    waterfallDistributions.forEach((dist, index) => {
      console.log(`${index + 1}. ID: ${dist.id}`)
      console.log(`   Amount: $${dist.totalAmount}`)
      console.log(`   Date: ${dist.distributionDate}`)
      console.log(`   Structure: ${dist.waterfallStructure.name}`)
      console.log(`   Property ID: ${dist.waterfallStructure.propertyId}`)
      console.log('')
    })
    
    // Check waterfall tier distributions
    const tierDistributions = await prisma.waterfallTierDistribution.findMany({
      include: {
        waterfallTier: {
          include: {
            waterfallStructure: {
              select: {
                id: true,
                name: true,
                propertyId: true
              }
            }
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })
    
    console.log(`Found ${tierDistributions.length} waterfall tier distributions:`)
    tierDistributions.forEach((dist, index) => {
      console.log(`${index + 1}. ID: ${dist.id}`)
      console.log(`   Amount: $${dist.distributionAmount}`)
      console.log(`   User: ${dist.user?.firstName} ${dist.user?.lastName}`)
      console.log(`   Structure: ${dist.waterfallTier.waterfallStructure.name}`)
      console.log(`   Property ID: ${dist.waterfallTier.waterfallStructure.propertyId}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('Error checking distributions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDistributions() 