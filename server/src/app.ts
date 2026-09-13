import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { FRONTEND_DIST_DIR } from './config.js';
import { queryOne } from './db.js';
import { errorHandler, notFoundHandler } from './lib/http.js';
import { libraryRouter } from './routes/library.js';
import { neteaseRouter } from './routes/netease.js';
import { playlistsRouter } from './routes/playlists.js';
import { tracksRouter } from './routes/tracks.js';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    const trackCount = queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM tracks')?.n ?? 0;
    res.json({ ok: true, service: 'music-player-server', trackCount, time: new Date().toISOString() });
  });

  app.use('/api/tracks', tracksRouter);
  app.use('/api/playlists', playlistsRouter);
  app.use('/api/netease', neteaseRouter);
  app.use('/api/library', libraryRouter);

  // In production, serve the built frontend from the same origin.
  if (fs.existsSync(FRONTEND_DIST_DIR)) {
    app.use(express.static(FRONTEND_DIST_DIR));
    // SPA fallback: Express 5 does not accept '*' wildcard routes.
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(FRONTEND_DIST_DIR, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
