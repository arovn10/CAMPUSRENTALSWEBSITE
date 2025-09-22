# Remote deployment script for AWS Lightsail with SSL Certificate Refresh (PowerShell Version)
# This script connects to your AWS instance, refreshes SSL certificate, and deploys the latest code

# Configuration - Update these values for your AWS instance
$AWS_USER = "bitnami"
$AWS_HOST = "23.21.76.187"
$SSH_KEY_PATH = "./LightsailDefaultKey-us-east-1 (3).pem"
$REMOTE_DIR = "CAMPUSRENTALSWEBSITE/campus-rentals"

Write-Host "🚀 Remote deployment with SSL refresh to AWS Lightsail..." -ForegroundColor Blue

# Check if SSH key exists
if (-not (Test-Path $SSH_KEY_PATH)) {
    Write-Host "❌ SSH key not found at: $SSH_KEY_PATH" -ForegroundColor Red
    Write-Host "📋 Please update the configuration in this script:" -ForegroundColor Yellow
    Write-Host "   - AWS_USER: Your AWS instance username (ubuntu/ec2-user)" -ForegroundColor White
    Write-Host "   - AWS_HOST: Your instance IP or domain" -ForegroundColor White
    Write-Host "   - SSH_KEY_PATH: Path to your SSH key file" -ForegroundColor White
    exit 1
}

Write-Host "🔗 Connecting to AWS instance: $AWS_USER@$AWS_HOST" -ForegroundColor Blue
Write-Host "📤 Executing deployment and SSL refresh commands on remote server..." -ForegroundColor Blue

# Create the remote script to execute
$remoteScript = @"
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
"@

# Execute the remote script
try {
    ssh -i $SSH_KEY_PATH "$AWS_USER@$AWS_HOST" $remoteScript
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Remote deployment and SSL refresh completed!" -ForegroundColor Green
        Write-Host "🌐 Your Campus Rentals website should now be updated with fresh SSL certificate" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Test your website at: https://$AWS_HOST" -ForegroundColor White
        Write-Host "2. Check SSL certificate at: https://campusrentalsllc.com" -ForegroundColor White
        Write-Host "3. Monitor with: ssh -i '$SSH_KEY_PATH' $AWS_USER@$AWS_HOST 'pm2 logs campus-rentals'" -ForegroundColor White
        Write-Host "4. Check SSL status: ssh -i '$SSH_KEY_PATH' $AWS_USER@$AWS_HOST 'sudo certbot certificates'" -ForegroundColor White
    } else {
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Deployment failed with error: $_" -ForegroundColor Red
    exit 1
} 