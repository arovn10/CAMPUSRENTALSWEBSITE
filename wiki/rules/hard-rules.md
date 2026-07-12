# Hard Rules — every Campus Rentals repo, every session

Non-negotiable. If a task conflicts with one of these, stop and surface it instead of proceeding.

## Build & deploy

1. **`npm run build` before every `git push`** (from `campus-rentals/`). A broken build wastes 20–30 min on Lightsail.
2. **Type-checking stays ON.** Never re-add `typescript.ignoreBuildErrors` to `next.config.js` — fix the type error.
3. **Deploy platform is AWS Lightsail** — never Vercel/Netlify. Push to `main` → GitHub webhook → `auto-deploy.sh` → PM2 restart.
4. **`npx prisma generate` after any `schema.prisma` change**, and ship a numbered migration — never hand-edit the DB. Migrations must be additive/data-preserving (`migrate:pending` runs on deploy).

## Money & data integrity

5. **Money is `Decimal`, never `Float`.** New monetary columns are `Decimal(15,2)`. Wrap Decimal reads used in arithmetic with `Number(...)`.
6. **The investor portal is a system of record.** Every change to investor-money code goes through additive migrations and is ownership-scoped.

## Security

7. **Every protected API route verifies BOTH the JWT and ownership** — `requireAuth()` null-check + `canAccessProperty()` / `canAccessDocument()` from `src/lib/access.ts`.
8. **Never spread `req.body` into Prisma** — whitelist updatable fields. `role` is never self-settable.
9. **No secrets with the `NEXT_PUBLIC_` prefix.** That prefix ships the value to the browser.
10. **Never commit secrets** (keys, `.env*`, PEMs). Several were leaked historically — see `SECURITY-REMEDIATION.md`; rotation is still owed.
11. **Don't leak error internals in prod** — gate `details: error.message` behind `NODE_ENV === 'development'`.

## The Abodingo boundary

12. **Listings data is NOT ours.** Public listings come live from the Abodingo backend under landlord `campusrentalsnola`. This site must never write listing/lease/tenant/rent data. Full contract: [`../architecture/data-sources.md`](../architecture/data-sources.md).
13. **The four Abodingo endpoints this site consumes must stay public** (`[AllowAnonymous]` in AbodeBackend): `GET /api/property/{username}`, `GET /api/propertyfromID/{id}`, `GET /api/photos/get/{id}`, `GET /api/amenities/{propertyId}`. They are pinned in AbodeBackend's `AllowAnonymousAllowlistTests`. If a security pass over there de-anonymizes them, this site silently degrades to fake test data (2026-07-12 incident).
14. **All outbound Abodingo calls go through `src/lib/abodeClient.ts` / `src/lib/apiConfig.ts`** — no raw `fetch` to the backend from pages.
15. **Abodingo repos are reference-only** during Campus Rentals work, with one exception: restoring the public endpoints in rule 13.

## Context discipline

16. **Write back what you learn.** Incidents → `operations/incident-playbook.md`; architecture discoveries → the relevant wiki page. Commit with `wiki:` prefix. Continuous context only works if sessions actually write to it.
17. **New Campus Rentals repos get added to `wiki/README.md`'s repo table** and inherit these rules via their own `CLAUDE.md` pointing here.
