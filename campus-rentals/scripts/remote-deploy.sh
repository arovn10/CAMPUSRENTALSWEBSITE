#!/bin/bash

# Remote deployment script for AWS Lightsail with SSL Certificate Refresh
# This script connects to your AWS instance, refreshes SSL certificate, and deploys the latest code

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

echo -e "${BLUE}🚀 Remote deployment with SSL refresh to AWS Lightsail...${NC}"

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
echo -e "${BLUE}📤 Executing deployment and SSL refresh commands on remote server...${NC}"

# Execute deployment commands on remote server
ssh -i "$SSH_KEY_PATH" "$AWS_USER@$AWS_HOST" << 'ENDSSH'
    echo "🚀 Starting deployment and SSL refresh on AWS instance..."
    
    # Function to log with timestamp
    log() {
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    }
    
    # Step 1: Refresh SSL Certificate
    log "🔒 Step 1: Refreshing SSL Certificate"
    log "====================================="
    
    # Update system packages
    log "📦 Updating system packages..."
    sudo apt-get update
    sudo apt-get upgrade -y
    
    # Install/Update Certbot if not already installed
    log "📦 Installing/Updating Certbot..."
    sudo apt-get install -y certbot python3-certbot-nginx
    
    # Check current certificate status
    log "🔍 Checking current SSL certificate status..."
    sudo certbot certificates
    
    # Renew SSL certificate
    log "🔄 Renewing SSL certificate..."
    sudo certbot renew --force-renewal --non-interactive
    
    # Test the renewal process
    log "🧪 Testing certificate renewal process..."
    sudo certbot renew --dry-run
    
    # Step 2: Deploy Application Updates
    log "📦 Step 2: Deploying Application Updates"
    log "======================================="
    
    # Navigate to project directory
    cd CAMPUSRENTALSWEBSITE
    
    log "📥 Pulling latest changes from GitHub..."
    git pull origin main
    
    cd campus-rentals
    
    log "📦 Installing dependencies..."
    npm install
    
    log "🔨 Building application..."
    npm run build
    
    log "🔄 Restarting Campus Rentals application..."
    pm2 stop campus-rentals 2>/dev/null || true
    pm2 delete campus-rentals 2>/dev/null || true
    pm2 start npm --name "campus-rentals" -- start
    pm2 save
    
    # Step 3: Update Nginx and Test Configuration
    log "⚙️ Step 3: Updating Nginx Configuration"
    log "======================================"
    
    # Test Nginx configuration
    log "⚙️ Testing Nginx configuration..."
    sudo nginx -t
    
    # Reload Nginx to apply any SSL changes
    log "🔄 Reloading Nginx..."
    sudo systemctl reload nginx
    
    # Step 4: Warm up and Verify
    log "🔥 Step 4: Warming up and Verification"
    log "====================================="
    
    # Warm up the cache
    log "🔥 Warming up cache..."
    sleep 5
    curl -s http://localhost:3000/api/warmup >/dev/null 2>&1 || true
    
    # Verify SSL certificate
    log "✅ Verifying SSL certificate..."
    echo "SSL Certificate Details:"
    echo | openssl s_client -servername campusrentalsllc.com -connect campusrentalsllc.com:443 2>/dev/null | openssl x509 -noout -dates
    
    # Check application status
    log "📊 Checking application status..."
    pm2 status
    
    # Test HTTPS access
    log "🌐 Testing HTTPS access..."
    curl -I https://campusrentalsllc.com 2>/dev/null | head -1 || echo "⚠️ HTTPS test failed - check DNS and certificate"
    
    log "✅ Deployment and SSL refresh completed successfully!"
    echo "🌐 Application should be running at: https://campusrentalsllc.com"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Remote deployment and SSL refresh completed!${NC}"
    echo -e "${GREEN}🌐 Your Campus Rentals website should now be updated with fresh SSL certificate${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "1. Test your website at: https://$AWS_HOST"
    echo -e "2. Check SSL certificate at: https://campusrentalsllc.com"
    echo -e "3. Monitor with: ssh -i '$SSH_KEY_PATH' $AWS_USER@$AWS_HOST 'pm2 logs campus-rentals'"
    echo -e "4. Check SSL status: ssh -i '$SSH_KEY_PATH' $AWS_USER@$AWS_HOST 'sudo certbot certificates'"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi 