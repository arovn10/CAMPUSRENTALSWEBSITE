# Phase 2 Migration Guide - TermSheet Student Housing Features

## Overview
This migration adds student housing specific fields and core TermSheet functionality to the Campus Rentals database.

## What This Migration Does

### 1. Student Housing Fields in Deals Table
- `totalBeds` - Total number of beds
- `totalUnits` - Total number of units
- `distanceToCampus` - Distance to campus in miles
- `walkabilityScore` - Walkability score (0-100)
- `averageRentPerBed` - Average monthly rent per bed
- `universityId` - Reference to university

### 2. Universities Table
- Stores university information (Tulane, FAU, etc.)
- Includes location data for distance calculations
- Pre-populated with Tulane and FAU

### 3. Document Management
- `document_templates` - Templates for automated document generation
- `document_generations` - History of generated documents

### 4. Excel Integration
- `excel_models` - Excel underwriting models
- `excel_field_mappings` - Field mappings between Excel and deals
- `excel_syncs` - Sync history

### 5. Custom Fields
- `deal_custom_fields` - Flexible custom fields for deals

### 6. Saved Views
- `deal_views` - Saved custom views and filters

### 7. Task Templates
- `task_templates` - Reusable task templates
- `task_template_dependencies` - Task dependencies

## How to Run

### Option 1: Direct SQL Execution (Recommended)

1. **Connect to your Lightsail database:**
   ```bash
   psql -h ls-96cf74c298a48ae39bf159a9fe40a260e5d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com -U dbmasteruser -d campus_rentals
   ```

2. **Run the migration:**
   ```sql
   \i scripts/phase2-termsheet-student-housing-migration.sql
   ```
   
   Or copy and paste the SQL file contents directly into psql.

### Option 2: Via Script

```bash
cd campus-rentals
psql $DATABASE_URL -f scripts/phase2-termsheet-student-housing-migration.sql
```

### Option 3: Via SSH to Server

```bash
ssh bitnami@23.21.76.187
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
psql $DATABASE_URL -f scripts/phase2-termsheet-student-housing-migration.sql
```

## Verification

After running the migration, verify it worked:

```sql
-- Check new columns in deals table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deals' 
AND column_name IN ('totalBeds', 'totalUnits', 'distanceToCampus', 'walkabilityScore', 'averageRentPerBed', 'universityId');

-- Check universities table
SELECT * FROM universities;

-- Check all new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'universities',
    'document_templates',
    'document_generations',
    'excel_models',
    'excel_field_mappings',
    'excel_syncs',
    'deal_custom_fields',
    'deal_views',
    'task_templates',
    'task_template_dependencies'
);
```

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Remove foreign key first
ALTER TABLE "deals" DROP CONSTRAINT IF EXISTS "deals_universityId_fkey";

-- Drop new columns from deals
ALTER TABLE "deals" DROP COLUMN IF EXISTS "totalBeds";
ALTER TABLE "deals" DROP COLUMN IF EXISTS "totalUnits";
ALTER TABLE "deals" DROP COLUMN IF EXISTS "distanceToCampus";
ALTER TABLE "deals" DROP COLUMN IF EXISTS "walkabilityScore";
ALTER TABLE "deals" DROP COLUMN IF EXISTS "averageRentPerBed";
ALTER TABLE "deals" DROP COLUMN IF EXISTS "universityId";

-- Drop new tables
DROP TABLE IF EXISTS "task_template_dependencies";
DROP TABLE IF EXISTS "task_templates";
DROP TABLE IF EXISTS "deal_views";
DROP TABLE IF EXISTS "deal_custom_fields";
DROP TABLE IF EXISTS "excel_syncs";
DROP TABLE IF EXISTS "excel_field_mappings";
DROP TABLE IF EXISTS "excel_models";
DROP TABLE IF EXISTS "document_generations";
DROP TABLE IF EXISTS "document_templates";
DROP TABLE IF EXISTS "universities";
```

## Next Steps

After successful migration:
1. Update Prisma schema to reflect new tables (for type safety)
2. Create API endpoints for new features
3. Build UI components in investors portal
4. Test with sample data

## Notes

- All migrations use `IF NOT EXISTS` to be idempotent (safe to run multiple times)
- Foreign keys are added with proper constraints
- Indexes are created for performance
- Initial data (universities) is inserted automatically

