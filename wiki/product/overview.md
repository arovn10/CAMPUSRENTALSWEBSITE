# Campus Rentals — Product Overview

**Campus Rentals LLC** (owner: Alec Rovner) rents student housing in New Orleans (Tulane-area) and near FAU (Boca Raton). The website serves two audiences from one Next.js app:

## 1. Public listings site (campusrentalsllc.com)

- Home page, `/properties` (all listings, map + cards), `/tulane-housing`, `/fau-housing` (school-filtered), `/properties/[id]` detail, `/about`.
- Listing data is **Abodingo's** (landlord account `campusrentalsnola`) — pulled live, cached server-side. This site owns none of it. See [data-sources](../architecture/data-sources.md).
- School pages filter the same set by the listing's `school` field / geography.

## 2. Investor portal (`/investors/*`) — the actual product focus

A private Investment Management System (IMS) for Campus Rentals' real-estate investors: portfolio dashboards, capital accounts (true XIRR/MOIC), distributions & waterfalls, capital calls, document vault + e-sign, K-1 workflow, PDF statements, announcements. Benchmarked against Juniper Square / AppFolio IM / InvestNext. Details: [investor-portal](../architecture/investor-portal.md).

Roles: `ADMIN | MANAGER | INVESTOR` with row-level property access.

## Operations reality (context for support tasks)

Day-to-day property ops (leases, rent collection, maintenance) run in **TenantCloud**, not here. ALEC (Alec's assistant stack) scrapes TenantCloud into a Supabase cache. Nothing on this site reads or writes TenantCloud.
