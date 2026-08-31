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

## Maple Street Plaza page (`/plaza`, 2026-07-22)

> Branding (2026-07-23, per Alec): the development is **"Maple Street Plaza"** — NOT "Campus Rentals Plaza".
> Nav tab stays "The Plaza". Internal identifiers (`/plaza`, `plaza_waitlist`, GA `plaza_*`) unchanged.

Apple-product-page-style showcase for the 7900 Maple Street mixed-use development
(7 residences · restaurant + commercial · courtyard · streetcar-adjacent; opening mid-2027).

- **Page:** `app/plaza/page.tsx` (client) + `app/plaza/layout.tsx` (metadata + ApartmentComplex JSON-LD).
  Renderings in `public/plaza/` (compressed JPEGs — keep under ~1 MB each).
- **Waitlist:** `POST /api/plaza-waitlist` → `plaza_waitlist` table (Prisma `PlazaWaitlist`,
  migration `scripts/add-02-plaza-waitlist.sql`). Honeypot field `company`; interest must be
  `RENT | BUY | EITHER`; one row per email (repeat signup updates in place); best-effort
  notification email to rovnerproperties@gmail.com. GA event: `plaza_waitlist_join`.
- **Content rules (from Alec):** do NOT name the restaurant tenant yet; green/sustainability
  section removed for now. Credits: Graham Hill Architect · Asper Construction (per the approved
  permit set — "ASK Construction" was a voice-note mishearing).
- **Interactive floor plans** (`app/plaza/FloorPlanExplorer.tsx`, 2026-07-22): SVG plans redrawn
  (simplified/approximate) from permit sheets A201/A402/A403 — plan tabs (Penthouse / Flat /
  Ground Floor), toggles for room labels / dimensions / draggable+rotatable example furniture,
  tap-a-room area chips. Per Alec: no raster permit crops on the page — keep plans dynamic.
  GA event `plaza_floorplan_interact` (deduped per plan+action).
