# AWS RDS PostgreSQL Migration Guide

This guide will help you migrate from Prisma Accelerate to AWS RDS PostgreSQL.

## Overview

**Current Setup**: Prisma Accelerate (connection pooling proxy)  
**Target Setup**: AWS RDS PostgreSQL (direct connection)

## Benefits of AWS RDS

- ✅ Full control over your database
- ✅ Better cost control (pay only for what you use)
- ✅ Automatic backups and point-in-time recovery
- ✅ Multi-AZ for high availability
- ✅ Easy scaling
- ✅ Better performance monitoring
- ✅ VPC security integration

## Step 1: Create AWS RDS PostgreSQL Instance

### Via AWS Console

1. **Navigate to RDS Console**
   - Go to AWS Console → RDS → Databases
   - Click "Create database"

2. **Database Configuration**
   - **Engine**: PostgreSQL
   - **Version**: 15.x or 16.x (recommended)
   - **Template**: Production (for production) or Dev/Test (for development)

3. **Settings**
   - **DB instance identifier**: `campus-rentals-db`
   - **Master username**: `postgres` (or your preferred username)
   - **Master password**: Generate a strong password (save it securely!)

4. **Instance Configuration**
   - **DB instance class**: 
     - Development: `db.t3.micro` (free tier eligible)
     - Production: `db.t3.small` or `db.t3.medium` (start small, scale up)
   - **Storage**: 
     - Type: General Purpose SSD (gp3)
     - Allocated storage: 20 GB (minimum, can auto-scale)

5. **Connectivity**
   - **VPC**: Use your existing VPC (or default)
   - **Subnet group**: Default or create new
   - **Public access**: 
     - **YES** (if your Lightsail server needs external access)
     - **NO** (if using VPC peering - more secure)
   - **VPC security group**: Create new or use existing
   - **Availability Zone**: Same region as your Lightsail instance (us-east-1 recommended)

6. **Database Authentication**
   - **Password authentication**: Selected

7. **Additional Configuration**
   - **Initial database name**: `campus_rentals`
   - **Backup retention**: 7 days (production) or 1 day (dev)
   - **Enable encryption**: Yes (recommended)
   - **Enable Enhanced monitoring**: Optional (adds cost)

8. **Click "Create database"**
   - Wait 5-10 minutes for instance to be created

### Via AWS CLI (Alternative)

```bash
aws rds create-db-instance \
  --db-instance-identifier campus-rentals-db \
  --db-instance-class db.t3.small \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name default \
  --publicly-accessible \
  --backup-retention-period 7 \
  --storage-encrypted
```

## Step 2: Configure Security Group

1. **Find your RDS Security Group**
   - Go to RDS → Databases → Your instance → Connectivity & security
   - Note the Security Group ID

2. **Edit Inbound Rules**
   - Go to EC2 → Security Groups → Your RDS security group
   - Add inbound rule:
     - **Type**: PostgreSQL
     - **Port**: 5432
     - **Source**: 
       - Your Lightsail instance IP (for public access)
       - OR Your VPC CIDR (for VPC-only access)
     - **Description**: "Allow from Lightsail server"

## Step 3: Get Connection Details

From RDS Console → Your database → Connectivity & security:

- **Endpoint**: `campus-rentals-db.xxxxxxxxx.us-east-1.rds.amazonaws.com`
- **Port**: `5432`
- **Database name**: `campus_rentals`
- **Username**: `postgres` (or what you set)
- **Password**: (the one you created)

## Step 4: Test Connection

From your Lightsail server:

```bash
# Install PostgreSQL client if needed
sudo apt-get update
sudo apt-get install postgresql-client

# Test connection
psql -h campus-rentals-db.xxxxxxxxx.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d campus_rentals \
     -p 5432
```

## Step 5: Update Environment Variables

### On Your Local Machine

Update `.env.local`:

```env
# OLD (Prisma Accelerate)
# DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."

# NEW (AWS RDS Direct Connection)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@campus-rentals-db.xxxxxxxxx.us-east-1.rds.amazonaws.com:5432/campus_rentals?schema=public&sslmode=require"

# Remove Prisma Accelerate config
# PRISMA_GENERATE_DATAPROXY=true  # Remove or set to false
```

### Connection String Format

```
postgresql://[username]:[password]@[endpoint]:[port]/[database]?schema=public&sslmode=require
```

