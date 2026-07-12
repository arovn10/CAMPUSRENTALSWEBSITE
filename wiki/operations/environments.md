# Environments & Hosting

One production environment. No staging.

| | Production |
|---|---|
| URL | https://www.campusrentalsllc.com |
| Host | AWS Lightsail `23.21.76.187` (user `bitnami`) |
| Process | PM2-managed Next.js (`campus-rentals/` app), nginx reverse proxy |
| Deploy trigger | push to `main` → GitHub webhook `/api/webhook/github` (HMAC-verified) → `auto-deploy.sh` (git pull → `npm run build` → `migrate:pending` → PM2 restart), ~5–10 min. Also `main.yml` GitHub Action does SSH deploy. |
| DB | PostgreSQL at `db.prisma.io` via Prisma Accelerate (`DATABASE_URL` pooled; `DIRECT_DATABASE_URL` for migrations) |
| Assets | S3 `abodebucket` (us-east-2) behind CloudFront `d1m1syk7iv23tg.cloudfront.net` |
| Health | `/api/health` (DB `SELECT 1`), pinged ~15 min by `health-monitor.yml` (opens/closes a GitHub incident issue) |

## Upstream services

| Service | URL | Notes |
|---|---|---|
| Abodingo backend (listings) | https://abodingo-backend.onrender.com/api | Render, deploys from AbodeBackend `master` on CI-green (`checksPass`). Not ours — see [data-sources](../architecture/data-sources.md). |

## Local dev

```bash
cd campus-rentals
npm install
npm run dev            # http://localhost:3000
npm run build          # ALWAYS before pushing
npx prisma generate    # after schema changes
```

## Key env vars

Server-only (Lightsail): `DATABASE_URL`, `DIRECT_DATABASE_URL`, `JWT_SECRET`, AWS keys, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `GITHUB_WEBHOOK_SECRET`.
Public: `NEXT_PUBLIC_ABODE_API_BASE_URL` (defaults to the Abodingo prod backend), `NEXT_PUBLIC_ABODINGO_WEBSITE_URL`, `NEXT_PUBLIC_IMS_V2` (kill-switch, on by default), `NEXT_PUBLIC_SITE_URL`.

> Never put a secret behind `NEXT_PUBLIC_` — that prefix ships it to the browser (hard rule 9).
