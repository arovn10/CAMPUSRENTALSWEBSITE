-- IMS Phase 5 migration: admin announcement broadcasts.
-- Additive and idempotent. Charts are client-side (no schema). Mirrors the
-- Prisma Announcement model; delivery fans out to existing notifications rows.

CREATE TABLE IF NOT EXISTS "announcements" (
    "id"             TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "body"           TEXT NOT NULL,
    "propertyId"     TEXT,
    "createdBy"      TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "announcements_propertyId_idx" ON "announcements"("propertyId");

DO $$ BEGIN
  ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
