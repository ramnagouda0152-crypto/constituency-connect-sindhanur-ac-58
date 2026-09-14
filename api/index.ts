async function ensureDatabaseInitialized() {
  const pool = getPostgresPool();

  if (!pool) return;

  if (!migrationPromise) {
    migrationPromise = (async () => {
      // Ensure all required production columns exist.
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS profile_photo TEXT
      `);

      console.log('[Vercel] Verified users.profile_photo column.');

      return {
        migrated: true,
        message: 'Production database schema verified.'
      };
    })().catch((err) => {
      migrationPromise = null;
      console.error('[Vercel] Database initialization failed:', err);
      throw err;
    });
  }

  return migrationPromise;
}