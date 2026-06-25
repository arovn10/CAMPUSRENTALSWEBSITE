# CLAUDE.md — Campus Rentals Website (`arovn10/campusrentalswebsite`)

The Next.js app for **Campus Rentals LLC** — public rental listings + a private investor/equity portal.
Owner: Alec Rovner. The actual app lives in the **`campus-rentals/`** subdirectory (repo root is a thin wrapper).

> Org/operations context for the wider ecosystem (ALEC, Abodingo) lives in `~/abodingo-claude-context/`.
> **Abodingo is reference-only here** — never edit Abodingo repos as part of a Campus Rentals task.

---

## Quick Start

```bash
cd campus-rentals
npm install
npm run dev            # http://localhost:3000
npm run build          # ALWAYS before pushing — Lightsail rebuild is slow
npx prisma generate    # after any schema.prisma change
```

- **App root:** `campus-rentals/` (not the repo root)
- **Hosting:** AWS **Lightsail** (`23.21.76.187`, bitnami user, PM2-managed Next.js, nginx reverse proxy)
- **Deploy:** push to `main` → GitHub webhook (`/api/webhook/github`) → `auto-deploy.sh` (git pull, build, PM2 restart)
- **DB:** PostgreSQL at `db.prisma.io` via **Prisma Accelerate** (pooled `DATABASE_URL`) + `DIRECT_DATABASE_URL` for migrations

---

## The Two-Universe Data Model (read this first)

Campus Rentals data is split across two systems that do **not** sync live:

| | **Operations** | **Listings + Investors (this app)** |
|---|---|---|
| System of record | **TenantCloud** (legacy SaaS) | **Abodingo backend** (listings) + **this app's Postgres** (equity) |
| Holds | live leases, tenants, rent ledger, maintenance | public rental listings + investor LLCs/waterfalls/distributions |
| Read by | **ALEC** (scrapes → Supabase cache) | **this website** |

**What this means for the code here:**
- **Public listings** (`/properties`, `/tulane-housing`, `/fau-housing`) are pulled live from the Abodingo backend at `abodingo-backend.onrender.com` under landlord account **`campusrentalsnola`** — see `src/lib/abodeClient.ts`. This app does **not** own listing/tenant/rent data.
- **The investor portal** (`/investors/*`) is this app's own Postgres (Prisma) — entities, ownership, waterfalls, distributions, CRM/deals, documents. This is the data you actually manage here.
- Rule of thumb (from `docs/ADMIN-DATA-SOURCES.md`): **listing/lease/tenant/rent = Abodingo; everything else = Campus Rentals DB.**

---

## Database (Prisma / PostgreSQL) — what this app owns

Schema: `campus-rentals/prisma/schema.prisma` (~88 models). It is an **investor / private-equity** schema, not a tenant-management one. Key groups:

- **Identity/access:** `users` (roles `ADMIN | MANAGER | INVESTOR`), tokens, `audit_logs`, `user_property_access` (row-level property gating)
- **Equity:** `properties`, `investments`, `property_loans`, `property_photos`, `deal_photos` (S3)
- **Entities:** `entities` (LLC/FUND/TRUST…), `entity_owners` (supports nested ownership), `entity_investments`, `entity_investment_owners`
- **Waterfalls:** `waterfall_structures` → `waterfall_tiers` → `waterfall_tier_distributions`; `waterfall_distributions`, `distributions`
- **Funds:** `funds`, `fund_investments`, `fund_contributions`, `fund_distributions`
- **CRM/pipeline:** `deals`, `deal_pipelines`/`_stages`, `deal_tasks`, `deal_notes`, `contacts`, underwriting/due-diligence/`asset_metrics`
- **Docs/files:** `documents`, `file_uploads`, `deal_folders`/`deal_files`, `email_logs`/`email_templates`
- **Compliance:** `insurance`, `property_taxes`, `notifications`

