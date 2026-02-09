/**
 * Document storage: all files stored on local disk under uploads/documents.
 * Used for investor documents (K-1, PPM, statements, etc.) — no S3 required.
 */
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { createReadStream, existsSync } from 'fs'
import crypto from 'crypto'

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
const DOCUMENTS_SUBDIR = 'documents'
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]

export function getAllowedMimeTypes(): string[] {
  return [...ALLOWED_MIME_TYPES]
}

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType) || mimeType.startsWith('image/')
}

export function getMaxFileSize(): number {
  return MAX_FILE_SIZE
}

function getDocumentsDir(): string {
  return join(UPLOAD_DIR, DOCUMENTS_SUBDIR)
}

/**
 * Save a file buffer to disk. Returns relative path (e.g. documents/timestamp_hash_name.pdf)
 * for storing in DB so it's portable.
 */
export async function saveDocumentFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ relativePath: string; fileName: string; fileSize: number }> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`)
  }
  if (!isAllowedMimeType(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}`)
  }

  const dir = getDocumentsDir()
  await mkdir(dir, { recursive: true })

  const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : ''
  const base = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName
  const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80)
  const timestamp = Date.now()
  const hash = crypto.randomBytes(8).toString('hex')
  const fileName = `${safeBase}_${timestamp}_${hash}${ext}`
  const relativePath = `${DOCUMENTS_SUBDIR}/${fileName}`
  const absolutePath = join(UPLOAD_DIR, relativePath)

  await writeFile(absolutePath, buffer)
  return { relativePath, fileName, fileSize: buffer.length }
}

/**
 * Resolve relative path from DB to absolute path on disk.
 */
export function getAbsolutePath(relativePath: string): string {
  if (relativePath.startsWith('/')) {
    return join(UPLOAD_DIR, relativePath.replace(/^\//, ''))
  }
  return join(UPLOAD_DIR, relativePath)
}

/**
 * Check if file exists on disk.
 */
export function documentFileExists(relativePath: string): boolean {
  const absolute = getAbsolutePath(relativePath)
  return existsSync(absolute)
}

/**
 * Read file as buffer (for streaming in API).
 */
export async function readDocumentFile(relativePath: string): Promise<Buffer> {
  const absolute = getAbsolutePath(relativePath)
  return readFile(absolute)
}

/**
 * Create read stream for large file streaming.
 */
export function createDocumentReadStream(relativePath: string): NodeJS.ReadableStream {
  const absolute = getAbsolutePath(relativePath)
  return createReadStream(absolute)
}

/**
 * Delete file from disk. Idempotent (no error if missing).
 */
export async function deleteDocumentFile(relativePath: string): Promise<void> {
  const absolute = getAbsolutePath(relativePath)
  try {
    await unlink(absolute)
  } catch (err: any) {
    if (err?.code !== 'ENOENT') throw err
  }
}
