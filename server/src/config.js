/**
 * server/src/config.js
 *
 * Environment configuration for JanPath.
 *
 * SECURITY NON-NEGOTIABLE:
 * Never print, log, or export secrets.
 * Secrets are loaded from server/.env and accessed strictly via process.env.
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env if present
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = Object.freeze({
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  tinyfishApiKey: process.env.TINYFISH_API_KEY || '',
  fixtureHost: process.env.FIXTURE_HOST || '',
  fixtureAdminToken: process.env.FIXTURE_ADMIN_TOKEN || '',
  maxConcurrentAudits: 2
});

/**
 * Returns a safe, non-sensitive summary of the config.
 * Never prints raw keys or connection strings.
 */
export function getSafeConfigSummary() {
  return {
    port: config.port,
    nodeEnv: config.nodeEnv,
    hasMongoUri: Boolean(config.mongoUri),
    hasTinyfishKey: Boolean(config.tinyfishApiKey),
    fixtureHost: config.fixtureHost || '(not set)',
    hasFixtureToken: Boolean(config.fixtureAdminToken),
    maxConcurrentAudits: config.maxConcurrentAudits
  };
}