**Data gets in via:** Abodingo API (listings, cached) · manual scripts (`scripts/batch-import-all-data.js`) · Prisma migrations. Storage of photos/docs → AWS S3 (`abodebucket`, us-east-2) behind CloudFront (`d1m1syk7iv23tg.cloudfront.net`).

---

## Non-Negotiables

- **`npm run build` before every push** — a broken build wastes 20–30 min on Lightsail.
- **`npx prisma generate` after schema edits**, and create a migration — never hand-edit the DB.
- **Money is `Decimal`, never `Float`.** New monetary columns must be `Decimal`. (Existing `Float` money columns are tech debt — see below.)
- **Every protected API route must verify BOTH the JWT and ownership.** Role check alone is not enough — investor-scoped routes must confirm the caller actually owns the investment/entity/deal (avoid IDOR). Use `user_property_access` / `Investment(userId, propertyId)` checks.
- **Never trust `req.body` fields directly into Prisma** — whitelist updatable fields (no mass-assignment; `role` must never be self-settable).
- **No secrets with the `NEXT_PUBLIC_` prefix.** That prefix bundles the value into the browser. AWS/Resend/JWT secrets are **server-only**.
- **Deploy platform is Lightsail** — not Vercel/Netlify.

---

## Known Security Debt (treat as P0 — do not add to it)

These are real and currently live. When touching adjacent code, fix rather than extend:

1. **Secrets committed to git:** `LightsailDefaultKey-us-east-1.pem` (prod SSH key), `campus-rentals/.env`, and root `.env.local` are tracked. There is **no root `.gitignore`** (the only one is in `campus-rentals/`). These need rotation + history purge + a root `.gitignore`.
2. **Client-exposed credentials:** AWS keys and other secrets are referenced via `NEXT_PUBLIC_*` (e.g. `src/lib/s3Service.ts`, `src/lib/investorS3Service.ts`) — they leak into the client bundle. Move server-side.
3. **Hardcoded secrets in source:** JWT secret fallback in `src/lib/auth.ts`; Resend key literal in `src/app/api/send-email/route.ts`.
4. **`next.config.js` sets `typescript.ignoreBuildErrors: true`** — type errors ship silently. Goal: remove it and fix the errors.
5. **GitHub webhook** (`/api/webhook/github`) skips signature verification when the header is absent — require it.
6. **IDOR:** `PUT /api/investors/properties/[id]` updates any property by id with no ownership check.
7. **No body validation** (no zod/joi) and **rate-limit settings exist in `.env` but are unenforced.**

---

## Patterns to Apply

```ts
// Money: always Decimal in Prisma, parse carefully in TS.
// Auth: verify token AND ownership before any investor-scoped mutation.
// Field whitelisting on updates (never spread req.body into Prisma):
const ALLOWED = ['firstName','lastName','phone','mailingAddress'] as const;
const data = Object.fromEntries(ALLOWED.filter(k => k in body).map(k => [k, body[k]]));
// (role, taxId, ownership % are NOT self-updatable)
```

- **API base for listings:** `src/lib/apiConfig.ts` → `src/lib/abodeClient.ts`. Don't raw-`fetch` the Abodingo backend from pages.
- **Auth token:** held client-side (`sessionStorage`/`LoginContext`). Migrating to httpOnly cookies is desired.
- **Maps:** only **Leaflet** is actually used; `mapbox-gl` and `@react-google-maps/api` are dead deps slated for removal.

---

## Should this DB move to Supabase?

Open question (Alec is considering consolidating onto Supabase, where ALEC already lives). If pursued:
- Keep **Prisma** as the ORM — Supabase is just Postgres; this is mostly repointing `DATABASE_URL` (Supavisor pooler) + `DIRECT_URL` and migrating data.
- Use a **dedicated Supabase project**, NOT ALEC's cache project (`bizxhknwlvvzqklefued`) — this is a system of record, not a cache.
- Migration is the right moment to fix `Float`→`Decimal` money columns and add FK indexes.
- RLS won't auto-protect you while Prisma connects as the service role — app-layer auth still matters.
