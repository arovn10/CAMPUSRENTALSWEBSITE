-- Add service pro contact linking fields to contacts table
-- This allows contacts to be linked to pipelines or properties

-- Add pipelineId and propertyId columns to contacts table if they don't exist
DO $$ 
BEGIN
  -- Add pipelineId column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contacts' 
    AND column_name = 'pipelineId'
  ) THEN
    ALTER TABLE contacts ADD COLUMN "pipelineId" TEXT;
    CREATE INDEX IF NOT EXISTS "contacts_pipelineId_idx" ON contacts("pipelineId");
  END IF;

  -- Add propertyId column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contacts' 
    AND column_name = 'propertyId'
  ) THEN
    ALTER TABLE contacts ADD COLUMN "propertyId" TEXT;
    CREATE INDEX IF NOT EXISTS "contacts_propertyId_idx" ON contacts("propertyId");
  END IF;

  -- Add serviceType column to identify service pro contacts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contacts' 
    AND column_name = 'serviceType'
  ) THEN
    ALTER TABLE contacts ADD COLUMN "serviceType" TEXT;
    CREATE INDEX IF NOT EXISTS "contacts_serviceType_idx" ON contacts("serviceType");
  END IF;
END $$;

-- Add foreign key constraints if the columns exist
DO $$
BEGIN
  -- Add foreign key for pipelineId
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contacts' 
    AND column_name = 'pipelineId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contacts_pipelineId_fkey'
  ) THEN
    ALTER TABLE contacts 
    ADD CONSTRAINT "contacts_pipelineId_fkey" 
    FOREIGN KEY ("pipelineId") 
    REFERENCES deal_pipelines(id) 
    ON DELETE SET NULL;
  END IF;

  -- Add foreign key for propertyId
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contacts' 
    AND column_name = 'propertyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contacts_propertyId_fkey'
  ) THEN
    ALTER TABLE contacts 
    ADD CONSTRAINT "contacts_propertyId_fkey" 
    FOREIGN KEY ("propertyId") 
    REFERENCES properties(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

