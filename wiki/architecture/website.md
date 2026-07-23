# Website Architecture

Next.js (App Router) + TypeScript + Tailwind. App root is **`campus-rentals/`** — the repo root is a thin wrapper.

## Layout

```
campus-rentals/src/
├── app/                  # routes; api/ = route handlers
│   ├── properties/, tulane-housing/, fau-housing/, about/   # public site
│   ├── investors/        # IMS portal (see investor-portal.md)
│   ├── admin/            # internal admin screens
│   └── api/              # properties cache, investors/*, auth, webhook, health, cron
├── components/           # PropertyCard, maps (Leaflet), ims/charts, …
├── lib/                  # apiConfig, abodeClient, auth, access, rateLimit, db/prisma, ims/
├── utils/                # api.ts (Abodingo fetchers), serverCache, clientApi, geocoding
└── types/
```

## Load-bearing modules

| Module | Role |
|---|---|
| `lib/apiConfig.ts` | `ABODE_API_BASE_URL` (env-overridable) |
| `lib/abodeClient.ts` | canonical Abodingo request wrapper (mirrors abodingo-website semantics: 404-GET→`[]`, 502/503 friendly errors) |
| `utils/api.ts` | `fetchProperties` / `fetchPropertyPhotos` / `fetchPropertyAmenities` + `s3ToCloudFrontUrl` — swallow errors, return `[]`/`null` |
| `utils/serverCache.ts` | disk cache of listings/photos/amenities/coords |
| `lib/auth.ts` + `lib/access.ts` | `requireAuth()` (Bearer then `cr_auth` cookie) + `canAccessProperty()` / `canAccessDocument()` |
| `lib/rateLimit.ts` | login rate limiting |
| `lib/ims/*` | capital-account engine, XIRR metrics, PDF statements |

## Patterns (apply always)

```ts
// Protected route skeleton
const user = await requireAuth(request)
if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
if (!(await canAccessProperty(user, propertyId)))
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

// Money (Prisma Decimal)
const total = rows.reduce((s, r) => s + Number(r.amount), 0)

// Update whitelisting — never spread req.body
const ALLOWED = ['firstName','lastName','phone'] as const
const data = Object.fromEntries(ALLOWED.filter(k => k in body).map(k => [k, body[k]]))
```

- Maps: **Leaflet only** (`mapbox-gl` / `@react-google-maps/api` are dead deps slated for removal).
- Auth token: `sessionStorage` + httpOnly `cr_auth` cookie (dual-read during migration).
- CI: `pr-check.yml` (install, prisma validate, `tsc --noEmit`, `next build`) gates every PR to `main`; `automerge` label enables native auto-merge after checks.

## Campus Rentals Plaza page (`/plaza`, 2026-07-22)

Apple-product-page-style showcase for the 7900 Maple Street mixed-use development
(7 residences · restaurant + commercial · courtyard · streetcar-adjacent; opening mid-2027).

- **Page:** `app/plaza/page.tsx` (client) + `app/plaza/layout.tsx` (metadata + ApartmentComplex JSON-LD).
  Renderings in `public/plaza/` (compressed JPEGs — keep under ~1 MB each).
- **Waitlist:** `POST /api/plaza-waitlist` → `plaza_waitlist` table (Prisma `PlazaWaitlist`,
  migration `scripts/add-02-plaza-waitlist.sql`). Honeypot field `company`; interest must be
  `RENT | BUY | EITHER`; one row per email (repeat signup updates in place); best-effort
  notification email to rovnerproperties@gmail.com. GA event: `plaza_waitlist_join`.
- **Content rules (from Alec):** do NOT name the restaurant tenant yet; green/sustainability
  section removed for now; floor plans pending (placeholder promises waitlist members first look).
  Credits: Graham Hill Architect · ASK Construction & Development.
- Nav: "The Plaza" in header (desktop + mobile) and footer Explore; `/plaza` in sitemap.

## UI gotchas (learned the hard way — don't relearn)

- **`backdrop-filter` on an ancestor breaks `position: fixed` children.** The glass nav
  (`.glass-nav`, backdrop-blur) makes the header the containing block for fixed
  descendants — a drawer/modal rendered inside it collapses to the header's box
  (2026-07-12 transparent-mobile-menu bug). Render overlays/drawers as siblings of
  the header, not children. `Header.tsx` has the comment; keep it that way.
- **Every fullscreen modal must lock body scroll** (`document.body.style.overflow='hidden'`
  while open) **and use `overflow-y-auto` on its panel** — otherwise mobile touch
  scrolls the page behind the modal and bottom buttons are unreachable (2026-07-12
  Quick Preview bug). See the `showPreview`/`open` effects in `PropertyCard.tsx` /
  `LeadCapture.tsx` for the pattern.
- Lead capture: `LeadCapture.tsx` → `POST /api/leads` (validating proxy, honeypot) →
  Abodingo. GA4 conversion events `lead_tour_request` / `lead_inquiry` fire on success.
- Analytics: `components/Analytics.tsx` loads GA4 only when `NEXT_PUBLIC_GA_ID` is set;
  `utils/analytics.ts` `trackEvent()` is a safe no-op otherwise. A Google Ads tag
  (AW-11303299747) is hardcoded in `layout.tsx` separately.
