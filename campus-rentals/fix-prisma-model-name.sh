#!/bin/bash

# Fix Prisma model name script
# This script will SSH into the server and fix the incorrect Prisma model name

set -e  # Exit on any error

# Configuration
SERVER_IP="23.21.76.187"
USERNAME="bitnami"
KEY_PATH="/Users/alec/Desktop/Campus Rentals/CAMPUSRENTALSWEBSITE/campus-rentals/LightsailDefaultKey-us-east-1 (3).pem"

echo "🔧 Fixing Prisma model name..."

# SSH into server and fix the model name
ssh -i "$KEY_PATH" "$USERNAME@$SERVER_IP" << 'EOF'
set -e

echo "📁 Navigating to project directory..."
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals

echo "🔍 Fixing Prisma model name from refinanceClosingFees to refinanceClosingFee..."
sed -i 's/prisma\.refinanceClosingFees/prisma.refinanceClosingFee/g' src/app/api/investors/waterfall-distributions/route.ts

echo "💾 Committing the fix..."
git add .
git commit -m "Fix Prisma model name: refinanceClosingFees -> refinanceClosingFee" || echo "No changes to commit"

echo "🚀 Pushing to repository..."
git push origin main

echo "🔄 Restarting application..."
pm2 restart campus-rentals

echo "✅ Prisma model name fix completed!"
EOF

echo "🎉 Script completed! The Prisma model name has been corrected."
