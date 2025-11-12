#!/bin/bash

# Script to update .env file directly on the server with pre-configured credentials
# Run this ON THE SERVER after SSHing in

set -e

RDS_ENDPOINT="ls-96cf74c298a48ae39bf159a9fe40a260e5d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com"
RDS_PORT="5432"
DB_NAME="campus_rentals"
DB_USER="dbmasteruser"
DB_PASSWORD="~D=Otib<.[+WsS=O9(OMM^9V{NX~49%v"

echo "🔧 Updating RDS Connection"
echo "=========================="
echo ""

# Construct DATABASE_URL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${RDS_ENDPOINT}:${RDS_PORT}/${DB_NAME}?schema=public&sslmode=require&connection_limit=20"

# Navigate to project directory
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals

# Backup current .env
echo ""
echo "💾 Backing up current .env..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created: .env.backup.$(date +%Y%m%d_%H%M%S)"

# Update DATABASE_URL
echo ""
echo "📝 Updating DATABASE_URL..."
sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env

# Update PRISMA_GENERATE_DATAPROXY
echo "📝 Updating PRISMA_GENERATE_DATAPROXY..."
sed -i.bak 's/^PRISMA_GENERATE_DATAPROXY=true/PRISMA_GENERATE_DATAPROXY=false/' .env

echo ""
echo "✅ .env file updated successfully!"
echo ""
echo "🔗 RDS Endpoint: ${RDS_ENDPOINT}"
echo "📊 Database: ${DB_NAME}"
echo "👤 User: ${DB_USER}"
echo ""

# Test connection first
echo "🔌 Testing RDS connection..."
export PGPASSWORD="${DB_PASSWORD}"
if psql -h "${RDS_ENDPOINT}" -U "${DB_USER}" -d "${DB_NAME}" -p "${RDS_PORT}" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Connection successful!"
else
    echo "⚠️  Connection test failed, but continuing..."
    echo "   (This might be normal if security groups aren't configured yet)"
fi
unset PGPASSWORD

echo ""
echo "🔄 Running Prisma migrations..."
echo "   (This will create/update tables based on your schema)"
npx prisma migrate deploy 2>&1 || {
    echo "⚠️  migrate deploy failed, trying db push..."
    npx prisma db push --accept-data-loss
}

echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate

echo ""
echo "🔄 Restarting application..."
pm2 restart campus-rentals

echo ""
echo "✅ Migration complete!"
echo ""
echo "📊 Check application status:"
pm2 status

echo ""
echo "📋 View logs if needed:"
echo "   pm2 logs campus-rentals --lines 50"
echo ""
echo "⚠️  IMPORTANT NOTES:"
echo "   1. If you're importing data separately, make sure it completes first"
echo "   2. The schema will be created/updated by Prisma migrations"
echo "   3. Your old Prisma Accelerate data needs to be exported/imported separately"
echo "   4. Check the logs to ensure everything is working correctly"

