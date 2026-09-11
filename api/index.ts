import app from '../src/server/app.ts';

export default function handler(req: any, res: any) {
  const path = req.url || '';

  if (path.includes('/debug-db')) {
    const url = process.env.DATABASE_URL || '';

    try {
      const u = new URL(url);

      return res.status(200).json({
        exists: true,
        protocol: u.protocol,
        hostname: u.hostname,
        database: u.pathname,
        hasUsername: !!u.username,
        hasPassword: !!u.password,
        passwordLength: u.password.length
      });
    } catch (err: any) {
      return res.status(200).json({
        exists: !!url,
        invalidFormat: true,
        valueLength: url.length
      });
    }
  }

  try {
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
        details: err?.message || 'Server error occurred'
      });
    }
  }
}
