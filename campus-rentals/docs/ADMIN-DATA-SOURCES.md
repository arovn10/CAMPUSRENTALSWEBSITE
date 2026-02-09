# Admin Dashboard – Data Sources

## Rule: Listings = Abodingo; Everything Else = Campus Rentals

In the **admin dashboard** (and anywhere listing content is shown):

- **From Abodingo:** Anything regarding **listings** — deal/lease/tenant and rent details, amenities, photos, and all listing-specific content.
- **Native to Campus Rentals:** Everything else (users, investments, properties as financial entities, CRM deals, documents, waterfall structures, etc.).

---

## From Abodingo (listing data)

These are sourced from the **Abodingo** backend (same as abodingo-website). Edit them in Abodingo; Campus Rentals displays/caches them.

| Data | Description | Where it’s used |
|------|-------------|-----------------|
| **Property listings** | Name, address, description, bedrooms, bathrooms, price, square feet, lease terms, school, etc. | Public property pages, cache, force-refresh |
| **Photos** | Listing photos (order, links, descriptions) | Property pages, cache, admin cache refresh |
| **Amenities** | fullyFurnished, pool, laundryUnit, centralAc, petFriendly, etc. | Property pages, cache, admin cache refresh |
| **Rent / lease / tenant** | Rent, lease terms, and any tenant-related listing fields from Abodingo | Listing display and cache |

**How it works**

- **Read:** `src/utils/api.ts` and `src/services/api.ts` call **abodeClient** (Abodingo API) for properties by username, property by ID, photos, and amenities.
- **Cache:** Admin **Cache Management** → “Force refresh” pulls fresh listing data (properties, photos, amenities) from Abodingo and saves it to the local cache. The site can then serve listing content from cache.
- **Edit listing content:** Use **Abodingo** (e.g. [Abodingo website](https://www.abodingo.com) or `NEXT_PUBLIC_ABODINGO_WEBSITE_URL`). The Portfolio page link “Edit listing details on the website” goes there.

**Abodingo API base:** `NEXT_PUBLIC_ABODE_API_BASE_URL` (default: Abodingo backend). Client: `src/lib/abodeClient.ts`.

---

## Native to Campus Rentals

All other admin and app data lives in the **Campus Rentals** database and APIs:

| Data | Description |
|------|-------------|
| **Users** | Auth, roles, profile, passwords |
| **Properties (financial)** | Deal status, funding status, current value, total cost, loans, acquisitions, etc. |
| **Investments & entities** | Investment amounts, ownership, entity owners, distributions |
| **CRM / pipeline** | Deals, stages, notes, tasks, contacts, deal files |
| **Documents** | Investor documents, K1s, PPM, etc. |
| **Waterfall structures** | Tier definitions, apply to properties |
| **Banking / distributions** | Distribution history, investor stats |
| **Group DB** | Entities, investors, properties rollups, contacts (admin view) |

These are served by **Campus Rentals** APIs (e.g. `/api/admin/*`, `/api/investors/*`) and **Prisma** against the project database.

---

## Summary

- **Listing content** (deal/lease/tenant, rent details, amenities, photos, listing fields): **Abodingo** → displayed/cached in Campus Rentals; edit in Abodingo.
- **Everything else** in the admin dashboard and app: **Campus Rentals** (native DB and APIs).
