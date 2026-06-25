# Security Remediation — Campus Rentals Website

Tracking doc for the P0/P1/P2 hardening pass. Check items off as completed.

---

## P0 — Secrets exposure (DO FIRST)

### Done in code (this branch)
- [x] Added a **root `.gitignore`** (`*.pem`, `.env*`, access-key patterns) — its absence is why the prod SSH key and env files got tracked.
- [x] **Untracked** committed secrets: `LightsailDefaultKey-us-east-1.pem`, `.env.local`, `campus-rentals/.env` (`git rm --cached`, files kept on disk).
- [x] Removed hardcoded **Resend** key from `src/app/api/send-email/route.ts` → `process.env.RESEND_API_KEY`.
- [x] Removed insecure **JWT secret** fallback in `src/lib/auth.ts` → `getJwtSecret()` throws if unset.
- [x] Removed **`NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY`** fallbacks from `investorS3Service.ts`, `fileService.ts`, `properties/[id]/files/route.ts`, and preferred server-side `AWS_ACCESS_KEY_ID` in `s3Service.ts`. (Secret now only comes from server-only env.)

### Requires human action (external consoles — code can't do this)
- [ ] **Rotate every exposed credential** — they are in git history and must be assumed compromised:
  - [ ] Lightsail SSH key (`LightsailDefaultKey-us-east-1.pem`) — regenerate key pair, replace authorized_keys on `23.21.76.187`.
  - [ ] Prisma Accelerate API key + Postgres password (`DATABASE_URL`, `DIRECT_DATABASE_URL`).
  - [ ] `JWT_SECRET` — generate a new long random value (rotating invalidates existing sessions; expected).
  - [ ] AWS access key + secret (IAM) — issue new keys, scope to least privilege, delete old.
  - [ ] Resend API key.
  - [ ] Google Maps API key — add HTTP-referrer + API restrictions (it is necessarily client-visible).
  - [ ] GitHub webhook secret.
- [ ] **Set the rotated values** as real environment variables on the Lightsail host / PM2 ecosystem (and locally in an untracked `.env`). Add the new server-only names: `AWS_ACCESS_KEY_ID`, `RESEND_API_KEY`.
- [ ] **Purge secrets from git history** (removing them in a new commit is NOT enough):
  ```bash
  # install git-filter-repo first (brew install git-filter-repo / pip install git-filter-repo)
  cd CAMPUSRENTALSWEBSITE
  git filter-repo --invert-paths \
    --path LightsailDefaultKey-us-east-1.pem \
    --path .env.local \
    --path campus-rentals/.env
  # then force-push the rewritten history (coordinate — this rewrites the branch):
  git push --force-with-lease origin <branch>
  ```
  > ⚠️ History rewrite + force-push affects everyone with a clone. Coordinate before running. Even after purging, treat all the above keys as compromised and rotate them regardless.

---

## P1 — Data integrity & resilience
- [x] Add `@@index` on hot FK columns — done in `schema.prisma` + migration `prisma/migrations/010_add_fk_indexes.sql` (investments, fund_investments, distributions, waterfall_*, entity_*, property_loans). **Apply the migration** against the DB to take effect.
- [x] Wrap waterfall distribution multi-writes in `prisma.$transaction` — POST `waterfall-distributions` now creates the record + tier rows + closing fees + property debt update atomically (the debt update is no longer a swallowed best-effort write).
- [x] Batch the N+1 loan query in `investors/properties` route — single `where propertyId in [...]` + in-memory grouping instead of one query per property.
- [ ] **Money columns `Float` → `Decimal`** — HELD BACK intentionally. In Prisma, `Decimal` returns a `Prisma.Decimal` object at runtime (not a JS `number`), so every `+`/`*`/`reduce` on these fields (heavy in the waterfall math) breaks silently — and `ignoreBuildErrors: true` means the compiler won't catch it. This needs: (1) a code sweep converting money arithmetic to Decimal ops or `.toNumber()`, (2) a tested `ALTER TABLE ... TYPE numeric(15,2)` migration with correct precision (money `(15,2)`, rates/percentages a different scale). Best done together with the Supabase migration. Do NOT flip the schema alone.
- [ ] `abodeClient.ts`: AbortController timeout + exponential-backoff retry + last-good cache fallback for Render cold starts.
- [x] Add IDOR ownership check to `PUT /api/investors/properties/[id]` — non-admins must have a direct `Investment` or `UserPropertyAccess` row for the property; also added the missing null-auth check.
- [x] **Read-IDOR sweep** of all investor-scoped GET routes. Added `src/lib/access.ts` (`canAccessProperty`) and fixed 11 leaks: admin-gated the all-entities / all-entity-investments / all-entity-owners / entity-[id] / crm-deal-files reads (they exposed every investor's ownership data); added property-access checks to waterfall-distributions (GET + /all + /breakdown), waterfall-structures, insurance, and taxes (were readable for any property by id). Verified clean with `tsc`. (Lower-risk NEEDS-REVIEW: `documents` GET is already scope-filtered; `photos` GET returns empty as fallback — left as-is.)
- [x] **IDOR sweep** of all ~60 investor-scoped mutation routes. Found + fixed: `investments/[id]` PUT & DELETE (no role/null check — also rewrote property financials → now ADMIN/MANAGER only) and `entity-investments/[id]` PUT (allowed INVESTOR to rewrite any entity's ownership → now ADMIN/MANAGER only, consistent with its create/delete). All other CRM/entity/deal/document/waterfall mutations were already correctly admin-gated.
- [x] Whitelist updatable fields on the admin `PUT /api/investors/users` (was spreading raw `req.body` via `updateUser`); confirmed `/api/investors/profile` already uses an allowlist with no `role`/`email`/`password`.
- [x] Enforce rate limiting on `/api/auth/login` — new `src/lib/rateLimit.ts` (in-memory, single-instance) wired with the `RATE_LIMIT_*` env values; 10/window/IP on login, on top of the existing per-account lockout.
- [x] Require the GitHub webhook signature — `/api/webhook/github` now fails closed when `GITHUB_WEBHOOK_SECRET` is unset or the `x-hub-signature-256` header is absent (previously a missing header skipped verification → unauthenticated deploy/RCE), uses `crypto.timingSafeEqual`, and no longer echoes deploy stdout/stderr to the caller.
- [x] Generic client error responses — gated the leaked `details: error.message` behind `NODE_ENV` across 36 API route files (dev keeps detail; prod returns `undefined`, dropped from JSON); server-side `console.error` retained. **Remaining:** a handful of routes still put raw `error.message` in the user-facing `error` field (auth/route, login, files, users) — some of those messages (e.g. "Account is deactivated") are intentionally user-facing, so they need a careful per-route pass, not a blanket change. Adding Sentry for structured server-side error capture is still open.
- [ ] Add `zod` validation to all POST/PUT bodies.

---

## P2 — Architecture & DX
- [ ] Supabase migration (dedicated project, Prisma stays, Float→Decimal + indexes bundled, ALEC read path).
- [ ] Remove `typescript.ignoreBuildErrors` from `next.config.js`; fix surfaced type errors.
- [ ] SSR public listing pages + `generateMetadata`; server-gate the investor portal (kill client-side auth flash).
- [ ] Remove unused map libs (`mapbox-gl`, `@react-google-maps/api`).
- [ ] Consolidate the duplicated S3/file service modules.
