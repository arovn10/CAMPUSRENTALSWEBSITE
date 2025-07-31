#!/bin/bash

# SSL Certificate Renewal and Maintenance Script for Campus Rentals
# This script can be run manually or via cron for automatic renewal

set -e

echo "🔒 SSL Certificate Renewal and Maintenance Script"
echo "=================================================="

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run with sudo privileges"
    exit 1
fi

# Function to log messages with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to check certificate status
check_certificate_status() {
    log_message "🔍 Checking certificate status..."
    
    if [ -d "/etc/letsencrypt/live/campusrentalsllc.com" ]; then
        echo ""
        echo "📋 Certificate Information:"
        certbot certificates
        
        # Get expiration date
        EXPIRY_INFO=$(certbot certificates | grep -A 2 "campusrentalsllc.com" | grep "VALID" | head -1)
        if [ -n "$EXPIRY_INFO" ]; then
            EXPIRY_DATE=$(echo "$EXPIRY_INFO" | awk '{print $2}')
            log_message "Certificate expires: $EXPIRY_DATE"
            
            # Calculate days until expiration
            EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || echo "0")
            CURRENT_TIMESTAMP=$(date +%s)
            DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))
            
            if [ $DAYS_UNTIL_EXPIRY -gt 0 ]; then
                log_message "✅ Certificate is valid for $DAYS_UNTIL_EXPIRY more days"
                
                if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
                    log_message "⚠️ WARNING: Certificate expires in less than 30 days!"
                    return 1
                fi
            else
                log_message "❌ Certificate has expired!"
                return 1
            fi
        else
            log_message "❌ Could not determine certificate expiration"
            return 1
        fi
    else
        log_message "❌ No SSL certificates found"
        return 1
    fi
    
    return 0
}

# Function to renew certificates
renew_certificates() {
    log_message "🔄 Attempting to renew SSL certificates..."
    
    # Test renewal first
    log_message "🧪 Testing renewal process..."
    if certbot renew --dry-run; then
        log_message "✅ Renewal test successful"
    else
        log_message "❌ Renewal test failed"
        return 1
    fi
    
    # Perform actual renewal
    log_message "🔄 Performing actual renewal..."
    if certbot renew --quiet --post-hook 'systemctl reload nginx'; then
        log_message "✅ Certificate renewal successful"
        
        # Test Nginx configuration
        if nginx -t; then
            log_message "✅ Nginx configuration is valid"
        else
            log_message "❌ Nginx configuration is invalid"
            return 1
        fi
        
        return 0
    else
        log_message "❌ Certificate renewal failed"
        return 1
    fi
}

# Function to test HTTPS connectivity
test_https_connectivity() {
    log_message "🌐 Testing HTTPS connectivity..."
    
    # Test main domain
    if curl -s -I --max-time 10 https://campusrentalsllc.com > /dev/null 2>&1; then
        log_message "✅ HTTPS connection to campusrentalsllc.com successful"
    else
        log_message "❌ HTTPS connection to campusrentalsllc.com failed"
        return 1
    fi
    
    # Test www subdomain
    if curl -s -I --max-time 10 https://www.campusrentalsllc.com > /dev/null 2>&1; then
        log_message "✅ HTTPS connection to www.campusrentalsllc.com successful"
    else
        log_message "❌ HTTPS connection to www.campusrentalsllc.com failed"
        return 1
    fi
    
    return 0
}

# Function to check SSL configuration
check_ssl_configuration() {
    log_message "🔧 Checking SSL configuration..."
    
    # Test Nginx configuration
    if nginx -t; then
        log_message "✅ Nginx configuration is valid"
    else
        log_message "❌ Nginx configuration is invalid"
        return 1
    fi
    
    # Check if SSL is properly configured
    if grep -q "ssl_certificate" /etc/nginx/sites-available/campus-rentals; then
        log_message "✅ SSL configuration found in Nginx"
    else
        log_message "❌ SSL configuration not found in Nginx"
        return 1
    fi
    
    return 0
}

# Function to backup current configuration
backup_configuration() {
    log_message "💾 Creating backup of current configuration..."
    
    BACKUP_DIR="/var/backups/campus-rentals/ssl"
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="$BACKUP_DIR/ssl-config-$(date +%Y%m%d_%H%M%S).tar.gz"
    
    tar -czf "$BACKUP_FILE" \
        /etc/nginx/sites-available/campus-rentals \
        /etc/letsencrypt/live/campusrentalsllc.com \
        /etc/letsencrypt/archive/campusrentalsllc.com \
        /etc/letsencrypt/renewal/campusrentalsllc.com.conf 2>/dev/null || true
    
    log_message "✅ Configuration backed up to: $BACKUP_FILE"
}

# Function to restore from backup
restore_from_backup() {
    if [ -z "$1" ]; then
        echo "Usage: $0 restore <backup-file>"
        exit 1
    fi
    
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_message "❌ Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    log_message "🔄 Restoring from backup: $BACKUP_FILE"
    
    # Stop Nginx
    systemctl stop nginx
    
    # Extract backup
    tar -xzf "$BACKUP_FILE" -C /
    
    # Start Nginx
    systemctl start nginx
    
    log_message "✅ Restore completed"
}

# Main script logic
case "${1:-check}" in
    "check")
        echo "🔍 Certificate Status Check"
        echo "=========================="
        check_certificate_status
        check_ssl_configuration
        test_https_connectivity
        ;;
    
    "renew")
        echo "🔄 Certificate Renewal"
        echo "======================"
        backup_configuration
        renew_certificates
        check_certificate_status
        test_https_connectivity
        ;;
    
    "force-renew")
        echo "🔄 Force Certificate Renewal"
        echo "============================"
        backup_configuration
        log_message "🔄 Force renewing certificates..."
        certbot renew --force-renewal --quiet --post-hook 'systemctl reload nginx'
        check_certificate_status
        test_https_connectivity
        ;;
    
    "backup")
        echo "💾 Configuration Backup"
        echo "======================="
        backup_configuration
        ;;
    
    "restore")
        echo "🔄 Configuration Restore"
        echo "========================"
        restore_from_backup "$2"
        ;;
    
    "status")
        echo "📊 Complete SSL Status Report"
        echo "============================="
        check_certificate_status
        check_ssl_configuration
        test_https_connectivity
        echo ""
        echo "📋 System Status:"
        systemctl status nginx --no-pager -l
        echo ""
        echo "📋 Recent Nginx Errors:"
        tail -n 20 /var/log/nginx/error.log 2>/dev/null || echo "No error log found"
        ;;
    
    "help"|"-h"|"--help")
        echo "SSL Certificate Management Script"
        echo "================================="
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  check       - Check certificate status and connectivity (default)"
        echo "  renew       - Renew certificates if needed"
        echo "  force-renew - Force renewal of certificates"
        echo "  backup      - Create backup of current configuration"
        echo "  restore     - Restore from backup file"
        echo "  status      - Complete status report"
        echo "  help        - Show this help message"
        echo ""
        echo "Examples:"
        echo "  sudo $0                    # Check status"
        echo "  sudo $0 renew             # Renew if needed"
        echo "  sudo $0 force-renew       # Force renewal"
        echo "  sudo $0 backup            # Create backup"
        echo "  sudo $0 restore backup.tar.gz  # Restore from backup"
        echo "  sudo $0 status            # Full status report"
        ;;
    
    *)
        echo "❌ Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac

echo ""
log_message "Script execution completed" 