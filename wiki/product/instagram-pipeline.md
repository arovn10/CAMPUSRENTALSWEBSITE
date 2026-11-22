# Instagram content pipeline (@campusrentalsllc)

**Status:** **LIVE since 2026-11-22.** @campusrentalsllc connected (Page token, no expiry), publishing switch ON, first automated post Mon 2026-11-23 14:30 UTC (8:30am CT). Publishing moved to mornings 2026-11-22.
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
| `social-generate` | Sundays | drafts one post per Mon/Wed/Fri slot of the coming week (campaign), or from listings/photos/editorial when no campaign is active |
| `social-publish` | Mon/Wed/Fri 14:30 UTC (8:30am CST) | sends **at most one** due, human-approved post, inside a rolling cap |
| `social-insights` | 6-hourly | per-media engagement **and the follower count** |

**Target cadence is three posts a week, Mon/Wed/Fri** (Alec, 2026-11-20; was
one a week from 2026-09-21). Enforced by dated slots the publisher won't send
early, the Mon/Wed/Fri publish schedule, and a server-side cap of 4 per rolling
168h (3 slots + room for one hand-made post) with a 12h minimum gap that a manual run cannot bypass.

**Active campaign: June 1, 2027 pre-leasing** — 2422 & 2424 Joseph, 7700 & 7702
Burthe, 7315 Freret (`src/lib/social/campaign.ts`; Alec confirmed 7315, not
7313). Mon = one unit, Wed = another unit's highlight, Fri = lineup of all still
listed. Facts come live from the Abodingo feed; leased units drop out and their
drafts are withdrawn. Full detail: `docs/INSTAGRAM-PIPELINE.md`.

Known feed discrepancies at launch (2026-11-20, fix in Abodingo): 7315 Freret
lists available 2028-06-01 and its description names 7313; 7700 Burthe's
description says 2.5 baths, the record says 2.

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

## Go-live log (2026-11-22)

- Admin login for the owner: `arovner@campusrentalsllc.com` (ADMIN) created via SSH; existing admins `rovnerproperties@gmail.com`, `testadmin@campusrentalsllc.com`.
- `ENCRYPTION_KEY` added to `.env.local` on Lightsail (none existed; only the social pipeline uses `lib/encryption`). **Never rotate it** without re-encrypting `social_credentials`.
- Verified live: generate (OIDC auth) queued 3 campaign drafts; insights read 27 followers; publish dry-run 200 with nothing due.
- Gotcha: the review page reads the login token from `sessionStorage`, which is per-tab — open `/admin/social` in the same tab you signed in with. The httpOnly-cookie fallback did not authenticate a fresh tab (cause not yet investigated).

## Activation status (checked 2026-11-20)

None of the "Still owed" steps below had been done as of 2026-11-20. Every
scheduled run since the merge failed solely because the `CRON_SECRET` Actions
secret was unset; the workflow now treats that as a warning (like a server 503)
so a red run means something real. Once `CRON_SECRET` is set, a 503 from the
server still means the Lightsail env/credentials are not in place.

## Connect flow — no secrets to copy (2026-11-22)

Meta app **"Campus Rentals Social"** (ID 1827015521939730), Instagram use case,
"API setup with Facebook login", linked to the **Campus Rentals** business
portfolio (597785759237786, unverified). Development mode — enough to post to
our own account. Not the Deal Radar app.

- **Connecting:** an ADMIN pastes a long-lived Facebook *user* token at
  `/admin/social` → server finds the Page linked to `@campusrentalsllc`
  (`SOCIAL_IG_USERNAME` overrides) and stores that Page's token + IG account id,
  encrypted. A Page token from a long-lived user token **does not expire**, so
  no refresh runs. Short-lived tokens are refused with instructions.
- **Cron auth:** GitHub Actions sends an **OIDC token** (audience
  `campusrentalsllc-social`); `guard.ts` verifies it was minted for
  `arovn10/campusrentalswebsite`, `refs/heads/main`, `social-pipeline.yml`.
  `CRON_SECRET` still works if set but is no longer needed.
- **Publishing switch:** toggle on `/admin/social` (table `social_settings`).
  `SOCIAL_PUBLISHING_ENABLED=false` in env is the hard kill; `=true` forces on.
- **No Lightsail env vars are required any more.** `META_APP_SECRET` is only
  used if a token with an expiry ever needs extending.
- Not yet added in the Meta app: `instagram_manage_insights` (the dashboard's
  Add button didn't respond from the agent's browser). Without it the insights
  job's follower/reach reads fail; publishing is unaffected. One click in
  App dashboard → Use cases → Customize → Permissions.

## Still owed (superseded by the connect flow above)

1. The Meta Business setup (`docs/META-BUSINESS-SETUP.md`) — Facebook Page,
   Business portfolio, developer app, long-lived token. Owner-gated; no agent
   session can do it.
2. Set `IG_BUSINESS_ACCOUNT_ID` / `META_APP_ID` / `META_APP_SECRET` /
   `CRON_SECRET` on Lightsail, and `CRON_SECRET` as a GitHub Actions secret.
3. Seed the token via `POST /api/social/credential`, then verify with a single
   approved post before setting `SOCIAL_PUBLISHING_ENABLED=true`.
4. Apply `scripts/add-social-instagram-pipeline.sql` (idempotent; runs via
   `npm run migrate:pending` on deploy).
