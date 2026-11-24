-- Add COMPANY to EntityType for company-wide documents (not a fake PROPERTY id).
-- Idempotent. Also retags existing company docs.

DO $$ BEGIN
  ALTER TYPE "EntityType" ADD VALUE 'COMPANY';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Existing rows used entityId='company' with PROPERTY — retag once COMPANY exists.
UPDATE "documents"
SET "entityType" = 'COMPANY'
WHERE "entityId" = 'company' AND "entityType" = 'PROPERTY';
