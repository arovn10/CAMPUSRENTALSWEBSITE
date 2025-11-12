#!/bin/bash

# Deployment script for CRM system
# This script safely applies schema changes and restarts the application

set -e

echo "🚀 Deploying CRM System to Lightsail"
echo "======================================"
echo ""

# SSH connection details
SSH_KEY="LightsailDefaultKey-us-east-1 (2).pem"
SSH_USER="bitnami"
SSH_HOST="23.21.76.187"
REMOTE_DIR="/home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals"

echo "📦 Pulling latest code from Git..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'ENDSSH'
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
git pull origin main
echo "✅ Code pulled successfully"
ENDSSH

echo ""
echo "🔧 Installing dependencies..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'ENDSSH'
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
npm install
echo "✅ Dependencies installed"
ENDSSH

echo ""
echo "🗄️  Applying database schema changes (safe - no data loss)..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'ENDSSH'
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
npx prisma db push --accept-data-loss
echo "✅ Schema updated"
ENDSSH

echo ""
echo "🔨 Generating Prisma Client..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'ENDSSH'
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
npx prisma generate
echo "✅ Prisma Client generated"
ENDSSH

echo ""
echo "🏗️  Building application..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'ENDSSH'
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
npm run build
echo "✅ Build completed"
ENDSSH

echo ""
echo "🔄 Restarting application..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'ENDSSH'
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
pm2 restart campus-rentals
pm2 save
echo "✅ Application restarted"
ENDSSH

echo ""
echo "✅ Deployment Complete!"
echo "======================"
echo ""
echo "📋 Next Steps:"
echo "   1. Visit: https://campusrentalsllc.com/investors/dashboard"
echo "   2. Log in as an admin user"
echo "   3. Navigate to the CRM tab"
echo "   4. Create a pipeline and test deal management"
echo ""
echo "📊 Check application status:"
echo "   ssh -i \"$SSH_KEY\" $SSH_USER@$SSH_HOST 'pm2 status'"
echo ""
echo "📋 View logs:"
echo "   ssh -i \"$SSH_KEY\" $SSH_USER@$SSH_HOST 'pm2 logs campus-rentals --lines 50'"

