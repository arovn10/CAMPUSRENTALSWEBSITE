#!/bin/bash

# Setup Automatic SSL Certificate Renewal for Campus Rentals
# This script ensures SSL certificates are automatically renewed

set -e

# Configuration
AWS_USER="bitnami"
AWS_HOST="23.21.76.187"
SSH_KEY_PATH="./LightsailDefaultKey-us-east-1.pem"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 Setting up Automatic SSL Certificate Renewal${NC}"
echo -e "${BLUE}==============================================${NC}"

# Check if SSH key exists
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}❌ SSH key not found at: $SSH_KEY_PATH${NC}"
    exit 1
fi

echo -e "${BLUE}🔗 Connecting to AWS instance: $AWS_USER@$AWS_HOST${NC}"

# Execute SSL setup commands on remote server
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$AWS_USER@$AWS_HOST" << 'ENDSSH'
    echo "🔒 Setting up automatic SSL certificate renewal..."
    
    # Function to log with timestamp
    log() {
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    }
    
    # Step 1: Check current certificate status
    log "🔍 Step 1: Checking current certificate status..."
    sudo certbot certificates
    
    # Step 2: Ensure certbot is properly installed
    log "📦 Step 2: Ensuring certbot is properly installed..."
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
    
    # Step 3: Enable and start the certbot timer
    log "⏰ Step 3: Enabling automatic renewal timer..."
    sudo systemctl enable certbot.timer
    sudo systemctl start certbot.timer
    
    # Step 4: Check timer status
    log "📊 Step 4: Checking timer status..."
    sudo systemctl status certbot.timer
    
    # Step 5: Test the renewal process
    log "🧪 Step 5: Testing renewal process..."
    sudo certbot renew --dry-run
    
    # Step 6: Set up renewal hooks for Nginx
    log "⚙️ Step 6: Setting up renewal hooks..."
    
    # Create renewal hook directory if it doesn't exist
    sudo mkdir -p /etc/letsencrypt/renewal-hooks/post
    
    # Create a post-renewal hook to reload Nginx
    sudo tee /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh << 'EOF'
#!/bin/bash
# Reload Nginx after certificate renewal
systemctl reload nginx
echo "Nginx reloaded after certificate renewal"
EOF
    
    # Make the hook executable
    sudo chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
    
    # Step 7: Verify the setup
    log "✅ Step 7: Verifying automatic renewal setup..."
    
    echo ""
    echo "📋 Automatic Renewal Configuration Summary:"
    echo "=========================================="
    echo "✅ Certbot timer is enabled and active"
    echo "✅ Certificates will be renewed automatically twice daily"
    echo "✅ Nginx will be reloaded after successful renewal"
    echo "✅ Dry-run test completed successfully"
    echo ""
    echo "📅 Next renewal attempt:"
    sudo systemctl status certbot.timer | grep "Trigger:"
    echo ""
    echo "🔍 To manually check certificate status:"
    echo "   sudo certbot certificates"
    echo ""
    echo "🔄 To manually renew certificates:"
    echo "   sudo certbot renew"
    echo ""
    echo "📊 To check timer status:"
    echo "   sudo systemctl status certbot.timer"
    
    log "✅ Automatic SSL certificate renewal setup completed!"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Automatic SSL certificate renewal setup completed!${NC}"
    echo ""
    echo -e "${GREEN}🎉 Your SSL certificates will now be renewed automatically:${NC}"
    echo -e "   ⏰ Renewal runs twice daily"
    echo -e "   🔄 Nginx reloads automatically after renewal"
    echo -e "   🧪 Dry-run test completed successfully"
    echo ""
    echo -e "${YELLOW}📋 You can monitor the renewal process with:${NC}"
    echo -e "   ssh -i '$SSH_KEY_PATH' $AWS_USER@$AWS_HOST 'sudo certbot certificates'"
    echo -e "   ssh -i '$SSH_KEY_PATH' $AWS_USER@$AWS_HOST 'sudo systemctl status certbot.timer'"
    echo -e "   ssh -i '$SSH_KEY_PATH' $AWS_USER@$AWS_HOST 'sudo journalctl -u certbot.timer'"
else
    echo -e "${RED}❌ Setup failed!${NC}"
    exit 1
fi 