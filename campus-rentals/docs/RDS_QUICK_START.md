# AWS RDS Quick Start Guide

Quick reference for setting up AWS RDS PostgreSQL for Campus Rentals.

## Prerequisites

- AWS Account
- Access to AWS Console or AWS CLI
- Your Lightsail server IP address

## Quick Setup (5 Steps)

### 1. Create RDS Instance

**AWS Console → RDS → Create Database**

- Engine: PostgreSQL 15.x
- Template: Production
- DB instance: `campus-rentals-db`
- Master username: `postgres`
- Master password: **[Generate strong password]**
- Instance class: `db.t3.small`
- Storage: 20 GB gp3
- **Public access: YES** (or configure VPC)
- Initial database name: `campus_rentals`

### 2. Configure Security Group

**EC2 → Security Groups → [Your RDS Security Group]**

Add inbound rule:
- Type: PostgreSQL
- Port: 5432
- Source: Your Lightsail IP (or VPC CIDR)

### 3. Get Connection String

From RDS Console → Your DB → Connectivity:

```
Endpoint: campus-rentals-db.xxxxx.us-east-1.rds.amazonaws.com
Port: 5432
Database: campus_rentals
Username: postgres
```

### 4. Update Environment

**Local `.env.local`:**
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@campus-rentals-db.xxxxx.us-east-1.rds.amazonaws.com:5432/campus_rentals?schema=public&sslmode=require"
PRISMA_GENERATE_DATAPROXY=false
```

**Production `.env` (on server):**
```bash
ssh bitnami@YOUR_SERVER
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
nano .env
# Update DATABASE_URL same as above
```

### 5. Run Migration

**Local:**
```bash
npx prisma migrate deploy
npx prisma generate
```

**Production:**
```bash
npx prisma migrate deploy
npx prisma generate
pm2 restart campus-rentals
```

## Connection String Format

```
postgresql://[username]:[password]@[endpoint]:[port]/[database]?schema=public&sslmode=require&connection_limit=20
```

## Cost Estimate

- **db.t3.small**: ~$15-20/month
- **Storage (20GB)**: ~$2/month
- **Backups**: ~$1-2/month
- **Total**: ~$18-24/month

## Testing Connection

```bash
# Install PostgreSQL client
sudo apt-get install postgresql-client

# Test connection
psql -h YOUR_RDS_ENDPOINT -U postgres -d campus_rentals
```

## Troubleshooting

**Connection timeout?**
- Check security group allows your IP
- Verify public access is enabled

**SSL errors?**
- Ensure `sslmode=require` in connection string

**Too many connections?**
- Add `&connection_limit=20` to DATABASE_URL
- Consider upgrading instance class

## Full Documentation

See [AWS_RDS_MIGRATION.md](./AWS_RDS_MIGRATION.md) for detailed guide.

