/**
 * fixture/server.js
 *
 * Micro Express server hosting the JanPath Scholarship Test Fixture.
 * Serves server-rendered static HTML with zero client-side JavaScript.
 *
 * Supports live toggling between "defective" and "clean" variants via
 * POST /admin/toggle, secured with FIXTURE_ADMIN_TOKEN.
 */

import express from 'express';
import {
  renderHomePage,
  renderGuidelinesPage,
  renderDocumentsPage,
  renderFaqPage,
  renderHostelPage,
  renderSpecialIncentivePage,
  renderApplyPage
} from './content.js';

export function createFixtureApp(initialVariant = 'defective') {
  const app = express();
  let currentVariant = initialVariant;

  app.use(express.json());

  // Variant inspection endpoint
  app.get('/admin/status', (req, res) => {
    res.json({ activeVariant: currentVariant });
  });

  // Toggle endpoint protected by FIXTURE_ADMIN_TOKEN
  app.post('/admin/toggle', (req, res) => {
    const expectedToken = process.env.FIXTURE_ADMIN_TOKEN || 'janpath-admin-secret';
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.replace(/^Bearer\s+/i, '') ||
      req.headers['x-admin-token'] ||
      req.query.token;

    if (!token || token !== expectedToken) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing FIXTURE_ADMIN_TOKEN'
        }
      });
    }

    if (req.body?.variant && (req.body.variant === 'defective' || req.body.variant === 'clean')) {
      currentVariant = req.body.variant;
    } else {
      currentVariant = currentVariant === 'defective' ? 'clean' : 'defective';
    }

    return res.status(200).json({ activeVariant: currentVariant });
  });

  // Website Pages
  app.get('/', (req, res) => {
    res.type('html').send(renderHomePage(currentVariant));
  });

  app.get('/guidelines', (req, res) => {
    res.type('html').send(renderGuidelinesPage(currentVariant));
  });

  app.get('/documents', (req, res) => {
    res.type('html').send(renderDocumentsPage(currentVariant));
  });

  app.get('/faq', (req, res) => {
    res.type('html').send(renderFaqPage(currentVariant));
  });

  app.get('/hostel-guidelines', (req, res) => {
    res.type('html').send(renderHostelPage(currentVariant));
  });

  app.get('/special-incentive', (req, res) => {
    res.type('html').send(renderSpecialIncentivePage(currentVariant));
  });

  // Apply route - returns 404 in defective mode, 200 in clean mode
  app.get('/apply', (req, res) => {
    const html = renderApplyPage(currentVariant);
    if (!html) {
      return res.status(404).type('html').send(`<!DOCTYPE html>
<html lang="en">
<head><title>404 Not Found - JanPath Test Fixture</title></head>
<body>
  <h1>404 Not Found</h1>
  <p>The requested application URL does not exist on this server.</p>
</body>
</html>`);
    }
    return res.status(200).type('html').send(html);
  });

  return { app, getVariant: () => currentVariant, setVariant: (v) => { currentVariant = v; } };
}

// Start standalone server ONLY when executed directly from CLI
import { fileURLToPath } from 'node:url';

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun && process.env.NODE_ENV !== 'test') {
  const port = parseInt(process.env.FIXTURE_PORT || process.env.PORT || '3002', 10);
  const { app } = createFixtureApp();
  app.listen(port, () => {
    console.log(`[JanPath Fixture] Microsite running on http://localhost:${port}`);
    console.log(`[JanPath Fixture] Active variant: defective (toggle via POST /admin/toggle)`);
  });
}

