# Database Endpoint DNS Resolution Issue

The database hostname isn't resolving via DNS. Here are solutions:

## Solution 1: Find Correct Endpoint in AWS Console

1. Go to AWS Lightsail Console
2. Navigate to Databases
3. Click on your database
4. Check the "Connectivity & security" tab
5. Look for the **endpoint** - it might be different from what we're using

## Solution 2: Use Private IP (If in Same VPC)

If your server and database are in the same VPC, you can use the private IP:

```bash
# Find the private IP in AWS Lightsail console
# Then set:
export DATABASE_URL_DIRECT="postgresql://dbmasteruser:~D=Otib<.[+WsS=O9(OMM^9V{NX~49%v@PRIVATE_IP:5432/campus_rentals?sslmode=require"
```

## Solution 3: Use Prisma Connection

Since your app works with Prisma, we can try using Prisma's connection directly. But Prisma Accelerate might be blocking direct connections.

## Solution 4: Check Actual Working Connection

Your app is working, which means Prisma Accelerate can connect. The issue is we need the **direct** endpoint, not the Accelerate proxy.

Check your AWS Lightsail database settings for:
- **Primary endpoint** (this is what we need)
- **Reader endpoint** (read-only)
- **Private endpoint** (if in VPC)

## Quick Fix: Set DATABASE_URL_DIRECT

Once you have the correct endpoint from AWS console:

```bash
export DATABASE_URL_DIRECT="postgresql://dbmasteruser:~D=Otib<.[+WsS=O9(OMM^9V{NX~49%v@CORRECT_ENDPOINT:5432/campus_rentals?sslmode=require"
npm run migrate:phase2:server
```

## Alternative: Run SQL Directly via psql with IP

If you can get the IP address:

```bash
psql -h IP_ADDRESS -U dbmasteruser -d campus_rentals -f scripts/phase2-termsheet-student-housing-migration.sql
```

(It will prompt for password: `~D=Otib<.[+WsS=O9(OMM^9V{NX~49%v`)

