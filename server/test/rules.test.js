/**
 * server/test/rules.test.js
 *
 * Unit tests for deterministic rules engine:
 * 1. Missing information two-signal rule (English & Hindi)
 * 2. Conflict rule with decoy protection
 * 3. Scattered requirements rule
 * 4. Past deadline rule with explicit date parser
 * 5. Broken next step rule (404/410 only)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  AuditStatus,
  FindingStatus,
  EvidenceStatus,
  StepKey
} from '../../shared/constants.js';
import { evaluateMissingInformation } from '../src/engine/rules/missingInformationRule.js';
import { evaluateConflicts } from '../src/engine/rules/conflictRule.js';
import { evaluateScatteredRequirements } from '../src/engine/rules/scatteredRule.js';
import { evaluatePastDeadlines } from '../src/engine/rules/pastDeadlineRule.js';
import { evaluateNextStepDestination } from '../src/engine/rules/brokenNextStepRule.js';
import { parseExplicitDate, isDateStrictlyPast } from '../src/engine/rules/dateParser.js';

// ==========================================
// 1. DATE PARSER TESTS
// ==========================================
describe('Explicit Date Parser (Indian & International Formats)', () => {
  test('parses dd/mm/yyyy, dd-mm-yyyy, and dd.mm.yyyy', () => {
    const r1 = parseExplicitDate('Deadline is 15/03/2026 on the portal');
    assert.deepEqual(r1, { year: 2026, month: 3, day: 15, raw: '15/03/2026' });

    const r2 = parseExplicitDate('Last date: 05-08-2025');
    assert.deepEqual(r2, { year: 2025, month: 8, day: 5, raw: '05-08-2025' });
  });

  test('parses "15 March 2026" and "15th March 2026"', () => {
    const r1 = parseExplicitDate('Window closes on 15 March 2026');
    assert.deepEqual(r1, { year: 2026, month: 3, day: 15, raw: '15 March 2026' });

    const r2 = parseExplicitDate('Applications accepted until 31st December 2025');
    assert.deepEqual(r2, { year: 2025, month: 12, day: 31, raw: '31st December 2025' });
  });

  test('handles leap years correctly and rejects invalid calendar days', () => {
    // 2024 is a leap year
    const leap = parseExplicitDate('29/02/2024');
    assert.deepEqual(leap, { year: 2024, month: 2, day: 29, raw: '29/02/2024' });

    // 2025 is NOT a leap year
    const invalidLeap = parseExplicitDate('29/02/2025');
    assert.equal(invalidLeap, null);

    const invalidDay = parseExplicitDate('32/01/2026');
    assert.equal(invalidDay, null);
  });

  test('strictly compares against referenceDate in IST', () => {
    const past = { year: 2026, month: 3, day: 10 };
    const future = { year: 2026, month: 3, day: 20 };
    const reference = { year: 2026, month: 3, day: 15 };

    assert.equal(isDateStrictlyPast(past, reference), true);
    assert.equal(isDateStrictlyPast(future, reference), false);
    assert.equal(isDateStrictlyPast(reference, reference), false); // same day is not past
  });
});

// ==========================================
// 2. MISSING INFORMATION TWO-SIGNAL RULE
// ==========================================
describe('Missing Information Rule', () => {
  test('positive: agent says not_found AND text scan finds nothing in COMPLETED audit -> NOT_FOUND_IN_SCOPE', () => {
    const result = evaluateMissingInformation({
      stepResult: {
        step_key: StepKey.DEADLINE,
        status_claimed: 'not_found',
        summary: 'No deadline was stated anywhere on the website'
      },
      auditStatus: AuditStatus.COMPLETED,
      pagesText: [
        'Welcome to the portal. Please explore available benefits and submit your feedback.'
      ]
    });

    assert.equal(result.status, FindingStatus.NOT_FOUND_IN_SCOPE);
    assert.equal(result.reason, 'verified_absent_in_retrieved_scope');
    assert.ok(result.issue);
    assert.equal(result.issue.ruleId, 'missing_information');
  });

  test('negative: agent says not_found BUT keyword scan finds English terms -> UNCONFIRMED', () => {
    const result = evaluateMissingInformation({
      stepResult: {
        step_key: StepKey.DEADLINE,
        status_claimed: 'not_found',
        summary: 'No deadline mentioned'
      },
      auditStatus: AuditStatus.COMPLETED,
      pagesText: [
        'Notice: The closing date for scholarship registration is announced under circular 4.'
      ]
    });

    assert.equal(result.status, FindingStatus.UNCONFIRMED);
    assert.equal(result.reason, 'agent_reported_not_found_but_text_scan_detected_terms');
    assert.equal(result.issue, null);
    assert.ok(result.detectedTerms.includes('closing date'));
  });

  test('negative: agent says not_found BUT keyword scan finds Hindi terms -> UNCONFIRMED', () => {
    const result = evaluateMissingInformation({
      stepResult: {
        step_key: StepKey.ELIGIBILITY,
        status_claimed: 'not_found',
        summary: 'No eligibility criteria found'
      },
      auditStatus: AuditStatus.COMPLETED,
      pagesText: [
        'योजना विवरण: आवेदक की न्यूनतम आयु सीमा 18 वर्ष है।'
      ]
    });

    assert.equal(result.status, FindingStatus.UNCONFIRMED);
    assert.equal(result.reason, 'agent_reported_not_found_but_text_scan_detected_terms');
    assert.ok(result.detectedTerms.includes('आयु सीमा'));
  });

  test('uncertain: audit status is PARTIAL -> UNCONFIRMED (never proof of non-existence)', () => {
    const result = evaluateMissingInformation({
      stepResult: {
        step_key: StepKey.DOCUMENTS,
        status_claimed: 'not_found',
        summary: 'Did not find documents'
      },
      auditStatus: AuditStatus.PARTIAL,
      pagesText: ['Empty page text without keywords']
    });

    assert.equal(result.status, FindingStatus.UNCONFIRMED);
    assert.equal(result.reason, 'audit_not_completed');
    assert.equal(result.issue, null);
  });
});

// ==========================================
// 3. CONFLICT RULE & DECOY PROTECTION
// ==========================================
describe('Conflict Rule', () => {
  test('positive: conflicting age on different pages, both SOURCE_MATCHED -> generates conflict issue', () => {
    const facts = [
      {
        id: 'f1',
        kind: 'age_max',
        value: '45',
        url: 'https://scholarships.gov.in/guidelines',
        verbatim_quote: 'The maximum applicant age limit is 45 years.',
        evidence: { status: EvidenceStatus.SOURCE_MATCHED }
      },
      {
        id: 'f2',
        kind: 'age_max',
        value: '60',
        url: 'https://scholarships.gov.in/faq',
        verbatim_quote: 'Candidates may apply up to 60 years of age.',
        evidence: { status: EvidenceStatus.SOURCE_MATCHED }
      }
    ];

    const issues = evaluateConflicts(facts);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].ruleId, 'conflict');
    assert.ok(issues[0].description.includes('45'));
    assert.ok(issues[0].description.includes('60'));
  });

  test('negative (decoy): applicant age vs children hostel age must NOT conflict', () => {
    const facts = [
      {
        id: 'f1',
        kind: 'age_min',
        value: '18',
        url: 'https://scholarships.gov.in/guidelines',
        verbatim_quote: 'Applicant must have completed 18 years of age at application time.',
        evidence: { status: EvidenceStatus.SOURCE_MATCHED }
      },
      {
        id: 'f2',
        kind: 'age_min',
        value: '6',
        url: 'https://scholarships.gov.in/hostel-rules',
        verbatim_quote: 'Children admitted to government hostel facilities must be minimum 6 years of age.',
        evidence: { status: EvidenceStatus.SOURCE_MATCHED }
      }
    ];

    const issues = evaluateConflicts(facts);
    assert.equal(issues.length, 0, 'Applicant age and children hostel age must not conflict');
  });

  test('uncertain: unverified evidence (QUOTE_NOT_FOUND or COULD_NOT_VERIFY) must NOT generate conflict', () => {
    const facts = [
      {
        id: 'f1',
        kind: 'age_max',
        value: '45',
        url: 'https://scholarships.gov.in/guidelines',
        verbatim_quote: 'Maximum age 45 years.',
        evidence: { status: EvidenceStatus.SOURCE_MATCHED }
      },
      {
        id: 'f2',
        kind: 'age_max',
        value: '60',
        url: 'https://scholarships.gov.in/faq',
        verbatim_quote: 'Maximum age 60 years.',
        evidence: { status: EvidenceStatus.COULD_NOT_VERIFY } // Not verified!
      }
    ];

    const issues = evaluateConflicts(facts);
    assert.equal(issues.length, 0, 'Unverified claims cannot trigger a verified conflict');
  });
});

// ==========================================
// 4. SCATTERED REQUIREMENTS RULE
// ==========================================
describe('Scattered Requirements Rule', () => {
  test('positive: requirements on 2+ pages and no single page contains them all -> scattered issue', () => {
    const facts = [
      {
        id: 'f1',
        kind: 'document',
        value: 'Income Certificate',
        url: 'https://scholarships.gov.in/eligibility',
        evidence: { status: EvidenceStatus.SOURCE_MATCHED }
      },
      {
        id: 'f2',
        kind: 'document',
        value: 'Caste Certificate',
        url: 'https://scholarships.gov.in/faq',
        evidence: { status: EvidenceStatus.SOURCE_MATCHED }
      }
    ];

    const issues = evaluateScatteredRequirements({
      facts,
      landingUrl: 'https://scholarships.gov.in'
    });
    assert.equal(issues.length, 1);
    assert.equal(issues[0].ruleId, 'scattered_requirements');
  });

  test('negative: single consolidated page contains all documents -> NO scattered issue', () => {
    const facts = [
      {
        id: 'f1',
        kind: 'document',
        value: 'Income Certificate',
        url: 'https://scholarships.gov.in/checklist',
        evidence: { status: EvidenceStatus.SOURCE_MATCHED }
      },
      {
        id: 'f2',
        kind: 'document',
        value: 'Caste Certificate',
        url: 'https://scholarships.gov.in/checklist',
        evidence: { status: EvidenceStatus.SOURCE_MATCHED }
      }
    ];

    const issues = evaluateScatteredRequirements({
      facts,
      landingUrl: 'https://scholarships.gov.in'
    });
    assert.equal(issues.length, 0);
  });

  test('uncertain: unverified document facts do not trigger scattered issue', () => {
    const facts = [
      {
        id: 'f1',
        kind: 'document',
        value: 'Income Certificate',
        url: 'https://scholarships.gov.in/page1',
        evidence: { status: EvidenceStatus.COULD_NOT_VERIFY }
      },
      {
        id: 'f2',
        kind: 'document',
        value: 'Caste Certificate',
        url: 'https://scholarships.gov.in/page2',
        evidence: { status: EvidenceStatus.SOURCE_MATCHED }
      }
    ];

    const issues = evaluateScatteredRequirements({ facts });
    assert.equal(issues.length, 0);
  });
});

// ==========================================
// 5. PAST DEADLINE RULE
// ==========================================
describe('Past Deadline Rule', () => {
  const referenceDate = { year: 2026, month: 10, day: 21 }; // Current reference date

  test('positive: explicit date in the past -> flags past_deadline labeled potentially outdated', () => {
    const facts = [
      {
        id: 'f-dl',
        kind: 'deadline_date',
        value: '15/03/2026',
        url: 'https://scholarships.gov.in/scheme',
        verbatim_quote: 'Last date for submission is 15/03/2026.',
        evidence: { status: EvidenceStatus.SOURCE_MATCHED }
      }
    ];

    const issues = evaluatePastDeadlines({ facts, referenceDate });
    assert.equal(issues.length, 1);
    assert.equal(issues[0].ruleId, 'past_deadline');
    assert.equal(issues[0].label, 'potentially outdated');
  });

  test('negative: future date -> NO past deadline issue', () => {
    const facts = [
      {
        id: 'f-dl',
        kind: 'deadline_date',
        value: '31/12/2026',
        url: 'https://scholarships.gov.in/scheme',
        verbatim_quote: 'Last date for submission is 31/12/2026.',
        evidence: { status: EvidenceStatus.SOURCE_MATCHED }
      }
    ];

    const issues = evaluatePastDeadlines({ facts, referenceDate });
    assert.equal(issues.length, 0);
  });

  test('uncertain: relative or non-explicit date cannot be evaluated -> NO issue', () => {
    const facts = [
      {
        id: 'f-dl',
        kind: 'deadline_date',
        value: 'open until further orders',
        url: 'https://scholarships.gov.in/scheme',
        verbatim_quote: 'Admissions are open until further orders.',
        evidence: { status: EvidenceStatus.SOURCE_MATCHED }
      }
    ];

    const issues = evaluatePastDeadlines({ facts, referenceDate });
    assert.equal(issues.length, 0);
  });
});

// ==========================================
// 6. BROKEN NEXT STEP RULE
// ==========================================
describe('Broken Next Step Rule', () => {
  test('positive: HTTP 404 and 410 count as broken next step', () => {
    const r404 = evaluateNextStepDestination({
      targetUrl: 'https://scholarships.gov.in/apply',
      httpStatus: 404,
      findingId: 'f-next'
    });
    assert.equal(r404.isBroken, true);
    assert.ok(r404.issue);
    assert.equal(r404.issue.ruleId, 'broken_next_step');

    const r410 = evaluateNextStepDestination({
      targetUrl: 'https://scholarships.gov.in/apply',
      httpStatus: 410,
      findingId: 'f-next'
    });
    assert.equal(r410.isBroken, true);
    assert.ok(r410.issue);
  });

  test('negative: HTTP 200 is reachable -> NOT broken', () => {
    const r200 = evaluateNextStepDestination({
      targetUrl: 'https://scholarships.gov.in/apply',
      httpStatus: 200
    });
    assert.equal(r200.isBroken, false);
    assert.equal(r200.issue, null);
  });

  test('uncertain: HTTP 401/403 or network timeout is COULD_NOT_VERIFY, NOT broken', () => {
    // 401 Unauthorized / Login wall
    const r401 = evaluateNextStepDestination({
      targetUrl: 'https://scholarships.gov.in/auth',
      httpStatus: 401
    });
    assert.equal(r401.isBroken, false);
    assert.equal(r401.status, EvidenceStatus.COULD_NOT_VERIFY);
    assert.equal(r401.reason, 'login_wall_or_auth_required');
    assert.equal(r401.issue, null);

    // Network timeout
    const rTimeout = evaluateNextStepDestination({
      targetUrl: 'https://scholarships.gov.in/apply',
      fetchError: { code: 'ETIMEDOUT' }
    });
    assert.equal(rTimeout.isBroken, false);
    assert.equal(rTimeout.status, EvidenceStatus.COULD_NOT_VERIFY);
    assert.equal(rTimeout.reason, 'retrieval_timeout_or_network_error');
    assert.equal(rTimeout.issue, null);
  });
});
