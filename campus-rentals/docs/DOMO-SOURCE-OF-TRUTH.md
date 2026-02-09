# Domo Dashboards — Source of Truth for Features & Build-Out

**Use these four Domo dashboard folders as the canonical reference for all features and build-out in the Campus Rentals investor app.**

| Dashboard | Local path (source of truth) |
|-----------|------------------------------|
| **Portfolio dashboard** | `/Users/alecrovner/Library/CloudStorage/OneDrive-STOA/Desktop/Domo Dashboards/portfolio dashboard` |
| **Deal pipeline** | `/Users/alecrovner/Library/CloudStorage/OneDrive-STOA/Desktop/Domo Dashboards/deal pipeline` |
| **Group DB** | `/Users/alecrovner/Library/CloudStorage/OneDrive-STOA/Desktop/Domo Dashboards/stoagroupDB` |
| **Banking dashboard** | `/Users/alecrovner/Library/CloudStorage/OneDrive-STOA/Desktop/Domo Dashboards/banking dashboard` |

When adding or refining features, **prioritize alignment with these Domo dashboards**: read their `index.html`, `app.js`, `README.md`, and `docs/` so the app matches the expected metrics, filters, views, and workflows.

---

## 1. Portfolio dashboard

**Source:** `.../Domo Dashboards/portfolio dashboard/`  
**App routes:** `/investors/dashboard` (Overview), `/investors/portfolio`

### Domo features (from portfolio dashboard app)

- **Filters:** State (multiselect), Status (multiselect; default “all except Sold, Under Contract, Dead”), search (properties, city, region).
- **View toggles:** Property Info | Cost/Value | Timeline/Sales | Returns — each changes both **table columns** and **KPIs**.
- **KPIs (by view):**
  - **Property Info:** Total Units, Avg NOI, Avg NOI/Unit, Avg % Occupied.
  - **Cost/Value:** Total Project Cost, Avg Cost/Unit, Avg Yield on Cost, Avg Perm Financing Value.
  - **Timeline/Sales:** Properties Sold, Avg Sale Price, Avg Sale Price/Unit, Avg Sale Cap Rate.
  - **Returns:** Avg Projected IRR, Avg Rent, Avg Return on Equity, Total Current FCF.
- **Properties table:** Sortable (Birth Order primary), expandable rows.
- **Expandable row detail:** Tabs — Performance | Construction | Financing (Construction Financing / Permanent Financing sub-tabs) | Property Info / Cost/Value / Timeline/Sales / Returns (other views) | Map (geocoded or OpenStreetMap link).
- **Data:** Property list + Portfolio dashboard dataset (joined by property name); fields include Units, % Owned, % Complete, % Occupied, NOI, NOI/Unit, Project Cost, Yield on Cost, construction/permanent financing, sale date/price/cap rate, IRR, DSCR, FCF, etc.
- **Read-only** (synced from Excel in Domo).

### Campus Rentals build-out

| Feature | Status | Notes |
|---------|--------|--------|
| Overview KPIs (total invested, current value, return, IRR) | ✅ Done | `/investors/dashboard` |
| Portfolio holdings table (property, status, invested, value, ownership) | ✅ Done | `/investors/portfolio` |
| State / Status filters | 🔲 To build | Add multiselect filters like Domo |
| Search (property, city, region) | 🔲 To build | |
| View toggles (Property Info / Cost/Value / Timeline/Sales / Returns) | 🔲 To build | Different column sets + KPI sets per view |
| KPI set per view (Units/NOI vs Cost/Value vs Timeline vs Returns) | 🔲 To build | |
| Expandable row with Performance / Construction / Financing / Map tabs | 🔲 To build | Requires property-level construction, perm financing, NOI, dates in schema/API |
| Birth Order sort + secondary sort | 🔲 To build | Add birth order / sequence if needed |
| Link to Abodingo for “edit listing on website” | ✅ Done | Portfolio page button |

---

## 2. Deal pipeline

**Source:** `.../Domo Dashboards/deal pipeline/`  
**App route:** `/investors/pipeline-tracker` (Deal Pipeline)

### Domo features (from deal pipeline README + DEAL_PIPELINE_FRONTEND_IMPLEMENTATION)

- **Overview:** Summary cards, deals by stage, upcoming dates.
- **Views:** List / By Location / By Bank / By Product Type; Timeline (by quarter/year).
- **Stages:** Prospective → Under Contract → Commercial Land - Listed → Under Construction → Lease-Up → Stabilized → Liquidated (land development flow).
- **Deal pipeline editor (admin):** Edit deal attributes, filter/sort by stage, save to API.
- **Deal fields:** ProjectName, City, State, Region, Units, ProductType, Stage, Bank, StartDate, UnitCount, PreConManager, Acreage, LandPrice, ExecutionDate, DueDiligenceDate, ClosingDate, PurchasingEntity, Cash, OpportunityZone, Notes, Priority, file attachments.
- **Deal files:** Attach, rename, download, delete per deal (LOIs, site plans, due diligence).
- **Export:** Excel export with stage selection.
- **API:** Full CRUD + attachments (list/upload/download/delete per deal).

### Campus Rentals build-out

