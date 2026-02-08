# API Endpoints Reference

This document lists all API endpoints used by Campus Rentals: **external Abode backend** (Render) and **local Next.js API routes**. Use this to ensure you're calling the correct, up-to-date endpoints and that the best data flows through.

---

## 1. External Abode Backend (AbodeBackend)

**Base URL:** `https://abode-backend.onrender.com/api`

Canonical paths from **AbodeBackend** (abodingo-website repo: `AbodeBackend/Routing.cs`, `Routing/Photos/PhotosRouting.cs`, `Routing/Amenities/AmenitiesRouting.cs`). Campus Rentals uses these in `src/services/api.ts` and `src/utils/api.ts`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/property/{username}` | List properties by landlord username (e.g. `campusrentalsnola`) |
| **GET** | `/propertyfromID/{id}` | Get property by ID (backend returns array of one) |
| **GET** | `/photos/get/{propertyId}` | Get photos for a property |
| **GET** | `/amenities/{propertyId}` | Get property amenities (fullyFurnished, pool, etc.) |

**CloudFront:** S3 image URLs are rewritten to CloudFront in `src/utils/api.ts`:
- From: `https://abodebucket.s3.us-east-2.amazonaws.com/...`
- To: `https://d1m1syk7iv23tg.cloudfront.net/...`

---

## 2. Local Next.js API Routes (this app)

Base path: `/api` (e.g. `http://localhost:3002/api` when running locally).

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| (varies) | `/api/auth` | Auth route |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |

### Properties (local + cache)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties` | List properties (cached, can fallback to Abode backend) |
| GET | `/api/properties/[id]` | Single property |
| GET | `/api/properties/photos` | Properties photos (query params) |
| POST | `/api/properties/photos` | Upload property photo |
| GET | `/api/properties/thumbnail/[id]` | Property thumbnail |
| GET | `/api/properties/[id]/loans` | List loans for property |
| POST | `/api/properties/[id]/loans` | Create loan |
| PUT | `/api/properties/[id]/loans/[loanId]` | Update loan |
| DELETE | `/api/properties/[id]/loans/[loanId]` | Delete loan |

### Photos (cache)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/photos/[propertyId]` | Cached photos for property |

### Cache / Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cache` | Cache status |
| GET/POST | `/api/cache/refresh` | Refresh cache |
| (varies) | `/api/cache-images` | Cache images |
| (varies) | `/api/cache-coordinates` | Cache coordinates |
| POST | `/api/force-refresh` | Force refresh |

### Contacts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts` | List contacts |
| GET | `/api/contacts/[id]` | Get contact |
| POST | `/api/contacts` | Create contact |
| PUT | `/api/contacts/[id]` | Update contact |
| DELETE | `/api/contacts/[id]` | Delete contact |

