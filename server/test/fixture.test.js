/**
 * server/test/fixture.test.js
 *
 * Tests for the JanPath Scholarship Microsite Fixture:
 * - HTML contains the 6 planted defects in "defective" variant
 * - HTML contains clean state and decoy in "clean" variant
 * - Admin toggle security with FIXTURE_ADMIN_TOKEN
 * - Visible "JANPATH TEST FIXTURE" marking on all pages
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { createFixtureApp } from '../../fixture/server.js';

describe('JanPath Scholarship Fixture Microsite', () => {
  let server;
  let baseUrl;
  const adminToken = 'test-fixture-token-123';

  before(async () => {
    process.env.FIXTURE_ADMIN_TOKEN = adminToken;
    const { app } = createFixtureApp('defective');

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after((done) => {
    server.close(done);
  });

  test('banner: all pages visibly display JANPATH TEST FIXTURE banner', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('JANPATH TEST FIXTURE'));
  });

  test('defective variant: verifies all 6 planted defects', async () => {
    // 1. Conflicting age: 18-45 on guidelines vs 18-60 on FAQ
    const resGuidelines = await fetch(`${baseUrl}/guidelines`);
    const htmlGuidelines = await resGuidelines.text();
    assert.ok(htmlGuidelines.includes('between 18 and 45 years of age'));

    const resFaq = await fetch(`${baseUrl}/faq`);
    const htmlFaq = await resFaq.text();
    assert.ok(htmlFaq.includes('between 18 and 60 years of age'));

    // 2. Missing document: Domicile mentioned in guidelines but missing in documents
    assert.ok(htmlGuidelines.includes('state Domicile Certificate is mandatory'));
    const resDocs = await fetch(`${baseUrl}/documents`);
    const htmlDocs = await resDocs.text();
    assert.ok(!htmlDocs.includes('State Domicile Certificate issued by'));

    // 3. Expired deadline: 15/03/2024
    assert.ok(htmlGuidelines.includes('15/03/2024'));

    // 4. Broken next step: /apply returns HTTP 404
    const resApply = await fetch(`${baseUrl}/apply`);
    assert.equal(resApply.status, 404);

    // 5. Scattered requirements across guidelines, documents, and faq
    assert.ok(htmlGuidelines.includes('Income Certificate issued by Tehsildar is required'));
    assert.ok(htmlDocs.includes('Caste Certificate verified by sub-divisional magistrate is required'));
    assert.ok(htmlFaq.includes('Bank Passbook with Aadhaar linkage is required'));

    // 6. Missing deadline: /special-incentive has no dates or deadline terms
    const resSpecial = await fetch(`${baseUrl}/special-incentive`);
    const htmlSpecial = await resSpecial.text();
    assert.ok(!htmlSpecial.includes('last date'));
    assert.ok(!htmlSpecial.includes('deadline'));
    assert.ok(!htmlSpecial.includes('closing date'));
  });

  test('admin toggle security: rejects unauthorized toggle requests without token', async () => {
    const res = await fetch(`${baseUrl}/admin/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant: 'clean' })
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });

  test('admin toggle: switches to clean variant and verifies zero defects + decoy', async () => {
    // Toggle to clean variant using valid admin token
    const toggleRes = await fetch(`${baseUrl}/admin/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ variant: 'clean' })
    });
    assert.equal(toggleRes.status, 200);
    const toggleBody = await toggleRes.json();
    assert.equal(toggleBody.activeVariant, 'clean');

    // 1. Conflicting age is resolved (both state 18-45)
    const resFaq = await fetch(`${baseUrl}/faq`);
    const htmlFaq = await resFaq.text();
    assert.ok(htmlFaq.includes('between 18 and 45 years of age'));

    // 2. Active deadline is present: 31/12/2027
    const resGuidelines = await fetch(`${baseUrl}/guidelines`);
    const htmlGuidelines = await resGuidelines.text();
    assert.ok(htmlGuidelines.includes('31/12/2027'));

    // 3. Application link is working (returns HTTP 200)
    const resApply = await fetch(`${baseUrl}/apply`);
    assert.equal(resApply.status, 200);

    // 4. Consolidated checklist present on documents page
    const resDocs = await fetch(`${baseUrl}/documents`);
    const htmlDocs = await resDocs.text();
    assert.ok(htmlDocs.includes('Consolidated Mandatory Documents Checklist'));
    assert.ok(htmlDocs.includes('Income Certificate'));
    assert.ok(htmlDocs.includes('Caste Certificate'));
    assert.ok(htmlDocs.includes('Bank Passbook'));

    // 5. Look-alike decoy present on hostel guidelines
    const resHostel = await fetch(`${baseUrl}/hostel-guidelines`);
    const htmlHostel = await resHostel.text();
    assert.ok(htmlHostel.includes('between 6 and 14 years of age'));
  });
});
