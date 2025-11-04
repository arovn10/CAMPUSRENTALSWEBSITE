/**
 * Script to seed deal photos from the old abode backend
 * Downloads photos from the old site and uploads them to the new S3 bucket
 */

import { PrismaClient } from '@prisma/client'
import { investorS3Service } from '../src/lib/investorS3Service'
import https from 'https'
import http from 'http'
import { URL } from 'url'
// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'

// Try to load .env.local first, then .env
const envLocalPath = resolve(process.cwd(), '.env.local')
const envPath = resolve(process.cwd(), '.env')

config({ path: envLocalPath })
config({ path: envPath })

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
 * Mapping of property names to old backend property IDs
 * Multiple IDs can map to the same property (e.g., different listings)
 */
const PROPERTY_TO_OLD_BACKEND_IDS: { [key: string]: number[] } = {
  '2422 Joseph St': [1],
  '7700 Burthe St': [2, 11],
  '7506 Zimple St': [3, 4],
  '7500 Zimple St/1032 Cherokee St': [5, 8],
  '7500 Zimple St': [5, 8], // Alternative name
  '1032 Cherokee St': [5, 8], // Alternative name
  '7315 Freret St': [6, 13],
  '7313-15 Freret St': [6, 13], // Alternative name
  '1414 Audubon St': [7, 9],
  '7508 Zimple St': [12],
  '7608 Zimple St': [], // Add if known
}

/**
 * Get old backend property IDs for a property name
 */
function getOldBackendIdsForProperty(propertyName: string): number[] {
  // Try exact match first
  const exactMatch = PROPERTY_TO_OLD_BACKEND_IDS[propertyName]
  if (exactMatch) return exactMatch

  // Try case-insensitive match
  const lowerName = propertyName.toLowerCase().trim()
  for (const [key, ids] of Object.entries(PROPERTY_TO_OLD_BACKEND_IDS)) {
    if (key.toLowerCase().trim() === lowerName) {
      return ids
    }
  }

  // Try partial match (contains)
  for (const [key, ids] of Object.entries(PROPERTY_TO_OLD_BACKEND_IDS)) {
    if (lowerName.includes(key.toLowerCase().trim()) || key.toLowerCase().trim().includes(lowerName)) {
      return ids
    }
  }

  return []
}

/**
 * Fetch photos from old backend for a property ID
 */
async function fetchPhotosFromOldBackend(propertyId: number): Promise<OldBackendPhoto[]> {
  try {
    const response = await fetch(`https://abode-backend.onrender.com/api/photos/get/${propertyId}`, {
      cache: 'no-store',
    })
    
    if (!response.ok) {
      return []
    }
    
    const photos = await response.json()
    return Array.isArray(photos) ? photos : []
  } catch (error) {
    return []
  }
}

/**
 * Fetch all photos from old backend for a property (checking all mapped IDs)
 */
async function fetchAllPhotosForProperty(propertyName: string): Promise<OldBackendPhoto[]> {
  const oldBackendIds = getOldBackendIdsForProperty(propertyName)
  
  if (oldBackendIds.length === 0) {
    return []
  }

  // Fetch photos from all mapped property IDs
  const allPhotos: OldBackendPhoto[] = []
  const seenUrls = new Set<string>()

  for (const propertyId of oldBackendIds) {
    const photos = await fetchPhotosFromOldBackend(propertyId)
    for (const photo of photos) {
      // Deduplicate by URL
      if (!seenUrls.has(photo.photoLink)) {
        seenUrls.add(photo.photoLink)
        allPhotos.push(photo)
      }
    }
  }

  return allPhotos
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

    // Verify AWS credentials are available
    const accessKeyId = process.env.INVESTOR_AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || ''
    const secretAccessKey = process.env.INVESTOR_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || ''
    const bucketName = process.env.INVESTOR_S3_BUCKET_NAME || process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'campusrentalswebsitebucket'
    const region = process.env.NEXT_PUBLIC_AWS_REGION || process.env.INVESTOR_AWS_REGION || 'us-east-2'

    if (!accessKeyId || !secretAccessKey) {
      console.error('ERROR: AWS credentials not found!')
      console.error('Required environment variables:')
      console.error('  - INVESTOR_AWS_ACCESS_KEY_ID or NEXT_PUBLIC_AWS_ACCESS_KEY_ID')
      console.error('  - INVESTOR_AWS_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY')
      console.error('\nCurrent values:')
      console.error(`  - accessKeyId: ${accessKeyId ? '***SET***' : 'NOT SET'}`)
      console.error(`  - secretAccessKey: ${secretAccessKey ? '***SET***' : 'NOT SET'}`)
      console.error(`  - bucketName: ${bucketName}`)
      console.error(`  - region: ${region}`)
      throw new Error('AWS credentials not configured. Cannot proceed with photo uploads.')
    }

    console.log('AWS Configuration:')
    console.log(`  - Bucket: ${bucketName}`)
    console.log(`  - Region: ${region}`)
    console.log(`  - Access Key ID: ${accessKeyId.substring(0, 8)}...${accessKeyId.length > 8 ? '***' : ''}`)
    console.log(`  - Secret Key: ${secretAccessKey ? '***SET***' : 'NOT SET'}\n`)

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

      const propertyName = investment.property.name

      console.log(`\nProcessing ${investment.type} investment: ${investment.id}`)
      console.log(`  Property: ${propertyName}`)

      // Check if photos already exist for this property (photos are linked to property, not investment)
      const existingPhotos = await prisma.dealPhoto.findMany({
        where: { propertyId: investment.property.id },
      })

      if (existingPhotos.length > 0) {
        console.log(`  Already has ${existingPhotos.length} photos for this property - skipping`)
        continue
      }

      // Get old backend IDs for this property
      const oldBackendIds = getOldBackendIdsForProperty(propertyName)
      
      if (oldBackendIds.length === 0) {
        console.log(`  No mapping found for property name - skipping`)
        continue
      }

      console.log(`  Checking old backend IDs: ${oldBackendIds.join(', ')}`)

      // Fetch photos from all mapped old backend property IDs
      const oldPhotos = await fetchAllPhotosForProperty(propertyName)

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
            investmentId: investment.property.id, // Use propertyId for folder organization
          })

          // Create DealPhoto record - linked to property, not investment
          const dealPhoto = await prisma.dealPhoto.create({
            data: {
              propertyId: investment.property.id,
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

