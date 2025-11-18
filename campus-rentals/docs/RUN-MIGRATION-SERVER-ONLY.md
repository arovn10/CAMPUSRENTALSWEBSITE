# Running Phase 2 Migration on Server (Required)

**IMPORTANT**: Your Lightsail database is **not publicly accessible**. Only resources in the same Lightsail region can connect to it.

This means the migration **MUST be run directly on your server**, not through the web interface.

## Quick Start

1. **SSH to your server:**
   ```bash
   ssh bitnami@23.21.76.187
   ```

2. **Navigate to project directory:**
   ```bash
   cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
   ```

3. **Pull latest code:**
   ```bash
   git pull
   ```

4. **Install dependencies (if needed):**
   ```bash
   npm install
   ```

5. **Run the migration:**
   ```bash
   npm run migrate:phase2:server
   ```

## Alternative: Direct SQL Execution

If the Node.js script doesn't work, you can run the SQL file directly:

```bash
psql $DATABASE_URL -f scripts/phase2-termsheet-student-housing-migration.sql
```

Or if DATABASE_URL is not set:

```bash
psql -h ls-96cf74c298a48ae39bf159a9fe40a2605d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com -U dbmasteruser -d campus_rentals -f scripts/phase2-termsheet-student-housing-migration.sql
```

(It will prompt for the password: `~D=Otib<.[+WsS=O9(OMM^9V{NX~49%v`)

## Why This Is Required

- **Database Security**: Your Lightsail database has "Public mode disabled"
- **Network Access**: Only Lightsail resources in the same region (us-east-1) can connect
- **Web Interface Limitation**: The web app runs on a different server that cannot reach the database directly
- **Solution**: Run the migration on the Lightsail server where database access is allowed

## Verification

After running, verify the migration worked:

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

