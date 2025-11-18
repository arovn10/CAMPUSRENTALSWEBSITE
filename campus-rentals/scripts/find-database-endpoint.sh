#!/bin/bash
# Find the actual database endpoint

echo "🔍 Finding database connection info..."
echo ""

# Check if there's a .env file with database info
if [ -f .env ]; then
    echo "📄 Checking .env file..."
    grep -i "database\|postgres\|db" .env | grep -v "API_KEY\|SECRET" | head -5
    echo ""
fi

# Check environment variables
echo "🌍 Environment variables:"
env | grep -i "database\|postgres\|db" | grep -v "API_KEY\|SECRET" | head -5
echo ""

# Try to get database info from Prisma schema
if [ -f prisma/schema.prisma ]; then
    echo "📋 Checking Prisma schema..."
    grep -i "datasource\|url" prisma/schema.prisma | head -3
    echo ""
fi

# Check if we can resolve the hostname
echo "🌐 Testing DNS resolution..."
nslookup ls-96cf74c298a48ae39bf159a9fe40a2605d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com 2>&1 | head -10
echo ""

echo "💡 If DNS fails, you may need to:"
echo "   1. Check AWS Lightsail console for the correct endpoint"
echo "   2. Use the database's private IP if in same VPC"
echo "   3. Check if there's a different endpoint format"

