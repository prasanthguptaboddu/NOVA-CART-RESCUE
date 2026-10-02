import express from 'express';
import path from 'path';
import { apiRouter } from './server/api.ts';
import { initializeDatabase } from './server/db.ts';

async function startServer() {
  await initializeDatabase();
  const app = express();
  app.use(express.json());

  // Mount API Router
  app.use('/api', apiRouter);

  // Serve static files in production
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`NOVA CART Reliance Engine production server listening on port ${port}`);
  });
}

if (process.argv[1]?.endsWith('server.ts')) {
  startServer().catch((err) => {
    console.error('Server startup error:', err);
    process.exit(1);
  });
}

export { startServer };
