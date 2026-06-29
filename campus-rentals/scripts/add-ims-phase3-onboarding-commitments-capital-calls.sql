-- IMS Phase 3 migration: onboarding invites + commitment & capital-call tracking.
-- Additive and idempotent. Safe to re-run (CREATE ... IF NOT EXISTS + guarded
-- enum/FK creation). No existing tables are altered or dropped — data-preserving.
-- Mirrors the Prisma models InvestorInvite / Commitment / CapitalCall /
-- CapitalCallResponse and their enums.

-- ============================================
-- Enums (guarded — Postgres has no CREATE TYPE IF NOT EXISTS)
-- ============================================
DO $$ BEGIN
  CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CommitmentStatus" AS ENUM ('ACTIVE', 'FULFILLED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CapitalCallStatus" AS ENUM ('OPEN', 'PARTIALLY_FUNDED', 'FUNDED', 'CLOSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CapitalCallResponseStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'FUNDED', 'DECLINED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- investor_invites
-- ============================================
CREATE TABLE IF NOT EXISTS "investor_invites" (
    "id"         TEXT NOT NULL,
    "email"      TEXT NOT NULL,
    "firstName"  TEXT,
    "lastName"   TEXT,
    "token"      TEXT NOT NULL,
    "role"       "UserRole" NOT NULL DEFAULT 'INVESTOR',
    "propertyId" TEXT,
    "invitedBy"  TEXT,
    "status"     "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "investor_invites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "investor_invites_token_key" ON "investor_invites"("token");
CREATE INDEX IF NOT EXISTS "investor_invites_email_idx" ON "investor_invites"("email");
CREATE INDEX IF NOT EXISTS "investor_invites_token_idx" ON "investor_invites"("token");
CREATE INDEX IF NOT EXISTS "investor_invites_propertyId_idx" ON "investor_invites"("propertyId");

-- ============================================
-- commitments
-- ============================================
CREATE TABLE IF NOT EXISTS "commitments" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "propertyId"  TEXT,
    "entityId"    TEXT,
    "amount"      DECIMAL(15,2) NOT NULL,
    "committedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status"      "CommitmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "note"        TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "commitments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "commitments_userId_idx" ON "commitments"("userId");
CREATE INDEX IF NOT EXISTS "commitments_propertyId_idx" ON "commitments"("propertyId");
CREATE INDEX IF NOT EXISTS "commitments_entityId_idx" ON "commitments"("entityId");

-- ============================================
-- capital_calls
-- ============================================
CREATE TABLE IF NOT EXISTS "capital_calls" (
    "id"          TEXT NOT NULL,
    "propertyId"  TEXT,
    "entityId"    TEXT,
    "callNumber"  INTEGER,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "dueDate"     TIMESTAMP(3),
    "issuedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status"      "CapitalCallStatus" NOT NULL DEFAULT 'OPEN',
    "createdBy"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "capital_calls_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "capital_calls_propertyId_idx" ON "capital_calls"("propertyId");
CREATE INDEX IF NOT EXISTS "capital_calls_entityId_idx" ON "capital_calls"("entityId");

-- ============================================
-- capital_call_responses
-- ============================================
CREATE TABLE IF NOT EXISTS "capital_call_responses" (
    "id"             TEXT NOT NULL,
    "capitalCallId"  TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "amountCalled"   DECIMAL(15,2) NOT NULL,
    "status"         "CapitalCallResponseStatus" NOT NULL DEFAULT 'PENDING',
    "acknowledgedAt" TIMESTAMP(3),
    "fundedAt"       TIMESTAMP(3),
    "note"           TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "capital_call_responses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "capital_call_responses_capitalCallId_userId_key" ON "capital_call_responses"("capitalCallId", "userId");
CREATE INDEX IF NOT EXISTS "capital_call_responses_userId_idx" ON "capital_call_responses"("userId");

-- ============================================
-- Foreign keys (guarded — add only if absent)
-- ============================================
DO $$ BEGIN
  ALTER TABLE "investor_invites" ADD CONSTRAINT "investor_invites_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "investor_invites" ADD CONSTRAINT "investor_invites_invitedBy_fkey"
    FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "commitments" ADD CONSTRAINT "commitments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "commitments" ADD CONSTRAINT "commitments_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "commitments" ADD CONSTRAINT "commitments_entityId_fkey"
    FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "capital_calls" ADD CONSTRAINT "capital_calls_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "capital_calls" ADD CONSTRAINT "capital_calls_entityId_fkey"
    FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "capital_call_responses" ADD CONSTRAINT "capital_call_responses_capitalCallId_fkey"
    FOREIGN KEY ("capitalCallId") REFERENCES "capital_calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "capital_call_responses" ADD CONSTRAINT "capital_call_responses_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
