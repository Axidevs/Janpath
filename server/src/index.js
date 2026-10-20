/**
 * server/src/index.js
 *
 * Server bootstrap for JanPath.
 * Connects to MongoDB Atlas if MONGODB_URI is provided, otherwise falls back
 * to memoryStore. Listens on configured port.
 */

import mongoose from 'mongoose';
import { createApp } from './app.js';
import { config, getSafeConfigSummary } from './config.js';
import { memoryStore } from './store/memoryStore.js';
import { mongoStore } from './store/mongoStore.js';
import { auditLimiter } from './lib/limiter.js';

async function bootstrap() {
  let store = memoryStore;

  if (config.mongoUri) {
    try {
      await mongoose.connect(config.mongoUri);
      store = mongoStore;
      console.log('[JanPath] Connected to MongoDB Atlas');
    } catch (err) {
      console.warn(
        '[JanPath] Warning: MongoDB connection failed, falling back to memoryStore.',
        err.message
      );
    }
  } else {
    console.log('[JanPath] No MONGODB_URI provided; using in-memory store');
  }

  const app = createApp({
    store,
    limiter: auditLimiter,
    config
  });

  const server = app.listen(config.port, () => {
    console.log(`[JanPath] Backend listening on port ${config.port}`);
    console.log('[JanPath] Safe Config Summary:', getSafeConfigSummary());
  });

  return { app, server, store };
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('[JanPath] Fatal bootstrap error:', err);
    process.exit(1);
  });
}
