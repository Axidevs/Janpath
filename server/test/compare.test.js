/**
 * server/test/compare.test.js
 *
 * Unit tests for compareAudits:
 * - RESOLVED, NEW, PERSISTENT, INCONCLUSIVE
 * - contentChanged detection from page hashes
 * - Inconclusive resolution when re-audit fails or has smaller scope
 * - Agent variability detection
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { AuditStatus, ComparisonStatus } from '../../shared/constants.js';
import { compareAudits, checkContentChanged } from '../src/engine/compare.js';

describe('checkContentChanged', () => {
  test('returns false when all page URLs and hashes are identical', () => {
    const pagesA = [
      { url: 'https://scholarships.gov.in', hash: 'hash1' },
      { url: 'https://scholarships.gov.in/rules', hash: 'hash2' }
    ];
    const pagesB = [
      { url: 'https://scholarships.gov.in', hash: 'hash1' },
      { url: 'https://scholarships.gov.in/rules', hash: 'hash2' }
    ];
    assert.equal(checkContentChanged(pagesA, pagesB), false);
  });

  test('returns true when a page hash differs', () => {
    const pagesA = [{ url: 'https://scholarships.gov.in', hash: 'hash1' }];
    const pagesB = [{ url: 'https://scholarships.gov.in', hash: 'hash_MODIFIED' }];
    assert.equal(checkContentChanged(pagesA, pagesB), true);
  });

  test('returns true when page count or page URLs differ', () => {
    const pagesA = [{ url: 'https://scholarships.gov.in', hash: 'hash1' }];
    const pagesB = [
      { url: 'https://scholarships.gov.in', hash: 'hash1' },
      { url: 'https://scholarships.gov.in/new-page', hash: 'hash2' }
    ];
    assert.equal(checkContentChanged(pagesA, pagesB), true);
  });
});

describe('compareAudits Semantics', () => {
  const sampleIssue1 = {
    id: 'issue-001',
    ruleId: 'conflict',
    title: 'Conflicting age limits',
    description: '45 vs 60'
  };

  const sampleIssue2 = {
    id: 'issue-002',
    ruleId: 'broken_next_step',
    title: 'Broken apply link',
    description: 'HTTP 404'
  };

  test('positive: PERSISTENT status when issue exists in both audits', () => {
    const baseAudit = {
      status: AuditStatus.COMPLETED,
      issues: [sampleIssue1],
      pages: [{ url: 'https://scholarships.gov.in', hash: 'h1' }]
    };
    const targetAudit = {
      status: AuditStatus.COMPLETED,
      issues: [sampleIssue1],
      pages: [{ url: 'https://scholarships.gov.in', hash: 'h1' }]
    };

    const res = compareAudits(baseAudit, targetAudit);
    assert.equal(res.summary.persistentCount, 1);
    assert.equal(res.items[0].status, ComparisonStatus.PERSISTENT);
  });

  test('positive: NEW status when issue appears only in target audit', () => {
    const baseAudit = {
      status: AuditStatus.COMPLETED,
      issues: [],
      pages: [{ url: 'https://scholarships.gov.in', hash: 'h1' }]
    };
    const targetAudit = {
      status: AuditStatus.COMPLETED,
      issues: [sampleIssue2],
      pages: [{ url: 'https://scholarships.gov.in', hash: 'h2' }]
    };

    const res = compareAudits(baseAudit, targetAudit);
    assert.equal(res.summary.newCount, 1);
    assert.equal(res.items[0].status, ComparisonStatus.NEW);
  });

  test('positive: RESOLVED status when issue in base is absent in completed, equal-scope target re-audit', () => {
    const baseAudit = {
      status: AuditStatus.COMPLETED,
      issues: [sampleIssue1],
      pages: [
        { url: 'https://scholarships.gov.in', hash: 'old_hash1' },
        { url: 'https://scholarships.gov.in/rules', hash: 'old_hash2' }
      ]
    };
    const targetAudit = {
      status: AuditStatus.COMPLETED,
      issues: [], // Issue fixed!
      pages: [
        { url: 'https://scholarships.gov.in', hash: 'new_hash1' },
        { url: 'https://scholarships.gov.in/rules', hash: 'new_hash2' }
      ]
    };

    const res = compareAudits(baseAudit, targetAudit);
    assert.equal(res.summary.resolvedCount, 1);
    assert.equal(res.items[0].status, ComparisonStatus.RESOLVED);
    assert.equal(res.contentChanged, true);
    assert.equal(res.agentVariability, false);
  });

  // ---------------- CRITICAL NEGATIVE PROOF TESTS ----------------
  test('uncertain: a FAILED target re-audit must NEVER mark an old issue RESOLVED (yields INCONCLUSIVE)', () => {
    const baseAudit = {
      status: AuditStatus.COMPLETED,
      issues: [sampleIssue1],
      pages: [{ url: 'https://scholarships.gov.in', hash: 'h1' }]
    };
    const targetAudit = {
      status: AuditStatus.EXPLORATION_FAILED, // Failed re-audit!
      issues: [], // Absent only because exploration aborted
      pages: []
    };

    const res = compareAudits(baseAudit, targetAudit);
    assert.equal(res.summary.resolvedCount, 0, 'Failed audit must never resolve an issue');
    assert.equal(res.summary.inconclusiveCount, 1);
    assert.equal(res.items[0].status, ComparisonStatus.INCONCLUSIVE);
    assert.equal(res.items[0].reason, 'target_audit_not_completed');
  });

  test('uncertain: a SMALLER scope re-audit must NEVER mark an old issue RESOLVED (yields INCONCLUSIVE)', () => {
    const baseAudit = {
      status: AuditStatus.COMPLETED,
      issues: [sampleIssue1],
      pages: [
        { url: 'https://scholarships.gov.in', hash: 'h1' },
        { url: 'https://scholarships.gov.in/guidelines', hash: 'h2' },
        { url: 'https://scholarships.gov.in/faq', hash: 'h3' }
      ]
    };
    const targetAudit = {
      status: AuditStatus.COMPLETED,
      issues: [], // Absent because agent only visited landing page
      pages: [{ url: 'https://scholarships.gov.in', hash: 'h1' }] // Visited only 1 of 3 pages!
    };

    const res = compareAudits(baseAudit, targetAudit);
    assert.equal(res.summary.resolvedCount, 0, 'Smaller scope re-audit cannot prove resolution');
    assert.equal(res.summary.inconclusiveCount, 1);
    assert.equal(res.items[0].status, ComparisonStatus.INCONCLUSIVE);
    assert.equal(res.items[0].reason, 'target_audit_had_smaller_page_scope');
  });

  test('agent variability: issue disappears but page content hashes are 100% IDENTICAL', () => {
    const baseAudit = {
      status: AuditStatus.COMPLETED,
      issues: [sampleIssue1],
      pages: [{ url: 'https://scholarships.gov.in', hash: 'IDENTICAL_HASH' }]
    };
    const targetAudit = {
      status: AuditStatus.COMPLETED,
      issues: [],
      pages: [{ url: 'https://scholarships.gov.in', hash: 'IDENTICAL_HASH' }]
    };

    const res = compareAudits(baseAudit, targetAudit);
    assert.equal(res.contentChanged, false);
    assert.equal(res.agentVariability, true);
    assert.equal(res.items[0].agentVariability, true);
    assert.equal(
      res.items[0].reason,
      'identical_page_hashes_indicate_agent_variability'
    );
  });
});
