#!/bin/bash

# Simple script to switch to RDS (assumes data is already imported)
# Use this if you've already imported data to RDS via AWS console

set -e

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

echo "🚀 Switching to AWS RDS"
echo "======================="
echo ""

cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals

# Backup .env
echo "💾 Backing up .env..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created"
echo ""

# Construct DATABASE_URL
DATABASE_URL="postgresql://${RDS_USER}:${RDS_PASSWORD}@${RDS_ENDPOINT}:${RDS_PORT}/${DB_NAME}?schema=public&sslmode=require&connection_limit=20"

# Test connection
echo "🔌 Testing RDS connection..."
export PGPASSWORD="${RDS_PASSWORD}"
if psql -h "${RDS_ENDPOINT}" -U "${RDS_USER}" -d "${DB_NAME}" -p "${RDS_PORT}" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ RDS connection successful!"
else
    echo "❌ RDS connection failed!"
    echo "   Check security group and credentials"
    exit 1
fi
unset PGPASSWORD

# Update .env
echo ""
echo "📝 Updating .env file..."
sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
sed -i.bak 's/^PRISMA_GENERATE_DATAPROXY=true/PRISMA_GENERATE_DATAPROXY=false/' .env
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

