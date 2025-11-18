#!/bin/bash
# Quick migration - handles DATABASE_URL automatically

cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals || exit 1

echo "📥 Pulling latest code..."
git pull

echo ""
echo "🔍 Checking for DATABASE_URL..."

# Check if DATABASE_URL is in environment
if [ -n "$DATABASE_URL" ]; then
    echo "✅ Found DATABASE_URL in environment"
    echo "🔄 Running migration..."
    psql "$DATABASE_URL" -f scripts/phase2-termsheet-student-housing-migration.sql
    exit_code=$?
elif [ -f .env ]; then
    echo "📄 Found .env file, loading DATABASE_URL..."
    # Source .env and extract DATABASE_URL
    export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
    if [ -n "$DATABASE_URL" ]; then
        echo "✅ Found DATABASE_URL in .env"
        echo "🔄 Running migration..."
        psql "$DATABASE_URL" -f scripts/phase2-termsheet-student-housing-migration.sql
        exit_code=$?
    else
        echo "❌ DATABASE_URL not found in .env"
        exit_code=1
    fi
else
    echo "❌ DATABASE_URL not found in environment or .env file"
    echo ""
    echo "Please set DATABASE_URL:"
    echo "export DATABASE_URL='postgresql://dbmasteruser:PASSWORD@HOST:5432/campus_rentals?sslmode=require'"
    exit_code=1
fi

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
else
    echo ""
    echo "❌ Migration failed. Check the error messages above."
fi

exit $exit_code

