import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Initialize S3 client
// Note: Secret keys should NEVER be in NEXT_PUBLIC_* variables for security
// Use AWS_SECRET_ACCESS_KEY in server-side only
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

const BUCKET_NAME = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'campusrentalswebsitebucket'

export interface S3UploadOptions {
  key: string // S3 object key (path)
  buffer: Buffer
  contentType: string
  isPublic?: boolean
}

export interface S3FileResult {
  url: string
  key: string
}

class S3Service {
  /**
   * Upload a file to S3
   */
  async uploadFile(options: S3UploadOptions): Promise<S3FileResult> {
    const { key, buffer, contentType, isPublic = false } = options

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: isPublic ? 'public-read' : 'private',
    })

    await s3Client.send(command)

    // Return the public URL
    const url = isPublic
      ? `https://${BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-2'}.amazonaws.com/${key}`
      : await this.getSignedUrl(key)

    return {
      url,
      key,
    }
  }

  /**
   * Get a signed URL for a private file (valid for 1 hour)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    return await getSignedUrl(s3Client, command, { expiresIn })
  }

  /**
   * Get the public URL for a file
   */
  getPublicUrl(key: string): string {
    return `https://${BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-2'}.amazonaws.com/${key}`
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
      await s3Client.send(command)
      return true
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false
      }
      throw error
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    await s3Client.send(command)
  }

  /**
   * Generate a key (path) for a file based on category and filename
   */
  generateKey(category: string, fileName: string): string {
    const categoryMap: Record<string, string> = {
      DOCUMENT: 'documents',
      IMAGE: 'images',
      VIDEO: 'videos',
      AUDIO: 'audio',
      ARCHIVE: 'archives',
      SPREADSHEET: 'spreadsheets',
      PRESENTATION: 'presentations',
      OTHER: 'other',
    }

    const categoryDir = categoryMap[category] || 'other'
    return `${categoryDir}/${fileName}`
  }
}

export const s3Service = new S3Service()

