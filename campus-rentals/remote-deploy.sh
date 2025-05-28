#!/bin/bash

# Remote deployment script for AWS Lightsail
# This script connects to your AWS instance and deploys the latest code

set -e

# Configuration - Update these values for your AWS instance
AWS_USER="bitnami"
AWS_HOST="23.21.76.187"
SSH_KEY_PATH="./LightsailDefaultKey-us-east-1 (3).pem"
REMOTE_DIR="CAMPUSRENTALSWEBSITE/campus-rentals"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Remote deployment to AWS Lightsail...${NC}"

# Check if SSH key exists
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}❌ SSH key not found at: $SSH_KEY_PATH${NC}"
    echo -e "${YELLOW}📋 Please update the configuration in this script:${NC}"
    echo -e "   - AWS_USER: Your AWS instance username (ubuntu/ec2-user)"
    echo -e "   - AWS_HOST: Your instance IP or domain"
    echo -e "   - SSH_KEY_PATH: Path to your SSH key file"
    exit 1
fi

echo -e "${BLUE}🔗 Connecting to AWS instance: $AWS_USER@$AWS_HOST${NC}"
echo -e "${BLUE}📤 Executing deployment commands on remote server...${NC}"

# Execute deployment commands on remote server
ssh -i "$SSH_KEY_PATH" "$AWS_USER@$AWS_HOST" << 'ENDSSH'
    echo "🚀 Starting deployment on AWS instance..."
    
    # Navigate to project directory
    cd CAMPUSRENTALSWEBSITE
    
    echo "📥 Pulling latest changes from GitHub..."
    git pull origin main
    
    cd campus-rentals
    
    echo "📦 Installing dependencies..."
    npm install
    
    echo "🔨 Building application..."
    npm run build
    
    echo "🔄 Restarting application..."
    echo "🔄 Restarting Campus Rentals application..."
    pm2 stop campus-rentals 2>/dev/null || true
    pm2 delete campus-rentals 2>/dev/null || true
    pm2 start npm --name "campus-rentals" -- start
    pm2 status
    
    echo "✅ Application restart completed!"
    
    echo "🔥 Warming up cache..."
    sleep 3
    curl -s http://localhost:3000/api/warmup >/dev/null 2>&1 || true
    
    echo "✅ Deployment completed successfully!"
    echo "🌐 Application should be running at: http://$AWS_HOST"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Remote deployment completed!${NC}"
    echo -e "${GREEN}🌐 Your Campus Rentals website should now be updated with the caching system${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "1. Test your website at: http://$AWS_HOST"
    echo -e "2. Check cache status at: http://$AWS_HOST/api/cache"
    echo -e "3. Monitor with: ssh -i '$SSH_KEY_PATH' $AWS_USER@$AWS_HOST 'pm2 logs campus-rentals'"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi 