-- Group DB: add entity master-data fields
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "stateOfFormation" TEXT;
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "formationDate" TIMESTAMP(3);
