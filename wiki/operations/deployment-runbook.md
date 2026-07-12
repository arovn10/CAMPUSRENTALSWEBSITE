# Deployment Runbook

## Standard deploy (website)

```bash
cd campus-rentals
npm run build              # MUST pass locally first (hard rule 1)
git push origin <branch>   # PR → main (pr-check.yml gates), or direct main push if authorized
```

Push to `main` → GitHub webhook → Lightsail `auto-deploy.sh` (pull, build, `migrate:pending`, PM2 restart). **~5–10 min.** `main.yml` also performs an SSH deploy on push to `main`.

## Verify a deploy

1. `curl -s https://www.campusrentalsllc.com/api/health` → `{ ok }` with DB probe
2. Spot-check `/properties` renders **real** listings (if you see "1234 Magazine St" → incident playbook)
3. `pm2 status` / `pm2 logs` on Lightsail if anything is off

## Force listing-cache refresh (after backend-side listing changes)

```bash
curl -s https://www.campusrentalsllc.com/api/force-refresh   # or /api/cache/refresh
```

## Rollback

- Website: revert the commit on `main`, push (webhook redeploys), or `git checkout <prev> && npm run build && pm2 restart` on the box.
- IMS v2 emergency: set `NEXT_PUBLIC_IMS_V2=0` on Lightsail + rebuild — hides the v2 nav instantly.
- Migrations are additive by policy — no destructive rollback should ever be needed.

## Upstream (Abodingo backend) deploys — for awareness

AbodeBackend deploys to Render from `master` when CI is green (`checksPass` trigger). If a Campus-Rentals-critical fix lands there (e.g. the public-endpoint contract), production pickup = CI (~5 min) + Render build (~5–10 min).
