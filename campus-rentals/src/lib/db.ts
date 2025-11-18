/**
 * Direct Database Connection Utility
 * Uses pg client directly instead of Prisma
 */

import { Client } from 'pg';

/**
 * Get database connection config from environment variables
 */
function getDbConfig() {
  // Get database credentials from environment variables
  const dbHost = process.env.DB_HOST;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME || 'campus_rentals';
  const dbPort = parseInt(process.env.DB_PORT || '5432');

  // Try to parse from DATABASE_URL if individual vars not set
  let host = dbHost;
  let user = dbUser;
  let password = dbPassword;
  let database = dbName;
  let port = dbPort;

  if (!host || !user || !password) {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl && !databaseUrl.includes('prisma+postgres://')) {
      try {
        const url = new URL(databaseUrl);
        host = url.hostname;
        user = url.username;
        password = url.password;
        database = url.pathname.slice(1) || 'campus_rentals';
        port = parseInt(url.port) || 5432;
      } catch (error) {
        console.error('Failed to parse DATABASE_URL:', error);
      }
    }
  }

  if (!host || !user || !password) {
    throw new Error('Database credentials not found. Set DB_HOST, DB_USER, DB_PASSWORD or DATABASE_URL');
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

