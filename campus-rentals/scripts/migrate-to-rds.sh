#!/bin/bash

# Migration Script: Prisma Accelerate → AWS RDS PostgreSQL
# This script helps migrate your database to AWS RDS

set -e

echo "🚀 AWS RDS PostgreSQL Migration Script"
echo "======================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Please create .env file with your configuration"
    exit 1
fi

# Load current DATABASE_URL
CURRENT_DB_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"')

if [ -z "$CURRENT_DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not found in .env${NC}"
    exit 1
fi

echo -e "${YELLOW}Current DATABASE_URL:${NC}"
echo "$CURRENT_DB_URL" | sed 's/:[^:@]*@/:***@/g'  # Hide password
echo ""

# Prompt for new RDS details
echo "📝 Enter AWS RDS PostgreSQL Connection Details:"
echo ""
read -p "RDS Endpoint (e.g., campus-rentals-db.xxxxx.us-east-1.rds.amazonaws.com): " RDS_ENDPOINT
read -p "Database Name (default: campus_rentals): " DB_NAME
DB_NAME=${DB_NAME:-campus_rentals}
read -p "Username (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}
read -sp "Password: " DB_PASSWORD
echo ""
read -p "Port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

# Construct new DATABASE_URL
NEW_DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${RDS_ENDPOINT}:${DB_PORT}/${DB_NAME}?schema=public&sslmode=require"

echo ""
echo -e "${YELLOW}New DATABASE_URL will be:${NC}"
echo "$NEW_DB_URL" | sed 's/:[^:@]*@/:***@/g'
echo ""

# Confirm migration
read -p "Continue with migration? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi

# Test connection
echo ""
echo "🔌 Testing connection to RDS..."
export PGPASSWORD="$DB_PASSWORD"
if psql -h "$RDS_ENDPOINT" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connection successful!${NC}"
else
    echo -e "${RED}❌ Connection failed!${NC}"
    echo "Please check:"
    echo "  - RDS endpoint is correct"
    echo "  - Security group allows connections from this IP"
    echo "  - Database credentials are correct"
    exit 1
fi
unset PGPASSWORD

# Backup current .env
echo ""
echo "💾 Backing up current .env..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✅ Backup created${NC}"

# Update .env file
echo ""
echo "📝 Updating .env file..."
sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"${NEW_DB_URL}\"|" .env

# Remove Prisma Accelerate config
sed -i.bak 's/^PRISMA_GENERATE_DATAPROXY=true/PRISMA_GENERATE_DATAPROXY=false/' .env

echo -e "${GREEN}✅ .env updated${NC}"

# Run Prisma migrations
echo ""
echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy || npx prisma db push

# Generate Prisma Client
echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate

echo ""
echo -e "${GREEN}✅ Migration completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Test your application"
echo "2. Verify data integrity"
echo "3. Monitor RDS CloudWatch metrics"
echo "4. Update production server .env file"
echo ""
echo "To rollback, restore from: .env.backup.*"

