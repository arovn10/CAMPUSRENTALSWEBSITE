#!/bin/bash

# Remote deployment script for AWS Lightsail
# This script connects to your AWS instance and deploys the latest code

set -e

echo "🚀 Remote deployment to AWS Lightsail..."

# Configuration - Update these with your AWS details
AWS_USER="bitnami"  # or "ec2-user" depending on your instance
AWS_HOST="18.215.22.232"  # Replace with your actual IP/domain
SSH_KEY_PATH="./LightsailDefaultKey-us-east-1 (2).pem"     # Replace with your SSH key path

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Please update the configuration in this script:${NC}"
echo -e "${YELLOW}   - AWS_USER: Your AWS instance username (ubuntu/ec2-user)${NC}"
echo -e "${YELLOW}   - AWS_HOST: Your instance IP or domain${NC}"
echo -e "${YELLOW}   - SSH_KEY_PATH: Path to your SSH key file${NC}"
echo ""

# Check if configuration looks updated
if [[ "$AWS_HOST" == "your-instance-ip-or-domain" ]]; then
    echo -e "${RED}❌ Please update the AWS configuration in this script first!${NC}"
    echo ""
    echo "Edit this file and update:"
    echo "  AWS_USER=\"ubuntu\"  # or ec2-user"
    echo "  AWS_HOST=\"your-actual-ip-or-domain\""
    echo "  SSH_KEY_PATH=\"~/.ssh/your-actual-key.pem\""
    exit 1
fi

echo -e "${GREEN}🔗 Connecting to AWS instance: $AWS_USER@$AWS_HOST${NC}"

# Create the deployment commands to run on the remote server
REMOTE_COMMANDS=$(cat << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting deployment on AWS instance..."

# Navigate to application directory or create it
sudo mkdir -p /var/www/campus-rentals
sudo chown -R $USER:$USER /var/www/campus-rentals
cd /var/www/campus-rentals

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install Git if not present
if ! command -v git &> /dev/null; then
    echo "📦 Installing Git..."
    sudo apt-get install -y git
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Clone or update repository
if [ -d "CAMPUSRENTALSWEBSITE" ]; then
    echo "🔄 Updating existing repository..."
    cd CAMPUSRENTALSWEBSITE
    git fetch origin
    git reset --hard origin/main
    cd campus-rentals
else
    echo "📥 Cloning repository..."
    git clone https://github.com/arovn10/CAMPUSRENTALSWEBSITE.git
    cd CAMPUSRENTALSWEBSITE/campus-rentals
fi

# Create cache directories
echo "📁 Creating cache directories..."
mkdir -p .cache
mkdir -p public/cached-images
chmod 755 .cache
chmod 755 public/cached-images

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Stop existing PM2 process
echo "🛑 Stopping existing PM2 processes..."
pm2 stop campus-rentals || true
pm2 delete campus-rentals || true

# Start the application
echo "🚀 Starting application with PM2..."
pm2 start npm --name "campus-rentals" -- start

# Save PM2 configuration
pm2 save

# Warm up the cache
echo "🔥 Warming up cache..."
sleep 10
curl -f http://localhost:3000/api/warmup || echo "⚠️ Cache warmup will happen automatically"

echo "✅ Deployment completed successfully!"
echo "🌐 Your application should be running on port 3000"

# Show PM2 status
pm2 status
EOF
)

# Execute the deployment on the remote server
echo -e "${GREEN}📤 Executing deployment commands on remote server...${NC}"
ssh -i "$SSH_KEY_PATH" "$AWS_USER@$AWS_HOST" "$REMOTE_COMMANDS"

echo -e "${GREEN}✅ Remote deployment completed!${NC}"
echo -e "${GREEN}🌐 Your Campus Rentals website should now be updated with the caching system${NC}"
echo ""
echo "Next steps:"
echo "1. Test your website at: http://$AWS_HOST:3000"
echo "2. Check cache status at: http://$AWS_HOST:3000/api/cache"
echo "3. Monitor with: ssh -i $SSH_KEY_PATH $AWS_USER@$AWS_HOST 'pm2 logs campus-rentals'" 