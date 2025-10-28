import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { prisma } from './prisma'
import { FileCategory, FilePermissions } from '@prisma/client'

interface FileUploadData {
  userId: string
  fileName: string
  originalName: string
  fileSize: number
  mimeType: string
  category: FileCategory
  isPublic?: boolean
  metadata?: Record<string, any>
}

interface FileShareData {
  fileId: string
  sharedBy: string
  sharedWith?: string
  permissions: FilePermissions
  expiresAt?: Date
}

class FileService {
  private uploadDir: string
  private maxFileSize: number = 50 * 1024 * 1024 // 50MB

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
    this.initializeDirectories()
  }

  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true })
      await fs.mkdir(path.join(this.uploadDir, 'documents'), { recursive: true })
      await fs.mkdir(path.join(this.uploadDir, 'images'), { recursive: true })
      await fs.mkdir(path.join(this.uploadDir, 'videos'), { recursive: true })
      await fs.mkdir(path.join(this.uploadDir, 'audio'), { recursive: true })
      await fs.mkdir(path.join(this.uploadDir, 'archives'), { recursive: true })
      await fs.mkdir(path.join(this.uploadDir, 'spreadsheets'), { recursive: true })
      await fs.mkdir(path.join(this.uploadDir, 'presentations'), { recursive: true })
      await fs.mkdir(path.join(this.uploadDir, 'other'), { recursive: true })
    } catch (error) {
      console.error('Failed to initialize upload directories:', error)
    }
  }

  private getCategoryDirectory(category: FileCategory): string {
    const categoryMap = {
      DOCUMENT: 'documents',
      IMAGE: 'images',
      VIDEO: 'videos',
      AUDIO: 'audio',
      ARCHIVE: 'archives',
      SPREADSHEET: 'spreadsheets',
      PRESENTATION: 'presentations',
      OTHER: 'other'
    }
    return path.join(this.uploadDir, categoryMap[category])
  }

  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
  }

  private generateUniqueFileName(originalName: string): string {
    const ext = path.extname(originalName)
    const baseName = path.basename(originalName, ext)
    const timestamp = Date.now()
    const random = crypto.randomBytes(8).toString('hex')
    return `${baseName}_${timestamp}_${random}${ext}`
  }

  async uploadFile(buffer: Buffer, data: FileUploadData): Promise<{ fileId: string; filePath: string }> {
    // Validate file size
    if (buffer.length > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`)
    }

    // Generate file hash for deduplication
    const fileHash = this.generateFileHash(buffer)

    // Check if file already exists
    const existingFile = await prisma.fileUpload.findUnique({
      where: { fileHash }
    })

    if (existingFile) {
      // Return existing file if it exists
      return {
        fileId: existingFile.id,
        filePath: existingFile.filePath
      }
    }

    // Generate unique filename
    const fileName = this.generateUniqueFileName(data.fileName)
    const categoryDir = this.getCategoryDirectory(data.category)
    const filePath = path.join(categoryDir, fileName)

    // Ensure directory exists
    await fs.mkdir(categoryDir, { recursive: true })

    // Write file to disk
    await fs.writeFile(filePath, buffer)

    // Save file record to database
    const fileUpload = await prisma.fileUpload.create({
      data: {
        userId: data.userId,
        fileName,
        originalName: data.originalName,
        filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        fileHash,
        category: data.category,
        isPublic: data.isPublic || false,
        metadata: data.metadata || {}
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: 'FILE_UPLOAD',
        resource: 'FILE',
        resourceId: fileUpload.id,
        details: {
          fileName: data.originalName,
          fileSize: data.fileSize,
          category: data.category
        }
      }
    })

    return {
      fileId: fileUpload.id,
      filePath: fileUpload.filePath
    }
  }

  async getFile(fileId: string, userId?: string): Promise<{ filePath: string; fileName: string; mimeType: string } | null> {
    const file = await prisma.fileUpload.findUnique({
      where: { id: fileId }
    })

    if (!file) {
      return null
    }

    // Check permissions
    if (!file.isPublic && (!userId || file.userId !== userId)) {
      throw new Error('Access denied')
    }

    // Check if file exists on disk
    try {
      await fs.access(file.filePath)
    } catch (error) {
      throw new Error('File not found on disk')
    }

    // Create audit log
    if (userId) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'FILE_DOWNLOAD',
          resource: 'FILE',
          resourceId: fileId,
          details: { fileName: file.originalName }
        }
      })
    }

    return {
      filePath: file.filePath,
      fileName: file.originalName,
      mimeType: file.mimeType
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    const file = await prisma.fileUpload.findUnique({
      where: { id: fileId }
    })

    if (!file) {
      throw new Error('File not found')
    }

    // Check permissions
    if (file.userId !== userId) {
      throw new Error('Access denied')
    }

    try {
      // Delete file from disk
      await fs.unlink(file.filePath)
    } catch (error) {
      console.error('Failed to delete file from disk:', error)
    }

    // Delete file record from database
    await prisma.fileUpload.delete({
      where: { id: fileId }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'FILE_DELETE',
        resource: 'FILE',
        resourceId: fileId,
        details: { fileName: file.originalName }
      }
    })

    return true
  }

  async shareFile(data: FileShareData): Promise<{ shareToken: string }> {
    const file = await prisma.fileUpload.findUnique({
      where: { id: data.fileId }
    })

    if (!file) {
      throw new Error('File not found')
    }

    // Check permissions
    if (file.userId !== data.sharedBy) {
      throw new Error('Access denied')
    }

    const shareToken = crypto.randomBytes(32).toString('hex')

    await prisma.fileShare.create({
      data: {
        fileId: data.fileId,
        sharedBy: data.sharedBy,
        sharedWith: data.sharedWith,
        shareToken,
        permissions: data.permissions,
        expiresAt: data.expiresAt
      }
    })

    return { shareToken }
  }

  async getFileByShareToken(shareToken: string): Promise<{ filePath: string; fileName: string; mimeType: string } | null> {
    const fileShare = await prisma.fileShare.findFirst({
      where: {
        shareToken,
        expiresAt: { gt: new Date() }
      },
      include: { fileUpload: true }
    })

    if (!fileShare) {
      return null
    }

    const file = fileShare.fileUpload

    // Check if file exists on disk
    try {
      await fs.access(file.filePath)
    } catch (error) {
      throw new Error('File not found on disk')
    }

    return {
      filePath: file.filePath,
      fileName: file.originalName,
      mimeType: file.mimeType
    }
  }

  async getUserFiles(userId: string, category?: FileCategory): Promise<any[]> {
    const where: any = { userId }
    if (category) {
      where.category = category
    }

    return await prisma.fileUpload.findMany({
      where,
      orderBy: { uploadedAt: 'desc' }
    })
  }

  async getPublicFiles(category?: FileCategory): Promise<any[]> {
    const where: any = { isPublic: true }
    if (category) {
      where.category = category
    }

    return await prisma.fileUpload.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    })
  }

  async cleanupExpiredFiles(): Promise<void> {
    const expiredFiles = await prisma.fileUpload.findMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    })

    for (const file of expiredFiles) {
      try {
        await fs.unlink(file.filePath)
      } catch (error) {
        console.error('Failed to delete expired file:', error)
      }

      await prisma.fileUpload.delete({
        where: { id: file.id }
      })
    }

    // Clean up expired file shares
    await prisma.fileShare.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    })
  }

  async getFileStats(): Promise<{
    totalFiles: number
    totalSize: number
    filesByCategory: Record<string, number>
  }> {
    const files = await prisma.fileUpload.findMany({
      select: {
        fileSize: true,
        category: true
      }
    })

    const totalFiles = files.length
    const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0)
    const filesByCategory = files.reduce((acc, file) => {
      acc[file.category] = (acc[file.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalFiles,
      totalSize,
      filesByCategory
    }
  }

  async validateFileType(mimeType: string, category: FileCategory): Promise<boolean> {
    const allowedTypes = {
      DOCUMENT: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/rtf'
      ],
      IMAGE: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml'
      ],
      VIDEO: [
        'video/mp4',
        'video/avi',
        'video/mov',
        'video/wmv',
        'video/webm'
      ],
      AUDIO: [
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'audio/m4a'
      ],
      ARCHIVE: [
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/gzip'
      ],
      SPREADSHEET: [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ],
      PRESENTATION: [
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ],
      OTHER: []
    }

    const allowedMimeTypes = allowedTypes[category]
    return allowedMimeTypes.length === 0 || allowedMimeTypes.includes(mimeType)
  }
}

export const fileService = new FileService()