| Feature | Status | Notes |
|---------|--------|--------|
| Pipeline dashboard, Deals list, deal detail | ✅ Done | pipeline-tracker |
| Prospective deals, notes, reject, file upload/list/download/delete | ✅ Done | `/api/investors/crm/deals/[id]/files` |
| Contacts, Tasks, Maps, Reports (tabs) | ✅ Done | CRMDealPipeline / pipeline-tracker |
| Filter by stage / location / bank / product type | 🔲 Enhance | Match Domo filters |
| Timeline view (by quarter/year) | 🔲 To build | |
| By Location / By Bank / By Product Type views | 🔲 To build | |
| Excel export with stage selection | 🔲 To build | |
| PreConManager, Acreage, LandPrice, ExecutionDate, DueDiligence, ClosingDate, PurchasingEntity, Cash, OpportunityZone | 🔲 Schema/UI | Add fields if aligning to land-dev pipeline |

---

## 3. Banking dashboard

**Source:** `.../Domo Dashboards/banking dashboard/`  
**App route:** `/investors/banking`

### Domo features (from banking dashboard index + BANKING_DASHBOARD_GUIDE)

- **Tabs:** By Property | Search by Bank | Search by Equity | Contacts & Partners | Upcoming Dates | Misc Loans.
- **By Property:** Sub-views — Active Financing (Construction / Permanent), Equity. Expandable rows with loans, participations, deal details.
- **Construction financing:** Property, lender, loan closing, amount, LTC, I/O term, I/O maturity, index, spread.
- **Permanent financing:** Property, lender, close date, loan amount, LTV, term, maturity, interest rate.
- **Equity:** By property / by partner; preferred/common/profits interest/company loan.
- **Search by Bank:** Filter by bank; show loans/participations.
- **Search by Equity:** Filter by equity partner.
- **Contacts & Partners:** Contacts and partner info.
- **Upcoming Dates:** Covenant/due dates, reminders.
- **Misc Loans:** Other loan types.
- **Edit mode (admin):** Toggle edit; deal pipeline shortcut; other admins in edit mode indicator.
- **Login / Domo SSO:** Auth for admin features.

### Campus Rentals build-out

| Feature | Status | Notes |
|---------|--------|--------|
| KPIs: total distributions, YTD, pending, total invested | ✅ Done | Banking page |
| Distributions by property | ✅ Done | |
| Distribution history with year filter | ✅ Done | |
| By Property view with Construction / Permanent / Equity sub-views | 🔲 To build | Requires loans/equity in schema |
| Search by Bank | 🔲 To build | |
| Search by Equity | 🔲 To build | |
| Contacts & Partners tab | 🔲 To build | Or link to pipeline contacts |
| Upcoming Dates (covenants, reminders) | 🔲 To build | |
| Misc Loans tab | 🔲 To build | |
| Expandable rows (loans, participations per property) | 🔲 To build | |
| Edit mode / admin-only actions | 🔲 To build | If needed |

---

## 4. Group DB

**Source:** `.../Domo Dashboards/stoagroupDB/`  
**App route:** `/investors/stoa-group-db` (admin/manager only)

### Group DB scope (from reference README + schema)

- **Core:** Projects (ProjectId, ProjectName, City, State, Region, Stage, Units, ProductType, etc.), Banks, Persons, EquityPartners.
- **Banking:** Loans (Construction/Permanent), DSCRTest, Covenant, Participation, LiquidityRequirement, etc.
- **Pipeline:** DealPipeline, UnderContract, CommercialListed, etc.; attachments.
- **Audit:** Change tracking, history tables.
- **Data flow:** Azure SQL → Domo (SQL queries); API for CRUD; Procore/RealPage/Asana match by ProjectName.

### Campus Rentals build-out

| Feature | Status | Notes |
|---------|--------|--------|
| Entities table (name, type, state/formation, property count, owners, total invested) | ✅ Done | Group DB page |
| Investors table (name, email, role, investment/entity count, total invested) | ✅ Done | |
| Properties table (name, deal/funding status, investor count, value, cost) | ✅ Done | |
| Contacts table (name, email, company, title, tags, created by) | ✅ Done | |
| Entity fields: stateOfFormation, formationDate | ✅ Done | Schema + API |
| Admin-only nav + page | ✅ Done | |
| Align to full Group DB schema (core/banking/pipeline/audit) | 🔲 Optional | Deeper mimic of reference API/schema if needed |

---

## Priority summary

1. **Portfolio:** Add State/Status filters, search, view toggles (Property Info / Cost/Value / Timeline/Sales / Returns), and expandable row detail (Performance / Construction / Financing / Map) using the portfolio dashboard app as reference.
2. **Deal pipeline:** Add Timeline view, By Location/Bank/Product Type views, Excel export; consider extra deal fields (PreConManager, Acreage, LandPrice, dates, etc.) from the deal pipeline docs.
3. **Banking:** Add By Property sub-views (Construction / Permanent / Equity), Search by Bank, Search by Equity, Upcoming Dates, Contacts & Partners, and expandable loan/participation detail using the banking dashboard and BANKING_DASHBOARD_GUIDE.
4. **Group DB:** Current admin master-data view is in place; extend only if you need full parity with the reference schema/API.

Reference the **local Domo dashboard folders** above for exact UI, metrics, and field names when implementing each feature.
