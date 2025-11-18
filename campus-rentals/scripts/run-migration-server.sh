#!/bin/bash
# Run Phase 2 migration directly on the server
# This bypasses nginx timeout issues

echo "🚀 Starting Phase 2 Migration - TermSheet Student Housing"
echo "=========================================================="
echo ""

# Get database URL from environment
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Get migration file path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/phase2-termsheet-student-housing-migration.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📖 Migration file: $MIGRATION_FILE"
echo "🔌 Connecting to database..."
echo ""

# Run migration
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📝 Next Steps:"
    echo "   1. Verify the new tables and columns were created"
    echo "   2. Test the new fields in the application"
    echo "   3. Proceed to Phase 3: Deal Management UI"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi

