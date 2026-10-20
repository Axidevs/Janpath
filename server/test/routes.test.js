/**
 * server/test/routes.test.js
 *
 * Integration tests for JanPath Express routes using in-memory store:
 * - POST /api/audits (valid URL, invalid URL, concurrency limit)
 * - GET  /api/audits/:id
 * - GET  /api/audits/:id/events?after=
 * - GET  /api/audits?startUrl=
 * - POST /api/audits/:id/reaudit
 * - GET  /api/audits/compare?base=&target=
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { createApp } from '../src/app.js';
import { createMemoryStore } from '../src/store/memoryStore.js';
import { createAuditLimiter } from '../src/lib/limiter.js';
import { AuditStatus } from '../../shared/constants.js';

describe('Express API Routes', () => {
  let server;
  let baseUrl;
  let store;
  let limiter;

  before(async () => {
    store = createMemoryStore();
    limiter = createAuditLimiter(2);

    const app = createApp({
      store,
      limiter,
      config: {
        fixtureHost: 'fixture.gov.in',
        maxConcurrentAudits: 2
      }
    });

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after((done) => {
    server.close(done);
  });

  test('POST /api/audits - creates an audit and acquires limiter slot', async () => {
    const res = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrl: 'https://scholarships.gov.in/portal'
      })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.auditId);
    assert.equal(body.status, AuditStatus.RUNNING);
    assert.equal(limiter.getActiveCount(), 1);
  });

  test('POST /api/audits - rejects out-of-scope non-allowlisted domains with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrl: 'https://commercial-scheme-site.com/apply'
      })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'INVALID_URL');
  });

  test('POST /api/audits - enforces 2-audit concurrency limit with HTTP 429', async () => {
    // Fill the 2nd slot (1st slot filled above)
    const res2 = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrl: 'https://nsp.nic.in/scheme'
      })
    });
    assert.equal(res2.status, 201);
    assert.equal(limiter.getActiveCount(), 2);

    // 3rd audit should receive 429
    const res3 = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrl: 'https://iitd.ac.in/scholarship'
      })
    });
    assert.equal(res3.status, 429);
    const body3 = await res3.json();
    assert.equal(body3.error.code, 'CONCURRENCY_LIMIT_REACHED');

    // Clean up slots for subsequent tests
    limiter.reset();
  });

  test('GET /api/audits/:id - returns audit or 404', async () => {
    // Non-existent audit
    const res404 = await fetch(`${baseUrl}/api/audits/non-existent-id`);
    assert.equal(res404.status, 404);
    const body404 = await res404.json();
    assert.equal(body404.error.code, 'AUDIT_NOT_FOUND');

    // Existing audit
    await store.createAudit({
      _id: 'test-audit-001',
      startUrl: 'https://scholarships.gov.in/portal',
      status: AuditStatus.COMPLETED
    });

    const res200 = await fetch(`${baseUrl}/api/audits/test-audit-001`);
    assert.equal(res200.status, 200);
    const body200 = await res200.json();
    assert.equal(body200._id, 'test-audit-001');
    assert.equal(body200.status, AuditStatus.COMPLETED);
  });

  test('GET /api/audits/:id/events - retrieves events for audit', async () => {
    await store.createRunEvent({
      auditId: 'test-audit-001',
      type: 'PROGRESS',
      payload: { step: 'eligibility', message: 'Scanning eligibility' }
    });

    const res = await fetch(`${baseUrl}/api/audits/test-audit-001/events`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.auditId, 'test-audit-001');
    assert.ok(Array.isArray(body.events));
    assert.ok(body.events.length > 0);
  });

  test('GET /api/audits - lists audits with optional filter', async () => {
    const res = await fetch(`${baseUrl}/api/audits`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.audits));
    assert.ok(body.audits.length >= 1);
  });

  test('POST /api/audits/:id/reaudit - initiates re-audit of same startUrl', async () => {
    const res = await fetch(`${baseUrl}/api/audits/test-audit-001/reaudit`, {
      method: 'POST'
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.auditId);
    assert.equal(body.status, AuditStatus.RUNNING);
    assert.equal(body.baseAuditId, 'test-audit-001');

    limiter.reset();
  });

  test('GET /api/audits/compare?base=&target= - compares two audits deterministically', async () => {
    await store.createAudit({
      _id: 'base-audit',
      startUrl: 'https://scholarships.gov.in',
      status: AuditStatus.COMPLETED,
      issues: [
        {
          id: 'issue-1',
          ruleId: 'conflict',
          title: 'Age Conflict',
          description: '18 vs 21',
          severity: 'error',
          findingIds: [],
          repairSuggestion: 'Fix conflict'
        }
      ],
      pages: [{ url: 'https://scholarships.gov.in', hash: 'hash1' }]
    });

    await store.createAudit({
      _id: 'target-audit',
      startUrl: 'https://scholarships.gov.in',
      status: AuditStatus.COMPLETED,
      issues: [], // Resolved!
      pages: [{ url: 'https://scholarships.gov.in', hash: 'hash2' }]
    });

    const res = await fetch(
      `${baseUrl}/api/audits/compare?base=base-audit&target=target-audit`
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.baseAuditId, 'base-audit');
    assert.equal(body.targetAuditId, 'target-audit');
    assert.equal(body.summary.resolvedCount, 1);
    assert.equal(body.contentChanged, true);
  });
});
