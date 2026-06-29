# Supabase Migration + Float→Decimal Plan (Campus Rentals website DB)

Status: **PLAN ONLY — nothing here has been executed.** Scope: move this app's Postgres
(currently `db.prisma.io` via Prisma Accelerate) onto a **dedicated Supabase project**,
keep Prisma as the ORM, and bundle the `Float`→`Decimal` money fix + an ALEC read path.

> Why bundle them: the connection move is low-risk and mechanical; the `Decimal` change is
> the risky part and is best done once, on the new DB, with the type-checker as a safety net.

---

## Guardrails (read first)

1. **Dedicated project — NOT ALEC's.** ALEC's Supabase project `bizxhknwlvvzqklefued` is a
   *cache/overlay*. This app is a *system of record*. Mixing them shares blast radius, backups,
   and RLS. Create a new project (e.g. `campus-rentals-prod`), region close to the Lightsail box
   (us-east-1/us-east-2).
2. **Prisma stays.** Supabase is just Postgres. This is a connection-string + data move, not a
   rewrite. The ~88 models are unchanged by the host move.
3. **RLS won't protect you automatically.** Prisma connects as a privileged role and bypasses RLS,
   so the app-layer auth/ownership work done in this branch remains the real enforcement.
4. **Keep `db.prisma.io` live until verified.** Every cutover step is reversible via env vars.

---

## Phase 0 — Provision & connection strings

1. Create the Supabase project; save the DB password.
2. Grab two connection strings from Supabase → Project Settings → Database:
   - **Pooled (Supavisor, transaction mode, port 6543)** → app runtime `DATABASE_URL`
     (`...pooler.supabase.com:6543/postgres?pgbouncer=true`). Required for serverless/Next.js.
   - **Direct (port 5432)** → `DIRECT_URL` for migrations and `pg_dump`/`psql`.
