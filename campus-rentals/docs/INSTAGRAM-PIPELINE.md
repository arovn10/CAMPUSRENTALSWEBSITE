# Instagram content pipeline — @campusrentalsllc

Campus Rentals' own social pipeline. It generates draft posts from the data this
site already owns, puts every one of them in front of a human, and publishes
only what that human approves — slowly, and inside a rolling cap.

**It shares nothing with any other Instagram automation.** Its own Meta app, its
own credentials, its own tables, its own repo. That separation is the point:
another brand's account cannot reach this one, and a credential rotation on one
side cannot break the other.

Setup is in [`META-BUSINESS-SETUP.md`](./META-BUSINESS-SETUP.md) and is
owner-gated — the code here is inert until those values exist.

---

## The flow

```
  generate (Mondays)               review (human)             publish (Tuesdays)
 ┌──────────────────┐            ┌──────────────┐            ┌─────────────────┐
 │ Abodingo listings│            │ /admin/social│            │ ≤1 post / cycle │
 │ S3 photo library │──drafts──▶ │ approve/edit │──APPROVED─▶│ cap + min gap   │──▶ IG
 │ editorial topics │            │ reject       │            │ re-check compl. │
 └──────────────────┘            └──────────────┘            └─────────────────┘
                                                                      │
                                                        insights (6-hourly)
                                                                      ▼
                                                   reach · saves · FOLLOWERS
```

**Target cadence is one post a week.** Monday builds the queue, you review it
during the week, Tuesday publishes whatever you approved.

Generation and publishing are separate jobs on separate schedules on purpose.
Approving something is a judgement about content; sending it is a decision about
timing. Collapsing them into one button makes the cap unenforceable.

## What gets posted

| Kind | Source | Media |
|---|---|---|
| `LISTING` | live from the Abodingo backend (`src/utils/api.ts`) | listing photos, CDN URLs |
| `PHOTO_FEATURE` | one property per week, rotated | photo library carousel |
| `DEVELOPMENT` | Maple Street Plaza topics (`src/lib/social/editorial.ts`) | **reviewer attaches** |
| `NEIGHBORHOOD` | evergreen area/leasing copy (same file) | **reviewer attaches** |

Editorial drafts are queued deliberately without media. The copy is ready and
waiting; the reviewer supplies the image. A post with no media can never be
approved and can never publish — the API rejects the approval and the publish
path skips it.

## Fair housing is the binding constraint

Rental advertising is regulated speech. The Fair Housing Act (42 U.S.C.
§3604(c)) makes it unlawful to publish an advertisement for a dwelling that
"indicates any preference, limitation, or discrimination" on a protected class,
and it binds the advertisement itself — regardless of intent, and regardless of
who the landlord would actually rent to.

So `src/lib/social/compliance.ts` **fails closed**, and it is checked three
times: when a draft is generated, when a human clicks approve, and again at
publish time (because the caption may have been edited in between). A caption
that trips a rule is blocked entirely rather than softened.

It covers the federal classes plus the ones the New Orleans ordinance adds (age,
creed, marital status, source of income), and it screens hashtags too — a
hashtag is part of the published advertisement.

Listing and photo-feature captions carry the equal-housing notice automatically.

**This is a guardrail against the obvious failures, not legal advice**, and it is
not a substitute for the human review step. A pattern list cannot catch every
way a sentence can imply a preference. That is why a person still reads every
post.

Two rules for anyone writing new caption copy:

- describe **the property**, never the ideal tenant. "Two blocks from campus" is
  fine; "perfect for a single professional" is a familial/marital status
  violation and will be blocked.
- never instruct the reader to like, save, tag or share. Instagram demotes
  captions that do, so it costs reach rather than earning it.

## Cadence

Defaults, all overridable by env:

| Knob | Default | Why |
|---|---|---|
| `SOCIAL_MAX_MEDIA_PER_WINDOW` | 1 | one post per window |
| `SOCIAL_WINDOW_HOURS` | 168 | the window is 7 days — so, one post a week |
| `SOCIAL_MIN_PUBLISH_GAP_MINUTES` | 1440 | redundant at a cap of 1; matters the moment you raise it |
| `SOCIAL_MAX_OPEN_DRAFTS` | 6 | ~six weeks of choice; generation stops refilling a queue nobody reviews |

