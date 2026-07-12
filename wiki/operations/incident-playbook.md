# Incident Playbook + Incident Log

## Triage by symptom

| Symptom | First check | Likely cause |
|---|---|---|
| Site shows **fake listings** ("1234 Magazine St", "5678 St. Charles Ave") or "No FAU/Tulane properties available" | `curl -w '%{http_code}' https://abodingo-backend.onrender.com/api/property/campusrentalsnola` | Abodingo backend returning 401/5xx → site fell back to `test-data.json`. See INC-2026-07-12 below. |
| Site completely down | `curl https://www.campusrentalsllc.com/api/health` · SSH to Lightsail, `pm2 status` | PM2 crash, failed deploy build, nginx |
| Deploy didn't take | Lightsail `auto-deploy.sh` log; GitHub webhook deliveries | webhook secret/signature, build failure |
| Investor numbers look wrong | Was a migration applied? `Decimal` vs `Float` arithmetic? | see hard rules 5–6 |
| Photos broken but data fine | CloudFront URL rewrite, S3 object ACLs | `s3ToCloudFrontUrl()`, bucket |

Escalation targets: backend data issues → AbodeBackend repo (Abodingo); hosting → Lightsail (`23.21.76.187`, bitnami); DB → Prisma Accelerate dashboard.

## After every incident

Add an entry below (newest first), then update any wiki page whose wrong/missing content contributed.

---

## Incident log

### INC-2026-07-12 — Listings replaced by fake test data (weeks-long, silent)

- **Symptom:** campusrentalsllc.com showed placeholder listings ("1234 Magazine St", "5678 St. Charles Ave"); FAU/Tulane pages empty.
- **Root cause:** AbodeBackend's 2026-06-20 security hardening made auth-required the default (`FallbackPolicy` in `Program.cs`). Its grandfathered `[AllowAnonymous]` baseline included `photos/get/{id}` but **missed** `property/{username}`, `propertyfromID/{id}`, and `amenities/{propertyId}` → those returned 401. `fetchProperties()` swallowed the error → `[]` → route served `test-data.json` with real-looking cards.
- **Why it was silent:** the fallback renders convincingly; no alert existed on fallback activation.
- **Fix:** restored `[AllowAnonymous]` on the three endpoints + pinned all of them in AbodeBackend's `AllowAnonymousAllowlistTests` (commit `a25c480`, merged to `master` as `7ee91b6`; full 1052-test suite green). Endpoints verified 200 post-deploy.
- **Follow-ups:** ✅ DONE (2026-07-12) — test-data fallbacks removed from `/api/properties` and `clientApi.ts`. On backend failure the route now serves **stale real cache** (with `X-Data-Staleness: stale` header) or returns **503**, and the client returns `[]` so pages show their empty state. Fake listings can no longer render. Remaining nice-to-have: point `health-monitor.yml` at `/api/properties` (alert on 503/stale) in addition to `/api/health`.
