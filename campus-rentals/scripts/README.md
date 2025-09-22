# Deployment Scripts

This directory contains all deployment and utility scripts for the Campus Rentals application.

## Main Scripts

### `auto-deploy.sh`
**Primary deployment script** - Use this for most deployments
- Pulls latest code from git
- Installs dependencies
- Builds the application
- Restarts PM2 processes
- Handles SSL certificate renewal

### `final-deployment.sh`
**Production deployment script** - For major releases
- Full system restart
- Database migrations
- Cache clearing
- Comprehensive health checks

## SSL Scripts

### `ssl-setup.sh`
Initial SSL certificate setup and configuration

### `ssl-renew.sh`
Renew SSL certificates (usually run via cron)

### `setup-auto-ssl.sh`
Configure automatic SSL renewal

## Utility Scripts

### `deploy.sh` / `deploy-to-server.sh`
Alternative deployment methods

### `lightsail-deploy.sh` / `lightsail-deploy-updated.sh`
AWS Lightsail specific deployment scripts

### `remote-deploy.sh` / `remote-deploy.ps1`
Remote deployment scripts (PowerShell and Bash versions)

### `restart-app.sh`
Simple application restart script

### `refresh-ssl-and-deploy.sh`
Combined SSL refresh and deployment

## Configuration Files

### `env.template`
Environment variables template - copy to `.env.local` and configure

### `nginx-config.conf`
Nginx server configuration for production

## Usage

1. **Quick Deploy**: `./auto-deploy.sh`
2. **Full Deploy**: `./final-deployment.sh`
3. **SSL Setup**: `./ssl-setup.sh`
4. **App Restart**: `./restart-app.sh`

## Prerequisites

- SSH access to production server
- PM2 installed on server
- Nginx configured
- SSL certificates (for HTTPS)

## Notes

- All scripts should be run from the project root directory
- Ensure proper permissions: `chmod +x *.sh`
- Test scripts in staging environment before production use
