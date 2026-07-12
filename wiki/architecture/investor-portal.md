# Investor Portal / IMS

`/investors/*` is a **system of record for investor money**. Every change here follows hard rules 5–7 (Decimal money, additive migrations, ownership-scoped reads).

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
