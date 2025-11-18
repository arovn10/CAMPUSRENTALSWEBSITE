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
    echo "   Using direct connection parameters..."
    
    # Run with direct connection
    PGPASSWORD='~D=Otib<.[+WsS=O9(OMM^9V{NX~49%v' psql \
        -h ls-96cf74c298a48ae39bf159a9fe40a2605d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com \
        -U dbmasteruser \
        -d campus_rentals \
        -f scripts/phase2-termsheet-student-housing-migration.sql
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
    
    # Quick verification
    PGPASSWORD='~D=Otib<.[+WsS=O9(OMM^9V{NX~49%v' psql \
        -h ls-96cf74c298a48ae39bf159a9fe40a2605d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com \
        -U dbmasteruser \
        -d campus_rentals \
        -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('universities', 'document_templates', 'excel_models', 'deal_custom_fields', 'deal_views', 'task_templates');"
    
    echo ""
    echo "✅ Done! Check the output above for verification."
else
    echo ""
    echo "❌ Migration failed. Check the error messages above."
    exit 1
fi