3. Add a `directUrl` to the Prisma datasource (it currently has none):
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")      // Supavisor pooled
     directUrl = env("DIRECT_URL")        // direct 5432, for migrate/introspect
   }
   ```
4. Decide optional Supabase features now or later: **Storage** (could replace `abodebucket` S3),
   **pgvector** (document search). Neither is required for the move.

---

## Phase 1 — Schema + data move (NO Decimal change yet)

Do this first and verify the app runs on Supabase **before** touching money types.

1. **Recreate schema on Supabase.** This repo uses hand-numbered SQL migrations
   (`prisma/migrations/00x_*.sql`) applied by a custom runner, not `prisma migrate`. Two options:
   - Adopt `prisma migrate` going forward: `prisma migrate diff` from an empty DB to the schema to
     generate a baseline, then `prisma migrate deploy` against `DIRECT_URL`; **or**
   - Keep the runner: point it at `DIRECT_URL` and run `00x` in order (including `010_add_fk_indexes.sql`).
2. **Move the data:**
   ```bash
   pg_dump "$OLD_DIRECT_DATABASE_URL" --no-owner --no-privileges --no-acl \
     --format=custom --file=cr.dump
   pg_restore --no-owner --no-privileges --dbname "$SUPABASE_DIRECT_URL" cr.dump
   ```
   (Data-only restore if schema already created: add `--data-only --disable-triggers`.)
3. **Verify**: row counts per table match old vs new (`SELECT count(*)` across the key tables —
   users, properties, investments, entities, waterfall_*, distributions).
4. **Cut over**: update `DATABASE_URL` (pooled) + `DIRECT_URL` on the Lightsail host / PM2 env,
   `npm run build`, redeploy, smoke-test login + investor dashboard + a waterfall read.
   Keep the old URLs saved for instant rollback.

**Exit criteria:** app fully functional on Supabase, money still `Float`. This is a safe stopping point.

---

## Phase 2 — Float → Decimal (the careful part)

`Decimal` in Prisma returns a `Prisma.Decimal` **object** at runtime, not a JS `number`. Every
`+`/`-`/`*`/`reduce` on these fields breaks unless updated. **`ignoreBuildErrors: true` hides this**,
so the safety net is to **temporarily remove that flag** and let `tsc` enumerate every broken site.

### 2a. Column classification (precision matters)

- **Money → `Decimal @db.Decimal(15,2)`** (dollar amounts):
  `Property.price/acquisitionPrice/constructionCost/totalCost/debtAmount/currentValue/monthlyRent/otherIncome/annualExpenses`,
  `Fund.targetSize/currentSize`, `Investment.investmentAmount`, `FundInvestment.investmentAmount`,
  `Distribution.amount`, `WaterfallTierDistribution.distributionAmount`,
  `WaterfallDistribution.totalAmount/oldDebtAmount`, `EntityInvestment.investmentAmount`,
  `EntityOwner.investmentAmount`, `EntityInvestmentOwner.investmentAmount`, `EntityDistribution.amount`,
  `Insurance.annualPremium/coverageAmount`, `PropertyTax.annualPropertyTax`,
  `PropertyLoan.originalAmount/currentBalance/monthlyPayment`,
  `Deal.estimatedValue/budgetedCost/actualCost/noi`, `BudgetLineItem.budgetedAmount/actualAmount/variance`,
  `UnderwritingData.purchasePrice/loanAmount/downPayment/grossRent/operatingExpenses/noi`,
  `AssetMetric.revenue/expenses/noi/debtService/cashFlow`.
- **Rates / percentages / ratios → `Decimal @db.Decimal(9,4)`** (penny-drift N/A, but convert the
  ones used in money math): `*.ownershipPercentage`, `WaterfallTier.returnRate/catchUpPercentage/promotePercentage`,
  `Investment.preferredReturn/percentOfProceeds`, `PropertyLoan.interestRate`,
  `*.occupancyRate/capRate/vacancyRate/loanRate/irr/cashOnCash/debtServiceCoverage`.

> **Critical interaction:** `ownershipPercentage` and the tier percentages are multiplied by money
> (e.g. `investorShare = (ownership/100) * tierAmount` in `waterfall-distributions` POST). If money
> becomes `Decimal` but these stay `Float`, the mixed math throws. Convert them too, **or** consistently
> `.toNumber()` at the compute boundary (see 2c).

### 2b. ALTER migration (`011_money_to_decimal.sql`)

```sql
ALTER TABLE "properties"  ALTER COLUMN "price" TYPE numeric(15,2) USING "price"::numeric(15,2);
-- ...one ALTER per money column (15,2) and per rate column (9,4)...
```
Test on a **Supabase preview branch** (`create_branch`) or a throwaway copy first — type changes are
hard to reverse with data in place.

### 2c. Code arithmetic sweep (the real work)

1. Remove `typescript.ignoreBuildErrors` from `next.config.js`.
2. `tsc --noEmit` → it now flags every `number` vs `Prisma.Decimal` mismatch.
3. Fix each site with one of:
   - **Read/display/aggregate:** `.toNumber()` at the boundary (e.g. dashboards, CSV export, the
     debt/IRR estimates in `investors/properties`). Acceptable — storage stays exact.
   - **Money-critical writes:** keep `Prisma.Decimal` math (`.plus()/.times()/.dividedBy()`),
     especially the **`waterfall-distributions` POST** distribution split — the per-investor amounts
     must reconcile to the total.
4. Re-run `tsc` until clean; then a full `next build`; then exercise a real distribution and confirm
   the tier/investor amounts sum correctly.

---

## Phase 3 — Leverage Supabase (optional, post-cutover)

- **ALEC read path** (closes the gap where ALEC's portfolio rollups can't see investor/equity data):
  create a **read-only** Postgres role + a few views (e.g. `cr_equity_portfolio`) on this project;
  add read helpers in ALEC's `services/supabaseClient.js` pointed at this project (separate from its
  cache project). Read-only role = no RLS-bypass risk.
- **Storage:** optionally migrate `abodebucket` (S3) deal photos/docs to Supabase Storage and drop the
  client-exposed AWS surface entirely (ties into the P0 secret cleanup).
- **pgvector:** optional document search over offering memos / operating agreements.

---

## Risk & rollback summary

| Risk | Mitigation |
|---|---|
| App breaks on Supabase pooler | Use Supavisor **transaction** pooler + `pgbouncer=true`; `directUrl` for migrations. Roll back via env vars. |
| Data mismatch after restore | Row-count verification per table before cutover; keep old DB live. |
| Decimal breaks money math silently | Remove `ignoreBuildErrors`, drive the sweep with `tsc`; test a real waterfall distribution end-to-end. |
| Decimal ALTER hard to reverse | Test on a Supabase preview branch first. |
| ALEC reading a system of record | Read-only role + views only; never the service role. |

## Suggested sequencing

1. Phase 0 + Phase 1 as one PR (host move, app still on `Float`) — low risk, independently shippable.
2. Phase 2 as a **separate** PR (schema ALTER + code sweep + `ignoreBuildErrors` removal) — the risky one.
3. Phase 3 items as their own follow-ups.
