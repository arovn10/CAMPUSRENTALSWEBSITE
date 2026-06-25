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
- [x] Add IDOR ownership check to `PUT /api/investors/properties/[id]` — non-admins must have a direct `Investment` or `UserPropertyAccess` row for the property; also added the missing null-auth check. (Sweep remaining investor-scoped mutations for the same pattern next.)
- [x] Whitelist updatable fields on the admin `PUT /api/investors/users` (was spreading raw `req.body` via `updateUser`); confirmed `/api/investors/profile` already uses an allowlist with no `role`/`email`/`password`.
- [x] Enforce rate limiting on `/api/auth/login` — new `src/lib/rateLimit.ts` (in-memory, single-instance) wired with the `RATE_LIMIT_*` env values; 10/window/IP on login, on top of the existing per-account lockout.
- [ ] Require the GitHub webhook signature (fail closed on missing header/secret).
- [ ] Generic client error responses + server-side logging (add Sentry).
- [ ] Add `zod` validation to all POST/PUT bodies.

---

## P2 — Architecture & DX
- [ ] Supabase migration (dedicated project, Prisma stays, Float→Decimal + indexes bundled, ALEC read path).
- [ ] Remove `typescript.ignoreBuildErrors` from `next.config.js`; fix surfaced type errors.
- [ ] SSR public listing pages + `generateMetadata`; server-gate the investor portal (kill client-side auth flash).
- [ ] Remove unused map libs (`mapbox-gl`, `@react-google-maps/api`).
- [ ] Consolidate the duplicated S3/file service modules.
