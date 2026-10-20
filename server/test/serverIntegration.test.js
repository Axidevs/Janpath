/**
 * server/test/serverIntegration.test.js
 *
 * Full Server Integration Test:
 * - Bootstraps the actual server via bootstrap()
 * - Tests health check, audit creation, worker execution, and event polling
 * - Verifies clean shutdown and error handling
 * - Zero network calls, zero TinyFish credits (injectable fakes)
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { bootstrap } from '../src/index.js';
import { createMemoryStore } from '../src/store/memoryStore.js';
import { createAuditLimiter } from '../src/lib/limiter.js';
import { AuditStatus, EvidenceStatus, FindingStatus } from '../../shared/constants.js';

describe('Server End-to-End Bootstrap & Worker Execution', () => {
  let appInstance;
  let serverInstance;
  let baseUrl;
  let memoryStore;

  const quote = 'applicants must have completed minimum 18 years of age';
  const pageText = `Government of India. Guidelines for Scholarship Portal: ${quote}. Applications open for all eligible citizens across all states and union territories. Late submissions will not be permitted under any circumstances. Candidates are advised to submit early to avoid server congestion. Helpline: 1800-111-222. All rights reserved. Ministry of Social Justice and Empowerment. Department of Higher Education. New Delhi, India.`;


  const mockAgentResult = {
    steps: [
      {
        step_key: 'eligibility',
        status_claimed: 'found',
        summary: 'Applicant must be at least 18 years old'
      }
    ],
    facts: [
      {
        kind: 'age_min',
        value: '18',
        url: 'https://scholarships.gov.in/scheme-portal',
        verbatim_quote: quote
      }
    ],
    pages_visited: ['https://scholarships.gov.in/scheme-portal'],
    click_path: ['Loaded portal'],
    limitations: null
  };

  const fakeAgentClient = {
    async run({ onEvent }) {
      await onEvent({ type: 'STARTED', run_id: 'run-e2e-1' });
      await onEvent({
        type: 'PROGRESS',
        run_id: 'run-e2e-1',
        payload: { message: 'Exploring eligibility' }
      });
      await onEvent({
        type: 'COMPLETE',
        run_id: 'run-e2e-1',
        payload: { result: mockAgentResult }
      });
      return { runId: 'run-e2e-1', result: mockAgentResult, events: [] };
    }
  };

  const fakeFetchClient = {
    async fetchUrls(urls) {
      const map = new Map();
      for (const u of urls) {
        map.set(u, {
          url: u,
          text: pageText,
          charCount: pageText.length,
          hash: 'mock-e2e-sha256-hash',
          status: 200,
          error: null
        });
      }
      return map;
    }
  };

  before(async () => {
    memoryStore = createMemoryStore();
    const limiter = createAuditLimiter(2);

    const result = await bootstrap({
      store: memoryStore,
      limiter,
      agentClient: fakeAgentClient,
      fetchClient: fakeFetchClient,
      config: {
        port: 0, // OS assigns random available port
        fixtureHost: 'fixture.gov.in',
        maxConcurrentAudits: 2
      }
    });

    appInstance = result.app;
    serverInstance = result.server;

    const assignedPort = serverInstance.address().port;
    baseUrl = `http://127.0.0.1:${assignedPort}`;
  });

  after((done) => {
    serverInstance.close(done);
  });

  test('GET /health returns status ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'janpath-backend');
  });

  test('POST /api/audits launches audit worker and runs to completion', async () => {
    const res = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrl: 'https://scholarships.gov.in/scheme-portal',
        goal: 'Verify age limit'
      })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.auditId);
    assert.equal(body.status, AuditStatus.RUNNING);

    const auditId = body.auditId;

    // Poll until worker finishes processing
    let completedAudit = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 50));
      const pollRes = await fetch(`${baseUrl}/api/audits/${auditId}`);
      assert.equal(pollRes.status, 200);
      const auditData = await pollRes.json();
      if (
        auditData.status === AuditStatus.COMPLETED ||
        auditData.status === AuditStatus.EXPLORATION_FAILED
      ) {
        completedAudit = auditData;
        break;
      }
    }

    assert.ok(completedAudit, 'Audit should reach terminal status');
    assert.equal(completedAudit.status, AuditStatus.COMPLETED);

    // Verify findings and verified evidence
    assert.equal(completedAudit.findings.length, 1);
    assert.equal(completedAudit.findings[0].status, FindingStatus.VERIFIED_FOUND);
    assert.equal(
      completedAudit.findings[0].evidence.status,
      EvidenceStatus.SOURCE_MATCHED
    );

    // Verify runEvents polling
    const eventsRes = await fetch(`${baseUrl}/api/audits/${auditId}/events`);
    assert.equal(eventsRes.status, 200);
    const eventsBody = await eventsRes.json();
    assert.ok(Array.isArray(eventsBody.events));
    assert.ok(eventsBody.events.length >= 3);
  });

  test('POST /api/audits error handling: rejects disallowed commercial domains', async () => {
    const res = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrl: 'https://commercial-scam-site.org/apply'
      })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'INVALID_URL');
  });
});
