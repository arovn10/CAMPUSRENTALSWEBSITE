#!/bin/bash

# Script to update .env file directly on the server
# Run this ON THE SERVER after SSHing in

set -e

RDS_ENDPOINT="ls-96cf74c298a48ae39bf159a9fe40a260e5d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com"
RDS_PORT="5432"
DB_NAME="campus_rentals"
DB_USER="postgres"

echo "🔧 Updating RDS Connection"
echo "=========================="
echo ""

# Prompt for password
read -sp "Enter RDS PostgreSQL password: " DB_PASSWORD
echo ""

# Construct DATABASE_URL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${RDS_ENDPOINT}:${RDS_PORT}/${DB_NAME}?schema=public&sslmode=require&connection_limit=20"

# Navigate to project directory
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals

# Backup current .env
echo ""
echo "💾 Backing up current .env..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created"

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
echo ""
echo "🔄 Running migrations..."
npx prisma migrate deploy || npx prisma db push

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
echo "   pm2 logs campus-rentals"

