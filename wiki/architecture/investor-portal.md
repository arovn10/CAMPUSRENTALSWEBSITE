# Investor Portal / IMS

`/investors/*` is a **system of record for investor money**. Every change here follows hard rules 5–7 (Decimal money, additive migrations, ownership-scoped reads).

## UI

The portal shares the CR design system — see [`design-system.md`](design-system.md) (portal recipe: ink-50 canvas, white shadow-soft cards, accent actions, semantic-only green/red/amber). The shell (sidebar + mobile chrome) is `src/app/investors/layout.tsx`; every page follows the recipe as of the 2026-07 overhaul. Restyles must never touch handlers, data flow, or money math (design-system hard rules).

## Banking & self-service layer (2026-07-13)

- **Banking page** is a banking-dashboard: KPI balance strip (contributed / distributed / net position / current value + DPI), a flattened **transactions ledger** across all deals with running balance, type/deal filters, client CSV export, and PDF statement download. Data: `GET /api/investors/capital-account` (ownership-scoped) — no new API surface.
- **Dashboard** carries a Recent Activity feed (latest ledger entries → banking page).
- **Profile** is a full self-service editor (contact, primary + mailing address with "same as primary", tax/K-1 profile) against the whitelisted `PUT /api/investors/profile`, plus a self-service password form (`POST /api/investors/users/change-my-password` — NOT the admin-only PasswordManagement endpoints).
- **Admin console → Investors tab**: searchable directory + edit modal over `PUT /api/admin/users/[id]` (14 whitelisted contact/address fields; role/email never editable). The users GET now uses an explicit Prisma `select` — it previously returned every column including password hashes.

## Investor journey (workflow map)

1. **Invite** — admin console sends invite → `/investors/accept-invite` (token) → account + httpOnly cookie.
2. **Overview** — dashboard KPIs (real XIRR via `lib/ims/metrics.ts`) → drill into portfolio / capital account.
3. **Money in** — capital calls page (acknowledge → fund); commitments recorded by admin.
4. **Money out** — distributions land in banking/capital-account; quarterly PDF statements auto-deliver (cron) or download on demand.
5. **Paper** — document vault + data rooms (per-investor `DocumentAccess` grants), e-sign queue under Documents to Sign, K-1s delivered per-investor by the admin K-1 workflow.
6. **Stay informed** — announcements fan out to notifications/updates; analytics page charts the book.

## Status

IMS v2 is **LIVE in prod** (Phases 1–5, PR #4). Nav on by default; `NEXT_PUBLIC_IMS_V2=0` is the instant kill-switch.

## Feature map → code

| Feature | Code |
|---|---|
| Capital-account engine (XIRR, MOIC/TVPI/DPI/RVPI) | `src/lib/ims/metrics.ts` (pure, fixture-tested), `src/lib/ims/capitalAccount.ts` (`buildCapitalAccount(userId)` — derived live, no materialized tables) |
| PDF statements + quarterly auto-delivery | `src/lib/ims/statement.tsx`, `GET /api/investors/statements/download`, `POST /api/cron/quarterly-statements` (CRON_SECRET) |
| Onboarding invites, commitments, capital calls | `/investors/accept-invite`, `/api/investors/invites`, `Commitment`/`CapitalCall` models |
| Data rooms, e-sign, audit trail | `canAccessDocument()`, `DocumentView` (immutable), `SignatureRequest` |
| Charts, announcements | `src/components/ims/charts.tsx` (zero-dep SVG), `/api/investors/announcements` |
| Admin console (invites, capital calls, K-1 workflow) | `/investors/admin`; K-1: `GET /api/investors/k1/allocations?year=`, `POST /api/investors/k1/deliver` |
| Password reset | `/investors/reset-password` + Resend email (`src/lib/email.ts`) |

## Post-launch items still owed

1. Spot-check a real distribution/capital-account figure + sample PDF against prod data.
2. Set `EMAIL_FROM` (Resend-verified), `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` on Lightsail.
3. Security backlog: credential rotation + git-history purge (`SECURITY-REMEDIATION.md`).

Full design spec: `campus-rentals/docs/INVESTOR-IMS-SPEC.md`.
