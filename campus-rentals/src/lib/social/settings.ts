/**
 * Admin-controlled switches for the social pipeline, stored in social_settings.
 * Values are strings; callers interpret them.
 */
import { prisma } from '@/lib/prisma'

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.socialSetting.findUnique({ where: { key } })
  return row?.value ?? null
}

export async function setSetting(key: string, value: string, updatedBy?: string): Promise<void> {
  await prisma.socialSetting.upsert({
    where: { key },
    update: { value, updatedBy: updatedBy ?? null },
    create: { key, value, updatedBy: updatedBy ?? null },
  })
}
