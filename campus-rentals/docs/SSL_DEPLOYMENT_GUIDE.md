# SSL Certificate Deployment Guide for Campus Rentals

This guide provides comprehensive instructions for setting up, maintaining, and troubleshooting SSL certificates for the Campus Rentals website.

## 📋 Prerequisites

Before setting up SSL certificates, ensure you have:

1. **Domain DNS Configuration**: Your domain (`campusrentalsllc.com` and `www.campusrentalsllc.com`) must point to your server's IP address
2. **Server Access**: Root or sudo access to your server
3. **Firewall Configuration**: Ports 80 and 443 must be open
4. **Application Deployment**: The main application must be deployed and running

## 🚀 Quick SSL Setup

### Step 1: Deploy the Application with SSL Support

```bash
# Run the updated deployment script
sudo ./lightsail-deploy-updated.sh
```

This script will:
- Deploy your application with PM2
- Configure Nginx with SSL preparation
- Install Certbot for SSL certificate management
- Set up automatic renewal and monitoring

### Step 2: Set Up SSL Certificates

After deployment, run the SSL setup script:

```bash
# Navigate to the application directory
cd /var/www/campus-rentals/campus-rentals

# Run the SSL setup script
sudo ./ssl-setup.sh
```

The script will:
- Install Certbot (if not already installed)
- Obtain SSL certificates from Let's Encrypt
- Configure Nginx with modern SSL settings
- Set up automatic renewal
- Test the SSL configuration

## 🔧 SSL Management Commands

### Certificate Status Check

```bash
# Check certificate status
sudo ./ssl-renew.sh check

# Complete status report
sudo ./ssl-renew.sh status
```

### Certificate Renewal

```bash
# Renew certificates if needed
sudo ./ssl-renew.sh renew

# Force renewal (even if not expired)
sudo ./ssl-renew.sh force-renew
```

### Backup and Restore

```bash
# Create backup of SSL configuration
sudo ./ssl-renew.sh backup

# Restore from backup
sudo ./ssl-renew.sh restore /path/to/backup.tar.gz
```

### Manual Certbot Commands

```bash
# Check certificate status
sudo certbot certificates

# Test renewal process
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal
```

## 🔒 SSL Configuration Details

### Modern SSL Settings Applied

The SSL setup includes the following security configurations:

- **TLS Protocols**: TLSv1.2 and TLSv1.3 only
- **Cipher Suites**: Modern, secure cipher combinations
- **OCSP Stapling**: Enabled for better performance and privacy
- **HSTS**: HTTP Strict Transport Security with preload
- **Security Headers**: Comprehensive security headers
- **Session Management**: Optimized session caching

### Nginx SSL Configuration

The Nginx configuration includes:

```nginx
# SSL Configuration
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

# Security Headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self';" always;
```

## ⏰ Automatic Renewal

### Cron Jobs

The following cron jobs are automatically set up:

1. **Daily SSL Renewal**: Runs at 12:00 PM daily
   ```bash
   0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'
   ```

2. **SSL Monitoring**: Runs at 6:00 AM daily
   ```bash
   0 6 * * * /usr/local/bin/ssl-monitor >> /var/log/ssl-monitor.log 2>&1
   ```

3. **Cache Maintenance**: Runs at 2:00 AM daily
   ```bash
   0 2 * * * /usr/local/bin/campus-rentals-cache-maintenance >> /var/log/campus-rentals-cache.log 2>&1
   ```

### Monitoring Logs

```bash
# View SSL monitoring logs
tail -f /var/log/ssl-monitor.log

# View cache maintenance logs
tail -f /var/log/campus-rentals-cache.log

# View Nginx error logs
tail -f /var/log/nginx/error.log

# View Nginx access logs
tail -f /var/log/nginx/access.log
```

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### 1. Certificate Renewal Fails

**Symptoms**: SSL certificate renewal fails or returns errors

**Solutions**:
```bash
# Check certificate status
sudo certbot certificates

# Test renewal process
sudo certbot renew --dry-run

# Check Nginx configuration
sudo nginx -t

# Check DNS configuration
nslookup campusrentalsllc.com
nslookup www.campusrentalsllc.com
```

