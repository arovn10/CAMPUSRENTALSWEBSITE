-- Instagram connect flow + admin publishing switch (2026-11-22).
-- Additive and idempotent: safe to re-run; touches no existing data.

ALTER TABLE "social_credentials" ADD COLUMN IF NOT EXISTS "igUsername" TEXT;
ALTER TABLE "social_credentials" ADD COLUMN IF NOT EXISTS "pageName" TEXT;

CREATE TABLE IF NOT EXISTS "social_settings" (
    "key"       TEXT NOT NULL,
    "value"     TEXT NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_settings_pkey" PRIMARY KEY ("key")
);
