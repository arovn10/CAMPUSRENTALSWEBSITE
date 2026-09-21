# Instagram content pipeline (@campusrentalsllc)

**Status:** built and merged, **inert until the Meta setup is done** (owner-gated).
**Lives in:** this repo — `campus-rentals/src/lib/social/`, `/admin/social`,
`/api/social/*`, `/api/cron/social-*`.
**Docs:** `campus-rentals/docs/INSTAGRAM-PIPELINE.md` (how it works) ·
`campus-rentals/docs/META-BUSINESS-SETUP.md` (the owner-gated setup).

## The thing a future session most needs to know

There was an earlier Instagram pipeline, and **it is not this one.** It is
**Deal Radar** (`@dealradar.daily`) in **`arovn10/deal-finder`** — an Amazon
Associates deals account under The Rovner Group LLC, deliberately unlinked from
Alec personally. Different business, different repo, different Meta app.

Campus Rentals' pipeline shares **nothing** with it, by explicit instruction
(2026-09-21): its own Meta app, its own credentials, its own tables. Do not wire
them together and do not "reuse" Deal Radar's credentials or code here.

What *did* transfer is measurement discipline, not code — see below.

## Shape

Three scheduled jobs (`.github/workflows/social-pipeline.yml`), deliberately
separate:

| Job | Cadence | Does |
|---|---|---|
| `social-generate` | Mondays | builds drafts from listings, the photo library and editorial topics |
| `social-publish` | Tuesdays | sends **at most one** human-approved post, inside a rolling cap |
| `social-insights` | 6-hourly | per-media engagement **and the follower count** |

**Target cadence is one post a week** (Alec, 2026-09-21). Enforced twice: a fixed
Tuesday schedule for a predictable posting day, and a server-side cap of 1 per
rolling 168h that a manual workflow run cannot bypass. To go faster, raise
`SOCIAL_MAX_MEDIA_PER_WINDOW` or shorten `SOCIAL_WINDOW_HOURS`.

**Every post is a DRAFT until a human approves it** at `/admin/social`
(ADMIN/MANAGER). Approving is a content judgement; sending is a timing decision.
They are separate on purpose — collapsing them makes the cadence cap
unenforceable.

## Two things not to break

1. **Fair housing compliance fails closed.** `src/lib/social/compliance.ts` is
   checked at generation, at approval, and again at publish (the caption may
   have been edited in between). FHA §3604(c) binds the advertisement itself,
   regardless of intent. A caption that trips a rule is blocked entirely, never
   softened. If you find it over-blocking, tighten the *pattern*, never the
   fail-closed behaviour.

2. **Never `SUM(reach)` across `social_post_insights`.** Many snapshot rows per
   media; summing gives a number several times the truth. Group by `igMediaId`,
   take the max, and compare only media ≥72h old. `pipelineStats()` does this
   correctly — copy it rather than writing a fresh query.

## Why the follower series exists from day one

Reach is granted by the platform and collapses for reasons no post is
responsible for. A follower only ever moves because a person chose. Deal Radar
ran five weeks with no follower reading at all, and as a result **no change to
cadence, format or copy could be evaluated against the outcome it was made
for** — only against reach, which moves on its own. `social_account_snapshots`
records followers hourly-idempotent from the first run so that cannot happen
here. There is no way to backfill it.

Related finding worth carrying (from Deal Radar's own 88 media): Reels reached
**61× feed posts** at matched maturity, because feed posts are distributed to the
follower graph and that account's graph was empty. **That finding does not
transfer wholesale** — @campusrentalsllc is a real brand account with real
followers, so feed posts do reach someone here. Measure it on this account
before acting on it.

## Kill switch

`SOCIAL_PUBLISHING_ENABLED` must be exactly `"true"` or nothing publishes.
Setting it to anything else and restarting PM2 stops publication instantly;
approved posts simply wait. Credentials (`IG_BUSINESS_ACCOUNT_ID`,
`META_APP_ID`, `META_APP_SECRET`) are **server-only — never `NEXT_PUBLIC_`**.

The long-lived token lives encrypted in `social_credentials`, not in env: PM2
processes cannot rewrite their own environment, so an env-only token would
revert on every restart. It auto-refreshes weekly against a 60-day window.

## Still owed

1. The Meta Business setup (`docs/META-BUSINESS-SETUP.md`) — Facebook Page,
   Business portfolio, developer app, long-lived token. Owner-gated; no agent
   session can do it.
2. Set `IG_BUSINESS_ACCOUNT_ID` / `META_APP_ID` / `META_APP_SECRET` /
   `CRON_SECRET` on Lightsail, and `CRON_SECRET` as a GitHub Actions secret.
3. Seed the token via `POST /api/social/credential`, then verify with a single
   approved post before setting `SOCIAL_PUBLISHING_ENABLED=true`.
4. Apply `scripts/add-social-instagram-pipeline.sql` (idempotent; runs via
   `npm run migrate:pending` on deploy).
