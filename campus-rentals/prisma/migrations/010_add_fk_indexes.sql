-- P1 data integrity: add indexes on hot foreign-key / filter columns.
-- Postgres does NOT auto-index foreign keys (only PKs and UNIQUE), so these
-- columns were sequentially scanned on every investor/portfolio query. Index
-- names match Prisma's default (<table>_<column>_idx) so schema and DB stay in
-- sync with the @@index entries added to schema.prisma. IF NOT EXISTS makes this
-- safe to re-run.

CREATE INDEX IF NOT EXISTS "investments_userId_idx" ON "investments"("userId");
CREATE INDEX IF NOT EXISTS "investments_propertyId_idx" ON "investments"("propertyId");

CREATE INDEX IF NOT EXISTS "fund_investments_userId_idx" ON "fund_investments"("userId");
CREATE INDEX IF NOT EXISTS "fund_investments_fundId_idx" ON "fund_investments"("fundId");

CREATE INDEX IF NOT EXISTS "distributions_investmentId_idx" ON "distributions"("investmentId");
CREATE INDEX IF NOT EXISTS "distributions_userId_idx" ON "distributions"("userId");

CREATE INDEX IF NOT EXISTS "waterfall_structures_propertyId_idx" ON "waterfall_structures"("propertyId");

CREATE INDEX IF NOT EXISTS "waterfall_tiers_waterfallStructureId_idx" ON "waterfall_tiers"("waterfallStructureId");

CREATE INDEX IF NOT EXISTS "waterfall_tier_distributions_waterfallTierId_idx" ON "waterfall_tier_distributions"("waterfallTierId");
CREATE INDEX IF NOT EXISTS "waterfall_tier_distributions_entityInvestmentId_idx" ON "waterfall_tier_distributions"("entityInvestmentId");
CREATE INDEX IF NOT EXISTS "waterfall_tier_distributions_userId_idx" ON "waterfall_tier_distributions"("userId");

CREATE INDEX IF NOT EXISTS "entity_investments_entityId_idx" ON "entity_investments"("entityId");
CREATE INDEX IF NOT EXISTS "entity_investments_propertyId_idx" ON "entity_investments"("propertyId");

CREATE INDEX IF NOT EXISTS "entity_owners_entityId_idx" ON "entity_owners"("entityId");
CREATE INDEX IF NOT EXISTS "entity_owners_userId_idx" ON "entity_owners"("userId");

CREATE INDEX IF NOT EXISTS "entity_investment_owners_entityInvestmentId_idx" ON "entity_investment_owners"("entityInvestmentId");
CREATE INDEX IF NOT EXISTS "entity_investment_owners_userId_idx" ON "entity_investment_owners"("userId");

CREATE INDEX IF NOT EXISTS "entity_distributions_entityInvestmentId_idx" ON "entity_distributions"("entityInvestmentId");
CREATE INDEX IF NOT EXISTS "entity_distributions_userId_idx" ON "entity_distributions"("userId");

CREATE INDEX IF NOT EXISTS "property_loans_propertyId_idx" ON "property_loans"("propertyId");