- **Fact source:** the approved permit set ("7900-04 Maple - Approved Permit Set R10 11.20.2025",
  Google Drive, owner grahamledoux@gmail.com; 36.6 MB — over the Drive connector's 10 MB download
  cap; text extraction works, drawing images came from Alec's screenshots). Key verbatims: units
  101 (937 SF 2BR ADA/FHA, "AFFORDABLE UNIT FOR BUILDING B"), 201–204 (2BR 966–992 SF, balconies),
  301 "OWNER'S UNIT" / 302 penthouse (1,960 SF, terrace w/ folding glass wall, private elevators);
  commercial shells 1,611 SF + 653 SF; Marvin impact-rated windows; NFPA 13R; STC 61–62;
  ButterflyMX; HU-B1 zoning, 38'-9" height.
- Nav: "The Plaza" in header (desktop + mobile) and footer Explore; `/plaza` in sitemap.

## Site quality baseline (2026-07-23 audit — hold this line)

A full audit measured the public site; everything below was fixed and must not regress.

| Area | Baseline now | What was wrong |
|---|---|---|
| Accessibility | **0 axe violations** across `/`, `/properties`, `/tulane-housing`, `/fau-housing`, `/plaza`, `/about`, `/contact`, `/privacy`, `/terms`, `/fair-housing`, `/investors/login` | ~150 violations; no `<main>` anywhere; accent failed AA; base layer forced failing colors on all headings |
| Canonicals | exactly **1 per page** | a hardcoded homepage canonical in the root `<head>` shipped on every page → every sub-page claimed to be a duplicate of `/` |
| Footers / `<main>` | exactly **1 each**, both from `layout.tsx` | `/about`, `/contact`, `/fau-housing`, `/tulane-housing` each rendered a second legacy footer — doubled copyright, mismatched navy, and "Powered by Abode Student Listing Service" shown to customers |
| Metadata | unique title + 136–156 char description per page | `/contact` inherited the homepage title verbatim; root description was 283 chars; `/about` + `/properties` dropped `og:image` by declaring `openGraph` without `images` |
| Mobile | no horizontal overflow; tap targets ≥44px; **all form fields ≥16px** | drawer links 24–28px, hamburger 40px, IG icon 24px; 14px inputs made iOS zoom the page on focus |
| Legal | `/privacy`, `/terms`, `/fair-housing` + Equal Housing statement in footer | none existed, while three forms collect PII and a Google Ads tag runs (Ads policy requires a privacy policy) |
| Failure states | branded `error.tsx`, `global-error.tsx`, `not-found.tsx` | none existed — crashes and bad URLs fell through to Next's default screen |
| `/investors/*` | `X-Robots-Tag: noindex` via `middleware.ts` | the portal login was `index, follow`. Its layout is a client component, so metadata can't be used — the header is the mechanism |
| Images | `sharp` installed | production `next/image` ran on the slow JS fallback |

**Hero video (`components/HeroVideo.tsx`):** the source asset is a **68 MB** MP4
(`Content-Type: binary/octet-stream`). It is now served via **CloudFront** (not S3 direct),
`preload="metadata"`, has a pause control, and only autoplays on desktop when the visitor
hasn't requested reduced motion and isn't on Data Saver / a slow link. **Still owed:**
transcode to <3 MB + add a poster frame + fix the content type — needs S3 write access.

**Not yet done from that audit:** no alert exists for the catastrophic silent failure mode
(Abodingo auth breaks → listings vanish); `health-monitor.yml` only pings `/api/health`.
Minimum viable fix: assert `/api/properties` returns ≥15 listings and lacks
`X-Data-Staleness: stale`. Also unbuilt: renter content gaps (pricing transparency,
application process/fees, lease terms, FAQ, testimonials).

## Design-system parity pass (2026-08-31 — hold this line too)

The 2026-07 redesign (home page, header, footer, `PropertyCard`, `LeadCapture`, `/plaza`)
never reached `/about`, `/contact`, `/tulane-housing`, `/fau-housing`, or `/properties/[id]` —
those five were still on the pre-redesign dark `gray-900/800` + `secondary`-gradient look,
which reads as a visibly different, lower-quality product the moment a visitor leaves the
homepage. All five are now on the `ink`/`accent-deep` system (`card-premium`, `section-shell`,
`eyebrow`, `btn-hero`/`btn-ghost`/`btn-quiet`) — restyle only, no handler/data-flow changes,
per the design-system hard rules. `PropertyCard`'s mobile preview modal had the same drift
(`text-text`, `bg-secondary/10`, gray-200/500) and is fixed too. Remaining known-dark-theme
files (`test-auth`, `admin/*`) are internal/robots-disallowed and intentionally untouched.

**FAU housing was the bigger gap, not just a reskin.** `/fau-housing/page.tsx` was a bare
`'use client'` component — client components cannot export `metadata`, so the page had **no
page-specific title/description/canonical/OG at all** and silently inherited the homepage's.
It also lacked the `FAQPage`/`LocalBusiness` JSON-LD and keyword-rich prose section that
`/tulane-housing` already had, and its hero hotlinked a generic Unsplash campus photo behind a
yellow/green gradient with no relation to the brand. Fixed by splitting it into the same
server-page + client-component pattern as Tulane (`FAUHousingClient.tsx` + `page.tsx` +
`metadata.ts`) and bringing the schema/content to parity. If a school hub page is ever added
again, copy this pattern — a bare client page at a route silently has zero SEO metadata.

**OG images were 404ing.** `/og-image.jpg`, `/og-tulane-housing.jpg`, `/og-fau-housing.jpg`
were referenced in metadata across the whole site but never existed in `public/` — every link
shared to Facebook/iMessage/Slack/Instagram-bio rendered with no preview image. Regenerated as
branded 1200×630 cards (ink-950 bg, accent glow, CR mark) via a small Playwright HTML-to-JPEG
script; regenerate the same way if the brand palette or copy changes (script pattern: build an
HTML string with inline CSS at exactly 1200×630, `page.screenshot({type:'jpeg'})` per variant —
not currently checked into the repo as a script, recreate from this description if needed).

**`/properties` was a crawl-budget dead end.** It was a `'use client'` page whose only job was
`useEffect(() => router.replace('/'))` — a client-side JS redirect that sat in `sitemap.xml` at
priority 0.8. Replaced with a real `redirects()` entry in `next.config.js` (permanent, resolved
before any page renders) and removed the page + its sitemap entry. `/properties/[id]` and
`/properties/create` are unaffected — they're separate route segments; only the index page was
a redirect stub. `/properties/layout.tsx`'s own metadata block (for the now-unreachable index)
was left in place — harmless dead code, and `[id]`'s own `generateMetadata` already overrides it.

**Property detail page (`/properties/[id]`) structured data was thinner than it could be:** no
`addressLocality`/`addressRegion`, no `geo`, no `BreadcrumbList`. Added all three to the
`Apartment` JSON-LD in `layout.tsx` (school/city inferred the same way `generateMetadata` already
does — substring match on `address`/`name` for "new orleans" / "boca"), geo from
`property.latitude`/`longitude` when present. Do **not** add `aggregateRating`/review schema
without real review data — fabricating it is a Google Rich Results policy violation.

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
