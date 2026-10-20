/**
 * server/src/engine/rules/missingInformationRule.js
 *
 * Deterministic Two-Signal Missing Information Rule:
 * NOT_FOUND_IN_SCOPE is assigned ONLY IF:
 *   1. The agent reported status_claimed === 'not_found'
 *   2. The audit run status is COMPLETED
 *   3. Our independent keyword and date scan across all retrieved page text finds nothing.
 *
 * If the agent and our scan disagree, status is UNCONFIRMED.
 * Failure to find something is never proof it does not exist.
 */

import { FindingStatus, AuditStatus, StepKey } from '../../../../shared/constants.js';
import { RuleId, repairTemplates } from './repairTemplates.js';
import { normalizeText } from '../../lib/normalize.js';
import { parseExplicitDate } from './dateParser.js';

export const STEP_KEYWORDS = {
  [StepKey.ELIGIBILITY]: [
    'eligibility', 'eligible', 'age limit', 'income limit', 'criteria', 'qualification', 'family income',
    'पात्रता', 'पात्र', 'आयु सीमा', 'आय सीमा', 'मापदंड', 'योग्यता'
  ],
  [StepKey.DOCUMENTS]: [
    'document', 'certificate', 'marksheet', 'income certificate', 'caste certificate', 'aadhaar', 'domicile',
    'दस्तावेज', 'प्रमाण पत्र', 'अंकतालिका', 'आय प्रमाण', 'जाति प्रमाण', 'आधार', 'मूल निवास'
  ],
  [StepKey.APPLICATION_STEPS]: [
    'how to apply', 'application steps', 'apply online', 'procedure', 'registration', 'portal steps',
    'आवेदन कैसे करें', 'आवेदन प्रक्रिया', 'पंजीकरण', 'आवेदन चरण'
  ],
  [StepKey.DEADLINE]: [
    'last date', 'deadline', 'closing date', 'due date', 'final date', 'application window',
    'अंतिम तिथि', 'समय सीमा', 'समाप्ति तिथि', 'आखिरी तारीख'
  ],
  [StepKey.NEXT_ACTION]: [
    'apply now', 'click here to apply', 'application form', 'apply online', 'login to apply', 'portal link',
    'ऑनलाइन आवेदन', 'यहाँ क्लिक करें', 'आवेदन करें', 'आवेदन पत्र'
  ]
};

/**
 * Scans page texts for keywords and dates matching a step key.
 * @param {string} stepKey
 * @param {string[]} pagesText
 * @returns {{ matchedKeywords: string[], matchedDates: string[] }}
 */
export function scanPageTextsForStep(stepKey, pagesText = []) {
  const combinedText = pagesText.map(t => normalizeText(t)).join(' ');
  const keywords = STEP_KEYWORDS[stepKey] || [];

  const matchedKeywords = [];
  for (const kw of keywords) {
    const normKw = normalizeText(kw);
    if (combinedText.includes(normKw)) {
      matchedKeywords.push(kw);
    }
  }

  const matchedDates = [];
  if (stepKey === StepKey.DEADLINE) {
    // Check if any explicit date format exists in text
    const parsed = parseExplicitDate(combinedText);
    if (parsed) {
      matchedDates.push(parsed.raw);
    }
  }

  return { matchedKeywords, matchedDates };
}

/**
 * Evaluates missing information for a step result.
 *
 * @param {Object} params
 * @param {Object} params.stepResult - { step_key, status_claimed, summary }
 * @param {string} params.auditStatus - Lifecycle status of the audit
 * @param {string[]} params.pagesText - Array of text strings from all retrieved pages
 * @returns {{
 *   status: string,
 *   reason: string,
 *   detectedTerms?: string[],
 *   issue: Object|null
 * }}
 */
export function evaluateMissingInformation({ stepResult, auditStatus, pagesText = [] }) {
  if (!stepResult) {
    return {
      status: FindingStatus.UNCONFIRMED,
      reason: 'missing_step_result',
      issue: null
    };
  }

  // If agent claimed found or partially found, this rule does not apply
  if (stepResult.status_claimed !== 'not_found') {
    return null;
  }

  // Signal 1 Guard: Audit MUST be COMPLETED. If partial or running, status is UNCONFIRMED
  if (auditStatus !== AuditStatus.COMPLETED) {
    return {
      status: FindingStatus.UNCONFIRMED,
      reason: 'audit_not_completed',
      issue: null
    };
  }

  // Signal 2: Independent keyword and date scan
  const { matchedKeywords, matchedDates } = scanPageTextsForStep(
    stepResult.step_key,
    pagesText
  );

  const detectedTerms = [...matchedKeywords, ...matchedDates];

  // If scan found relevant terms/dates, agent and scan disagree -> UNCONFIRMED
  if (detectedTerms.length > 0) {
    return {
      status: FindingStatus.UNCONFIRMED,
      reason: 'agent_reported_not_found_but_text_scan_detected_terms',
      detectedTerms,
      issue: null
    };
  }

  // Both signals agree -> NOT_FOUND_IN_SCOPE
  return {
    status: FindingStatus.NOT_FOUND_IN_SCOPE,
    reason: 'verified_absent_in_retrieved_scope',
    issue: {
      id: `issue-missing-${stepResult.step_key}`,
      ruleId: RuleId.MISSING_INFORMATION,
      title: `Missing critical step information: ${stepResult.step_key}`,
      description: `No details or guidance found for "${stepResult.step_key}" across all retrieved pages in this audit.`,
      severity: 'error',
      findingIds: [],
      repairSuggestion: repairTemplates[RuleId.MISSING_INFORMATION]({
        stepKey: stepResult.step_key
      })
    }
  };
}
