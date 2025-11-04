# Quick deployment script for Windows
# Deploys latest changes to production server

$SERVER_IP = "23.21.76.187"
$USERNAME = "bitnami"
# Update this path to your SSH key location on Windows
$SSH_KEY_PATH = "C:\Users\AlecRovner\OneDrive - STOA\Desktop\CAMPUSRENTALSWEBSITE-1\LightsailDefaultKey-us-east-1 (2).pem"

Write-Host "🚀 Deploying Campus Rentals to Production..." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# Check if SSH key exists
if (-not (Test-Path $SSH_KEY_PATH)) {
    Write-Host "❌ SSH key not found at: $SSH_KEY_PATH" -ForegroundColor Red
    Write-Host "Please update SSH_KEY_PATH in this script" -ForegroundColor Yellow
    exit 1
}

Write-Host "📡 Connecting to server..." -ForegroundColor Cyan
Write-Host ""

# Deploy via SSH
ssh -i "$SSH_KEY_PATH" "$USERNAME@$SERVER_IP" @"
set -e

echo "📁 Navigating to project directory..."
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals

echo "🔄 Pulling latest changes from Git..."
git pull origin main

echo "🔧 Installing dependencies..."
npm install --legacy-peer-deps

echo "🏗️  Building application..."
npm run build

echo "🔄 Restarting application with PM2..."
pm2 restart campus-rentals || pm2 start npm --name "campus-rentals" -- start

echo "📊 Checking application status..."
pm2 status

echo "✅ Deployment completed successfully!"
"@

Write-Host ""
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "✅ All changes have been deployed to https://campusrentalsllc.com" -ForegroundColor Green
Write-Host ""

