#!/bin/bash
# Quick migration script - copy and paste this entire block into your SSH session

echo "🚀 Phase 2 Migration - Quick Start"
echo "=================================="
echo ""

# Navigate to project
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals || {
    echo "❌ Project directory not found!"
    exit 1
}

# Pull latest code
echo "📥 Pulling latest code..."
git pull || {
    echo "⚠️  Git pull failed, continuing anyway..."
}

# Check if migration file exists
if [ ! -f "scripts/phase2-termsheet-student-housing-migration.sql" ]; then
    echo "❌ Migration file not found!"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set in environment"
    echo "   Checking for direct connection credentials..."
    
    # Get credentials from environment
    DB_HOST="${DB_HOST:-${DATABASE_URL_DIRECT_HOST}}"
    DB_USER="${DB_USER:-${DATABASE_URL_DIRECT_USER}}"
    DB_PASS="${DB_PASSWORD:-${DATABASE_URL_DIRECT_PASSWORD}}"
    DB_NAME="${DB_NAME:-${DATABASE_URL_DIRECT_DB:-campus_rentals}}"
    DB_PORT="${DB_PORT:-${DATABASE_URL_DIRECT_PORT:-5432}}"
    
    if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASS" ]; then
        echo "❌ Database credentials not found"
        echo "   Please set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD in .env"
        exit 1
    fi
    
    # Run with direct connection
    export PGPASSWORD="$DB_PASS"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/phase2-termsheet-student-housing-migration.sql
    unset PGPASSWORD
else
    # Run with DATABASE_URL
    echo "✅ Using DATABASE_URL from environment"
    psql "$DATABASE_URL" -f scripts/phase2-termsheet-student-housing-migration.sql
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📝 Verifying migration..."
    
    # Quick verification (use same connection method as migration)
    if [ -z "$DATABASE_URL" ]; then
        export PGPASSWORD="$DB_PASS"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('universities', 'document_templates', 'excel_models', 'deal_custom_fields', 'deal_views', 'task_templates');"
        unset PGPASSWORD
    else
        psql "$DATABASE_URL" -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('universities', 'document_templates', 'excel_models', 'deal_custom_fields', 'deal_views', 'task_templates');"
    fi
    
    echo ""
    echo "✅ Done! Check the output above for verification."
else
    echo ""
    echo "❌ Migration failed. Check the error messages above."
    exit 1
fi

