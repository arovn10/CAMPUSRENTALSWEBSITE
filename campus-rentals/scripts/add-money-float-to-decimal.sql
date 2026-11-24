-- Convert remaining money Float columns to Decimal(15,2). Idempotent-ish.

DO $$ BEGIN
  ALTER TABLE "refinance_closing_fees"
    ALTER COLUMN "amount" TYPE DECIMAL(15,2) USING ROUND("amount"::numeric, 2);
EXCEPTION
  WHEN others THEN
    IF SQLERRM NOT LIKE '%already%' AND SQLERRM NOT LIKE '%does not exist%' THEN
      RAISE NOTICE 'refinance_closing_fees.amount: %', SQLERRM;
    END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE "fund_contributions"
    ALTER COLUMN "amount" TYPE DECIMAL(15,2) USING ROUND("amount"::numeric, 2);
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'fund_contributions.amount: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER TABLE "fund_distributions"
    ALTER COLUMN "amount" TYPE DECIMAL(15,2) USING ROUND("amount"::numeric, 2);
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'fund_distributions.amount: %', SQLERRM;
END $$;
