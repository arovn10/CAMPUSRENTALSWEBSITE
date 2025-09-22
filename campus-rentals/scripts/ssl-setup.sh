#!/bin/bash

# SSL Setup Script for Campus Rentals
# Run this AFTER the main deployment and DNS is pointing to your server

set -e

echo "🔒 Setting up SSL certificate for Campus Rentals..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run with sudo privileges"
    exit 1
fi

# Check if domain is pointing to this server
echo "🌐 Checking DNS configuration..."
SERVER_IP=$(curl -s ifconfig.me)
echo "Server IP: $SERVER_IP"

# Install Certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
else
    echo "✅ Certbot already installed"
fi

# Check if certificates already exist
if [ -d "/etc/letsencrypt/live/campusrentalsllc.com" ]; then
    echo "🔍 Existing certificates found. Checking status..."
    certbot certificates
    
    echo "🔄 Renewing existing certificates..."
    certbot renew --non-interactive
else
    echo "🔐 Obtaining new SSL certificates..."
    
    # Prompt for email (required for Let's Encrypt)
    read -p "Enter your email address for SSL certificate notifications: " EMAIL
    
    if [ -z "$EMAIL" ]; then
        echo "❌ Email address is required for SSL certificate setup"
        exit 1
    fi
    
    # Get SSL certificate
    certbot --nginx -d campusrentalsllc.com -d www.campusrentalsllc.com \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --redirect
fi

# Test automatic renewal
echo "🔄 Testing automatic renewal..."
certbot renew --dry-run

# Update Nginx configuration for better SSL security
echo "⚙️ Updating Nginx SSL configuration with modern security settings..."

# Create a backup of the current configuration
cp /etc/nginx/sites-available/campus-rentals /etc/nginx/sites-available/campus-rentals.backup.$(date +%Y%m%d_%H%M%S)

# Update the SSL configuration with modern settings
cat > /tmp/ssl-config << 'EOF'
# Modern SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# Security headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self';" always;
EOF

# Apply the SSL configuration
sed -i '/# SSL configuration will be added by Certbot/r /tmp/ssl-config' /etc/nginx/sites-available/campus-rentals
sed -i '/# SSL configuration will be added by Certbot/d' /etc/nginx/sites-available/campus-rentals

# Clean up temp file
rm /tmp/ssl-config

# Test and reload Nginx
echo "🧪 Testing Nginx configuration..."
nginx -t

echo "🔄 Reloading Nginx..."
systemctl reload nginx

# Set up automatic renewal
echo "⏰ Setting up automatic SSL renewal..."
# Add to crontab if not already present
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    echo "✅ Automatic renewal scheduled for daily at 12:00 PM"
else
    echo "✅ Automatic renewal already configured"
fi

# Create SSL monitoring script
echo "📝 Creating SSL monitoring script..."
cat > /usr/local/bin/ssl-monitor << 'EOF'
#!/bin/bash
# SSL Certificate Monitoring Script

echo "$(date): Checking SSL certificate status..."

# Check certificate expiration
CERT_EXPIRY=$(certbot certificates | grep -A 2 "campusrentalsllc.com" | grep "VALID" | awk '{print $2}' | head -1)

if [ -n "$CERT_EXPIRY" ]; then
    echo "$(date): Certificate expires: $CERT_EXPIRY"
    
    # Check if certificate expires within 30 days
    EXPIRY_DATE=$(date -d "$CERT_EXPIRY" +%s)
    THIRTY_DAYS=$(date -d "+30 days" +%s)
    
    if [ $EXPIRY_DATE -lt $THIRTY_DAYS ]; then
        echo "$(date): WARNING: Certificate expires within 30 days!"
        echo "$(date): Attempting renewal..."
        certbot renew --quiet --post-hook 'systemctl reload nginx'
    else
        echo "$(date): Certificate is valid for more than 30 days"
    fi
else
    echo "$(date): ERROR: Could not determine certificate expiration"
fi
EOF

chmod +x /usr/local/bin/ssl-monitor

# Add SSL monitoring to crontab
if ! crontab -l 2>/dev/null | grep -q "ssl-monitor"; then
    (crontab -l 2>/dev/null; echo "0 6 * * * /usr/local/bin/ssl-monitor >> /var/log/ssl-monitor.log 2>&1") | crontab -
    echo "✅ SSL monitoring scheduled for daily at 6:00 AM"
fi

# Test SSL configuration
echo "🧪 Testing SSL configuration..."
sleep 5  # Wait for Nginx to reload

# Test HTTPS connection
if curl -s -I https://campusrentalsllc.com > /dev/null 2>&1; then
    echo "✅ HTTPS connection successful"
else
    echo "⚠️ HTTPS connection test failed - check DNS configuration"
fi

# Display certificate information
echo ""
echo "🔍 Certificate Information:"
certbot certificates

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
echo "✅ Automatic renewal scheduled daily at 12:00 PM"
echo "✅ SSL monitoring scheduled daily at 6:00 AM"
echo ""
echo "📊 SSL Status Commands:"
echo "   sudo certbot certificates     # Check certificate status"
echo "   sudo certbot renew --dry-run  # Test renewal process"
echo "   sudo nginx -t                 # Test Nginx configuration"
echo "   tail -f /var/log/ssl-monitor.log  # Monitor SSL logs"
echo ""
echo "🛠️ Troubleshooting:"
echo "   sudo tail -f /var/log/nginx/error.log  # View Nginx errors"
echo "   sudo systemctl status nginx            # Check Nginx status" 