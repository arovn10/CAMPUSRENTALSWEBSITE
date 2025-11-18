#!/bin/bash
# Run migration using direct database connection (bypasses Prisma Accelerate)

cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals || exit 1

echo "🚀 Phase 2 Migration - Direct Database Connection"
echo "=================================================="
echo ""

# Get database credentials from environment variables (NEVER hardcode!)
DB_HOST="${DB_HOST:-${DATABASE_URL_DIRECT_HOST}}"
DB_USER="${DB_USER:-${DATABASE_URL_DIRECT_USER}}"
DB_PASS="${DB_PASSWORD:-${DATABASE_URL_DIRECT_PASSWORD}}"
DB_NAME="${DB_NAME:-${DATABASE_URL_DIRECT_DB:-campus_rentals}}"
DB_PORT="${DB_PORT:-${DATABASE_URL_DIRECT_PORT:-5432}}"

if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASS" ]; then
    echo "❌ Database credentials not found in environment variables"
    echo "   Please set DB_HOST, DB_USER, DB_PASSWORD (or DATABASE_URL_DIRECT_*)"
    echo "   These should be in your .env file (not committed to git)"
    exit 1
fi

# Try to get actual hostname/IP if DNS doesn't resolve
# First, let's try with the hostname
echo "🔌 Attempting direct connection..."
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Use PGPASSWORD environment variable to avoid password prompt
export PGPASSWORD="$DB_PASS"

# Try connection
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Connection successful!"
    echo ""
    echo "🔄 Running migration..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/phase2-termsheet-student-housing-migration.sql
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migration completed successfully!"
        echo ""
        echo "📝 Verifying migration..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('universities', 'document_templates', 'excel_models', 'deal_custom_fields', 'deal_views', 'task_templates') ORDER BY table_name;"
    else
        echo ""
        echo "❌ Migration failed. Check the error messages above."
        exit 1
    fi
else
    echo "❌ Cannot connect to database. DNS resolution failed."
    echo ""
    echo "🔍 Troubleshooting options:"
    echo ""
    echo "1. Check if hostname resolves:"
    echo "   nslookup $DB_HOST"
    echo ""
    echo "2. Try using the Node.js script (handles Prisma Accelerate):"
    echo "   npm run migrate:phase2:server"
    echo ""
    echo "3. Check AWS Lightsail console for the correct endpoint"
    echo ""
    exit 1
fi

