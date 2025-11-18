#!/bin/bash

# Script to switch to Lightsail Database (PostgreSQL)
# Lightsail databases have different connection requirements than RDS

set -e

# Lightsail Database Configuration
# Update these with your actual Lightsail database details
LIGHTSAIL_DB_ENDPOINT="ls-96cf74c298a48ae39bf159a9fe40a260e5d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="campus_rentals"
# Get credentials from environment variables (NEVER hardcode!)
DB_USER="${DB_USER:-${DATABASE_URL_DIRECT_USER:-dbmasteruser}}"
DB_PASSWORD="${DB_PASSWORD:-${DATABASE_URL_DIRECT_PASSWORD}}"

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Database password not found in environment variables"
    echo "   Please set DB_PASSWORD or DATABASE_URL_DIRECT_PASSWORD in .env"
    exit 1
fi

echo "🚀 Switching to Lightsail Database"
echo "==================================="
echo ""

cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals

# Backup .env
echo "💾 Backing up .env..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created"
echo ""

# Construct DATABASE_URL for Lightsail
# Lightsail databases use standard PostgreSQL connection strings
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${LIGHTSAIL_DB_ENDPOINT}:${DB_PORT}/${DB_NAME}?schema=public&sslmode=require&connection_limit=20"

# Test connection and create database if it doesn't exist
echo "🔌 Testing Lightsail database connection..."
export PGPASSWORD="${DB_PASSWORD}"

# First, try to connect to default postgres database to check if we can connect at all
if psql -h "${LIGHTSAIL_DB_ENDPOINT}" -U "${DB_USER}" -d postgres -p "${DB_PORT}" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database server connection successful!"
    
    # Check if database exists, create if it doesn't
    if ! psql -h "${LIGHTSAIL_DB_ENDPOINT}" -U "${DB_USER}" -d "${DB_NAME}" -p "${DB_PORT}" -c "SELECT 1;" > /dev/null 2>&1; then
        echo "📊 Database '${DB_NAME}' does not exist, creating it..."
        psql -h "${LIGHTSAIL_DB_ENDPOINT}" -U "${DB_USER}" -d postgres -p "${DB_PORT}" -c "CREATE DATABASE ${DB_NAME};" 2>&1
        echo "✅ Database '${DB_NAME}' created!"
    else
        echo "✅ Database '${DB_NAME}' exists!"
    fi
else
    echo "❌ Database connection failed!"
    echo ""
    echo "⚠️  Troubleshooting:"
    echo "   1. Check Lightsail database is running"
    echo "   2. Verify endpoint: ${LIGHTSAIL_DB_ENDPOINT}"
    echo "   3. Verify credentials"
    echo "   4. Check if database is publicly accessible (if needed)"
    echo ""
    echo "   Lightsail databases in the same region can connect without public access"
    echo "   If your app is on the same Lightsail account, connection should work"
    exit 1
fi
unset PGPASSWORD

# Update .env
echo ""
echo "📝 Updating .env file..."

# Escape special characters in password for sed
ESCAPED_PASSWORD=$(echo "${DB_PASSWORD}" | sed 's/[[\.*^$()+?{|]/\\&/g')
ESCAPED_DATABASE_URL=$(echo "${DATABASE_URL}" | sed 's/[[\.*^$()+?{|]/\\&/g')

# Remove old DATABASE_URL line and add new one
grep -v "^DATABASE_URL=" .env > .env.tmp || true
echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env.tmp
mv .env.tmp .env

# Update PRISMA_GENERATE_DATAPROXY
sed -i.bak 's/^PRISMA_GENERATE_DATAPROXY=true/PRISMA_GENERATE_DATAPROXY=false/' .env || echo "PRISMA_GENERATE_DATAPROXY=false" >> .env

echo "✅ .env updated"
echo ""

# Run migrations (creates/updates schema)
echo "🏗️  Running Prisma migrations..."
npx prisma migrate deploy 2>&1 || npx prisma db push --accept-data-loss
echo "✅ Schema updated"
echo ""

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate
echo "✅ Prisma Client generated"
echo ""

# Restart application
echo "🔄 Restarting application..."
pm2 restart campus-rentals
sleep 3

echo ""
echo "✅ Switch Complete!"
echo "==================="
echo ""
echo "📊 Application Status:"
pm2 status

echo ""
echo "📋 Test the application:"
echo "   1. Visit: https://campusrentalsllc.com/investors/login"
echo "   2. Try logging in"
echo "   3. Check that all data loads"
echo ""
echo "📋 View logs:"
echo "   pm2 logs campus-rentals --lines 50"
echo ""
echo "💾 Backup location: .env.backup.*"
echo ""

