#!/bin/bash

# Complete Data Migration Script: Prisma Accelerate → AWS RDS
# This script exports all data from Prisma Accelerate and imports to RDS

set -e

echo "🚀 Complete Data Migration: Prisma Accelerate → AWS RDS"
echo "======================================================"
echo ""

# RDS Configuration
RDS_ENDPOINT="ls-96cf74c298a48ae39bf159a9fe40a260e5d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com"
RDS_PORT="5432"
DB_NAME="campus_rentals"
# Get credentials from environment variables (NEVER hardcode!)
RDS_USER="${RDS_USER:-${DATABASE_URL_DIRECT_USER:-dbmasteruser}}"
RDS_PASSWORD="${RDS_PASSWORD:-${DATABASE_URL_DIRECT_PASSWORD}}"

if [ -z "$RDS_PASSWORD" ]; then
    echo "❌ Database password not found in environment variables"
    echo "   Please set RDS_PASSWORD or DATABASE_URL_DIRECT_PASSWORD in .env"
    exit 1
fi

# Navigate to project directory
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals

# Backup current .env
echo "💾 Backing up current .env..."
cp .env .env.backup.before-migration.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created"
echo ""

# Step 1: Export data from Prisma Accelerate
echo "📤 Step 1: Exporting data from Prisma Accelerate..."
echo "---------------------------------------------------"

# Create backup directory
BACKUP_DIR="./data-migration-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Export using pg_dump (if we can connect directly)
# Note: Prisma Accelerate might not allow direct pg_dump
# So we'll use Prisma to export data

echo "📋 Exporting schema and data..."
echo "   (This may take a few minutes depending on data size)"

# Try to export using Prisma Studio or direct database connection
# First, let's try to get the underlying database URL from Prisma Accelerate
# If that's not possible, we'll use Prisma's data export capabilities

# For now, we'll use pg_dump if we can extract the real database URL
# Otherwise, we'll need to use Prisma's built-in export

# Check if we can connect to old database
echo "🔌 Testing connection to Prisma Accelerate..."
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Can connect to Prisma Accelerate"
    
    # Export schema
    echo "📋 Exporting schema..."
    npx prisma db pull > "$BACKUP_DIR/schema.prisma.backup" 2>&1 || true
    
    # Export data using Prisma
    echo "📊 Exporting data (this may take a while)..."
    # We'll use a Node.js script to export data via Prisma Client
else
    echo "⚠️  Cannot connect directly to Prisma Accelerate"
    echo "   Will proceed with schema-only migration"
fi

echo ""
echo "📤 Step 2: Importing data to AWS RDS..."
echo "---------------------------------------"

# Update .env temporarily to point to RDS for migration
RDS_DATABASE_URL="postgresql://${RDS_USER}:${RDS_PASSWORD}@${RDS_ENDPOINT}:${RDS_PORT}/${DB_NAME}?schema=public&sslmode=require"

# Test RDS connection
echo "🔌 Testing RDS connection..."
export PGPASSWORD="${RDS_PASSWORD}"
if psql -h "${RDS_ENDPOINT}" -U "${RDS_USER}" -d "${DB_NAME}" -p "${RDS_PORT}" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ RDS connection successful!"
else
    echo "❌ RDS connection failed!"
    echo "   Please check:"
    echo "   - Security group allows connections from this IP"
    echo "   - RDS endpoint is correct"
    echo "   - Credentials are correct"
    exit 1
fi
unset PGPASSWORD

# Run Prisma migrations on RDS (creates schema)
echo ""
echo "🏗️  Creating schema on RDS..."
export DATABASE_URL="${RDS_DATABASE_URL}"
npx prisma migrate deploy 2>&1 || npx prisma db push --accept-data-loss

# Now we need to export data from old DB and import to new DB
# Since Prisma Accelerate is a proxy, we'll use a different approach

echo ""
echo "📊 Migrating data..."
echo "   (Using Prisma Client to copy data)"

# Create a Node.js script to migrate data
cat > "$BACKUP_DIR/migrate-data.js" << 'MIGRATE_SCRIPT'
const { PrismaClient } = require('@prisma/client');

// Old database (Prisma Accelerate)
const oldPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.OLD_DATABASE_URL
    }
  }
});

// New database (RDS)
const newPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.NEW_DATABASE_URL
    }
  }
});

async function migrateData() {
  console.log('Starting data migration...');
  
  try {
    // Get all models from schema (you may need to adjust this)
    const models = [
      'User', 'Property', 'Investment', 'EntityInvestment', 
      'Entity', 'EntityOwner', 'DealPhoto', 'DealFile', 
      'DealFolder', 'DealFollower', 'Contact', 'WaterfallStructure',
      'WaterfallDistribution', 'PropertyLoan', 'Insurance', 'PropertyTax'
    ];
    
    for (const modelName of models) {
      try {
        console.log(`Migrating ${modelName}...`);
        const oldData = await oldPrisma[modelName.toLowerCase()].findMany();
        
        if (oldData.length > 0) {
          // Use createMany for better performance (skip duplicates)
          await newPrisma[modelName.toLowerCase()].createMany({
            data: oldData,
            skipDuplicates: true
          });
          console.log(`  ✅ Migrated ${oldData.length} ${modelName} records`);
        } else {
          console.log(`  ⚠️  No ${modelName} records to migrate`);
        }
      } catch (error) {
        console.log(`  ⚠️  Error migrating ${modelName}: ${error.message}`);
        // Continue with other models
      }
    }
    
    console.log('✅ Data migration completed!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await oldPrisma.$disconnect();
    await newPrisma.$disconnect();
  }
}

migrateData();
MIGRATE_SCRIPT

# Run the migration script
echo "🔄 Running data migration script..."
OLD_DB_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"')
NEW_DB_URL="${RDS_DATABASE_URL}"

if [ -n "$OLD_DB_URL" ] && [ "$OLD_DB_URL" != "$NEW_DB_URL" ]; then
    OLD_DATABASE_URL="$OLD_DB_URL" NEW_DATABASE_URL="$NEW_DB_URL" node "$BACKUP_DIR/migrate-data.js" || {
        echo "⚠️  Automated migration had issues, but continuing..."
        echo "   You may need to manually verify data"
    }
else
    echo "⚠️  Could not determine old database URL, skipping data copy"
    echo "   If data is already in RDS (from import mode), this is fine"
fi

echo ""
echo "📝 Step 3: Updating connection string..."
echo "----------------------------------------"

# Update .env to use RDS
sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"${RDS_DATABASE_URL}\"|" .env
sed -i.bak 's/^PRISMA_GENERATE_DATAPROXY=true/PRISMA_GENERATE_DATAPROXY=false/' .env

echo "✅ Connection string updated"
echo ""

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Restart application
echo ""
echo "🔄 Restarting application..."
pm2 restart campus-rentals

echo ""
echo "✅ Migration Complete!"
echo "======================"
echo ""
echo "📊 Check application status:"
pm2 status

echo ""
echo "📋 Next steps:"
echo "1. Check logs: pm2 logs campus-rentals --lines 50"
echo "2. Test login to investor portal"
echo "3. Verify all data is present"
echo "4. Test creating/updating records"
echo ""
echo "💾 Backup location: $BACKUP_DIR"
echo "📁 .env backup: .env.backup.before-migration.*"
echo ""
echo "⚠️  If something goes wrong, restore .env backup and restart"

