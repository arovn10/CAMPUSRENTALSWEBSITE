-- IMS Phase 4 migration: data-room access grants, view audit trail, e-signatures.
-- Additive and idempotent. No existing tables altered/dropped — data-preserving.
-- Mirrors Prisma models DocumentView / DocumentAccess / SignatureRequest + enum.

DO $$ BEGIN
  CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SIGNED', 'DECLINED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- document_views (immutable audit: who opened what, when)
-- ============================================
CREATE TABLE IF NOT EXISTS "document_views" (
    "id"         TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "ipAddress"  TEXT,
    "viewedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_views_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "document_views_documentId_idx" ON "document_views"("documentId");
CREATE INDEX IF NOT EXISTS "document_views_userId_idx" ON "document_views"("userId");

-- ============================================
-- document_access (per-investor routing grants)
-- ============================================
CREATE TABLE IF NOT EXISTS "document_access" (
    "id"         TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "grantedBy"  TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_access_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_access_documentId_userId_key" ON "document_access"("documentId", "userId");
CREATE INDEX IF NOT EXISTS "document_access_userId_idx" ON "document_access"("userId");

-- ============================================
-- signature_requests (lightweight in-house e-sign record)
-- ============================================
CREATE TABLE IF NOT EXISTS "signature_requests" (
    "id"            TEXT NOT NULL,
    "documentId"    TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "status"        "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "signerName"    TEXT,
    "signatureText" TEXT,
    "signedAt"      TIMESTAMP(3),
    "ipAddress"     TEXT,
    "createdBy"     TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "signature_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "signature_requests_documentId_idx" ON "signature_requests"("documentId");
CREATE INDEX IF NOT EXISTS "signature_requests_userId_idx" ON "signature_requests"("userId");

-- ============================================
-- Foreign keys (guarded)
-- ============================================
DO $$ BEGIN
  ALTER TABLE "document_views" ADD CONSTRAINT "document_views_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "document_views" ADD CONSTRAINT "document_views_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "document_access" ADD CONSTRAINT "document_access_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "document_access" ADD CONSTRAINT "document_access_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
