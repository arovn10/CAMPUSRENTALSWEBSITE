# Investor Portal → IMS Overhaul — Design Spec & Roadmap

Decisions captured from the in-depth design quiz (2026-06). Benchmark targets: RealPage IMS,
Juniper Square, Yardi Investment Manager, AppFolio Investment Management, Agora, InvestNext.

> **Operating rule:** the investor portal is a **system of record for investor money**.
> Money is `Decimal`; every read is ownership-scoped (`canAccessProperty`); all schema changes
> are **additive + data-preserving** migrations; new UI ships **behind a feature flag** so the
> live site never breaks. (PR Build Check + `/api/health` monitor enforce stability.)

---

## 1. Product decisions (the spec)

| Dimension | Decision |
|---|---|
| **#1 priority** | **LP self-service capital accounts** — investors log in and see their complete position. |
| **Capital account screen** | Full LP account (commitment · contributed · distributed · unreturned capital · ending balance) **+** per-deal and **consolidated** rollup **+** inline return metrics **+** full transaction ledger. |
| **Metrics (must be correct)** | **True IRR via XIRR** (dated cash flows; replaces the `(return/invested)×100` approximation) · **equity multiple / MOIC / TVPI** · **cash-on-cash** · institutional **DPI / RVPI / TVPI**. |
| **Money movement** | **Record-only** — the portal is the book of record; distributions are paid outside the system and marked paid. No ACH/Stripe/Plaid rails. |
| **K-1 / tax** | System **pre-computes per-investor income/distribution allocation** for the CPA → admin **uploads final K-1 PDFs** → portal **e-delivers to the correct investor only** + email notice. |
| **Onboarding** | **Self-service invite flow** (invite → set password → profile/tax info → portal) **+ commitment & capital-call tracking** (committed/called/funded; call notices + acknowledgement; mark funded). |
| **Documents** | **Per-deal data rooms** with permissions · **e-signature** (lightweight vendor where legally required) · **investor-specific auto-routing** (K-1s/statements to the right LP only) · **view audit trail**. |
| **Communications** | **Branded email + in-app** for key events (distribution recorded, capital call, new statement/doc) · **quarterly statement delivery** (auto PDF + email) · **admin announcement broadcasts** (all / per-deal). |
| **Look & feel** | **Match Campus Rentals brand** (see §2) — institutional/trustworthy, data-forward. |
| **Charts** (none today) | Value & returns over time · **distribution waterfall** (pref → catch-up → promote → residual) · portfolio allocation (property/geo/type) · distributions calendar/history. |
| **Investment model** | **Deal-by-deal syndication** — per-property entities (Campus Rentals 1/2/3 LLC + `entity_investments`); capital accounts are **per-deal, rolled up**. (Fund support is out of scope for now.) |
| **Information architecture** | **Investor-first** — lead with the LP's money; admin/GP tooling in a separate area. |
| **Security/access** | **httpOnly-cookie auth** (replace sessionStorage) · **self-service password reset** (email token) · **granular roles & guest access** (view-only investor, advisor/CPA guest, co-investor). *(MFA deferred — schema supports it when wanted.)* |
| **Build vs buy** | **Minimize vendors** — email via **Resend** (already in repo), **in-house PDF + charts**, lightweight e-sign API only where legally necessary. |
| **Rollout** | **Additive migrations + backfill + feature flag.** |

---

## 2. Brand / look & feel