Two independent things enforce the weekly rhythm, and both are deliberate:

- the **schedule** publishes on Tuesdays, which gives a predictable posting day.
  A rolling cap alone would drift — the next slot frees exactly 168h after the
  last post, so the posting time walks later every week.
- the **cap** is 1 per rolling 168 hours, which a manual `workflow_dispatch`
  cannot bypass. The window is rolling rather than a calendar week because a
  calendar boundary can be crossed to reset the count: "one a week" enforced
  against a calendar week permits two posts a few hours apart across a Sunday
  night.

The publish job also sends **at most one post per cycle** regardless of what the
cap would allow. Two posts in one cycle is how spacing silently becomes zero.

To go faster later, raise `SOCIAL_MAX_MEDIA_PER_WINDOW`, or shorten
`SOCIAL_WINDOW_HOURS` and add publish days to the workflow schedule.

## Measurement

`social_account_snapshots` records the **follower count**, hourly-idempotent,
from the first day the pipeline runs.

This is the outcome metric and it is the one worth protecting. Reach is granted
by the platform and collapses for reasons no individual post is responsible for;
a follower only ever moves because a person chose. Without the follower series,
no change to cadence, format or copy can be judged against the thing it was made
for — only against reach, which moves on its own.

**Never `SUM(reach)` across `social_post_insights`.** There are many snapshot
rows per media; summing them gives a number several times the truth. Group by
`igMediaId` and take the max — `pipelineStats()` does this, and so should any
query you write. Compare only media at least ~72h old, or say plainly that the
recent rows are immature.

## Switches

| Env var | Effect |
|---|---|
| `SOCIAL_PUBLISHING_ENABLED` | must be exactly `"true"` or **nothing publishes**. The kill switch. |
| `SOCIAL_GENERATION_ENABLED` | set `false` to stop refilling the queue; review still works |
| `IG_BUSINESS_ACCOUNT_ID` · `META_APP_ID` · `META_APP_SECRET` | credentials; server-only, never `NEXT_PUBLIC_` |
| `CRON_SECRET` | authenticates the three cron endpoints |

Turning publishing off is instant and safe: approved posts simply wait.

## Surfaces

| Path | What |
|---|---|
| `/admin/social` | the review queue (ADMIN or MANAGER) |
| `GET/POST /api/social/drafts` | list the queue · regenerate · create a manual draft |
| `PATCH /api/social/drafts/:id` | edit · approve · reject · reset |
| `GET /api/social/stats` | queue counts, follower series, cadence state |
| `GET/POST/PUT /api/social/credential` | token health · seed · force refresh (ADMIN) |
| `POST /api/cron/social-generate` | refill the queue (CRON_SECRET) |
| `POST /api/cron/social-publish` | publish ≤1 approved post (CRON_SECRET) |
| `POST /api/cron/social-insights` | engagement + follower snapshot (CRON_SECRET) |

Schedules live in `.github/workflows/social-pipeline.yml`.

## Token lifetime

Long-lived Instagram tokens last 60 days and are refreshable after they are 24
hours old. The publish job refreshes weekly, which leaves roughly eight
consecutive failures of headroom before anything is at risk. The token lives in
`social_credentials`, encrypted with the app's AES helper, because PM2 processes
cannot rewrite their own environment and an env-only token would revert on every
restart.

No endpoint ever returns the token. `GET /api/social/credential` gives a
fingerprint and an expiry.

## Known limits

- **No video rendering.** `REEL` is supported by the publish path, but nothing
  in the pipeline *produces* a video — a Reel needs a reviewer-supplied URL.
  Carousels and images are what generation makes today.
- **Editorial content is templated seed copy**, rotated weekly. It is a starting
  draft for a human to rewrite, not finished writing.
- **The compliance list is pattern-based.** It catches the well-known failures.
  It cannot catch every way a sentence implies a preference, which is why the
  human step is not optional.
