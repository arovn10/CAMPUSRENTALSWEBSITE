#!/bin/bash

# Setup script for GitHub webhook auto-deployment
# This script helps configure the webhook and generate secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 GitHub Webhook Auto-Deployment Setup${NC}"
echo "=============================================="

# Generate webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo -e "${GREEN}✅ Generated webhook secret: ${WEBHOOK_SECRET}${NC}"

# Get the webhook URL
WEBHOOK_URL="https://campusrentalsllc.com/api/webhook/github"

echo ""
echo -e "${YELLOW}📋 Configuration Steps:${NC}"
echo "1. Go to your GitHub repository: https://github.com/arovn10/CAMPUSRENTALSWEBSITE"
echo "2. Go to Settings > Webhooks"
echo "3. Click 'Add webhook'"
echo "4. Configure the webhook:"
echo "   - Payload URL: ${WEBHOOK_URL}"
echo "   - Content type: application/json"
echo "   - Secret: ${WEBHOOK_SECRET}"
echo "   - Events: Just the push event"
echo "   - Active: ✓"
echo "5. Click 'Add webhook'"

echo ""
echo -e "${YELLOW}🔧 Environment Setup:${NC}"
echo "Add this to your .env.local file:"
echo "GITHUB_WEBHOOK_SECRET=${WEBHOOK_SECRET}"

echo ""
echo -e "${YELLOW}🧪 Testing:${NC}"
echo "Test the webhook endpoint:"
echo "curl ${WEBHOOK_URL}"

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo "After configuring the webhook in GitHub, every push to the main branch will automatically deploy your website." 