# Campus Rentals Wiki

Continuous-context knowledge base for **every Campus Rentals repo** (currently `arovn10/campusrentalswebsite`; add new repos to this table when they exist). Read by humans and by Claude sessions via `CLAUDE.md` routing.

> **Source-of-truth rule:** this wiki is the durable memory. When you learn something operationally important (an incident, a gotcha, a dependency), write it here and push — the next session starts with it.

## Index

| Topic | File |
|-------|------|
| **How agents should read this wiki (start here)** | [`agents.md`](agents.md) |
| **Hard rules — non-negotiable, every repo, every session** | [`rules/hard-rules.md`](rules/hard-rules.md) |
| What is Campus Rentals? Sites, users, products | [`product/overview.md`](product/overview.md) |
| Website architecture (Next.js app, key libs, patterns) | [`architecture/website.md`](architecture/website.md) |
| **Where data comes from (Abodingo dependency — CRITICAL)** | [`architecture/data-sources.md`](architecture/data-sources.md) |
| Investor portal / IMS | [`architecture/investor-portal.md`](architecture/investor-portal.md) |
| Database (Prisma / Postgres) | [`architecture/database.md`](architecture/database.md) |
| Environments, hosting, deploy flow (Lightsail) | [`operations/environments.md`](operations/environments.md) |
| Deployment runbook | [`operations/deployment-runbook.md`](operations/deployment-runbook.md) |
| Incident playbook + past incidents log | [`operations/incident-playbook.md`](operations/incident-playbook.md) |

## Repos covered

| Repo | What it is | Deploy |
|------|-----------|--------|
| `arovn10/campusrentalswebsite` | Public listings site + investor portal (`campus-rentals/` app) | Lightsail, push to `main` |

External dependencies (not ours, but we break when they change):

| System | Owned by | What we consume |
|--------|----------|-----------------|
| Abodingo backend (`ABODINGOORG/AbodeBackend`) | Abodingo | Public listing endpoints for landlord `campusrentalsnola` — see [`architecture/data-sources.md`](architecture/data-sources.md) |
| TenantCloud | Campus Rentals ops | Leases/tenants/rent (via ALEC, not this site) |
