-- Add published field to deals table
-- This field determines if a deal should be visible to investors on the dashboard
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'published') THEN
        ALTER TABLE "deals" ADD COLUMN "published" BOOLEAN DEFAULT false;
        -- Create index for faster filtering
        CREATE INDEX IF NOT EXISTS "deals_published_idx" ON "deals"("published");
    END IF;
END $$;

