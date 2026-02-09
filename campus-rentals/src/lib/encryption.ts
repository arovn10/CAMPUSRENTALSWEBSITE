/**
 * Field-level encryption for sensitive data (SSN, taxId, etc.).
 * Uses AES-256-GCM. Set ENCRYPTION_KEY in .env (32-byte hex = 64 chars).
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyHex)) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: openssl rand -hex 32')
  }
  return Buffer.from(keyHex, 'hex')
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return ''
  try {
    const key = getKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return Buffer.concat([iv, authTag, enc]).toString('base64')
  } catch (e) {
    console.error('Encryption error:', e)
    throw e
  }
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ''
  try {
    const key = getKey()
    const buf = Buffer.from(ciphertext, 'base64')
    if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) return ''
    const iv = buf.subarray(0, IV_LENGTH)
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const data = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  } catch (e) {
    console.error('Decryption error:', e)
    return ''
  }
}
