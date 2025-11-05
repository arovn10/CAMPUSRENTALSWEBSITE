import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'

// Initialize S3 client for investor dashboard
// Uses separate bucket or separate prefix for isolation
// Note: Secret keys should NEVER be in NEXT_PUBLIC_* variables for security
// Use AWS_SECRET_ACCESS_KEY in server-side only
const investorS3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || process.env.INVESTOR_AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.INVESTOR_AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.INVESTOR_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
})

// Use separate bucket for investor photos, or same bucket with different prefix
const INVESTOR_BUCKET_NAME = process.env.INVESTOR_S3_BUCKET_NAME || process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'campusrentalswebsitebucket'
const INVESTOR_PREFIX = 'investor-deals' // Prefix to isolate investor photos

export interface InvestorPhotoUploadOptions {
  fileName: string
  buffer: Buffer
  contentType: string
  investmentId?: string
  dealId?: string
}

export interface InvestorPhotoResult {
  url: string
  key: string
  fileName: string
}

class InvestorS3Service {
  /**
   * Generate a unique key for investor deal photos
   * Organized by investment ID (deal ID) in separate folders
   */
  private generateKey(fileName: string, investmentId?: string, dealId?: string): string {
    const timestamp = Date.now()
    const random = crypto.randomBytes(8).toString('hex')
    const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : ''
    const baseName = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName
    
    // Clean base name (remove special chars)
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_')
    
    // Build path: investor-deals/deals/{investmentId or dealId}/{timestamp}_{random}{ext}
    // Each deal gets its own folder for organization
    const dealIdentifier = investmentId || dealId || 'general'
    return `${INVESTOR_PREFIX}/deals/${dealIdentifier}/${cleanBaseName}_${timestamp}_${random}${ext}`
  }

  /**
   * Upload a photo for investor dashboard (deal photos)
   */
  async uploadPhoto(options: InvestorPhotoUploadOptions): Promise<InvestorPhotoResult> {
    const { fileName, buffer, contentType, investmentId, dealId } = options

    const key = this.generateKey(fileName, investmentId, dealId)

    const command = new PutObjectCommand({
      Bucket: INVESTOR_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType
    })

    await investorS3Client.send(command)

    // Return the public URL
    const url = `https://${INVESTOR_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || process.env.INVESTOR_AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`

    return {
      url,
      key,
      fileName,
    }
  }

  /**
   * Get a signed URL for a private photo (valid for 1 hour)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: INVESTOR_BUCKET_NAME,
      Key: key,
    })

    return await getSignedUrl(investorS3Client, command, { expiresIn })
  }

  /**
   * Get the public URL for a photo
   */
  getPublicUrl(key: string): string {
    return `https://${INVESTOR_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || process.env.INVESTOR_AWS_REGION || 'us-east-2'}.amazonaws.com/${key}`
  }

  /**
   * Check if a photo exists in S3
   */
  async photoExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: INVESTOR_BUCKET_NAME,
        Key: key,
      })
      await investorS3Client.send(command)
      return true
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false
      }
      throw error
    }
  }

  /**
   * Delete a photo from S3
   */
  async deletePhoto(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: INVESTOR_BUCKET_NAME,
      Key: key,
    })

    await investorS3Client.send(command)
  }

  /**
   * Extract key from S3 URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url)
      // Remove leading slash from pathname
      return urlObj.pathname.substring(1)
    } catch {
      return null
    }
  }
}

export const investorS3Service = new InvestorS3Service()

