/**
 * server/src/app.js
 *
 * Express application factory for JanPath.
 * Configures middleware, API routes, and standard error handling.
 */

import express from 'express';
import { createAuditRouter } from './routes/auditRoutes.js';
import { memoryStore } from './store/memoryStore.js';
import { auditLimiter } from './lib/limiter.js';
import { config as defaultConfig } from './config.js';

export function createApp(options = {}) {
  const app = express();
  const store = options.store || memoryStore;
  const limiter = options.limiter || auditLimiter;
  const appConfig = options.config || defaultConfig;
  const runAuditTask = options.runAuditTask;

  // JSON parsing middleware
  app.use(express.json());

  // Basic CORS headers for frontend integration
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'janpath-backend',
      timestamp: new Date().toISOString()
    });
  });

  // Mount audit API router
  app.use(
    '/api',
    createAuditRouter({
      store,
      limiter,
      config: appConfig,
      runAuditTask
    })
  );

  // 404 Handler for undefined routes
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.path} not found`
      }
    });
  });

  // Global Error Handler
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    const message = err.message || 'An unexpected error occurred';

    res.status(status).json({
      error: { code, message }
    });
  });

  return app;
}
