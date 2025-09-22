#!/bin/bash

# Auto-deployment script for Campus Rentals website
# This script is triggered by GitHub webhooks

set -e  # Exit on any error

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log "🚀 Starting auto-deployment..."

# Navigate to project directory
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals

# Step 1: Pull latest changes
log "📥 Pulling latest changes from Git..."
git pull origin main

# Step 2: Install dependencies
log "📦 Installing dependencies..."
npm install

# Step 3: Build the application
log "🔨 Building application..."
npm run build

# Step 4: Restart the application
log "🔄 Restarting application..."
pm2 restart campus-rentals

# Step 5: Verify deployment
log "✅ Verifying deployment..."
sleep 5

# Check if the application is running
if pm2 list | grep -q "campus-rentals.*online"; then
    log "${GREEN}✅ Auto-deployment completed successfully!${NC}"
    
    # Test the website
    if curl -s -o /dev/null -w "%{http_code}" https://campusrentalsllc.com | grep -q "200"; then
        log "${GREEN}✅ Website is responding correctly${NC}"
    else
        log "${YELLOW}⚠️ Website may not be responding correctly${NC}"
    fi
else
    log "${RED}❌ Auto-deployment failed - application not running${NC}"
    exit 1
fi

log "🎉 Auto-deployment process completed!" 