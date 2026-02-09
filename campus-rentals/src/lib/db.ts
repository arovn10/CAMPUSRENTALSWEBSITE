/**
 * Direct Database Connection Utility
 * Uses pg client directly instead of Prisma
 */

import { Client } from 'pg';

/**
 * Parse a Postgres URL into connection config (host, user, password, database, port).
 * Handles postgres:// and postgresql://.
 */
function parsePostgresUrl(urlStr: string): { host: string; user: string; password: string; database: string; port: number } | null {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') return null;
    const database = url.pathname.slice(1).replace(/\/$/, '') || 'postgres';
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
    };
  } catch {
    return null;
  }
}

/**
 * Get database connection config from environment variables
 */
function getDbConfig() {
  // Priority 1: Direct Postgres URL (for apps using Prisma Accelerate + direct URL for server queries)
  const directUrl =
    process.env.DATABASE_URL_DIRECT ||
    process.env.DIRECT_DATABASE_URL ||
    process.env.DIRECT_URL;
  if (directUrl && (directUrl.startsWith('postgres://') || directUrl.startsWith('postgresql://'))) {
    const parsed = parsePostgresUrl(directUrl);
    if (parsed) {
      return {
        ...parsed,
        database: parsed.database || 'campus_rentals',
      };
    }
  }

  // Priority 2: Individual DB_* / DATABASE_URL_DIRECT_* environment variables
  let host = process.env.DB_HOST || process.env.DATABASE_URL_DIRECT_HOST;
  let user = process.env.DB_USER || process.env.DATABASE_URL_DIRECT_USER;
  let password = process.env.DB_PASSWORD || process.env.DATABASE_URL_DIRECT_PASSWORD;
  let database = process.env.DB_NAME || process.env.DATABASE_URL_DIRECT_DB || 'campus_rentals';
  let port = parseInt(process.env.DB_PORT || process.env.DATABASE_URL_DIRECT_PORT || '5432');

  // Priority 3: Parse DATABASE_URL if it's a direct connection (not Prisma Accelerate)
  if ((!host || !user || !password) && process.env.DATABASE_URL) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl.includes('prisma+postgres://') && !databaseUrl.includes('accelerate.prisma-data.net')) {
      const parsed = parsePostgresUrl(databaseUrl);
      if (parsed) {
        host = parsed.host;
        user = parsed.user;
        password = parsed.password;
        database = parsed.database || database;
        port = parsed.port;
      }
    }
  }

  if (!host || !user || !password) {
    const errorMsg =
      'Database credentials not found. Set DIRECT_DATABASE_URL (or DATABASE_URL_DIRECT), or DB_HOST/DB_USER/DB_PASSWORD. ' +
      'DATABASE_URL with Prisma Accelerate cannot be used for direct connections.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return { host, port, database, user, password };
}

/**
 * Execute a query and return results
 * Creates a new connection for each query (connection pooling handled by pg)
 */
/** Whether the configured DB URL requires SSL (e.g. db.prisma.io) */
function getDbSsl(): boolean {
  const url =
    process.env.DATABASE_URL_DIRECT ||
    process.env.DIRECT_DATABASE_URL ||
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL ||
    '';
  return url.includes('sslmode=require') || url.includes('db.prisma.io');
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const config = getDbConfig();
  const useSsl = getDbSsl();
  const client = new Client({
    ...config,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 30000,
  });

  try {
    await client.connect();
    const result = await client.query(text, params);
    return result.rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Execute a query and return a single row
 */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

