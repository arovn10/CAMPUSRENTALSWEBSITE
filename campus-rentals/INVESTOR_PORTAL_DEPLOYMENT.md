# Campus Rentals Investor Portal - Deployment Guide

## Overview
This guide will help you deploy the investor portal to your AWS server with all the necessary environment variables and database setup.

## Prerequisites
- Access to your AWS Lightsail server
- PostgreSQL database (can be AWS RDS, Supabase, or any PostgreSQL provider)
- Google Maps API key
- AWS credentials

## Step 1: Environment Setup

### Option A: Using the Setup Script (Recommended)
1. SSH into your AWS server:
   ```bash
   ssh -i "LightsailDefaultKey-us-east-1.pem" ubuntu@3.250.201.113
   ```

2. Navigate to your project directory:
   ```bash
   cd /home/ubuntu/campus-rentals
   ```

3. Run the environment setup script:
   ```bash
   chmod +x setup-env.sh
   ./setup-env.sh
   ```

### Option B: Manual Setup
1. Create the `.env.local` file:
   ```bash
   nano .env.local
   ```

2. Add the following content (replace with your actual values):
   ```env
   # Database Configuration
   DATABASE_URL="postgresql://username:password@host:port/database_name"
   
   # JWT Configuration
   JWT_SECRET="your-super-secure-jwt-secret-key-here"
   
   # Google Maps API
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
   
   # AWS Configuration
   NEXT_PUBLIC_AWS_ACCESS_KEY_ID="15108fde5089768d6f68eaa70320e1f3442387814fa5ad1a20ff5e90b9894ee8"
   NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY="your_secret_access_key"
   NEXT_PUBLIC_AWS_REGION="us-east-2"
   NEXT_PUBLIC_S3_BUCKET_NAME="abodebucket"
   
   # GitHub Webhook (if using auto-deploy)
   GITHUB_WEBHOOK_SECRET="your-github-webhook-secret"
   
   # Environment
   NODE_ENV="production"
   
   # Prisma Configuration
   PRISMA_GENERATE_DATAPROXY=true
   ```

## Step 2: Database Setup

### Option A: Using Supabase (Recommended for quick setup)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your database connection string from Settings > Database
4. Update `DATABASE_URL` in `.env.local`

### Option B: Using AWS RDS
1. Create a PostgreSQL RDS instance in AWS
2. Configure security groups to allow connections from your Lightsail server
3. Get the connection string and update `DATABASE_URL`

### Option C: Using Railway, PlanetScale, or other providers
1. Create a PostgreSQL database with your preferred provider
2. Get the connection string and update `DATABASE_URL`

## Step 3: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Prisma CLI globally (if not already installed)
npm install -g prisma
```

## Step 4: Database Migration and Seeding

```bash
# Generate Prisma client
npx prisma generate

# Push the database schema
npx prisma db push

# Seed the database with initial data
npm run db:seed
```

## Step 5: Build and Deploy

```bash
# Build the application
npm run build

# Restart the application (if using PM2)
pm2 restart campus-rentals

# Or start the application
npm start
```

## Step 6: Verify Installation

1. Check if the application is running:
   ```bash
   pm2 status
   ```

2. Test the investor portal:
   - Visit: `https://campusrentalsllc.com/investors/login`
   - Login with:
     - Admin: `rovnerproperties@gmail.com` / `Celarev0319942002!`
     - Investor: `srovner@dial-law.com` / `15Saratoga!`

## Step 7: Photo System Setup

The photo system is already configured with your actual property photos:

- Property ID 1: 2422 Joseph St. - ✅ Has photo
- Property ID 2: 2424 Joseph St - ✅ Has photo  
- Property ID 6: 7315 Freret St - ✅ Has photo
- Property ID 10: 7700 Burthe St - ✅ Has photo
- Other properties: Will show placeholder images

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify your `DATABASE_URL` is correct
   - Check if the database is accessible from your server
   - Ensure firewall rules allow the connection

2. **JWT Secret Error**
   - Make sure `JWT_SECRET` is set and is a secure random string
   - Regenerate if needed

3. **Build Errors**
   - Check if all dependencies are installed
   - Verify TypeScript compilation
   - Check for missing environment variables

4. **Photo Loading Issues**
   - Verify AWS S3 bucket access
   - Check if photo URLs are accessible
   - Ensure placeholder images exist

### Logs and Debugging

```bash
# Check application logs
pm2 logs campus-rentals

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check system logs
sudo journalctl -u nginx -f
```

## Security Considerations

1. **Environment Variables**
   - Never commit `.env.local` to version control
   - Use strong, unique secrets
   - Rotate secrets regularly

2. **Database Security**
   - Use strong passwords
   - Enable SSL connections
   - Restrict access to necessary IPs only

3. **API Keys**
   - Restrict Google Maps API key to your domain
   - Use least privilege for AWS credentials
   - Monitor API usage

## Maintenance

### Regular Tasks
1. **Database Backups**
   ```bash
   # Create database backup
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   ```

2. **Log Rotation**
   ```bash
   # Rotate PM2 logs
   pm2 flush
   ```

3. **Security Updates**
   ```bash
   # Update dependencies
   npm audit fix
   npm update
   ```

### Monitoring
- Set up monitoring for database connections
- Monitor application performance
- Set up alerts for errors

## Support

If you encounter issues:
1. Check the logs first
2. Verify all environment variables are set
3. Test database connectivity
4. Ensure all dependencies are installed

For additional help, check the main README.md file or contact the development team. 