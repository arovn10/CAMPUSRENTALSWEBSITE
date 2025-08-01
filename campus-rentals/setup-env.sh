#!/bin/bash

# Setup Environment Variables for Campus Rentals Investor Portal
# This script will help you create the .env.local file on your AWS server

echo "🔧 Setting up environment variables for Campus Rentals Investor Portal..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the campus-rentals directory"
    exit 1
fi

# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 64)

# Create the .env.local file
cat > .env.local << EOF
# Database Configuration
# Prisma Accelerate Database URL
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19VMU5SaVV5MHBrSm43cXBWbXFCNXYiLCJhcGlfa2V5IjoiMDFLMUpZRlY4UkJOTkc1MjEwQTlBOE4zMjQiLCJ0ZW5hbnRfaWQiOiI0NDJjYmZlOTJlNjY4MDk0ODAyNDUzODU3MzhmZjcyNWI3ZTJmZjBhNzEyYzA0MDNiZjU0YTgzNTZlYmE0ZGU3IiwiaW50ZXJuYWxfc2VjcmV0IjoiZjEzYmUzOWItOWIzZC00NmY1LWIzOGYtMGQ0ZjUyNWIwNTlhIn0.g1IIGCJPW1gj-HKerDj_qygHG040s8V0O3LjxqQundw"

# JWT Configuration
JWT_SECRET="${JWT_SECRET}"

# Google Maps API
# Replace with your actual Google Maps API key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"

# AWS Configuration
NEXT_PUBLIC_AWS_ACCESS_KEY_ID="15108fde5089768d6f68eaa70320e1f3442387814fa5ad1a20ff5e90b9894ee8"
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY="your_secret_access_key"
NEXT_PUBLIC_AWS_REGION="us-east-2"
NEXT_PUBLIC_S3_BUCKET_NAME="abodebucket"

# GitHub Webhook (if using auto-deploy)
GITHUB_WEBHOOK_SECRET="$(openssl rand -base64 32)"

# Environment
NODE_ENV="production"

# Prisma Configuration
PRISMA_GENERATE_DATAPROXY=true

# Database Pool Configuration
DATABASE_POOL_SIZE=10
DATABASE_CONNECTION_LIMIT=20

# Cache Configuration
CACHE_TTL=3600
CACHE_MAX_SIZE=100

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

echo "✅ Environment file created: .env.local"
echo ""
echo "⚠️  IMPORTANT: You need to update the following values in .env.local:"
echo "   1. NEXT_PUBLIC_GOOGLE_MAPS_API_KEY - Your Google Maps API key"
echo "   2. NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY - Your AWS secret access key"
echo ""
echo "🔐 Generated secure JWT_SECRET and GITHUB_WEBHOOK_SECRET"
echo "🗄️  Database URL configured with Prisma Accelerate"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env.local with your Google Maps API key and AWS secret"
echo "   2. Run: npm install"
echo "   3. Run: npx prisma generate"
echo "   4. Run: npx prisma db push"
echo "   5. Run: npm run db:seed"
echo "   6. Run: npm run build"
echo "   7. Restart your application"
echo ""
echo "🚀 Your investor portal will be ready to use!" 