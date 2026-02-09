# Domo Dashboards – Focus Alignment

The investor and admin dashboards in this app are aligned to these **Domo dashboards**. Use them as the **source of truth for all features and build-out**.

**Canonical source-of-truth paths (focus on these for features and build-out):**

| Dashboard | Local path |
|-----------|------------|
| **Portfolio dashboard** | `…/Domo Dashboards/portfolio dashboard` |
| **Deal pipeline** | `…/Domo Dashboards/deal pipeline` |
| **Group DB** | `…/Domo Dashboards/stoagroupDB` |
| **Banking dashboard** | `…/Domo Dashboards/banking dashboard` |

**Full feature list, build-out status, and priorities:** see **[DOMO-SOURCE-OF-TRUTH.md](./DOMO-SOURCE-OF-TRUTH.md)**.

---

## App routes (summary)

| Domo dashboard | App equivalent | Path |
|----------------|----------------|------|
| **Portfolio dashboard** | Portfolio + Overview | `/investors/portfolio`, `/investors/dashboard` |
| **Deal pipeline** | Deal Pipeline | `/investors/pipeline-tracker` |
| **Banking dashboard** | Banking | `/investors/banking` |
| **Group DB** | Group DB (admin only) | `/investors/stoa-group-db` |
| **Properties** | Properties & availability | `/investors/properties` |

When adding or refining features, **read the corresponding Domo folder** (index.html, app.js, README.md, docs/) and align metrics, filters, views, and workflows to match.
