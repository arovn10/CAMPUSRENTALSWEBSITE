# Data Migration Safety Guide

## What the Script Does

The `update-rds-env-with-credentials.sh` script will:

✅ **Safe Operations:**
1. **Backup your current `.env` file** (creates timestamped backup)
2. **Update connection string** to point to RDS
3. **Run Prisma migrations** (creates/updates database schema)
4. **Generate Prisma Client** (updates code to work with new DB)
5. **Restart application** (applies new connection)

❌ **What it DOES NOT do:**
- **Does NOT delete any data** from your old database
- **Does NOT automatically copy data** from Prisma Accelerate to RDS
- **Does NOT break your current setup** (old connection still works until you switch)

## Data Migration Process

### Current Situation
- **Old Database**: Prisma Accelerate (still working)
- **New Database**: AWS RDS (in import mode - you're importing data)

### Safe Migration Steps

1. **Complete your data import** to RDS first
   - Make sure all data is imported to RDS
   - Verify data integrity

2. **Run the connection update script**
   - This switches your app to use RDS
   - Your old Prisma Accelerate database remains untouched

3. **Test thoroughly**
   - Login to investor portal
   - Check all data loads correctly
   - Test creating/updating records

4. **Rollback if needed**
   - If something breaks, restore `.env.backup.*` file
   - Restart application
   - You're back to Prisma Accelerate

## What Happens When You Run the Script

```
Step 1: Backup .env → .env.backup.20250107_143022
Step 2: Update DATABASE_URL → Points to RDS
Step 3: Update PRISMA_GENERATE_DATAPROXY → false
Step 4: Test RDS connection
Step 5: Run Prisma migrations → Creates/updates tables
Step 6: Generate Prisma Client
Step 7: Restart application → Now using RDS
```

## Safety Guarantees

✅ **Your old database is safe** - Prisma Accelerate connection is not deleted
✅ **Your data is safe** - Nothing is deleted, only connection string changes
✅ **Easy rollback** - Just restore the backup .env file
✅ **No data loss** - All operations are additive (create/update, never delete)

## If Something Goes Wrong

### Rollback Procedure

```bash
# On server
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals

# Restore backup
cp .env.backup.YYYYMMDD_HHMMSS .env

# Restart
pm2 restart campus-rentals
```

### Check Logs

```bash
# View application logs
pm2 logs campus-rentals --lines 100

# Check for errors
pm2 logs campus-rentals | grep -i error
```

## Pre-Migration Checklist

Before running the script, ensure:

- [ ] Data import to RDS is complete
- [ ] RDS security group allows connections from Lightsail (23.21.76.187)
- [ ] You have the RDS endpoint, username, and password
- [ ] You've tested RDS connection manually
- [ ] You know where your backup .env files are stored

## Post-Migration Verification

After running the script:

- [ ] Application starts without errors
- [ ] Can login to investor portal
- [ ] All data loads correctly
- [ ] Can create/update records
- [ ] No errors in logs

## Data Import Notes

Since you're in "import mode":

1. **Complete the import first** - Make sure all your data is in RDS
2. **Verify data** - Check that all tables have data
3. **Then run the script** - This will switch your app to use RDS
4. **Test everything** - Ensure all functionality works

The script assumes your data is already in RDS. If you need to export from Prisma Accelerate and import to RDS, that's a separate process.

## Questions?

- **Will my old data be deleted?** No, Prisma Accelerate database remains untouched
- **Can I go back?** Yes, just restore the backup .env file
- **Will the app break?** No, if RDS connection works, everything should work
- **What if import isn't done?** Wait until import completes, then run the script

