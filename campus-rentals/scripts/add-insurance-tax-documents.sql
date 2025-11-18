-- Add document upload fields to Insurance and PropertyTax tables
-- Run this on Lightsail database

-- Add document fields to insurance table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance' AND column_name = 'documentUrl') THEN
        ALTER TABLE "insurance" ADD COLUMN "documentUrl" TEXT;
        COMMENT ON COLUMN "insurance"."documentUrl" IS 'URL to uploaded insurance document (policy, certificate, etc.)';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance' AND column_name = 'documentFileName') THEN
        ALTER TABLE "insurance" ADD COLUMN "documentFileName" TEXT;
        COMMENT ON COLUMN "insurance"."documentFileName" IS 'Original filename of uploaded document';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance' AND column_name = 'documentS3Key') THEN
        ALTER TABLE "insurance" ADD COLUMN "documentS3Key" TEXT;
        COMMENT ON COLUMN "insurance"."documentS3Key" IS 'S3 key for the uploaded document';
    END IF;
END $$;

-- Add document fields to property_taxes table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_taxes' AND column_name = 'documentUrl') THEN
        ALTER TABLE "property_taxes" ADD COLUMN "documentUrl" TEXT;
        COMMENT ON COLUMN "property_taxes"."documentUrl" IS 'URL to uploaded tax document (tax bill, assessment, etc.)';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_taxes' AND column_name = 'documentFileName') THEN
        ALTER TABLE "property_taxes" ADD COLUMN "documentFileName" TEXT;
        COMMENT ON COLUMN "property_taxes"."documentFileName" IS 'Original filename of uploaded document';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_taxes' AND column_name = 'documentS3Key') THEN
        ALTER TABLE "property_taxes" ADD COLUMN "documentS3Key" TEXT;
        COMMENT ON COLUMN "property_taxes"."documentS3Key" IS 'S3 key for the uploaded document';
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "insurance_documentS3Key_idx" ON "insurance"("documentS3Key");
CREATE INDEX IF NOT EXISTS "property_taxes_documentS3Key_idx" ON "property_taxes"("documentS3Key");

