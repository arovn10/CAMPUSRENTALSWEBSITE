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
