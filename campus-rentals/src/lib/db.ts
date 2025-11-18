/**
 * Direct Database Connection Utility
 * Uses pg client directly instead of Prisma
 */

import { Client } from 'pg';

/**
 * Get database connection config from environment variables
 */
function getDbConfig() {
  // Priority 1: Individual DB_* environment variables
  let host = process.env.DB_HOST || process.env.DATABASE_URL_DIRECT_HOST;
  let user = process.env.DB_USER || process.env.DATABASE_URL_DIRECT_USER;
  let password = process.env.DB_PASSWORD || process.env.DATABASE_URL_DIRECT_PASSWORD;
  let database = process.env.DB_NAME || process.env.DATABASE_URL_DIRECT_DB || 'campus_rentals';
  let port = parseInt(process.env.DB_PORT || process.env.DATABASE_URL_DIRECT_PORT || '5432');

  // Priority 2: Parse DATABASE_URL if it's a direct connection (not Prisma Accelerate)
  if ((!host || !user || !password) && process.env.DATABASE_URL) {
    const databaseUrl = process.env.DATABASE_URL;
    
    // Skip Prisma Accelerate URLs - they can't be used for direct connections
    if (!databaseUrl.includes('prisma+postgres://') && !databaseUrl.includes('accelerate.prisma-data.net')) {
      try {
        const url = new URL(databaseUrl);
        if (!host) host = url.hostname;
        if (!user) user = url.username;
        if (!password) password = url.password;
        if (!database || database === 'campus_rentals') {
          database = url.pathname.slice(1) || 'campus_rentals';
        }
        if (!port || port === 5432) {
          port = parseInt(url.port) || 5432;
        }
      } catch (error) {
        console.error('Failed to parse DATABASE_URL:', error);
      }
    }
  }

  if (!host || !user || !password) {
    const errorMsg = 'Database credentials not found. ' +
      'Set DB_HOST, DB_USER, DB_PASSWORD (or DATABASE_URL_DIRECT_*) environment variables. ' +
      'Note: DATABASE_URL pointing to Prisma Accelerate cannot be used for direct connections.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return { host, port, database, user, password };
}

/**
 * Execute a query and return results
 * Creates a new connection for each query (connection pooling handled by pg)
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const config = getDbConfig();
  const client = new Client({
    ...config,
    ssl: { rejectUnauthorized: false }, // SSL required for Lightsail
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

