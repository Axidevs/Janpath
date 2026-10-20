/**
 * server/test/limiter.test.js
 *
 * Unit tests for the in-memory 2-concurrent-audits limiter.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createAuditLimiter } from '../src/lib/limiter.js';

describe('Audit Concurrency Limiter', () => {
  test('positive: acquires slots up to limit (2 audits)', () => {
    const limiter = createAuditLimiter(2);

    assert.equal(limiter.getActiveCount(), 0);
    assert.equal(limiter.isAvailable(), true);

    const slot1 = limiter.acquire('audit-1');
    assert.equal(slot1, true);
    assert.equal(limiter.getActiveCount(), 1);
    assert.equal(limiter.isAvailable(), true);

    const slot2 = limiter.acquire('audit-2');
    assert.equal(slot2, true);
    assert.equal(limiter.getActiveCount(), 2);
    assert.equal(limiter.isAvailable(), false);
  });

  test('negative: rejects 3rd concurrent audit when 2 slots are occupied', () => {
    const limiter = createAuditLimiter(2);
    limiter.acquire('audit-1');
    limiter.acquire('audit-2');

    const slot3 = limiter.acquire('audit-3');
    assert.equal(slot3, false, 'Third audit must be rejected');
    assert.equal(limiter.getActiveCount(), 2);
  });

  test('release: releasing a slot frees up capacity for subsequent audit', () => {
    const limiter = createAuditLimiter(2);
    limiter.acquire('audit-1');
    limiter.acquire('audit-2');

    limiter.release('audit-1');
    assert.equal(limiter.getActiveCount(), 1);
    assert.equal(limiter.isAvailable(), true);

    const slot3 = limiter.acquire('audit-3');
    assert.equal(slot3, true, 'Freed slot should allow audit-3 to acquire');
    assert.equal(limiter.getActiveCount(), 2);
  });

  test('reset: clears all active audits', () => {
    const limiter = createAuditLimiter(2);
    limiter.acquire('audit-1');
    limiter.acquire('audit-2');

    limiter.reset();
    assert.equal(limiter.getActiveCount(), 0);
    assert.equal(limiter.isAvailable(), true);
  });
});