### Investors (main app CRM / dashboard)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/investors` | Investor overview |
| GET | `/api/investors/properties` | List investor properties |
| POST | `/api/investors/properties` | Create property |
| PUT | `/api/investors/properties/[id]` | Update property |
| GET | `/api/investors/profile` | Current investor profile |
| PUT | `/api/investors/profile` | Update profile |
| GET | `/api/investors/stats` | Stats |
| GET | `/api/investors/reports` | Reports |
| GET | `/api/investors/export-csv` | Export CSV |
| GET | `/api/investors/notifications` | Notifications |
| POST | `/api/investors/notifications` | Create notification |
| PUT | `/api/investors/notifications` | Update notification |
| GET | `/api/investors/funds` | Funds |
| POST | `/api/investors/funds` | Create fund |
| GET | `/api/investors/insurance` | Insurance |
| POST | `/api/investors/insurance` | Create insurance |
| GET | `/api/investors/taxes` | Taxes |
| POST | `/api/investors/taxes` | Create tax |
| GET | `/api/investors/documents` | Documents |
| POST | `/api/investors/documents` | Upload document |
| GET | `/api/investors/photos` | Photos |
| POST | `/api/investors/photos` | Upload photo |
| DELETE | `/api/investors/photos` | Delete photo |
| GET | `/api/investors/investments` | Investments |
| POST | `/api/investors/investments` | Create investment |
| PUT | `/api/investors/investments/[id]` | Update investment |
| DELETE | `/api/investors/investments/[id]` | Delete investment |
| GET | `/api/investors/entities` | Entities |
| POST | `/api/investors/entities` | Create entity |
| GET | `/api/investors/entities/[id]` | Get entity |
| PUT | `/api/investors/entities/[id]` | Update entity |
| DELETE | `/api/investors/entities/[id]` | Delete entity |
| GET | `/api/investors/entities/[id]/documents` | Entity documents |
| POST | `/api/investors/entities/[id]/documents` | Upload entity document |
| GET | `/api/investors/entity-owners` | Entity owners |
| POST | `/api/investors/entity-owners` | Create entity owner |
| GET | `/api/investors/entity-investments` | Entity investments |
| POST | `/api/investors/entity-investments` | Create entity investment |
| PUT | `/api/investors/entity-investments/[id]` | Update entity investment |
| DELETE | `/api/investors/entity-investments/[id]` | Delete entity investment |
| GET | `/api/investors/global-waterfall-structures` | Global waterfall structures |
| POST | `/api/investors/global-waterfall-structures` | Create |
| PUT | `/api/investors/global-waterfall-structures/[id]` | Update |
| GET | `/api/investors/waterfall-structures` | Waterfall structures |
| POST | `/api/investors/waterfall-structures` | Create |
| PUT | `/api/investors/waterfall-structures/[id]` | Update |
| DELETE | `/api/investors/waterfall-structures/[id]` | Delete |
| GET | `/api/investors/waterfall-distributions` | Waterfall distributions |
| POST | `/api/investors/waterfall-distributions` | Create |
| PUT | `/api/investors/waterfall-distributions` | Update |
| DELETE | `/api/investors/waterfall-distributions` | Delete |
| GET | `/api/investors/waterfall-distributions/breakdown` | Breakdown |
| GET | `/api/investors/waterfall-distributions/all` | All distributions |
| POST | `/api/investors/apply-waterfall-structure` | Apply waterfall structure |
| GET | `/api/investors/users` | List investor users |
| POST | `/api/investors/users` | Create user |
| PUT | `/api/investors/users` | Update user |
| DELETE | `/api/investors/users` | Delete user |
| PUT | `/api/investors/users/[id]` | Update user by ID |
| DELETE | `/api/investors/users/[id]` | Delete user |
| PUT | `/api/investors/users/[id]/change-password` | Change user password |
| PUT | `/api/investors/users/change-my-password` | Change own password |
| POST | `/api/investors/users/reset-password` | Reset password |
| PUT | `/api/investors/update-user-by-email` | Update user by email |

### Investors – Deal photos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/investors/deal-photos?investmentId=...` | List deal photos |
| POST | `/api/investors/deal-photos` | Upload deal photo |
| PUT | `/api/investors/deal-photos/[photoId]` | Update deal photo |
| DELETE | `/api/investors/deal-photos/[photoId]` | Delete deal photo |
| PUT | `/api/investors/deal-photos/reorder` | Reorder deal photos |

### Investors – Property files & followers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/investors/properties/[id]/files` | List files and folders |
| POST | `/api/investors/properties/[id]/files` | Upload file |
| GET | `/api/investors/properties/[id]/files/[fileId]` | Get file (signed URL) |
| PUT | `/api/investors/properties/[id]/files/[fileId]` | Update file metadata |
| DELETE | `/api/investors/properties/[id]/files/[fileId]` | Delete file |
| GET | `/api/investors/properties/[id]/files/folders` | List folders |
| POST | `/api/investors/properties/[id]/files/folders` | Create folder |
| PUT | `/api/investors/properties/[id]/files/folders/[folderId]` | Update folder |
| DELETE | `/api/investors/properties/[id]/files/folders/[folderId]` | Delete folder |
| GET | `/api/investors/properties/[id]/followers` | List followers |
| POST | `/api/investors/properties/[id]/followers` | Add follower |
| PUT | `/api/investors/properties/[id]/followers/[followerId]` | Update follower |
| DELETE | `/api/investors/properties/[id]/followers/[followerId]` | Remove follower |

