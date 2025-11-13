#!/bin/bash

# Script to run Prisma migration on AWS Lightsail database
# Usage: ./scripts/run-migration-aws.sh

set -e

echo "🔄 Running Prisma migration on AWS Lightsail database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo "Please set it in your .env file or export it:"
    echo "export DATABASE_URL='postgresql://username:password@host:port/database'"
    exit 1
fi

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run migration
echo "🚀 Running database migration..."
npx prisma migrate deploy

# Verify connection
echo "✅ Verifying database connection..."
npx prisma db pull --force || echo "⚠️  Database pull failed, but migration may have succeeded"

echo "✅ Migration complete!"

