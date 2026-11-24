-- Convert remaining money Float columns to Decimal(15,2)

ALTER TABLE "refinance_closing_fees"
  ALTER COLUMN "amount" TYPE DECIMAL(15,2) USING ROUND("amount"::numeric, 2);

ALTER TABLE "fund_contributions"
  ALTER COLUMN "amount" TYPE DECIMAL(15,2) USING ROUND("amount"::numeric, 2);

ALTER TABLE "fund_distributions"
  ALTER COLUMN "amount" TYPE DECIMAL(15,2) USING ROUND("amount"::numeric, 2);
