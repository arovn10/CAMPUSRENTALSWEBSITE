# Database migrations (`npm run db:migrate`)

Runs all SQL files in `prisma/migrations/` in order. Safe to re-run (idempotent); preserves existing data.

## Direct Postgres URL required

Migrations need a **direct** Postgres connection. If your app uses **Prisma Accelerate** (`prisma+postgres://` or `accelerate.prisma-data.net`), that URL cannot run raw SQL.

### Option 1: Set in `.env`

Add a direct URL (from RDS, Neon, Supabase, or your Postgres host). Either name works:

```env
DATABASE_URL_DIRECT="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
# or
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

Then run:

```bash
npm run db:migrate
```

### Option 2: Pass URL when running

```bash
DATABASE_URL_DIRECT='postgresql://USER:PASSWORD@HOST:5432/DATABASE' npm run db:migrate
```

Or with the script argument:

```bash
npm run db:migrate -- 'postgresql://USER:PASSWORD@HOST:5432/DATABASE'
```

### Option 3: Use DB_* variables

```env
DB_HOST=your-db-host
DB_USER=your-user
DB_PASSWORD=your-password
DB_NAME=campus_rentals
DB_PORT=5432
```

After migrations complete, the script runs `npx prisma generate` to refresh the Prisma client.
