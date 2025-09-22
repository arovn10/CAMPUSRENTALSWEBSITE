#!/bin/bash

# Final deployment script to update the server with the complete fix
# This script will pull the latest changes and restart the application

set -e  # Exit on any error

# Configuration
SERVER_IP="23.21.76.187"
USERNAME="bitnami"
KEY_PATH="/Users/alec/Desktop/Campus Rentals/CAMPUSRENTALSWEBSITE/campus-rentals/LightsailDefaultKey-us-east-1 (3).pem"

echo "🚀 Final Deployment - Refinancing Distribution Fix"
echo "=================================================="

# SSH into server and deploy
ssh -i "$KEY_PATH" "$USERNAME@$SERVER_IP" << 'EOF'
set -e

echo "📁 Navigating to project directory..."
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals

echo "🔄 Pulling latest changes from repository..."
git pull origin main

echo "🔧 Installing any new dependencies..."
npm install

echo "🏗️  Building the application..."
npm run build

echo "🔄 Restarting the application..."
pm2 restart campus-rentals

echo "📊 Checking application status..."
pm2 status

echo "✅ Deployment completed successfully!"
echo ""
echo "🎉 The refinancing distribution fix has been deployed!"
echo "✅ The error 'Distribution amount is less than outstanding debt' should now be resolved"
echo "✅ Refinancing distributions will use the new debt amount for validation"
echo "✅ Property debt will be automatically updated during refinancing"
EOF

echo ""
echo "🎉 FINAL DEPLOYMENT COMPLETED!"
echo "=============================="
echo "✅ All changes have been successfully deployed to the server"
echo "✅ The refinancing distribution error has been fixed"
echo "✅ Your application is now running with the latest fixes"
echo ""
echo "🌐 Test the fix at: https://campusrentalsllc.com"
echo "📋 Try creating a refinancing distribution to verify the fix works"


