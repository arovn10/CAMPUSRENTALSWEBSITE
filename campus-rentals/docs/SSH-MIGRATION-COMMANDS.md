# SSH Migration - Copy & Paste Commands

## Quick Migration (Copy All At Once)

Copy and paste this entire block into your SSH session:

```bash
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals && \
git pull && \
PGPASSWORD='~D=Otib<.[+WsS=O9(OMM^9V{NX~49%v' psql \
  -h ls-96cf74c298a48ae39bf159a9fe40a2605d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com \
  -U dbmasteruser \
  -d campus_rentals \
  -f scripts/phase2-termsheet-student-housing-migration.sql && \
echo "✅ Migration complete!" && \
PGPASSWORD='~D=Otib<.[+WsS=O9(OMM^9V{NX~49%v' psql \
  -h ls-96cf74c298a48ae39bf159a9fe40a2605d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com \
  -U dbmasteruser \
  -d campus_rentals \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('universities', 'document_templates', 'excel_models') ORDER BY table_name;"
```

## Step-by-Step (If You Prefer)

### 1. SSH to Server
```bash
ssh bitnami@23.21.76.187
```

### 2. Navigate to Project
```bash
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
```

### 3. Pull Latest Code
```bash
git pull
```

### 4. Run Migration
```bash
PGPASSWORD='~D=Otib<.[+WsS=O9(OMM^9V{NX~49%v' psql \
  -h ls-96cf74c298a48ae39bf159a9fe40a2605d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com \
  -U dbmasteruser \
  -d campus_rentals \
  -f scripts/phase2-termsheet-student-housing-migration.sql
```

### 5. Verify (Optional)
```bash
PGPASSWORD='~D=Otib<.[+WsS=O9(OMM^9V{NX~49%v' psql \
  -h ls-96cf74c298a48ae39bf159a9fe40a2605d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com \
  -U dbmasteruser \
  -d campus_rentals \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('universities', 'document_templates', 'excel_models', 'deal_custom_fields', 'deal_views', 'task_templates') ORDER BY table_name;"
```

## Using npm Script (Alternative)

If you prefer using the Node.js script:

```bash
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
git pull
npm install  # if needed
npm run migrate:phase2:server
```

## Notes

- The `PGPASSWORD` environment variable is set inline to avoid password prompts
- The migration is **idempotent** - safe to run multiple times
- **NO DATA WILL BE DELETED** - only adds new tables and columns
- If you see "already exists" errors, that's OK - the migration handles them

