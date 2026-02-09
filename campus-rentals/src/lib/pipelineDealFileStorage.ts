/**
 * Pipeline deal file storage: local disk under uploads/pipeline-deals/{dealId}.
 * For files attached to CRM pipeline deals (including prospective deals with no property).
 */
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { createReadStream, existsSync } from 'fs'
import crypto from 'crypto'

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
const PIPELINE_DEAL_FILES_SUBDIR = 'pipeline-deals'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export const PIPELINE_DEAL_FILE_PREFIX = 'local:'

export function isPipelineDealLocalPath(filePath: string): boolean {
  return filePath.startsWith(PIPELINE_DEAL_FILE_PREFIX) || filePath.includes(PIPELINE_DEAL_FILES_SUBDIR)
}

export async function savePipelineDealFile(
  buffer: Buffer,
  originalName: string,
  dealId: string
): Promise<{ relativePath: string; fileName: string }> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`)
  }

  const dir = join(UPLOAD_DIR, PIPELINE_DEAL_FILES_SUBDIR, dealId)
  await mkdir(dir, { recursive: true })

  const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : ''
  const base = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName
  const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80)
  const unique = `${safeBase}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`
  const relativePath = `${PIPELINE_DEAL_FILE_PREFIX}${PIPELINE_DEAL_FILES_SUBDIR}/${dealId}/${unique}`
  const absolutePath = join(dir, unique)

  await writeFile(absolutePath, buffer)
  return { relativePath, fileName: unique }
}

export function getPipelineDealFileAbsolutePath(storedPath: string): string {
  const relative = storedPath.startsWith(PIPELINE_DEAL_FILE_PREFIX)
    ? storedPath.slice(PIPELINE_DEAL_FILE_PREFIX.length)
    : storedPath
  return join(UPLOAD_DIR, relative)
}

export function pipelineDealFileExists(storedPath: string): boolean {
  return existsSync(getPipelineDealFileAbsolutePath(storedPath))
}

export function createPipelineDealFileReadStream(storedPath: string): NodeJS.ReadableStream {
  return createReadStream(getPipelineDealFileAbsolutePath(storedPath))
}

export async function deletePipelineDealFile(storedPath: string): Promise<void> {
  try {
    await unlink(getPipelineDealFileAbsolutePath(storedPath))
  } catch (err: any) {
    if (err?.code !== 'ENOENT') throw err
  }
}
