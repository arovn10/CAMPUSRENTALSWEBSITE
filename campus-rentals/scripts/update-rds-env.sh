#!/bin/bash

# Script to update .env file on server with RDS connection details
# Usage: Run this on your local machine, it will SSH and update the server .env

set -e

RDS_ENDPOINT="ls-96cf74c298a48ae39bf159a9fe40a260e5d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com"
RDS_PORT="5432"
DB_NAME="campus_rentals"
DB_USER="postgres"

echo "🔧 Updating RDS Connection on Server"
echo "======================================"
echo ""

# Prompt for password
read -sp "Enter RDS PostgreSQL password: " DB_PASSWORD
echo ""

# Construct DATABASE_URL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${RDS_ENDPOINT}:${RDS_PORT}/${DB_NAME}?schema=public&sslmode=require&connection_limit=20"

echo ""
echo "📝 Updating server .env file..."
echo ""

# SSH and update .env file
ssh -i "C:\Users\AlecRovner\OneDrive - STOA\Desktop\CAMPUSRENTALSWEBSITE-1\LightsailDefaultKey-us-east-1 (2).pem" bitnami@23.21.76.187 << EOF
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals

# Backup current .env
cp .env .env.backup.\$(date +%Y%m%d_%H%M%S)

# Update DATABASE_URL
sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env

# Update PRISMA_GENERATE_DATAPROXY
sed -i.bak 's/^PRISMA_GENERATE_DATAPROXY=true/PRISMA_GENERATE_DATAPROXY=false/' .env

echo "✅ .env file updated successfully!"
echo ""
echo "Next steps:"
echo "1. Run: npx prisma migrate deploy"
echo "2. Run: npx prisma generate"
echo "3. Run: pm2 restart campus-rentals"
EOF

echo ""
echo "✅ Server .env updated!"
echo ""
echo "🔗 RDS Endpoint: ${RDS_ENDPOINT}"
echo "📊 Database: ${DB_NAME}"
echo "👤 User: ${DB_USER}"
echo ""
echo "⚠️  Remember to run migrations on the server:"
echo "   ssh bitnami@23.21.76.187"
echo "   cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals"
echo "   npx prisma migrate deploy"
echo "   npx prisma generate"
echo "   pm2 restart campus-rentals"

