# Fix Migration - DNS Resolution Issue

The hostname isn't resolving. Let's use the DATABASE_URL environment variable instead.

## Solution: Use DATABASE_URL

Run these commands one at a time:

### 1. Check if DATABASE_URL is set
```bash
echo $DATABASE_URL
```

### 2. If DATABASE_URL is set, use it:
```bash
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
git pull
psql "$DATABASE_URL" -f scripts/phase2-termsheet-student-housing-migration.sql
```

### 3. If DATABASE_URL is NOT set, set it first:
```bash
export DATABASE_URL="postgresql://dbmasteruser:~D=Otib<.[+WsS=O9(OMM^9V{NX~49%v@ls-96cf74c298a48ae39bf159a9fe40a2605d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com:5432/campus_rentals?sslmode=require"
```

Then run:
```bash
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
git pull
psql "$DATABASE_URL" -f scripts/phase2-termsheet-student-housing-migration.sql
```

### 4. Alternative: Check .env file
The DATABASE_URL might be in the .env file:

```bash
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
cat .env | grep DATABASE_URL
```

If it's there, source it:
```bash
source .env
psql "$DATABASE_URL" -f scripts/phase2-termsheet-student-housing-migration.sql
```

### 5. Or use the Node.js script (handles DATABASE_URL automatically):
```bash
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
git pull
npm run migrate:phase2:server
```

## If Hostname Still Doesn't Resolve

The hostname might need to be different. Check your Lightsail database endpoint in the AWS console - it might be slightly different.

Or try using the IP address if available, or check if there's a different endpoint format.

