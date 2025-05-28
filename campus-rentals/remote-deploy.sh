#!/bin/bash

# Remote deployment script for AWS Lightsail
# This script connects to your AWS instance and deploys the latest code

set -e

echo "🚀 Remote deployment to AWS Lightsail..."
echo "📋 Please update the configuration in this script:"
echo "   - AWS_USER: Your AWS instance username (ubuntu/ec2-user)"
echo "   - AWS_HOST: Your instance IP or domain"
echo "   - SSH_KEY_PATH: Path to your SSH key file"

# Configuration
AWS_USER="bitnami"
AWS_HOST="18.215.22.232"
SSH_KEY_PATH="./LightsailDefaultKey-us-east-1 (2).pem"

echo "🔗 Connecting to AWS instance: $AWS_USER@$AWS_HOST"
echo "📤 Executing deployment commands on remote server..."

ssh -i "$SSH_KEY_PATH" "$AWS_USER@$AWS_HOST" << 'EOF'
echo "🚀 Starting deployment on AWS instance..."

# Navigate to the application directory
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals || {
    echo "❌ Application directory not found"
    exit 1
}

# Pull latest changes from GitHub
echo "📥 Pulling latest changes from GitHub..."
git pull origin main || {
    echo "❌ Failed to pull from GitHub"
    exit 1
}

# Install dependencies
echo "📦 Installing dependencies..."
npm install || {
    echo "❌ Failed to install dependencies"
    exit 1
}

# Build the application
echo "🔨 Building application..."
npm run build || {
    echo "❌ Failed to build application"
    exit 1
}

# Restart the application using our restart script
echo "🔄 Restarting application..."
chmod +x restart-app.sh
./restart-app.sh

# Warm up the cache
echo "🔥 Warming up cache..."
sleep 5
curl -s http://localhost:3000/api/cache > /dev/null || echo "Cache warmup failed, but continuing..."

echo "✅ Deployment completed successfully!"
echo "🌐 Application should be running at: http://18.215.22.232"
EOF

echo "✅ Remote deployment completed!"
echo "🌐 Your Campus Rentals website should now be updated with the caching system"
echo ""
echo "Next steps:"
echo "1. Test your website at: http://18.215.22.232"
echo "2. Check cache status at: http://18.215.22.232/api/cache"
echo "3. Monitor with: ssh -i './LightsailDefaultKey-us-east-1 (2).pem' bitnami@18.215.22.232 'pm2 logs campus-rentals'" 