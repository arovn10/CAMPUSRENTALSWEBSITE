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
- **Type-checking is ON.** `typescript.ignoreBuildErrors` has been **removed** from `next.config.js` and the type backlog is at **0**. `npm run build` now type-checks. **Do not re-add `ignoreBuildErrors`** — fix the type error instead. The PR Build Check enforces this.
- **`npx prisma generate` after schema edits**, and add a numbered migration in `prisma/migrations/` — never hand-edit the DB. Deploy runs `npm run migrate:pending` (data-preserving).
- **Money is `Decimal`, never `Float`** — and this is now **enforced in the schema** (45 money columns are `Decimal(15,2)`; rates/percentages stay `Float`). Prisma returns `Decimal` objects: wrap money reads used in arithmetic with `Number(...)` (or use Decimal ops). New monetary columns must be `Decimal`.
- **Every protected API route must verify BOTH the JWT and ownership.** Use `canAccessProperty()` from `src/lib/access.ts` (admin/manager OR investment / entity-owner / property-access / follower). Null-check `requireAuth()` (`if (!user) return 401`).
- **Never trust `req.body` fields directly into Prisma** — whitelist updatable fields (no mass-assignment; `role` must never be self-settable).
- **No secrets with the `NEXT_PUBLIC_` prefix.** That prefix bundles the value into the browser. AWS/Resend/JWT secrets are **server-only**.
- **Don't leak error internals** — gate `details: error.message` behind `NODE_ENV === 'development'`; return generic messages in prod.
- **Deploy platform is Lightsail** — not Vercel/Netlify.

---

## Security Status (hardening pass complete; see `SECURITY-REMEDIATION.md`)

**Fixed in-code (committed):** root `.gitignore` added + committed secrets untracked · `NEXT_PUBLIC_` AWS secret fallbacks removed · hardcoded Resend key + JWT fallback removed · GitHub webhook now requires a valid HMAC signature · IDOR closed on all investor mutation **and** read routes (`canAccessProperty` / role gates) · login rate limiting (`src/lib/rateLimit.ts`) · admin user-update field whitelist · error-detail leakage gated by `NODE_ENV` · `Float`→`Decimal` money migration · FK indexes.

**STILL REQUIRES MANUAL ACTION (cannot be done from code):**
1. **Rotate every exposed credential** (Lightsail SSH key, Prisma DB creds, JWT secret, AWS keys, Resend key, GitHub webhook secret) — they are in git history; assume compromised.
2. **Purge git history** of `LightsailDefaultKey-us-east-1.pem`, `.env.local`, `campus-rentals/.env` (`git filter-repo`), then force-push.
3. **Apply migrations** `010_add_fk_indexes.sql` + `011_money_to_decimal.sql` and **verify a real waterfall distribution in staging** before relying on the Decimal change.

Still open (lower priority): httpOnly-cookie auth (currently `sessionStorage`), `zod` body validation, MFA, self-service password reset.

---

## Patterns to Apply

```ts
// Auth: null-check, then verify ownership before any investor-scoped read/mutation.
const user = await requireAuth(request)
if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
if (!(await canAccessProperty(user, propertyId)))   // src/lib/access.ts
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

// Money: Prisma returns Decimal objects — wrap reads used in arithmetic.
const total = rows.reduce((s, r) => s + Number(r.amount), 0)

// Field whitelisting on updates (never spread req.body into Prisma):
const ALLOWED = ['firstName','lastName','phone','mailingAddress'] as const;
const data = Object.fromEntries(ALLOWED.filter(k => k in body).map(k => [k, body[k]]));
// (role, taxId, ownership % are NOT self-updatable)
```

- **Ownership checks:** `src/lib/access.ts` (`canAccessProperty`). **Rate limiting:** `src/lib/rateLimit.ts`.
- **API base for listings:** `src/lib/apiConfig.ts` → `src/lib/abodeClient.ts`. Don't raw-`fetch` the Abodingo backend from pages.
- **Auth token:** held client-side (`sessionStorage`/`LoginContext`). Migrating to httpOnly cookies is desired.
- **Maps:** only **Leaflet** is actually used; `mapbox-gl` and `@react-google-maps/api` are dead deps slated for removal.

---

## CI / Site health (`.github/workflows/`)

- **`pr-check.yml`** — every PR to `main` runs install + `prisma generate/validate` + `tsc --noEmit` + `next build`. This is the gate that keeps `main` deployable.
- **`auto-merge.yml`** — PRs labelled **`automerge`** use GitHub native auto-merge (merges only AFTER required checks pass). One-time setup: enable "Allow auto-merge" + branch protection on `main` requiring "PR Build Check".
- **`health-monitor.yml`** — pings prod `/api/health` (`SELECT 1` DB probe) every ~15 min; opens/closes an incident issue.
- **`main.yml`** — existing deploy: on push to `main`, SSH to Lightsail → pull, build, `migrate:pending`, PM2 restart.