**Parameters:**
- `schema=public`: Default schema
- `sslmode=require`: Require SSL (recommended for RDS)
- `connection_limit=20`: Optional, limit connections
- `pool_timeout=10`: Optional, connection timeout

## Step 6: Migrate Data

### Option A: Using Prisma Migrate (Recommended)

1. **Backup current database** (if possible):
   ```bash
   # If you have access to the underlying database
   pg_dump -h OLD_HOST -U OLD_USER -d OLD_DB > backup.sql
   ```

2. **Update DATABASE_URL** to point to new RDS instance

3. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   # OR if starting fresh:
   npx prisma db push
   ```

4. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

### Option B: Using pg_dump/pg_restore

If you have access to export from Prisma Accelerate:

```bash
# Export from old database
pg_dump -h OLD_HOST -U OLD_USER -d OLD_DB -F c -f backup.dump

# Import to new RDS
pg_restore -h NEW_RDS_ENDPOINT -U postgres -d campus_rentals backup.dump
```

### Option C: Using Prisma Studio (Manual Export/Import)

1. **Export data** from Prisma Accelerate using Prisma Studio
2. **Import data** to RDS using Prisma Studio

## Step 7: Update Production Server

1. **SSH into your Lightsail server**

2. **Update `.env` file**:
   ```bash
   cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
   nano .env
   ```

3. **Update DATABASE_URL**:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@campus-rentals-db.xxxxxxxxx.us-east-1.rds.amazonaws.com:5432/campus_rentals?schema=public&sslmode=require"
   ```

4. **Remove or set**:
   ```env
   PRISMA_GENERATE_DATAPROXY=false
   ```

5. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

6. **Restart application**:
   ```bash
   pm2 restart campus-rentals
   ```

## Step 8: Verify Migration

1. **Test application**:
   - Login to investor portal
   - Check if data loads correctly
   - Test creating/updating records

2. **Monitor RDS**:
   - Check CloudWatch metrics
   - Monitor connection count
   - Check for errors

3. **Check logs**:
   ```bash
   pm2 logs campus-rentals
   ```

## Step 9: Update Connection Pooling (Optional)

For better performance, consider using PgBouncer or connection pooling:

### Using Prisma Connection Pooling

Update DATABASE_URL with connection pooling parameters:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@ENDPOINT:5432/campus_rentals?schema=public&sslmode=require&connection_limit=20&pool_timeout=10"
```

### Using PgBouncer (Advanced)

Set up PgBouncer on your Lightsail instance for connection pooling.

## Cost Estimation

**AWS RDS PostgreSQL (db.t3.small, us-east-1)**:
- Instance: ~$15-20/month
- Storage (20GB gp3): ~$2/month
- Backup storage: ~$1-2/month
- **Total**: ~$18-24/month

**vs Prisma Accelerate**: Check your current pricing

## Security Best Practices

1. ✅ **Enable encryption at rest** (done during creation)
2. ✅ **Use SSL connections** (`sslmode=require`)
3. ✅ **Restrict security group** to only your Lightsail IP
4. ✅ **Use strong passwords** (rotate regularly)
5. ✅ **Enable automated backups**
6. ✅ **Enable CloudWatch monitoring**
7. ✅ **Consider VPC-only access** (disable public access if possible)

## Troubleshooting

### Connection Timeout
- Check security group rules
- Verify public access is enabled (if needed)
- Check VPC routing

### SSL Errors
- Ensure `sslmode=require` in connection string
- RDS uses AWS-managed certificates (no client cert needed)

### Too Many Connections
- Reduce `connection_limit` in DATABASE_URL
- Consider connection pooling (PgBouncer)
- Upgrade instance class

### Performance Issues
- Enable Performance Insights in RDS
- Check CloudWatch metrics
- Consider upgrading instance class
- Add read replicas for read-heavy workloads

## Rollback Plan

If migration fails:

1. Revert DATABASE_URL to Prisma Accelerate
2. Restart application
3. Investigate issues
4. Retry migration

## Next Steps

- [ ] Set up automated backups
- [ ] Configure CloudWatch alarms
- [ ] Set up read replicas (if needed)
- [ ] Document backup/restore procedures
- [ ] Set up monitoring dashboards

## Support

For issues:
1. Check AWS RDS documentation
2. Review Prisma documentation
3. Check application logs
4. Monitor CloudWatch metrics

