import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/api';
import { handleGoogleCallback } from './server/googleAuth';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check route (Stage 0 requirement)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'Wholesale Shop Management & Register API',
      timestamp: new Date().toISOString(),
    });
  });

  // Top-level Google OAuth callback routes
  app.get('/auth/callback', handleGoogleCallback);
  app.get('/auth/callback/', handleGoogleCallback);

  // Mount API Router
  app.use('/api', apiRouter);

  // Vite middleware for development or static file serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wholesale Shop Backend & UI running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
