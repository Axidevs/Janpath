/**
 * server/test/urlGuard.test.js
 *
 * Unit tests for urlGuard:
 * - Protocol check (http/https only)
 * - Domain allowlist (*.gov.in, *.nic.in, *.ac.in, FIXTURE_HOST)
 * - Credential rejection
 * - IP literal and localhost rejection
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateUrl, isHostAllowed, normalizeHost } from '../src/lib/urlGuard.js';

describe('normalizeHost', () => {
  test('strips port and www and converts to lowercase', () => {
    assert.equal(normalizeHost('WWW.Scholarships.Gov.In:443'), 'scholarships.gov.in');
    assert.equal(normalizeHost('localhost:3000'), 'localhost');
  });
});

describe('isHostAllowed', () => {
  const fixtureHost = 'scholarship-fixture.internal';

  test('positive: allows official Indian public sector and academic domains', () => {
    assert.equal(isHostAllowed('scholarships.gov.in'), true);
    assert.equal(isHostAllowed('portal.nsp.nic.in'), true);
    assert.equal(isHostAllowed('iitb.ac.in'), true);
    assert.equal(isHostAllowed('gov.in'), true);
    assert.equal(isHostAllowed('nic.in'), true);
  });

  test('positive: allows configured fixture host', () => {
    assert.equal(isHostAllowed(fixtureHost, fixtureHost), true);
    assert.equal(isHostAllowed(`sub.${fixtureHost}`, fixtureHost), true);
  });

  test('negative: rejects commercial, foreign, or unauthorized domains', () => {
    assert.equal(isHostAllowed('google.com'), false);
    assert.equal(isHostAllowed('scholarships.com'), false);
    assert.equal(isHostAllowed('fakegov.in.commercial.com'), false);
  });

  test('negative: rejects IP literals (IPv4 and IPv6)', () => {
    assert.equal(isHostAllowed('127.0.0.1'), false);
    assert.equal(isHostAllowed('192.168.1.10'), false);
    assert.equal(isHostAllowed('[::1]'), false);
  });

  test('negative: rejects localhost when not designated as fixtureHost', () => {
    assert.equal(isHostAllowed('localhost'), false);
    assert.equal(isHostAllowed('sub.localhost'), false);
  });
});

describe('validateUrl', () => {
  const fixtureHost = 'fixture.test';

  test('positive: valid https gov.in URL passes validation', () => {
    const res = validateUrl('https://scholarships.gov.in/scheme/123');
    assert.equal(res.allowed, true);
    assert.equal(res.normalizedUrl, 'https://scholarships.gov.in/scheme/123');
  });

  test('negative: rejects non-http protocols (e.g. ftp, file, javascript)', () => {
    const r1 = validateUrl('ftp://scholarships.gov.in/doc.pdf');
    assert.equal(r1.allowed, false);
    assert.equal(r1.reason, 'disallowed_protocol_ftp');

    const r2 = validateUrl('javascript:alert(1)');
    assert.equal(r2.allowed, false);
  });

  test('negative: rejects credentials in URL for security', () => {
    const res = validateUrl('https://admin:secretPass@scholarships.gov.in/login');
    assert.equal(res.allowed, false);
    assert.equal(res.reason, 'credentials_in_url');
  });

  test('negative: rejects out-of-scope commercial domains', () => {
    const res = validateUrl('https://commercial-portal.com/scholarships');
    assert.equal(res.allowed, false);
    assert.equal(res.reason, 'domain_not_allowlisted');
  });

  test('uncertain / invalid inputs return allowed: false', () => {
    assert.equal(validateUrl(null).allowed, false);
    assert.equal(validateUrl('').allowed, false);
    assert.equal(validateUrl('not a valid url').allowed, false);
  });
});
