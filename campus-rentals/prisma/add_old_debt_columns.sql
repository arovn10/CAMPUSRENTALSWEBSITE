-- Add oldDebtAmount and oldDebtDetails columns to waterfall_distributions table
ALTER TABLE "waterfall_distributions" ADD COLUMN IF NOT EXISTS "oldDebtAmount" DOUBLE PRECISION;
ALTER TABLE "waterfall_distributions" ADD COLUMN IF NOT EXISTS "oldDebtDetails" TEXT;
