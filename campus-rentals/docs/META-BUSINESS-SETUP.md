# Meta Business setup for @campusrentalsllc

> **This is the owner-gated half of the Instagram pipeline.** Everything in this
> document requires signing in as Alec, accepting Meta's terms, and in one step
> submitting business verification documents. None of it can be done from an
> agent session, and none of it should be: accepting terms of service and
> asserting a business identity are acts that have to be the owner's.
>
> The code half is built and merged. It sits inert until the four values at the
> end of this document exist. Budget about 45 minutes, plus up to a few days if
> Meta asks for business verification.

## What you are creating, and why this shape

Campus Rentals needs an **Instagram Business account linked to a Facebook Page**,
inside a **Meta Business portfolio** owned by Campus Rentals LLC.

That specific shape matters. Instagram offers a simpler "Instagram Login" flow
that needs no Facebook Page, and it is tempting because it is fewer steps. Do
not use it here. It gives up:

- **Insights** — follower counts, reach, saves. Without a Page you cannot read
  the account's own numbers, and the pipeline's whole measurement layer goes
  dark.
- **Business Discovery and Hashtag Search** — reading public competitor and
  hashtag data. Only available on the Page-linked product.

A brand account wants all of that. The Page-linked flow is the right one.

Also: create the portfolio under **Campus Rentals LLC**, not under a personal
profile. The business owns the asset, and an account tied to one person's login
is a single point of failure the day that person's session changes.

---

## Step 1 — Facebook Page (10 min)

1. Sign in to Facebook as the account that should administer this long term.
2. **facebook.com/pages/create** → Page name **Campus Rentals**, category
   **Property Rental** (or *Real Estate Service*).
3. Fill in: the campusrentalsllc.com URL, the business address, a phone number
   and the business email. Add the logo and a cover image.
4. Publish the Page.

Do **not** skip the contact fields. Meta uses them during verification, and a
Page with no contact information is slower to verify.

## Step 2 — Convert the Instagram account (5 min)

1. In the Instagram app, signed in as **@campusrentalsllc**:
   **Settings → Account type and tools → Switch to professional account**.
2. Choose **Business** (not Creator — Creator accounts lose some publishing API
   access). Category **Property Rental**.
3. When prompted to connect a Facebook Page, connect the Page from Step 1.

Verify it took: **Settings → Account type and tools** should now show
*Professional / Business* with the Page linked.

## Step 3 — Meta Business portfolio (10 min)

1. **business.facebook.com** → **Create account**.
2. Business name **Campus Rentals LLC**, your name, the business email.
3. **Business settings → Accounts → Pages** → *Add* → the Campus Rentals Page.
4. **Business settings → Accounts → Instagram accounts** → *Add* →
   @campusrentalsllc.
5. **Business settings → Business info** → complete the legal entity details
   (Campus Rentals LLC, the Louisiana address, EIN). Submit verification if
   prompted — this can take a few days and is worth starting now rather than
   discovering it blocks you later.

## Step 4 — Developer app (15 min)

1. **developers.facebook.com** → *My Apps* → **Create App**.
2. Use case: **Other** → type: **Business** → link it to the Campus Rentals LLC
   portfolio from Step 3.
3. App name: `Campus Rentals Social`. Contact email: the business email.
4. **Add product → Instagram Graph API**.
5. **App settings → Basic**: note the **App ID** and **App Secret**. The secret
   is a credential — it goes into the server environment, never into a commit,
   a screenshot or a message.

### Permissions

Under **App review → Permissions and features**, request:

| Permission | Why |
|---|---|
| `instagram_basic` | read the account and its media |
| `instagram_content_publish` | create and publish media |
| `instagram_manage_insights` | read reach/saves/followers |
| `pages_show_list` | resolve the linked Page |
| `pages_read_engagement` | required alongside the above |

While the app is in **Development mode** these work for accounts with a role on
the app, which is enough to run the whole pipeline against your own account. You
only need App Review to go Live, which you do not need in order to post as
yourself.

## Step 5 — Get the two values the app needs

### The Instagram Business account ID

In **Graph API Explorer** (developers.facebook.com/tools/explorer), with your
app selected and a user token generated:

```
GET /me/accounts                        → find the Page, note its {page-id}
GET /{page-id}?fields=instagram_business_account
```

The returned `instagram_business_account.id` is a long numeric string. That is
`IG_BUSINESS_ACCOUNT_ID`.

### A long-lived access token

The Explorer gives you a **short-lived** token (about an hour). Exchange it:

```
GET https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={app-id}
  &client_secret={app-secret}
  &fb_exchange_token={short-lived-token}
```

The response's `access_token` lasts **60 days**. The app refreshes it
automatically from then on (`src/lib/social/credentials.ts`, called by the
publish cron), so this is the only time you do it by hand.

---

## Step 6 — Wire it up

Set these on the Lightsail server (PM2 env), **not** in a commit:

```
IG_BUSINESS_ACCOUNT_ID=<numeric id from Step 5>
META_APP_ID=<from Step 4>
META_APP_SECRET=<from Step 4>
CRON_SECRET=<any long random string; must match the GitHub secret>
SOCIAL_PUBLISHING_ENABLED=false      # leave false until you have reviewed drafts
```

None of these may ever carry the `NEXT_PUBLIC_` prefix — that would bundle them
into the browser, and two of them are credentials.

Then store the long-lived token, as an ADMIN user:

```bash
curl -X POST https://campusrentalsllc.com/api/social/credential \
  -H "Authorization: Bearer <your app login token>" \
  -H "Content-Type: application/json" \
  -d '{"token":"<the 60-day token>"}'
```

It is encrypted at rest before it reaches the database, and no endpoint ever
returns it — `GET /api/social/credential` gives you a fingerprint and an expiry
date only.

Finally, in the GitHub repo: **Settings → Secrets and variables → Actions** →
add the secret `CRON_SECRET` with the same value.

## Step 7 — Verify, in order

1. `GET /api/social/credential` (as ADMIN) → `hasToken: true`, a sane
   `daysToExpiry`.
2. Visit **/admin/social** → the "credentials not configured" banner is gone.
3. Actions → **Instagram Pipeline** → *Run workflow* → `generate`. Drafts appear
   in the queue.
4. Read them. Edit what needs editing. Approve exactly one.
5. Set `SOCIAL_PUBLISHING_ENABLED=true` and restart PM2.
6. Actions → **Instagram Pipeline** → *Run workflow* → `publish`.
7. Check the account. Then check `/admin/social` — the post should show a
   permalink, and within six hours an insight row.

If anything looks wrong at any point, set `SOCIAL_PUBLISHING_ENABLED=false` and
restart. Nothing publishes while it is off, and approved posts simply wait.
