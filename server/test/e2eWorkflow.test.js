/**
 * server/test/e2eWorkflow.test.js
 *
 * Full End-to-End Workflow Verification:
 * - Spins up real JanPath Scholarship Fixture on a local ephemeral port
 * - Bootstraps the real JanPath backend server connected to the fixture
 * - Uses real HTTP fetch against the fixture pages
 * - Executes an audit on the defective fixture variant
 * - Verifies evidence matching, SHA-256 page hashes, and deterministic rule violations
 * - Toggles fixture to "clean" variant via /admin/toggle
 * - Executes re-audit and runs compareAudits()
 * - Proves issues transition to RESOLVED status
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { createFixtureApp } from '../../fixture/server.js';
import { bootstrap } from '../src/index.js';
import { createMemoryStore } from '../src/store/memoryStore.js';
import { createAuditLimiter } from '../src/lib/limiter.js';
import { createFetchClient } from '../src/tinyfish/fetchClient.js';
import { compareAudits } from '../src/engine/compare.js';
import { AuditStatus, EvidenceStatus, FindingStatus } from '../../shared/constants.js';

describe('Phase 3 — End-to-End Audit & Fixture Comparison Lifecycle', () => {
  let fixtureServer;
  let fixturePort;
  let fixtureBaseUrl;
  let fixtureHost;

  let backendServer;
  let backendBaseUrl;
  let memoryStore;
  let agentClientInstance;

  const adminToken = 'e2e-test-secret-token';

  before(async () => {
    // 1. Start fixture microsite on ephemeral port
    process.env.FIXTURE_ADMIN_TOKEN = adminToken;
    const { app: fixtureApp } = createFixtureApp('defective');
    fixtureServer = http.createServer(fixtureApp);
    await new Promise((resolve) => {
      fixtureServer.listen(0, '127.0.0.1', () => {
        fixturePort = fixtureServer.address().port;
        fixtureHost = `127.0.0.1:${fixturePort}`;
        fixtureBaseUrl = `http://${fixtureHost}`;
        resolve();
      });
    });

    // 2. Real HTTP fetch client hitting the local fixture
    const realHttpFetchClient = {
      async fetchUrls(urls) {
        const results = new Map();
        for (const u of urls) {
          try {
            const res = await fetch(u);
            const text = await res.text();
            const crypto = await import('node:crypto');
            const hash = crypto.createHash('sha256').update(text).digest('hex');
            results.set(u, {
              url: u,
              text,
              charCount: text.length,
              hash,
              status: res.status,
              error: null
            });
          } catch (err) {
            results.set(u, {
              url: u,
              text: '',
              charCount: 0,
              hash: '',
              status: 0,
              error: err.message
            });
          }
        }
        return results;
      }
    };

    // 3. Mock AgentClient exploring the fixture site
    let currentAgentDefective = true;
    const fixtureAwareAgentClient = {
      async run({ startUrl, onEvent }) {
        await onEvent({ type: 'STARTED', run_id: 'e2e-agent-run' });

        const result = currentAgentDefective
          ? {
              steps: [
                {
                  step_key: 'eligibility',
                  status_claimed: 'found',
                  summary: 'Applicant must be between 18 and 45 years.'
                },
                {
                  step_key: 'documents',
                  status_claimed: 'partially_found',
                  summary: 'Income and caste certificates required.'
                },
                {
                  step_key: 'deadline',
                  status_claimed: 'found',
                  summary: 'Closing date is 15/03/2024.'
                },
                {
                  step_key: 'next_action',
                  status_claimed: 'not_found',
                  summary: 'Apply button link fails.'
                }
              ],
              facts: [
                {
                  kind: 'age_min',
                  value: '18',
                  url: `${fixtureBaseUrl}/guidelines`,
                  verbatim_quote: 'Applicants must be between 18 and 45 years of age at the time of application.'
                },
                {
                  kind: 'age_max',
                  value: '45',
                  url: `${fixtureBaseUrl}/guidelines`,
                  verbatim_quote: 'Applicants must be between 18 and 45 years of age at the time of application.'
                },
                {
                  kind: 'age_max',
                  value: '60',
                  url: `${fixtureBaseUrl}/faq`,
                  verbatim_quote: 'Applicants must be between 18 and 60 years of age at the time of application.'
                },
                {
                  kind: 'deadline_date',
                  value: '15/03/2024',
                  url: `${fixtureBaseUrl}/guidelines`,
                  verbatim_quote: 'The last date for online submission of completed application forms is 15/03/2024.'
                },
                {
                  kind: 'document',
                  value: 'Income Certificate',
                  url: `${fixtureBaseUrl}/guidelines`,
                  verbatim_quote: 'Income Certificate issued by Tehsildar is required for all applicants.'
                },
                {
                  kind: 'document',
                  value: 'Caste Certificate',
                  url: `${fixtureBaseUrl}/documents`,
                  verbatim_quote: 'Caste Certificate verified by sub-divisional magistrate is required'
                }
              ],
              pages_visited: [
                `${fixtureBaseUrl}/`,
                `${fixtureBaseUrl}/guidelines`,
                `${fixtureBaseUrl}/documents`,
                `${fixtureBaseUrl}/faq`,
                `${fixtureBaseUrl}/apply`
              ],
              click_path: ['Home', 'Guidelines', 'Documents', 'FAQ', 'Apply'],
              limitations: null
            }
          : {
              // Clean variant: single age 18-45, unified documents, active future deadline, working /apply
              steps: [
                {
                  step_key: 'eligibility',
                  status_claimed: 'found',
                  summary: 'Applicant must be between 18 and 45 years.'
                },
                {
                  step_key: 'documents',
                  status_claimed: 'found',
                  summary: 'All documents listed on guidelines page.'
                },
                {
                  step_key: 'deadline',
                  status_claimed: 'found',
                  summary: 'Closing date is 31/12/2027.'
                },
                {
                  step_key: 'next_action',
                  status_claimed: 'found',
                  summary: 'Apply button works.'
                }
              ],
              facts: [
                {
                  kind: 'age_min',
                  value: '18',
                  url: `${fixtureBaseUrl}/guidelines`,
                  verbatim_quote: 'Applicants must be between 18 and 45 years of age at the time of application.'
                },
                {
                  kind: 'age_max',
                  value: '45',
                  url: `${fixtureBaseUrl}/guidelines`,
                  verbatim_quote: 'Applicants must be between 18 and 45 years of age at the time of application.'
                },
                {
                  kind: 'deadline_date',
                  value: '31/12/2027',
                  url: `${fixtureBaseUrl}/guidelines`,
                  verbatim_quote: 'The last date for online submission of completed application forms is 31/12/2027.'
                }
              ],
              pages_visited: [
                `${fixtureBaseUrl}/`,
                `${fixtureBaseUrl}/guidelines`,
                `${fixtureBaseUrl}/documents`,
                `${fixtureBaseUrl}/faq`,
                `${fixtureBaseUrl}/apply`
              ],
              click_path: ['Home', 'Guidelines', 'Documents', 'FAQ', 'Apply'],
              limitations: null
            };

        await onEvent({
          type: 'COMPLETE',
          run_id: 'e2e-agent-run',
          payload: { result }
        });

        return { runId: 'e2e-agent-run', result, events: [] };
      },
      setDefective(val) {
        currentAgentDefective = val;
      }
    };

    // 4. Bootstrap backend configured to allow the fixture host
    memoryStore = createMemoryStore();
    const limiter = createAuditLimiter(2);

    const backendResult = await bootstrap({
      store: memoryStore,
      limiter,
      agentClient: fixtureAwareAgentClient,
      fetchClient: realHttpFetchClient,
      config: {
        port: 0,
        fixtureHost: fixtureHost,
        maxConcurrentAudits: 2
      }
    });

    backendServer = backendResult.server;
    const bPort = backendServer.address().port;
    backendBaseUrl = `http://127.0.0.1:${bPort}`;

    // Expose control to test
    agentClientInstance = fixtureAwareAgentClient;
  });

  after((done) => {
    backendServer.close(() => {
      fixtureServer.close(done);
    });
  });

  test('executes audit on defective fixture and detects planted defects', async () => {
    // 1. Post audit for defective fixture
    const createRes = await fetch(`${backendBaseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrl: `${fixtureBaseUrl}/`,
        goal: 'Test citizen scholarship application journey'
      })
    });

    assert.equal(createRes.status, 201);
    const { auditId } = await createRes.json();
    assert.ok(auditId);

    // 2. Poll until audit completes
    let defectiveAudit = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const pollRes = await fetch(`${backendBaseUrl}/api/audits/${auditId}`);
      assert.equal(pollRes.status, 200);
      const data = await pollRes.json();
      if (data.status === AuditStatus.COMPLETED || data.status === AuditStatus.EXPLORATION_FAILED || data.status === AuditStatus.PARTIAL) {
        defectiveAudit = data;
        break;
      }
    }

    assert.ok(defectiveAudit, 'Defective audit must complete');
    assert.equal(defectiveAudit.status, AuditStatus.COMPLETED);

    // Verify findings and evidence verifier results
    assert.ok(defectiveAudit.findings.length >= 5);
    const matchedQuotes = defectiveAudit.findings.filter(
      (f) => f.evidence?.status === EvidenceStatus.SOURCE_MATCHED
    );
    assert.ok(matchedQuotes.length >= 4, 'Real quotes from fixture must match');

    // Verify rule violations caught
    const ruleIds = defectiveAudit.issues.map((i) => i.ruleId);
    assert.ok(
      ruleIds.includes('past_deadline'),
      'Must detect 15/03/2024 past deadline'
    );
    assert.ok(
      ruleIds.includes('broken_next_step'),
      'Must detect /apply returning HTTP 404'
    );
    assert.ok(
      ruleIds.includes('conflict'),
      'Must detect conflicting age (45 on guidelines vs 60 on FAQ)'
    );

    // Verify cryptographic page hashes
    assert.ok(defectiveAudit.pages.length >= 4);
    assert.ok(defectiveAudit.pages.every((p) => p.hash && p.hash.length === 64));

    // 3. Toggle fixture to clean variant via admin endpoint
    const toggleRes = await fetch(`${fixtureBaseUrl}/admin/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ variant: 'clean' })
    });
    assert.equal(toggleRes.status, 200);
    const toggleData = await toggleRes.json();
    assert.equal(toggleData.activeVariant, 'clean');

    // Update agent to clean mode
    agentClientInstance.setDefective(false);

    // 4. Trigger re-audit
    const reauditRes = await fetch(
      `${backendBaseUrl}/api/audits/${auditId}/reaudit`,
      { method: 'POST' }
    );
    assert.equal(reauditRes.status, 201);
    const reauditData = await reauditRes.json();
    const cleanAuditId = reauditData.auditId;

    // Poll clean audit to completion
    let cleanAudit = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 50));
      const pollRes = await fetch(`${backendBaseUrl}/api/audits/${cleanAuditId}`);
      assert.equal(pollRes.status, 200);
      const data = await pollRes.json();
      if (data.status === AuditStatus.COMPLETED) {
        cleanAudit = data;
        break;
      }
    }

    assert.ok(cleanAudit, 'Clean audit must complete');
    assert.equal(cleanAudit.status, AuditStatus.COMPLETED);

    // 5. Compare defective base audit vs. clean target audit
    const compareRes = await fetch(
      `${backendBaseUrl}/api/audits/compare?base=${auditId}&target=${cleanAuditId}`
    );
    assert.equal(compareRes.status, 200);
    const comparison = await compareRes.json();

    assert.equal(comparison.baseAuditId, auditId);
    assert.equal(comparison.targetAuditId, cleanAuditId);

    // Proves the defects resolved in the clean variant!
    const resolvedItems = (comparison.items || []).filter((i) => i.status === 'RESOLVED');
    assert.ok(resolvedItems.length >= 2, 'Issues must transition to RESOLVED');
    const resolvedRuleIds = resolvedItems.map((r) => r.issue?.ruleId);
    assert.ok(
      resolvedRuleIds.includes('past_deadline') ||
        resolvedRuleIds.includes('broken_next_step') ||
        resolvedRuleIds.includes('conflict')
    );
  });
});