---

## Investor Portal / IMS (the product focus)

`/investors/*` is the private **Investment Management System**, benchmarked against RealPage IMS, Juniper Square, Yardi, AppFolio IM, Agora, InvestNext. Full design spec: `docs/INVESTOR-IMS-SPEC.md`. Shell: left sidebar (desktop) / drawer (mobile), Heroicons, Tailwind.

**Foundation (always on):** dashboard KPIs · portfolio holdings · distributions/banking · document vault · in-app notifications · K-1 tax profile · deep deal-pipeline/CRM · entity/ownership + waterfall schema · investment detail with loans/photos/refinance.

**IMS v2 — built, behind `NEXT_PUBLIC_IMS_V2=1` (Phases 1–5 complete on the feature branch):**
- **Capital-account engine** (`src/lib/ims/metrics.ts`): true **XIRR** (Newton+bisection) + MOIC/TVPI/DPI/RVPI/cash-on-cash. Pure, fixture-tested. `positionIrrPercent()` replaced the old `(return/invested)×100` approximation in the **investments / stats / reports** APIs (so dashboard "Average IRR" is now real).
- **Derivation** (`src/lib/ims/capitalAccount.ts`): `buildCapitalAccount(userId)` derives per-deal + consolidated accounts live from the book of record (direct investments, entity ownership, distributions) — **no materialized tables**. Feeds both the screen and the PDF. New nav: **Capital Account** (`/investors/capital-account`).
- **PDF statements** (`src/lib/ims/statement.tsx`, `@react-pdf/renderer`): branded, served by `GET /api/investors/statements/download`; quarterly auto-delivery via `POST /api/cron/quarterly-statements` (CRON_SECRET) + `.github/workflows/quarterly-statements.yml`. Distribution notices: `POST /api/investors/statements/notify-distribution`.
- **Onboarding + capital calls:** self-service invite (`/investors/accept-invite`, `/api/investors/invites`, auth actions `accept-invite`/`invite-info`) · `Commitment` / `CapitalCall` / `CapitalCallResponse` + **Capital Calls** page (acknowledge/fund).
- **Data rooms + e-sign + audit:** `canAccessDocument()` (owned-property OR explicit `DocumentAccess` grant = per-investor routing) · download logs an immutable `DocumentView` · lightweight in-house e-sign (`SignatureRequest`, **Documents to Sign** page) · `/api/investors/data-room`.
- **Charts + broadcasts:** zero-dep SVG charts (`src/components/ims/charts.tsx`) on the **Analytics** page · admin `Announcement` broadcasts (`/api/investors/announcements`) fan out to notifications.
- **Self-service password reset:** `/investors/reset-password` + emailed token (`src/lib/email.ts`, Resend).

**Env vars for IMS v2:** `NEXT_PUBLIC_IMS_V2=1` (nav/flag) · `EMAIL_FROM` (verified Resend sender) · `CRON_SECRET` (quarterly statements auth) · `NEXT_PUBLIC_SITE_URL` (links in emails). `RESEND_API_KEY` already exists.

**Additive migrations (idempotent, in `scripts/`, applied by `migrate:pending`):** `add-ims-phase3-onboarding-commitments-capital-calls.sql` · `add-ims-phase4-datarooms-esign-audit.sql` · `add-ims-phase5-announcements.sql`. All `CREATE … IF NOT EXISTS` + guarded enum/FK — safe to re-run, no existing table touched.

> **Go-live gating (not auto-merged to prod):** flip `NEXT_PUBLIC_IMS_V2` per-cohort only after (1) the Phase 3–5 migrations are applied + verified in staging, (2) a real distribution/statement is spot-checked, and (3) the still-pending manual security items (credential rotation, history purge) are done. Build + push to the branch is automated; the production cutover is a human decision.

> Rule for IMS work: it's a **system of record** for investor money — money is `Decimal`, every read is ownership-scoped (`canAccessProperty`/`canAccessDocument`), and all changes go through data-preserving additive migrations behind the flag.

---

## Should this DB move to Supabase?

Open question (Alec is considering consolidating onto Supabase, where ALEC already lives). If pursued:
- Keep **Prisma** as the ORM — Supabase is just Postgres; this is mostly repointing `DATABASE_URL` (Supavisor pooler) + `DIRECT_URL` and migrating data.
- Use a **dedicated Supabase project**, NOT ALEC's cache project (`bizxhknwlvvzqklefued`) — this is a system of record, not a cache.
- Migration is the right moment to fix `Float`→`Decimal` money columns and add FK indexes.
- RLS won't auto-protect you while Prisma connects as the service role — app-layer auth still matters.