#### 2. Nginx Configuration Errors

**Symptoms**: Nginx fails to start or reload

**Solutions**:
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restore from backup if needed
sudo ./ssl-renew.sh restore /path/to/backup.tar.gz
```

#### 3. DNS Issues

**Symptoms**: SSL certificate validation fails due to DNS issues

**Solutions**:
```bash
# Check if domain points to correct IP
curl -s ifconfig.me
nslookup campusrentalsllc.com

# Wait for DNS propagation (can take up to 48 hours)
# Use online DNS checker tools to verify propagation
```

#### 4. Firewall Issues

**Symptoms**: Cannot access HTTPS or certificate validation fails

**Solutions**:
```bash
# Check firewall status
sudo ufw status

# Ensure ports 80 and 443 are open
sudo ufw allow 80
sudo ufw allow 443

# Check if ports are listening
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

### SSL Testing Tools

#### Online SSL Testers

1. **SSL Labs**: https://www.ssllabs.com/ssltest/
2. **Mozilla Observatory**: https://observatory.mozilla.org/
3. **Security Headers**: https://securityheaders.com/

#### Command Line Testing

```bash
# Test SSL configuration
openssl s_client -connect campusrentalsllc.com:443 -servername campusrentalsllc.com

# Check certificate details
echo | openssl s_client -servername campusrentalsllc.com -connect campusrentalsllc.com:443 2>/dev/null | openssl x509 -noout -text

# Test HTTPS connectivity
curl -I https://campusrentalsllc.com
```

## 📊 SSL Performance Monitoring

### SSL Metrics to Monitor

1. **Certificate Expiration**: Days until certificate expires
2. **Renewal Success Rate**: Percentage of successful renewals
3. **SSL Handshake Time**: Time taken for SSL handshake
4. **Cipher Suite Usage**: Which cipher suites are being used
5. **OCSP Stapling**: Whether OCSP stapling is working

### Monitoring Commands

```bash
# Check certificate expiration
sudo certbot certificates | grep "VALID"

# Monitor SSL handshake time
time curl -s -o /dev/null https://campusrentalsllc.com

# Check SSL configuration
sudo nginx -T | grep ssl

# Monitor SSL logs
tail -f /var/log/ssl-monitor.log
```

## 🔄 SSL Certificate Lifecycle

### Let's Encrypt Certificates

- **Validity Period**: 90 days
- **Renewal Window**: 30 days before expiration
- **Renewal Method**: Automatic via cron job
- **Backup Strategy**: Automatic backups before renewal

### Certificate Renewal Process

1. **Automatic Check**: Daily at 12:00 PM
2. **Renewal Criteria**: If certificate expires within 30 days
3. **Post-Renewal Actions**: Reload Nginx configuration
4. **Monitoring**: Log all renewal activities

## 📞 Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Check SSL certificate status
2. **Monthly**: Review SSL monitoring logs
3. **Quarterly**: Test SSL configuration with online tools
4. **Annually**: Review and update SSL security settings

### Emergency Procedures

1. **Certificate Expired**: Use force renewal
2. **Nginx Down**: Check configuration and restore from backup
3. **DNS Issues**: Verify DNS configuration and wait for propagation
4. **Security Breach**: Rotate certificates and review logs

### Contact Information

For SSL-related issues:
- Check logs: `/var/log/ssl-monitor.log`
- Review configuration: `/etc/nginx/sites-available/campus-rentals`
- Backup location: `/var/backups/campus-rentals/ssl/`

## 🎯 Best Practices

1. **Always backup before making changes**
2. **Test configurations before applying**
3. **Monitor certificate expiration dates**
4. **Keep SSL libraries and tools updated**
5. **Use strong cipher suites and protocols**
6. **Enable HSTS for better security**
7. **Monitor SSL performance regularly**
8. **Have a rollback plan ready**

---

**Last Updated**: $(date)
**Version**: 2.0
**Maintainer**: Campus Rentals Development Team 