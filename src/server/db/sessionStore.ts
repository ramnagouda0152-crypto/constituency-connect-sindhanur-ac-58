import crypto from 'crypto';
import { getPostgresPool, isProduction } from './postgresPool.ts';

// Internal dev fallback session store ONLY when not in production and no DATABASE_URL
const devSessions: Map<string, { userId: string; expiresAt: number }> = new Map();

/**
 * Creates and persists a session token.
 * In production / when PostgreSQL is configured, stores token in PostgreSQL sessions table.
 */
export async function createSessionToken(userId: string): Promise<string> {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const token = `SEC_TOK_${Date.now()}_${randomBytes}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const pool = getPostgresPool();
  if (pool) {
    await pool.query(
      `INSERT INTO sessions (token, user_id, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token) DO UPDATE SET expires_at = $3`,
      [token, userId, expiresAt]
    );
    return token;
  }

  if (isProduction) {
    throw new Error('Database connection unavailable. Please try again later.');
  }

  // Development fallback
  devSessions.set(token, { userId, expiresAt: expiresAt.getTime() });
  return token;
}

/**
 * Validates and retrieves an active session.
 */
export async function getSession(token: string): Promise<{ userId: string; expiresAt: number } | null> {
  if (!token) return null;

  const pool = getPostgresPool();
  if (pool) {
    const result = await pool.query(
      `SELECT user_id, expires_at FROM sessions WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return {
      userId: result.rows[0].user_id,
      expiresAt: new Date(result.rows[0].expires_at).getTime()
    };
  }

  if (isProduction) {
    return null;
  }

  // Development fallback
  const session = devSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    devSessions.delete(token);
    return null;
  }
  return session;
}

/**
 * Destroys a session on logout.
 */
export async function destroySessionToken(token: string): Promise<boolean> {
  if (!token) return false;

  const pool = getPostgresPool();
  if (pool) {
    const result = await pool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
    return (result.rowCount ?? 0) > 0;
  }

  if (isProduction) {
    return false;
  }

  return devSessions.delete(token);
}

/**
 * Invalidates all active sessions for a user (on role change, password reset, or account suspension).
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  if (!userId) return;

  const pool = getPostgresPool();
  if (pool) {
    await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
    return;
  }

  if (isProduction) return;

  for (const [token, sess] of devSessions.entries()) {
    if (sess.userId === userId) {
      devSessions.delete(token);
    }
  }
}
