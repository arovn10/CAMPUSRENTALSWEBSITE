#!/bin/bash

# Exit on error
set -e

echo "🚀 Deploying Campus Rentals with Caching System and SSL..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js and npm
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Install Git
echo "📦 Installing Git..."
sudo apt-get install -y git

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Create application directory
echo "📁 Setting up application directory..."
sudo mkdir -p /var/www/campus-rentals
sudo chown -R $USER:$USER /var/www/campus-rentals
cd /var/www/campus-rentals

# Remove existing deployment if it exists
if [ -d "CAMPUSRENTALSWEBSITE" ]; then
    echo "🧹 Removing existing deployment..."
    rm -rf CAMPUSRENTALSWEBSITE
fi

# Clone your repository
echo "📥 Cloning repository..."
git clone https://github.com/arovn10/CAMPUSRENTALSWEBSITE.git .
cd campus-rentals

# Create cache directories with proper permissions
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

# Stop existing PM2 process if running
echo "🛑 Stopping existing PM2 processes..."
pm2 stop campus-rentals || true
pm2 delete campus-rentals || true

# Start the application with PM2
echo "🚀 Starting application with PM2..."
pm2 start npm --name "campus-rentals" -- start

# Configure PM2 to start on boot
echo "⚙️ Configuring PM2 startup..."
pm2 startup
pm2 save

# Install and configure Nginx
echo "📦 Installing and configuring Nginx..."
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create Nginx configuration with caching support and SSL preparation
echo "⚙️ Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/campus-rentals << 'EOF'
# HTTP server (will redirect to HTTPS)
server {
    listen 80;
    server_name campusrentalsllc.com www.campusrentalsllc.com;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server (will be configured by Certbot)
server {
    listen 443 ssl http2;
    server_name campusrentalsllc.com www.campusrentalsllc.com;

    # SSL configuration will be added by Certbot
    # ssl_certificate /etc/letsencrypt/live/campusrentalsllc.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/campusrentalsllc.com/privkey.pem;

    # Increase client max body size for image uploads
    client_max_body_size 50M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
        try_files $uri @proxy;
    }

    # Cache API responses briefly
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Cache API responses for 5 minutes
        proxy_cache_valid 200 5m;
        add_header X-Cache-Status $upstream_cache_status;
    }

    # Main application
    location @proxy {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        try_files $uri @proxy;
    }
}
EOF

# Enable the site
echo "⚙️ Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/campus-rentals /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Install Certbot for SSL certificates
echo "📦 Installing Certbot for SSL certificates..."
sudo apt-get install -y certbot python3-certbot-nginx

# Set up firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw --force enable

# Warm up the cache
echo "🔥 Warming up cache..."
sleep 10  # Wait for the app to start
curl -f http://localhost:3000/api/warmup || echo "⚠️ Cache warmup failed - will retry after deployment"

# Create a cache maintenance script
echo "📝 Creating cache maintenance script..."
sudo tee /usr/local/bin/campus-rentals-cache-maintenance << 'EOF'
#!/bin/bash
# Campus Rentals Cache Maintenance Script

echo "$(date): Starting cache maintenance..."

# Navigate to application directory
cd /var/www/campus-rentals/campus-rentals

# Check cache status
CACHE_STATUS=$(curl -s http://localhost:3000/api/cache | jq -r '.isValid' 2>/dev/null || echo "false")

if [ "$CACHE_STATUS" != "true" ]; then
    echo "$(date): Cache is invalid, refreshing..."
    curl -s -X POST -H "Content-Type: application/json" -d '{"action":"refresh"}' http://localhost:3000/api/cache
    echo "$(date): Cache refresh completed"
else
    echo "$(date): Cache is valid, no action needed"
fi

# Clean up old log files (keep last 7 days)
find /var/log -name "*campus-rentals*" -mtime +7 -delete 2>/dev/null || true

echo "$(date): Cache maintenance completed"
EOF

sudo chmod +x /usr/local/bin/campus-rentals-cache-maintenance

# Set up daily cache maintenance cron job
echo "⏰ Setting up daily cache maintenance..."
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/campus-rentals-cache-maintenance >> /var/log/campus-rentals-cache.log 2>&1") | crontab -

# Create log rotation for cache logs
sudo tee /etc/logrotate.d/campus-rentals << 'EOF'
/var/log/campus-rentals*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

# Create SSL setup reminder
echo "📝 Creating SSL setup instructions..."
sudo tee /var/www/campus-rentals/SSL_SETUP_INSTRUCTIONS.md << 'EOF'
# SSL Certificate Setup Instructions

## Prerequisites
1. DNS must be pointing to this server's IP address
2. Domain names: campusrentalsllc.com and www.campusrentalsllc.com

## Setup SSL Certificate
Run the following command to obtain and configure SSL certificates:

```bash
sudo certbot --nginx -d campusrentalsllc.com -d www.campusrentalsllc.com --non-interactive --agree-tos --email your-email@example.com
```

## Test SSL Renewal
```bash
sudo certbot renew --dry-run
```

## SSL Certificate Status
Check certificate status:
```bash
sudo certbot certificates
```

## Manual Renewal
```bash
sudo certbot renew
```

## Troubleshooting
- If certificates fail to obtain, ensure DNS is properly configured
- Check Nginx configuration: `sudo nginx -t`
- View Nginx logs: `sudo tail -f /var/log/nginx/error.log`
EOF

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 System Status:"
echo "✅ Application: Running on PM2"
echo "✅ Nginx: Configured with SSL preparation"
echo "✅ Cache directories: Created"
echo "✅ Maintenance: Scheduled daily at 2 AM"
echo "✅ Certbot: Installed for SSL certificates"
echo ""
echo "🌐 Your application should now be running at:"
echo "   http://$(curl -s ifconfig.me) (will redirect to HTTPS)"
echo "   http://campusrentalsllc.com (will redirect to HTTPS after SSL setup)"
echo ""
echo "🔧 Admin Panel:"
echo "   http://$(curl -s ifconfig.me)/admin/cache"
echo ""
echo "🔒 SSL Setup Required:"
echo "1. Ensure DNS is pointing to this server's IP: $(curl -s ifconfig.me)"
echo "2. Run SSL setup: sudo certbot --nginx -d campusrentalsllc.com -d www.campusrentalsllc.com"
echo "3. Check SSL setup instructions: cat /var/www/campus-rentals/SSL_SETUP_INSTRUCTIONS.md"
echo ""
echo "🛠️ Useful commands:"
echo "   pm2 status                    # Check application status"
echo "   pm2 logs campus-rentals       # View application logs"
echo "   sudo nginx -t                 # Test Nginx configuration"
echo "   curl http://localhost:3000/api/cache  # Check cache status"
echo "   sudo certbot certificates     # Check SSL certificate status" 