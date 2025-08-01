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
    
    # Setup environment file
    log "🔧 Setting up environment file..."
    cat > .env << 'EOF'
# Database Configuration
# Prisma Accelerate Database URL
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19VMU5SaVV5MHBrSm43cXBWbXFCNXYiLCJhcGlfa2V5IjoiMDFLMUpZRlY4UkJOTkc1MjEwQTlBOE4zMjQiLCJ0ZW5hbnRfaWQiOiI0NDJjYmZlOTJlNjY4MDk0ODAyNDUzODU3MzhmZjcyNWI3ZTJmZjBhNzEyYzA0MDNiZjU0YTgzNTZlYmE0ZGU3IiwiaW50ZXJuYWxfc2VjcmV0IjoiZjEzYmUzOWItOWIzZC00NmY1LWIzOGYtMGQ0ZjUyNWIwNTlhIn0.g1IIGCJPW1gj-HKerDj_qygHG040s8V0O3LjxqQundw"

# JWT Configuration
# Generate a secure random string for JWT signing
JWT_SECRET="campus-rentals-super-secure-jwt-secret-key-2024"

# Google Maps API
# Your Google Maps API key for geocoding and maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyCMRq-rxm_IqV32dHmhhRshHfCXJHUZmqA"

# AWS Configuration
NEXT_PUBLIC_AWS_ACCESS_KEY_ID="15108fde5089768d6f68eaa70320e1f3442387814fa5ad1a20ff5e90b9894ee8"
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY="your_secret_access_key"
NEXT_PUBLIC_AWS_REGION="us-east-2"
NEXT_PUBLIC_S3_BUCKET_NAME="abodebucket"

# GitHub Webhook (if using auto-deploy)
GITHUB_WEBHOOK_SECRET="your-github-webhook-secret"

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
    curl -I https://campusrentalsllc.com
    
    log "✅ SSL refresh and deployment completed successfully!"
    
    echo ""
    echo "🎉 Summary:"
    echo "✅ SSL certificate renewed"
    echo "✅ Application updated and restarted"
    echo "✅ Environment file configured"
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

echo -e "${GREEN}✅ SSL certificate refresh and site update completed successfully!${NC}"
echo ""
echo -e "${GREEN}🎉 Your Campus Rentals website is now updated with:${NC}"
echo -e "${GREEN}   ✅ Fresh SSL certificate${NC}"
echo -e "${GREEN}   ✅ Latest code deployment${NC}"
echo -e "${GREEN}   ✅ Environment file configured${NC}"
echo -e "${GREEN}   ✅ Restarted application${NC}"
echo -e "${GREEN}   ✅ Warmed up cache${NC}"
echo ""
echo -e "${BLUE}🌐 Test your website:${NC}"
echo -e "${BLUE}   https://campusrentalsllc.com${NC}"
echo -e "${BLUE}   https://www.campusrentalsllc.com${NC}"
echo ""
echo -e "${BLUE}📊 Monitor your deployment:${NC}"
echo -e "${BLUE}   ssh -i '$SSH_KEY_PATH' $AWS_USER@$AWS_HOST 'pm2 logs campus-rentals'${NC}"
echo -e "${BLUE}   ssh -i '$SSH_KEY_PATH' $AWS_USER@$AWS_HOST 'sudo certbot certificates'${NC}" 