Pull from `tailwind.config.js` (the marketing site's palette):

- **accent** `#54AAB1` (teal) — primary actions, active nav, KPI highlights
- **primary** `#6F898B` (slate-teal), **secondary** `#54595F` (charcoal), **text** `#7A7A7A`
- Neutrals/whitespace for an institutional, calm feel; large readable monetary figures; quiet borders.
- Charts use the brand teal as the lead series; muted slate/charcoal for secondary series.
- Keep Heroicons + Tailwind; add a chart layer (in-house with a small lib, see §6).

---

## 3. Information architecture (investor-first)

**Investor (LP) sidebar:**
`Overview` · `My Capital Account` · `Holdings` · `Distributions` · `Statements & Tax` · `Documents` · `Updates` · `Profile`

**Admin/GP area (role-gated, separate shell or "Manage" switch):**
`Investors` · `Deals/Entities` · `Distributions (record + waterfall)` · `Capital Calls` · `Documents/Data Rooms` · `Statements` · `Pipeline/CRM` (existing) · `Audit`

Existing deal-pipeline/CRM stays in the admin area (investors shouldn't see it).

---

## 4. Data model additions (all additive — no drops)

New tables/fields alongside the current schema (`investments`, `entity_investments`, `distributions`, `entities`, `waterfall_*` stay as-is and are backfilled from):

- **`capital_accounts`** — one per (investor, deal/entity): `commitment`, `totalContributed`, `totalDistributed`, `unreturnedCapital`, `currentValue` (all `Decimal`), derived metrics cached (`irr`, `moic`, `tvpi`, `dpi`, `rvpi`, `cashOnCash`) + `asOf`.
- **`capital_transactions`** — the ledger: `capitalAccountId`, `type` (CONTRIBUTION | DISTRIBUTION | VALUATION | FEE), `amount` `Decimal`, `date`, `dealId`, `distributionId?`, `note`. (Backfilled from existing `distributions` + investment contributions.)
- **`commitments`** + **`capital_calls`** + **`capital_call_responses`** — commitment tracking + call issuance/ack (record-only; `fundedAt` marks paid-outside).
- **`investor_statements`** — generated PDF statements: `userId`, `periodStart/End`, `s3Key`, `generatedAt`, delivery status.
- **`data_rooms`** / extend `documents` — per-deal room + per-investor visibility + `document_views` (audit: who/when).
- **`investor_invites`** — self-service onboarding tokens.
- **`announcements`** + delivery log — admin broadcasts.
- **Access:** extend roles for guest/advisor + a `document_access` grant table; `email_logs` already exists for delivery audit.

Money columns are `Decimal` (per the migration already done). Backfill scripts run as numbered, idempotent migrations; the existing deploy `migrate:pending` applies them.

---

## 5. The capital-account engine (correctness is the point)

A single server module (`src/lib/ims/metrics.ts`) computing, from each account's dated `capital_transactions`:

- **XIRR** — Newton/bisection NPV solver over `(amount, date)` cash flows (negative = contribution, positive = distribution + a terminal valuation cash flow at `asOf`). This replaces `(return/invested)×100`.
- **MOIC / TVPI** = (total distributions + current value) / total contributions; **DPI** = distributions / contributions; **RVPI** = current value / contributions.
- **Cash-on-cash** = distributions in period / contributed capital.
- Consolidated rollups sum across the investor's accounts; per-deal values come from each account.
- Pure, unit-testable functions (verify against known IRR fixtures) — this is where staging verification matters most.

---

## 6. Phased roadmap (accepted sequencing)

Each phase = additive migration + backfill + feature-flagged UI; PR gated by the build check; verified before flag flip.

- **Phase 1 — Capital-account engine + LP self-service (the core).**
  `capital_accounts` + `capital_transactions` (+ backfill), the metrics module (XIRR/MOIC/TVPI/DPI/RVPI/cash-on-cash), and the investor-first **My Capital Account** + **Holdings** screens (per-deal + consolidated + ledger + inline metrics). Brand-styled.
- **Phase 2 — Statements & reporting.** In-house **PDF statements** (`@react-pdf/renderer`), quarterly auto-generation, **Resend** branded email delivery, distribution notices, in-app + email events.
- **Phase 3 — Onboarding + commitments.** Self-service invite flow, `commitments`/`capital_calls` tracking, call notices + acknowledgement, mark-funded.
- **Phase 4 — Data rooms + e-sign + audit.** Per-deal rooms, per-investor doc routing, view audit trail, lightweight e-sign for subscription/operating docs.
- **Phase 5 — Visualization woven throughout.** Value-over-time, **distribution waterfall** viz (uses the existing `waterfall_*` schema), allocation breakdowns, distributions calendar. Admin announcement broadcasts.

**Cross-cutting (early):** httpOnly-cookie auth + middleware gating, self-service password reset, granular roles/guest access.

---

## 7. Rollout safety (keep data + keep the site up)

- **Additive migrations only** — new tables/columns; never drop or repurpose existing ones until the new path is validated. Backfill via idempotent numbered migrations (`012+`).
- **Feature flag** — new IMS pages live at a flagged route (e.g. `/investors` v2 behind `IMS_V2`), old pages remain until cutover; flip per-cohort.
- **Stability gates already in place:** PR Build Check (type-checked build) blocks regressions; `/api/health` monitor + incident issues; `automerge` label only merges green PRs; deploy runs `migrate:pending` then PM2 restart.
- **Verify before flip:** capital-account metrics validated against known fixtures + a real distribution in staging; statements spot-checked.

---

## 8. Immediate suggested edits (next concrete steps)

1. **Add charting + PDF deps** (`recharts` or a light in-house chart, `@react-pdf/renderer`) — currently zero.
2. **Replace the IRR approximation** with the XIRR module (correctness fix that benefits existing pages immediately).
3. **httpOnly-cookie auth + middleware** for `/investors/*` (closes the sessionStorage-XSS gap; removes the client-side auth flash).
4. **Self-service password reset** (email token) — removes the "contact your admin" friction.
5. **Scaffold `capital_accounts` + `capital_transactions`** (additive migration + backfill from `investments`/`distributions`) — the foundation everything else builds on.
6. **Brand tokens** — apply the teal/slate palette to the portal shell.

These are sequenced so nothing requires payment rails (record-only) and every step is independently shippable behind the flag.
