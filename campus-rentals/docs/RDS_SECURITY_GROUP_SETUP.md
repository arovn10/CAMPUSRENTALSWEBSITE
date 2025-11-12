# RDS Security Group Setup

## Issue: Connection Failed

The RDS connection is failing because the security group needs to allow connections from your Lightsail server.

## Fix: Configure RDS Security Group

### Step 1: Find Your Lightsail Server IP

Your Lightsail server IP: **23.21.76.187**

### Step 2: Update RDS Security Group

1. **Go to AWS Console → RDS**
2. **Click on your database**: `campus-rentals-db` (or whatever you named it)
3. **Click on "Connectivity & security" tab**
4. **Click on the Security Group** (under "VPC security groups")
5. **Click "Edit inbound rules"**
6. **Click "Add rule"**
7. **Configure the rule:**
   - **Type**: PostgreSQL
   - **Protocol**: TCP
   - **Port**: 5432
   - **Source**: 
     - Option 1: **Custom** → Enter IP: `23.21.76.187/32`
     - Option 2: **My IP** (if accessing from your computer for testing)
   - **Description**: "Allow from Lightsail server"
8. **Click "Save rules"**

### Step 3: Verify Connection

After updating the security group, wait 1-2 minutes for changes to propagate, then test:

```bash
ssh bitnami@23.21.76.187
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
psql -h ls-96cf74c298a48ae39bf159a9fe40a260e5d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com -U dbmasteruser -d campus_rentals
```

### Alternative: Allow All Traffic (NOT RECOMMENDED for Production)

If you need to test quickly (not recommended for production):

- **Source**: `0.0.0.0/0` (allows from anywhere)
- **Warning**: This is less secure, only use for testing

### Step 4: Re-run Migration Script

Once security group is configured:

```bash
ssh bitnami@23.21.76.187
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
bash scripts/simple-rds-switch.sh
```

## Troubleshooting

### Still Can't Connect?

1. **Check RDS is publicly accessible:**
   - RDS Console → Your DB → Connectivity & security
   - "Publicly accessible" should be **Yes**

2. **Check VPC routing:**
   - Ensure RDS is in a VPC that allows public access
   - Check route tables

3. **Check network ACLs:**
   - VPC → Network ACLs
   - Ensure inbound/outbound rules allow PostgreSQL traffic

4. **Test from your local machine:**
   ```bash
   psql -h ls-96cf74c298a48ae39bf159a9fe40a260e5d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com -U dbmasteruser -d campus_rentals
   ```

### Connection Timeout?

- Security group might not be updated yet (wait 1-2 minutes)
- RDS might not be publicly accessible
- Check if RDS is in the same region as Lightsail (us-east-1 recommended)

## Security Best Practices

✅ **Recommended Setup:**
- Allow only your Lightsail IP: `23.21.76.187/32`
- Use SSL connections (`sslmode=require`)
- Enable encryption at rest
- Regular security updates

❌ **Avoid:**
- Allowing `0.0.0.0/0` (allows from anywhere)
- Disabling SSL
- Using weak passwords

