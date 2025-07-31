#!/bin/bash

# SSL Certificate Refresh and Site Update Script for Campus Rentals
# This script refreshes the HTTPS certificate and updates the site deployment

set -e

# Configuration - Update these values for your AWS instance
AWS_USER="bitnami"
AWS_HOST="23.21.76.187"
SSH_KEY_PATH="./LightsailDefaultKey-us-east-1 (3).pem"
DOMAIN="campusrentalsllc.com"
WWW_DOMAIN="www.campusrentalsllc.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 SSL Certificate Refresh and Site Update for Campus Rentals${NC}"
echo -e "${BLUE}========================================================${NC}"

# Check if SSH key exists
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}❌ SSH key not found at: $SSH_KEY_PATH${NC}"
    echo -e "${YELLOW}📋 Please update the SSH_KEY_PATH in this script${NC}"
    exit 1
fi

echo -e "${BLUE}🔗 Connecting to AWS instance: $AWS_USER@$AWS_HOST${NC}"
echo -e "${BLUE}📤 Executing SSL refresh and deployment on remote server...${NC}"

# Execute SSL refresh and deployment commands on remote server
ssh -i "$SSH_KEY_PATH" "$AWS_USER@$AWS_HOST" << 'ENDSSH'
    echo "🔒 Starting SSL certificate refresh and site update..."
    
    # Function to log with timestamp
    log() {
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    }
    
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
    
    # Navigate to project directory and update code
    log "📁 Navigating to project directory..."
    cd CAMPUSRENTALSWEBSITE
    
    log "📥 Pulling latest changes from GitHub..."
    git pull origin main
    
    cd campus-rentals
    
    log "📦 Installing dependencies..."
    npm install
    
    log "🔨 Building application..."
    npm run build
    
    # Restart the application
    log "🔄 Restarting Campus Rentals application..."
    pm2 stop campus-rentals 2>/dev/null || true
    pm2 delete campus-rentals 2>/dev/null || true
    pm2 start npm --name "campus-rentals" -- start
    pm2 save
    
    # Test Nginx configuration
    log "⚙️ Testing Nginx configuration..."
    sudo nginx -t
    
    # Reload Nginx to apply any SSL changes
    log "🔄 Reloading Nginx..."
    sudo systemctl reload nginx
    
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
    
    log "✅ SSL refresh and deployment completed successfully!"
    echo ""
    echo "🎉 Summary:"
    echo "✅ SSL certificate renewed"
    echo "✅ Application updated and restarted"
    echo "✅ Nginx configuration reloaded"
    echo "✅ Cache warmed up"
    echo ""
    echo "🌐 Your website should now be accessible at:"
    echo "   https://campusrentalsllc.com"
    echo "   https://www.campusrentalsllc.com"
    echo ""
    echo "📊 Monitor with:"
    echo "   pm2 logs campus-rentals"
    echo "   sudo certbot certificates"
    echo "   curl -I https://campusrentalsllc.com"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL certificate refresh and site update completed successfully!${NC}"
    echo ""
    echo -e "${GREEN}🎉 Your Campus Rentals website is now updated with:${NC}"
    echo -e "   ✅ Fresh SSL certificate"
    echo -e "   ✅ Latest code deployment"
    echo -e "   ✅ Restarted application"
    echo -e "   ✅ Warmed up cache"
    echo ""
    echo -e "${YELLOW}🌐 Test your website:${NC}"
    echo -e "   https://campusrentalsllc.com"
    echo -e "   https://www.campusrentalsllc.com"
    echo ""
    echo -e "${YELLOW}📊 Monitor your deployment:${NC}"
    echo -e "   ssh -i '$SSH_KEY_PATH' $AWS_USER@$AWS_HOST 'pm2 logs campus-rentals'"
    echo -e "   ssh -i '$SSH_KEY_PATH' $AWS_USER@$AWS_HOST 'sudo certbot certificates'"
else
    echo -e "${RED}❌ SSL refresh and deployment failed!${NC}"
    echo -e "${YELLOW}Please check the error messages above and try again.${NC}"
    exit 1
fi 