# Investors Dashboard (Campus Rentals)

The investors area is a single login with multiple sections, aligned to **five Domo dashboards**. See **[DOMO-DASHBOARDS-FOCUS.md](./DOMO-DASHBOARDS-FOCUS.md)** for the mapping.

## Structure

| Section | Path | Purpose |
|--------|------|--------|
| **Overview** | `/investors/dashboard` | High-level stats (portfolio at a glance). |
| **Banking** | `/investors/banking` | Cash flow, distributions received, pending/estimated (Domo: Banking dashboard). |
| **Deal Pipeline** | `/investors/pipeline-tracker` | Deals, contacts, tasks, maps, reports. |
| **Properties** | `/investors/properties` | Your properties and when they’re available; view listings on the website for availability. |
| **Portfolio** | `/investors/portfolio` | Holdings, current value, returns, IRR (Domo: Portfolio dashboard). |
| **Documents** | `/investors/documents` | Tax, PPM, statements. |
| **Updates** | `/investors/updates` | Announcements and notices. |
| **Performance** | `/investors/performance` | Reports and CSV export. |
| **Profile** | `/investors/profile` | User profile and settings. |

Layout: `src/app/investors/layout.tsx` — shared sidebar (desktop) / mobile menu, auth check, sign out. All investor routes are protected; only `/investors/login` is public.

## Auth & security

- **Login:** `/api/auth` POST `{ action: 'login', email, password }` → returns `{ user, token }`. Passwords hashed with bcrypt (12 rounds). JWT in `Authorization: Bearer <token>`.
- **Current user:** `GET /api/auth/me` or `GET /api/investors/me` (full user from DB) with `Authorization: Bearer <token>`.
- **Sensitive fields:** SSN/taxId in DB can be encrypted at rest using `src/lib/encryption.ts` (AES-256-GCM). Set **ENCRYPTION_KEY** in `.env` (32-byte hex = 64 chars). Generate with: `openssl rand -hex 32`. If ENCRYPTION_KEY is not set, encryption helpers throw when used.

## Data

- **Banking:** Uses `/api/investors/stats` and `/api/investors/investments` (distributions nested). No separate banking DB tables; Distribution + Investment drive the view.
- **Portfolio:** Same stats + investments; focuses on holdings and performance.
- **Deal Pipeline:** Existing CRM APIs under `/api/investors/crm/*` (deals, contacts, tasks, pipelines, etc.).

## Theming

Investors UI uses a dark shell: `bg-slate-950`, `slate-800/60` cards, `amber-500` accents, and Campus Rentals branding in the sidebar.
