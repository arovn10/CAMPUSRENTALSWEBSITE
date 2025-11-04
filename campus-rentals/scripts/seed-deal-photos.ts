/**
 * Script to seed deal photos from the old abode backend
 * Downloads photos from the old site and uploads them to the new S3 bucket
 */

import { PrismaClient } from '@prisma/client'
import { investorS3Service } from '../src/lib/investorS3Service'
import https from 'https'
import http from 'http'
import { URL } from 'url'

const prisma = new PrismaClient()

interface OldBackendPhoto {
  photoId: number
  photoLink: string
  description?: string
  photoOrder?: number
}

/**
 * Download image from URL and return as Buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const protocol = urlObj.protocol === 'https:' ? https : http

    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`))
        return
      }

      const chunks: Buffer[] = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
      response.on('error', reject)
    }).on('error', reject)
  })
}

/**
 * Fetch photos from old backend for a property
 */
async function fetchPhotosFromOldBackend(propertyId: number): Promise<OldBackendPhoto[]> {
  try {
    const response = await fetch(`https://abode-backend.onrender.com/api/photos/get/${propertyId}`, {
      cache: 'no-store',
    })
    
    if (!response.ok) {
      console.log(`  No photos found for property ${propertyId} (status: ${response.status})`)
      return []
    }
    
    const photos = await response.json()
    return Array.isArray(photos) ? photos : []
  } catch (error) {
    console.error(`  Error fetching photos for property ${propertyId}:`, error)
    return []
  }
}

/**
 * Extract file name and extension from URL
 */
function getFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const fileName = pathname.substring(pathname.lastIndexOf('/') + 1)
    // If no extension, default to .jpg
    if (!fileName.includes('.')) {
      return `${fileName}.jpg`
    }
    return fileName
  } catch {
    return `photo_${Date.now()}.jpg`
  }
}

/**
 * Get content type from URL or file extension
 */
function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.') + 1)
  const mimeTypes: { [key: string]: string } = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  }
  return mimeTypes[ext] || 'image/jpeg'
}

/**
 * Main seeding function
 */
async function seedDealPhotos() {
  console.log('Starting deal photos seeding...\n')

  try {
    // Get an admin user for uploadedBy field
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
      },
      select: {
        id: true,
        email: true,
      },
    })

    if (!adminUser) {
      throw new Error('No admin user found in database. Cannot proceed with seeding.')
    }

    console.log(`Using admin user: ${adminUser.email} (${adminUser.id})\n`)

    // Get all direct investments with their properties
    const directInvestments = await prisma.investment.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            propertyId: true, // Numeric ID from old backend
          },
        },
      },
    })

    // Note: DealPhoto only references Investment (direct investments), not EntityInvestment
    // Entity investments are handled separately through their property relationship
    // For now, we'll only seed photos for direct investments
    // If entity investments need photos, they would need to be linked through the property
    
    console.log(`Found ${directInvestments.length} direct investments to process\n`)

    const allInvestments = directInvestments.map(inv => ({ ...inv, type: 'DIRECT' as const }))

    let totalPhotosProcessed = 0
    let totalPhotosCreated = 0
    let totalErrors = 0

    for (const investment of allInvestments) {
      if (!investment.property) {
        console.log(`Skipping investment ${investment.id} - no property`)
        continue
      }

      // Try to get property ID from propertyId field (numeric ID from old backend)
      const oldBackendPropertyId = (investment.property as any).propertyId || null

      if (!oldBackendPropertyId || typeof oldBackendPropertyId !== 'number') {
        console.log(`Skipping investment ${investment.id} (${investment.property.name}) - no numeric propertyId to match with old backend`)
        continue
      }

      console.log(`\nProcessing ${investment.type} investment: ${investment.id}`)
      console.log(`  Property: ${investment.property.name} (Old ID: ${oldBackendPropertyId})`)

      // Check if photos already exist for this investment
      const existingPhotos = await prisma.dealPhoto.findMany({
        where: { investmentId: investment.id },
      })

      if (existingPhotos.length > 0) {
        console.log(`  Already has ${existingPhotos.length} photos - skipping`)
        continue
      }

      // Fetch photos from old backend
      const oldPhotos = await fetchPhotosFromOldBackend(oldBackendPropertyId)

      if (oldPhotos.length === 0) {
        console.log(`  No photos found in old backend`)
        continue
      }

      console.log(`  Found ${oldPhotos.length} photos in old backend`)

      // Process each photo
      for (let i = 0; i < oldPhotos.length; i++) {
        const oldPhoto = oldPhotos[i]
        try {
          console.log(`  Downloading photo ${i + 1}/${oldPhotos.length}: ${oldPhoto.photoLink}`)

          // Download the image
          const imageBuffer = await downloadImage(oldPhoto.photoLink)
          totalPhotosProcessed++

          // Get file name and content type
          const fileName = getFileNameFromUrl(oldPhoto.photoLink)
          const contentType = getContentType(fileName)

          // Upload to S3
          console.log(`  Uploading to S3...`)
          const uploadResult = await investorS3Service.uploadPhoto({
            fileName,
            buffer: imageBuffer,
            contentType,
            investmentId: investment.id,
          })

          // Create DealPhoto record
          const dealPhoto = await prisma.dealPhoto.create({
            data: {
              investmentId: investment.id,
              photoUrl: uploadResult.url,
              s3Key: uploadResult.key,
              fileName,
              description: oldPhoto.description || null,
              displayOrder: oldPhoto.photoOrder ?? i,
              isThumbnail: i === 0, // First photo is thumbnail
              fileSize: imageBuffer.length,
              mimeType: contentType,
              uploadedBy: adminUser.id,
            },
          })

          totalPhotosCreated++
          console.log(`  ✓ Created deal photo: ${dealPhoto.id}`)
        } catch (error) {
          totalErrors++
          console.error(`  ✗ Error processing photo ${i + 1}:`, error)
        }
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('Seeding complete!')
    console.log(`Total photos processed: ${totalPhotosProcessed}`)
    console.log(`Total photos created: ${totalPhotosCreated}`)
    console.log(`Total errors: ${totalErrors}`)
    console.log('='.repeat(50))
  } catch (error) {
    console.error('Fatal error during seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
seedDealPhotos()
  .then(() => {
    console.log('\nScript completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\nScript failed:', error)
    process.exit(1)
  })

