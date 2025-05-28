#!/bin/bash

# SSL Setup Script for Campus Rentals
# Run this AFTER the main deployment and DNS is pointing to your server

set -e

echo "🔒 Setting up SSL certificate for Campus Rentals..."

# Install Certbot
echo "📦 Installing Certbot..."
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
echo "🔐 Obtaining SSL certificate..."
sudo certbot --nginx -d campusrentalsllc.com -d www.campusrentalsllc.com --non-interactive --agree-tos --email your-email@example.com

# Test automatic renewal
echo "🔄 Testing automatic renewal..."
sudo certbot renew --dry-run

# Update Nginx configuration for better SSL security
echo "⚙️ Updating Nginx SSL configuration..."
sudo tee -a /etc/nginx/sites-available/campus-rentals << 'EOF'

# Additional SSL security settings
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
EOF

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "🎉 SSL setup completed successfully!"
echo ""
echo "🔒 Your website is now secured with HTTPS:"
echo "   https://campusrentalsllc.com"
echo "   https://www.campusrentalsllc.com"
echo ""
echo "✅ SSL certificate will auto-renew every 90 days"
echo "✅ HSTS security headers enabled"
echo "✅ Modern SSL/TLS configuration applied" 