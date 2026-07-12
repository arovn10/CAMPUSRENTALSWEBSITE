# Database (Prisma / PostgreSQL)

Schema: `campus-rentals/prisma/schema.prisma` (~88 models). It's an **investor/private-equity** schema — not tenant management (that's TenantCloud/Abodingo's universe).

## Model groups

- **Identity/access:** `users` (`ADMIN | MANAGER | INVESTOR`), tokens, `audit_logs`, `user_property_access`
- **Equity:** `properties`, `investments`, `property_loans`, `property_photos`, `deal_photos`
- **Entities:** `entities` (LLC/FUND/TRUST…), `entity_owners` (nested ownership), `entity_investments`(+`_owners`)
- **Waterfalls:** `waterfall_structures` → `waterfall_tiers` → `waterfall_tier_distributions`; `waterfall_distributions`, `distributions`
- **Funds:** `funds`, `fund_investments`, `fund_contributions`, `fund_distributions`
- **CRM/pipeline:** `deals`, `deal_pipelines`/`_stages`/`_tasks`/`_notes`, `contacts`, underwriting/due-diligence
- **Docs:** `documents`, `DocumentAccess`, `DocumentView`, `SignatureRequest`, `file_uploads`, email logs/templates
- **IMS v2:** `Commitment`, `CapitalCall`, `CapitalCallResponse`, `Announcement`
- **Compliance:** `insurance`, `property_taxes`, `notifications`

## Rules

- **Money = `Decimal(15,2)`** (45 columns enforced); rates/percentages stay `Float`. `Number(...)` wrap for arithmetic.
- Migrations: numbered SQL in `prisma/migrations/` + idempotent IMS scripts in `scripts/add-ims-*.sql`; deploy runs `npm run migrate:pending` (data-preserving). Never hand-edit the DB.
- `npx prisma generate` after every schema edit.
- Connection: Prisma Accelerate pooled `DATABASE_URL` + `DIRECT_DATABASE_URL` for migrations.

## Open question — Supabase move

Alec may consolidate this DB onto Supabase. If pursued: keep Prisma; dedicated project (NOT ALEC's cache project); repoint `DATABASE_URL`/`DIRECT_URL`; RLS won't protect service-role connections, so app-layer auth still matters.
