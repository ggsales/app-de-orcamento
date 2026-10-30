import express from 'express';

import { authRouter } from './auth/routes.js';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', authRouter);

  return app;
}