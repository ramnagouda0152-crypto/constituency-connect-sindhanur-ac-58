import app from '../src/server/app.ts';
import { getPostgresPool } from '../src/server/db/postgresPool.ts';
import { migrateDataToPostgres } from '../src/server/db/migrate.ts';

let migrationPromise: Promise<any> | null = null;

async function ensureDatabaseInitialized() {
  const pool = getPostgresPool();

  if (!pool) return;

  if (!migrationPromise) {
    migrationPromise = (async () => {
      const result = await pool.query('SELECT COUNT(*)::int AS count FROM villages');

      if (result.rows[0].count < 100) {
        console.log('[Vercel] Database has fewer than 100 villages. Running migration...');
        return migrateDataToPostgres();
      }

      return { migrated: false, message: `Database already contains ${result.rows[0].count} villages.` };
    })().catch((err) => {
      migrationPromise = null;
      console.error('[Vercel] Database initialization failed:', err);
      throw err;
    });
  }

  return migrationPromise;
}

export default async function handler(req: any, res: any) {
  try {
    await ensureDatabaseInitialized();

    const matchedPath = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];

    if (matchedPath && typeof matchedPath === 'string' && matchedPath.startsWith('/api')) {
      req.url = matchedPath;
    } else if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }

    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Handler Error]:', err);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        details: err?.message || 'Server initialization error'
      });
    }
  }
}
