/**
 * Deal/property file storage: local disk under uploads/deal-files.
 * Used when S3 is not configured or upload fails.
 */
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { createReadStream, existsSync } from 'fs'
import crypto from 'crypto'

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
const DEAL_FILES_SUBDIR = 'deal-files'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export const DEAL_FILE_LOCAL_PREFIX = 'local:'

export function isLocalPath(filePath: string): boolean {
  return filePath.startsWith(DEAL_FILE_LOCAL_PREFIX) || (!filePath.startsWith('http') && filePath.includes(DEAL_FILES_SUBDIR))
}

/**
 * Save deal file to disk. Returns relative path with prefix for DB (local:deal-files/propertyId/xxx).
 */
export async function saveDealFile(
  buffer: Buffer,
  originalName: string,
  propertyId: string
): Promise<{ relativePath: string; fileName: string }> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`)
  }

  const dir = join(UPLOAD_DIR, DEAL_FILES_SUBDIR, propertyId)
  await mkdir(dir, { recursive: true })

  const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : ''
  const base = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName
  const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80)
  const unique = `${safeBase}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`
  const relativePath = `${DEAL_FILE_LOCAL_PREFIX}${DEAL_FILES_SUBDIR}/${propertyId}/${unique}`
  const absolutePath = join(dir, unique)

  await writeFile(absolutePath, buffer)
  return { relativePath, fileName: unique }
}

/**
 * Resolve stored path to absolute path. Handles "local:deal-files/pid/name" or "deal-files/pid/name".
 */
export function getDealFileAbsolutePath(storedPath: string): string {
  const relative = storedPath.startsWith(DEAL_FILE_LOCAL_PREFIX)
    ? storedPath.slice(DEAL_FILE_LOCAL_PREFIX.length)
    : storedPath
  return join(UPLOAD_DIR, relative)
}

export function dealFileExists(storedPath: string): boolean {
  return existsSync(getDealFileAbsolutePath(storedPath))
}

export function createDealFileReadStream(storedPath: string): NodeJS.ReadableStream {
  return createReadStream(getDealFileAbsolutePath(storedPath))
}

export async function deleteDealFile(storedPath: string): Promise<void> {
  try {
    await unlink(getDealFileAbsolutePath(storedPath))
  } catch (err: any) {
    if (err?.code !== 'ENOENT') throw err
  }
}
