import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Serverless-compatible PostgreSQL Connection Pool.
 * Reuses connections safely across functions/requests.
 * Automatically configures SSL for Supabase, Neon, and Vercel Postgres.
 */
export function getPostgresPool(): pg.Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || !connectionString.trim()) {
    return null;
  }

  if (!pool) {
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      // Log on server only - never expose connection strings to client
      console.error('[PostgreSQL Pool Background Error]:', err.message);
    });
  }

  return pool;
}

/**
 * Internal Database Health Check.
 * Safely verifies that PostgreSQL is reachable without leaking DATABASE_URL or credentials.
 */
export async function checkDatabaseHealth(): Promise<{ ok: boolean; error?: string }> {
  const p = getPostgresPool();
  if (!p) {
    if (isProduction) {
      return { ok: false, error: 'Database connection unavailable. Please try again later.' };
    }
    // In development without DATABASE_URL, local dev DB is healthy
    return { ok: true };
  }

  try {
    const result = await p.query('SELECT 1 as alive');
    if (result && result.rows && result.rows.length > 0) {
      return { ok: true };
    }
    return { ok: false, error: 'Database connection unavailable. Please try again later.' };
  } catch (err) {
    console.error('[PostgreSQL Health Check Failed]:', (err as Error)?.message);
    return { ok: false, error: 'Database connection unavailable. Please try again later.' };
  }
}

/**
 * Executes a callback within a managed PostgreSQL Transaction.
 * Automatically rolls back if any operation fails.
 */
export async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const p = getPostgresPool();
  if (!p) {
    throw new Error('Database connection unavailable. Please try again later.');
  }

  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[PostgreSQL Rollback Error]:', (rollbackErr as Error)?.message);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Initializes the database schema using schema.sql if tables do not exist.
 */
export async function initializeSchema(): Promise<void> {
  const p = getPostgresPool();
  if (!p) return;

  const schemaPath = path.join(process.cwd(), 'src', 'server', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const ddl = fs.readFileSync(schemaPath, 'utf-8');
    await p.query(ddl);
    await p.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT');
    console.log('[PostgreSQL] Production schema initialized successfully.');
  }
}
