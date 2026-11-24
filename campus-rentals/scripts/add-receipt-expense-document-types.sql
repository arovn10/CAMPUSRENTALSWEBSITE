-- Add RECEIPT / EXPENSE to DocumentType so investor document uploads match the UI.
-- Idempotent: safe if values already exist.

DO $$ BEGIN
  ALTER TYPE "DocumentType" ADD VALUE 'RECEIPT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "DocumentType" ADD VALUE 'EXPENSE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
