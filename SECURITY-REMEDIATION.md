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
- [ ] Money columns `Float` → `Decimal(15,2)` in `prisma/schema.prisma` (price, investmentAmount, distributions, loan amounts).
- [ ] Add `@@index` on hot FK columns (`Investment.userId/propertyId`, `Distribution.userId`, `EntityInvestment.entityId`, `WaterfallTierDistribution.waterfallTierId`).
- [ ] Wrap waterfall distribution multi-writes in `prisma.$transaction`.
- [ ] Batch the N+1 loan query in the investor-properties route (`where propertyId in [...]`).
- [ ] `abodeClient.ts`: AbortController timeout + exponential-backoff retry + last-good cache fallback for Render cold starts.
- [ ] Add IDOR ownership checks to investor-scoped routes (e.g. `PUT /api/investors/properties/[id]`).
- [ ] Whitelist updatable fields on profile/update routes (no `role`/ownership self-assignment).
- [ ] Enforce rate limiting on `/api/auth/login` (wire the existing `RATE_LIMIT_*` env values).
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
