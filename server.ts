import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import {createServer as createViteServer} from 'vite';
import {createApiRouter} from './server/routes.ts';

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const missing: string[] = [];
    if (!process.env.SESSION_SECRET?.trim()) missing.push('SESSION_SECRET');
    if (!process.env.ADMIN_PASSCODE?.trim()) missing.push('ADMIN_PASSCODE');
    if (missing.length > 0) {
      throw new Error(
        `Missing required production environment variable(s): ${missing.join(', ')}`,
      );
    }
  }

  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);
  app.use(express.json({limit: '8mb'}));

  app.use('/api', createApiRouter());

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EcoQuest server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start EcoQuest server:', err);
  process.exit(1);
});
