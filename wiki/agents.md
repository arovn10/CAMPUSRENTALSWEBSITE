# How agents should use this wiki

You are (probably) a Claude session working on a Campus Rentals repo. This page is your routing table. **Do not load every wiki page at startup** — read `rules/hard-rules.md` plus whatever the task routes to below.

## Read order

1. Repo `CLAUDE.md` (auto-loaded) — quick start + hard rules summary
2. [`rules/hard-rules.md`](rules/hard-rules.md) — always
3. The one or two pages the task routes to (table below)

## Task → file routing

| If the task involves… | Read |
|---|---|
| Listings pages (`/properties`, `/tulane-housing`, `/fau-housing`), missing/fake property data, photos | [`architecture/data-sources.md`](architecture/data-sources.md) → then [`operations/incident-playbook.md`](operations/incident-playbook.md) if it's an outage |
| "Site shows wrong/placeholder properties" (e.g. *1234 Magazine St*) | [`operations/incident-playbook.md`](operations/incident-playbook.md) — this exact incident happened; the playbook has the diagnosis |
| Investor portal, distributions, waterfalls, capital accounts, K-1s, statements | [`architecture/investor-portal.md`](architecture/investor-portal.md) + [`architecture/database.md`](architecture/database.md) |
| Prisma schema, migrations, money columns | [`architecture/database.md`](architecture/database.md) |
| Deploying, PM2, nginx, Lightsail, "site is down" | [`operations/environments.md`](operations/environments.md) + [`operations/deployment-runbook.md`](operations/deployment-runbook.md) |
| Auth, API route security, ownership checks | [`architecture/website.md`](architecture/website.md) (Patterns section) + hard rules |
| Anything touching Abodingo repos | [`architecture/data-sources.md`](architecture/data-sources.md) — know the boundary before you cross it |

## Anti-patterns

- **Don't** edit Abodingo repos as part of a routine Campus Rentals task. Exception: restoring the public listing endpoints this site depends on (see data-sources page) — that fix lives in AbodeBackend by necessity.
- **Don't** trust `docs/` archive files over this wiki — some are stale. The wiki + `CLAUDE.md` win.
- **Don't** finish a session that discovered something durable (incident cause, new dependency, config gotcha) without writing it into the relevant wiki page and pushing.

## Writing back (continuous context)

When you learn something the next session needs:

```bash
# 1. Edit the relevant wiki page (or add an incident entry)
# 2. Commit with a `wiki:` prefix
git add wiki/ && git commit -m "wiki: <what you learned>"
# 3. Push to your working branch (merge to main with your feature work)
```
