/**
 * server/test/verifier.test.js
 *
 * Unit tests for Evidence Verification Engine and Normalizer.
 * Run with built-in: node --test test/verifier.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { verifyEvidence } from '../src/engine/verifier.js';
import { normalizeText } from '../src/lib/normalize.js';
import { EvidenceStatus } from '../../shared/constants.js';

// Base dummy text generator ensuring page text >= 300 characters
function createSamplePage(content) {
  const boilerplate = ' Department of Higher Education, Government of India. Official Portal for Scholarship Schemes and Welfare Benefits. All rights reserved. For queries contact support@gov.in or helpline 1800-000-000. Terms and conditions apply. Please ensure all documents are submitted prior to closing.';
  return content + boilerplate + ' ' + boilerplate;
}

describe('normalizeText', () => {
  test('lowercases and collapses multiple whitespaces', () => {
    const input = '  Applicant   MUST be   Between \n\n 18 and 25  ';
    assert.equal(normalizeText(input), 'applicant must be between 18 and 25');
  });

  test('normalizes curly quotes to standard ASCII apostrophe/quotes', () => {
    const input = '“Candidate’s passport” is required';
    assert.equal(normalizeText(input), '"candidate\'s passport" is required');
  });

  test('normalizes en-dash, em-dash, and minus to hyphen', () => {
    const input = 'age: 18–25 years — fee: 500−0';
    assert.equal(normalizeText(input), 'age: 18-25 years - fee: 500-0');
  });

  test('strips markdown pipes, headers, bold, and links', () => {
    const input = '# Guidelines\n| **Field** | *Requirement* |\n| Age | [18-25 years](https://example.gov.in) |';
    const result = normalizeText(input);
    assert.ok(result.includes('guidelines'));
    assert.ok(result.includes('field'));
    assert.ok(result.includes('18-25 years'));
    assert.ok(!result.includes('|'));
    assert.ok(!result.includes('#'));
    assert.ok(!result.includes('**'));
  });

  test('preserves Devanagari Hindi text accurately', () => {
    const input = '  छात्रवृत्ति   के लिए  पात्रता  शर्तें ';
    assert.equal(normalizeText(input), 'छात्रवृत्ति के लिए पात्रता शर्तें');
  });
});

describe('verifyEvidence', () => {
  // ---------------- POSITIVE CASES ----------------
  test('positive: exact match of quote in page text', () => {
    const quote = 'applicants must submit income certificate issued by tehsildar';
    const pageText = createSamplePage(`Note that ${quote}. Late submissions will be rejected.`);
    const result = verifyEvidence({
      quote,
      retrievedPage: { url: 'https://scholarships.gov.in/scheme', text: pageText },
      requestedUrl: 'https://scholarships.gov.in/scheme'
    });

    assert.equal(result.status, EvidenceStatus.SOURCE_MATCHED);
    assert.equal(result.reason, 'exact_or_normalized_match');
    assert.ok(result.matchedSnippet.includes(quote));
  });

  test('positive: quote with curly quotes matching straight quotes in page', () => {
    const quote = '“annual family income must not exceed 2.5 lakh”';
    const pageText = createSamplePage('Eligibility: "annual family income must not exceed 2.5 lakh" per financial year.');
    const result = verifyEvidence({
      quote,
      retrievedPage: { url: 'https://scholarships.gov.in/scheme', text: pageText }
    });

    assert.equal(result.status, EvidenceStatus.SOURCE_MATCHED);
  });

  test('positive: quote with extra odd whitespace and newlines', () => {
    const quote = 'domicile   certificate \n\n  issued   by state authority';
    const pageText = createSamplePage('Mandatory list: domicile certificate issued by state authority.');
    const result = verifyEvidence({
      quote,
      retrievedPage: { url: 'https://scholarships.gov.in/scheme', text: pageText }
    });

    assert.equal(result.status, EvidenceStatus.SOURCE_MATCHED);
  });

  test('positive: en-dash in quote matches hyphen in page', () => {
    const quote = 'candidate age must be 18–35 years';
    const pageText = createSamplePage('Criteria: Candidate age must be 18-35 years at application time.');
    const result = verifyEvidence({
      quote,
      retrievedPage: { url: 'https://scholarships.gov.in/scheme', text: pageText }
    });

    assert.equal(result.status, EvidenceStatus.SOURCE_MATCHED);
  });

  test('positive: markdown table text match', () => {
    const quote = 'minimum marks 60 percent in qualifying exam';
    const markdownPage = createSamplePage('| Degree | Minimum marks | 60 percent in qualifying exam | Eligible |');
    const result = verifyEvidence({
      quote,
      retrievedPage: { url: 'https://scholarships.gov.in/scheme', text: markdownPage }
    });

    assert.equal(result.status, EvidenceStatus.SOURCE_MATCHED);
  });

  test('positive: Hindi text quote verification', () => {
    const quote = 'आवेदक की आयु 18 से 25 वर्ष के बीच होनी चाहिए';
    const pageText = createSamplePage(`पात्रता मापदंड: ${quote}। कृपया सभी दस्तावेज अपलोड करें।`);
    const result = verifyEvidence({
      quote,
      retrievedPage: { url: 'https://scholarships.gov.in/hindi', text: pageText }
    });

    assert.equal(result.status, EvidenceStatus.SOURCE_MATCHED);
  });

  // ---------------- NEGATIVE CASES ----------------
  test('negative: altered number must NOT match', () => {
    const quote = 'annual family income must not exceed 5.0 lakh';
    const pageText = createSamplePage('Eligibility: annual family income must not exceed 2.5 lakh per financial year.');
    const result = verifyEvidence({
      quote,
      retrievedPage: { url: 'https://scholarships.gov.in/scheme', text: pageText }
    });

    assert.equal(result.status, EvidenceStatus.QUOTE_NOT_FOUND);
    assert.equal(result.reason, 'quote_not_in_text');
    assert.equal(result.matchedSnippet, null);
  });

  test('negative: altered word must NOT match', () => {
    const quote = 'candidates must provide birth certificate';
    const pageText = createSamplePage('Candidates must provide caste certificate to claim reservation benefits.');
    const result = verifyEvidence({
      quote,
      retrievedPage: { url: 'https://scholarships.gov.in/scheme', text: pageText }
    });

    assert.equal(result.status, EvidenceStatus.QUOTE_NOT_FOUND);
  });

  test('negative: completely absent quote returns QUOTE_NOT_FOUND', () => {
    const quote = 'scholarship amount will be disbursed via postal money order';
    const pageText = createSamplePage('All funds will be directly credited via Direct Benefit Transfer (DBT) to bank accounts.');
    const result = verifyEvidence({
      quote,
      retrievedPage: { url: 'https://scholarships.gov.in/scheme', text: pageText }
    });

    assert.equal(result.status, EvidenceStatus.QUOTE_NOT_FOUND);
  });

  // ---------------- UNCERTAIN CASES (COULD_NOT_VERIFY) ----------------
  test('uncertain: retrieval error returns COULD_NOT_VERIFY with retrieval_error reason', () => {
    const quote = 'valid quote longer than fifteen characters';
    const result = verifyEvidence({
      quote,
      retrievedPage: null,
      fetchError: { code: 'FETCH_TIMEOUT', message: 'Connection timed out' }
    });

    assert.equal(result.status, EvidenceStatus.COULD_NOT_VERIFY);
    assert.equal(result.reason, 'retrieval_error');
    assert.equal(result.matchedSnippet, null);
  });

  test('uncertain: 222-char footer-only page returns COULD_NOT_VERIFY with insufficient_page_text', () => {
    // Exact simulation of the MyScheme JS-only issue (222 characters of footer)
    const quote = 'scholarship eligibility criteria for applicants';
    const footerOnlyText = 'National Scholarship Portal. Designed and hosted by National Informatics Centre. Disclaimer: Content on this website is published and managed by concerned ministries. Helpdesk: 0120-6619540. Version 3.2.01. Copyright 2026.';
    assert.equal(footerOnlyText.length, 222);

    const result = verifyEvidence({
      quote,
      retrievedPage: { url: 'https://scholarships.gov.in/scheme', text: footerOnlyText }
    });

    assert.equal(result.status, EvidenceStatus.COULD_NOT_VERIFY);
    assert.equal(result.reason, 'insufficient_page_text');
    assert.equal(result.matchedSnippet, null);
  });

  test('uncertain: quote shorter than 15 characters returns COULD_NOT_VERIFY with quote_too_short', () => {
    const quote = 'age 18 to 25'; // 12 characters
    const pageText = createSamplePage('age 18 to 25 is required.');
    const result = verifyEvidence({
      quote,
      retrievedPage: { url: 'https://scholarships.gov.in/scheme', text: pageText }
    });

    assert.equal(result.status, EvidenceStatus.COULD_NOT_VERIFY);
    assert.equal(result.reason, 'quote_too_short');
  });

  test('uncertain: out-of-scope redirect returns COULD_NOT_VERIFY with redirected_out_of_scope', () => {
    const quote = 'applicants must submit income certificate issued by tehsildar';
    const pageText = createSamplePage(quote);

    // Redirected from scholarships.gov.in to external-ad-portal.com
    const result = verifyEvidence({
      quote,
      retrievedPage: { url: 'https://external-ad-portal.com/page', text: pageText },
      requestedUrl: 'https://scholarships.gov.in/scheme',
      options: {
        isHostAllowed: (host) => host.endsWith('.gov.in')
      }
    });

    assert.equal(result.status, EvidenceStatus.COULD_NOT_VERIFY);
    assert.equal(result.reason, 'redirected_out_of_scope');
  });

  test('uncertain: invalid input (null or non-string quote) returns COULD_NOT_VERIFY', () => {
    const pageText = createSamplePage('valid page text');
    const result = verifyEvidence({
      quote: null,
      retrievedPage: { url: 'https://scholarships.gov.in/scheme', text: pageText }
    });

    assert.equal(result.status, EvidenceStatus.COULD_NOT_VERIFY);
    assert.equal(result.reason, 'invalid_input');
  });
});
