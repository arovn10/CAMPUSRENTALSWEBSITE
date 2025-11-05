/**
 * Cleanup script: deletes ALL DealPhoto records and their S3 objects
 */

import { PrismaClient } from '@prisma/client'
import { investorS3Service } from '../src/lib/investorS3Service'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables (.env.local first, then .env)
const envLocalPath = resolve(process.cwd(), '.env.local')
const envPath = resolve(process.cwd(), '.env')
config({ path: envLocalPath })
config({ path: envPath })

const prisma = new PrismaClient()

async function cleanupDealPhotos() {
  console.log('Starting cleanup of all deal photos...')

  try {
    const totalBefore = await prisma.dealPhoto.count()
    console.log(`Found ${totalBefore} deal photos to delete`)

    if (totalBefore === 0) {
      console.log('No deal photos found. Nothing to clean up.')
      return
    }

    const photos = await prisma.dealPhoto.findMany({
      select: { id: true, s3Key: true }
    })

    let s3Deleted = 0
    let s3Errors = 0

    // Delete S3 objects (best-effort)
    for (const p of photos) {
      if (!p.s3Key) continue
      try {
        await investorS3Service.deletePhoto(p.s3Key)
        s3Deleted++
      } catch (err) {
        s3Errors++
        console.error(`S3 delete failed for ${p.id} (${p.s3Key}):`, err instanceof Error ? err.message : String(err))
      }
    }

    console.log(`S3 deletes complete. Success: ${s3Deleted}, Errors: ${s3Errors}`)

    // Delete DB records
    const result = await prisma.dealPhoto.deleteMany({})
    console.log(`Deleted ${result.count} deal photo records from database`)

    const totalAfter = await prisma.dealPhoto.count()
    console.log(`Cleanup finished. Remaining records: ${totalAfter}`)
  } catch (error) {
    console.error('Fatal error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

cleanupDealPhotos()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))


