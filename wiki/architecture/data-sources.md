# Data Sources — the Two-Universe Model

Campus Rentals data lives in two systems that do **not** sync live. Knowing which universe owns a datum is the first step of every data task.

| | **Operations** | **Listings + Investors (this app)** |
|---|---|---|
| System of record | TenantCloud (legacy SaaS) | Abodingo backend (listings) + this app's Postgres (equity) |
| Holds | live leases, tenants, rent ledger, maintenance | public rental listings + investor LLCs/waterfalls/distributions |
| Read by | ALEC (scrapes → Supabase cache) | this website |

**Rule of thumb: listing/lease/tenant/rent = Abodingo; everything else = Campus Rentals DB.**

## The Abodingo listings dependency (CRITICAL)

Public listings (`/properties`, `/tulane-housing`, `/fau-housing`, home page) are pulled **live and unauthenticated** from the Abodingo backend at `https://abodingo-backend.onrender.com/api` under landlord account **`campusrentalsnola`**.

### The endpoint contract (reads + lead writes)

| Endpoint | Used for | Client code |
|---|---|---|
| `GET /api/property/campusrentalsnola` | full listing set | `src/utils/api.ts` `fetchProperties()` |
| `GET /api/photos/get/{propertyId}` | photo galleries | `fetchPropertyPhotos()` |
| `GET /api/amenities/{propertyId}` | amenity flags | `fetchPropertyAmenities()` |
| `GET /api/propertyfromID/{id}` | property detail | `src/lib/abodeClient.ts` `abodeApi.properties.getById()` |
| `POST /api/property-inquiries/create` | "Ask a question" leads (2026-07-12) | `src/app/api/leads/route.ts` proxy ← `LeadCapture.tsx` |
| `POST /api/property-tours/create` | "Schedule a tour" leads (2026-07-12) | same proxy |

Lead payloads: inquiry `{propertyId, inquirerName, inquirerEmail, inquirerPhone?, message?}`;
tour `{propertyId, scheduledDate(ISO, future), tourGuestName, tourGuestEmail, tourGuestPhone?, notes?}`.
Leads land in Abodingo as PropertyInquiry/PropertyTour rows and notify the landlord.

**These must stay `[AllowAnonymous]` in AbodeBackend** (the lead-write endpoints already were, as public prospect flows) (its auth default is deny — a `FallbackPolicy` requires a JWT on everything not explicitly opted out). They are registered in AbodeBackend's `Abode.Tests/AllowAnonymousAllowlistTests.cs`, which fails their CI if someone removes the attribute. History: the 2026-06-20 hardening missed three of the four and the site silently served fake data for weeks — see the incident log.

### Failure mode & fallback chain

`fetchProperties()` swallows HTTP errors and returns `[]`. The `/api/properties` route then falls back to `src/app/api/properties/test-data.json` — **fake listings ("1234 Magazine St", "5678 St. Charles Ave") render as if real**. There is no alerting on this today. If the site shows those addresses, the Abodingo fetch is broken; check the backend first, not this repo.

### Caching layers between backend and browser

1. Server cache (`src/utils/serverCache`) — property/photo/amenity JSON + geocoded coordinates, refreshed when stale
2. Next.js route `Cache-Control` — 1 h fresh / 24 h stale-while-revalidate (5 min for fallback responses)
3. Force refresh: `GET /api/force-refresh` or `/api/cache/refresh` on the live site

## Images

Photos are S3 (`abodebucket`, us-east-2) URLs rewritten to CloudFront (`d1m1syk7iv23tg.cloudfront.net`) by `s3ToCloudFrontUrl()`.

## What this app's own Postgres owns

Everything investor/equity: users, investments, entities, waterfalls, funds, distributions, deal pipeline/CRM, documents, insurance/taxes. See [`database.md`](database.md) and [`investor-portal.md`](investor-portal.md).