### Investors – CRM
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/investors/crm/pipelines` | List pipelines |
| POST | `/api/investors/crm/pipelines` | Create pipeline |
| GET | `/api/investors/crm/pipelines/[id]` | Get pipeline |
| PUT | `/api/investors/crm/pipelines/[id]` | Update pipeline |
| DELETE | `/api/investors/crm/pipelines/[id]` | Delete pipeline |
| POST | `/api/investors/crm/pipelines/[id]/stages` | Create stage |
| PUT | `/api/investors/crm/pipelines/[id]/stages/[stageId]` | Update stage |
| DELETE | `/api/investors/crm/pipelines/[id]/stages/[stageId]` | Delete stage |
| GET | `/api/investors/crm/deals` | List deals (query params) |
| POST | `/api/investors/crm/deals` | Create deal |
| GET | `/api/investors/crm/deals/[id]` | Get deal |
| PUT | `/api/investors/crm/deals/[id]` | Update deal |
| DELETE | `/api/investors/crm/deals/[id]` | Delete deal |
| PUT | `/api/investors/crm/deals/[id]/stage` | Update deal stage |
| GET | `/api/investors/crm/contacts` | List contacts (optional `?search=`) |
| POST | `/api/investors/crm/contacts` | Create contact |
| GET | `/api/investors/crm/contacts/[id]` | Get contact |
| PUT | `/api/investors/crm/contacts/[id]` | Update contact |
| DELETE | `/api/investors/crm/contacts/[id]` | Delete contact |
| GET | `/api/investors/crm/tasks` | List tasks (query params) |
| POST | `/api/investors/crm/tasks` | Create task |
| PUT | `/api/investors/crm/tasks/[id]` | Update task |
| DELETE | `/api/investors/crm/tasks/[id]` | Delete task |
| POST | `/api/investors/crm/notes` | Create note |
| PUT | `/api/investors/crm/notes/[id]` | Update note |
| DELETE | `/api/investors/crm/notes/[id]` | Delete note |
| POST | `/api/investors/crm/relationships` | Create relationship |
| PUT | `/api/investors/crm/relationships/[id]` | Update relationship |
| DELETE | `/api/investors/crm/relationships/[id]` | Delete relationship |
| POST | `/api/investors/crm/sync-investments` | Sync investments to deals |
| POST | `/api/investors/crm/sync-properties` | Sync properties to deals |
| POST | `/api/investors/crm/setup-pipeline` | Setup pipeline |
| POST | `/api/investors/crm/import-properties` | Import properties as deals |
| POST | `/api/investors/crm/organize-deals-by-location` | Organize deals by location |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| (varies) | `/api/admin/users` | Admin users |
| (varies) | `/api/admin/users/[id]` | Admin user by ID |
| (varies) | `/api/admin/users/[id]/change-password` | Admin change password |
| (varies) | `/api/admin/properties` | Admin properties |
| (varies) | `/api/admin/migrate/phase2` | Phase 2 migration |
| (varies) | `/api/admin/migrate/phase2/start` | Start phase 2 |
| (varies) | `/api/admin/migrate/phase2/status` | Phase 2 status |
| (varies) | `/api/admin/migrate/insurance-tax-docs/start` | Start insurance/tax/docs migration |
| (varies) | `/api/admin/migrate/insurance-tax-docs/status` | Status |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/warmup` | Warmup |
| POST | `/api/send-email` | Send email |
| GET | `/api/test-email` | Test email |
| GET | `/api/debug` | Debug |
| GET | `/api/debug/entity-owners` | Debug entity owners |
| (varies) | `/api/files` | Files |
| (varies) | `/api/files/[fileId]` | File by ID |
| (varies) | `/api/documents/[id]` | Document by ID |
| POST | `/api/webhook/github` | GitHub webhook |
| GET | `/api/webhook/github` | GitHub webhook (test) |
| GET | `/api/properties-debug` | Properties debug |

---

## 3. Data flow summary

- **Public property listings:** Data can come from:
  1. **Local cache:** `GET /api/properties` and `GET /api/photos/[propertyId]` (which use Abode backend under the hood and cache).
  2. **Direct Abode:** `GET https://abode-backend.onrender.com/api/property/campusrentalsnola`, `/photos/...`, `/amenities/...`.
- **Investor/CRM features:** All via local Next.js routes under `/api/investors/...` and `/api/contacts`, `/api/users`, etc.
- For “best data”: use the local `/api/properties` and `/api/photos/[propertyId]` so caching and fallbacks are consistent; ensure `src/services/api.ts` and `src/utils/api.ts` use the same Abode photo path once you confirm it with the backend.

---

## 4. GitHub repos (for reference)

- **AbodeBackend:** https://github.com/ABODINGOORG/AbodeBackend  
- **HomeRun-front-end:** https://github.com/ABODINGOORG/HomeRun-front-end  

**Campus Rentals is aligned with AbodeBackend** using the abodingo-website repo (sibling folder). Property and photo endpoints in `src/services/api.ts` and `src/utils/api.ts` use the canonical paths from AbodeBackend (e.g. `/propertyfromID/{id}`, `/photos/get/{propertyId}`).
