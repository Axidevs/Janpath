/**
 * server/src/index.js
 *
 * Server bootstrap for JanPath.
 * Connects to MongoDB Atlas if MONGODB_URI is provided, otherwise falls back
 * to memoryStore. Instantiates TinyFish clients and audit orchestration worker.
 * Listens on configured port.
 */

import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';

import { createApp } from './app.js';
import { config, getSafeConfigSummary } from './config.js';
import { memoryStore } from './store/memoryStore.js';
import { mongoStore } from './store/mongoStore.js';
import { auditLimiter } from './lib/limiter.js';
import { createAgentClient } from './tinyfish/agentClient.js';
import { createFetchClient } from './tinyfish/fetchClient.js';
import { createRunAuditService } from './services/runAudit.js';

export async function bootstrap(overrides = {}) {
  let store = overrides.store || memoryStore;
  const appConfig = overrides.config || config;
  const limiter = overrides.limiter || auditLimiter;

  if (!overrides.store && appConfig.mongoUri) {
    try {
      await mongoose.connect(appConfig.mongoUri);
      store = mongoStore;
      console.log('[JanPath] Connected to MongoDB Atlas');
    } catch (err) {
      console.warn(
        '[JanPath] Warning: MongoDB connection failed, falling back to memoryStore.',
        err.message
      );
    }
  } else if (!overrides.store) {
    console.log('[JanPath] No MONGODB_URI provided; using in-memory store');
  }

  // Initialize TinyFish clients & orchestration worker
  const agentClient =
    overrides.agentClient ||
    createAgentClient({ apiKey: appConfig.tinyfishApiKey });

  const fetchClient =
    overrides.fetchClient ||
    createFetchClient({ apiKey: appConfig.tinyfishApiKey });

  const runAuditService =
    overrides.runAuditService ||
    createRunAuditService({
      store,
      limiter,
      agentClient,
      fetchClient,
      config: appConfig
    });

  const runAuditTask = (auditId) => runAuditService.execute(auditId);

  const app = createApp({
    store,
    limiter,
    config: appConfig,
    runAuditTask
  });

  let server;
  const port = typeof appConfig.port === 'number' ? appConfig.port : 3001;
  await new Promise((resolve) => {
    server = app.listen(port, () => {
      const activePort = server.address()?.port || port;
      console.log(`[JanPath] Backend listening on port ${activePort}`);
      console.log('[JanPath] Safe Config Summary:', getSafeConfigSummary());
      resolve();
    });
  });

  return { app, server, store, limiter, runAuditService };
}

// Start standalone server ONLY when executed directly from CLI
const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('[JanPath] Fatal bootstrap error:', err);
    process.exit(1);
  });
}
