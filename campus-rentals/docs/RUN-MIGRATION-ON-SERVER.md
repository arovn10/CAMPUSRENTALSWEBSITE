# Running Phase 2 Migration on Server

If you're getting a 504 Gateway Timeout error when running the migration through the web UI, you can run it directly on the server to bypass nginx timeout limits.

## Option 1: SSH to Server and Run Script

1. **SSH to your server:**
   ```bash
   ssh bitnami@23.21.76.187
   ```

2. **Navigate to project directory:**
   ```bash
   cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
   ```

3. **Make script executable:**
   ```bash
   chmod +x scripts/run-migration-server.sh
   ```

4. **Run the migration:**
   ```bash
   ./scripts/run-migration-server.sh
   ```

   Or if DATABASE_URL is not set in environment:
   ```bash
   DATABASE_URL="your-database-url-here" ./scripts/run-migration-server.sh
   ```

## Option 2: Run SQL File Directly

1. **SSH to your server:**
   ```bash
   ssh bitnami@23.21.76.187
   ```

2. **Navigate to project directory:**
   ```bash
   cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
   ```

3. **Run psql directly:**
   ```bash
   psql $DATABASE_URL -f scripts/phase2-termsheet-student-housing-migration.sql
   ```

## Option 3: Use Node.js Script on Server

1. **SSH to your server:**
   ```bash
   ssh bitnami@23.21.76.187
   ```

2. **Navigate to project directory:**
   ```bash
   cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
   ```

3. **Run the migration script:**
   ```bash
   npm run migrate:phase2
   ```

## Verification

After running the migration, verify it worked:

```sql
-- Check new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deals' 
AND column_name IN ('totalBeds', 'totalUnits', 'distanceToCampus', 'walkabilityScore', 'averageRentPerBed', 'universityId')
ORDER BY column_name;

-- Check new tables
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
)
ORDER BY table_name;

-- Check universities
SELECT id, name, "shortName", city, state 
FROM universities 
ORDER BY name;
```

## Notes

- The migration is **idempotent** - safe to run multiple times
- **NO DATA WILL BE DELETED** - only adds new tables and columns
- If you see "already exists" errors, that's OK - the migration handles them gracefully

