/**
 * server/src/engine/rules/brokenNextStepRule.js
 *
 * Deterministic Broken Next Step Rule:
 * Identifies broken application or next action links.
 *
 * CRITICAL RULE:
 * ONLY HTTP 404 and HTTP 410 count as broken.
 * Timeouts, 401/403 login walls, and blocks are COULD_NOT_VERIFY, NOT broken.
 */

import { EvidenceStatus } from '../../../../shared/constants.js';
import { RuleId, repairTemplates } from './repairTemplates.js';

/**
 * Evaluates whether a destination URL result represents a broken next step.
 *
 * @param {Object} params
 * @param {string} params.targetUrl - URL of the call-to-action
 * @param {number} [params.httpStatus] - HTTP response code
 * @param {any} [params.fetchError] - Retrieval error, if any
 * @param {string} [params.findingId] - Associated finding ID
 * @returns {{
 *   status: string,
 *   isBroken: boolean,
 *   reason: string,
 *   issue: Object|null
 * }}
 */
export function evaluateNextStepDestination({ targetUrl, httpStatus, fetchError, findingId }) {
  if (fetchError) {
    return {
      status: EvidenceStatus.COULD_NOT_VERIFY,
      isBroken: false,
      reason: 'retrieval_timeout_or_network_error',
      issue: null
    };
  }

  // ONLY 404 (Not Found) and 410 (Gone) count as broken
  if (httpStatus === 404 || httpStatus === 410) {
    return {
      status: EvidenceStatus.COULD_NOT_VERIFY,
      isBroken: true,
      reason: `http_${httpStatus}`,
      issue: {
        id: `issue-broken-next-step-${findingId || 'cta'}`,
        ruleId: RuleId.BROKEN_NEXT_STEP,
        title: `Primary application link is broken (HTTP ${httpStatus})`,
        description: `Next action link pointing to ${targetUrl} returned HTTP ${httpStatus}. Citizens cannot proceed with application submission.`,
        severity: 'error',
        findingIds: [findingId].filter(Boolean),
        repairSuggestion: repairTemplates[RuleId.BROKEN_NEXT_STEP]({
          targetUrl,
          httpStatus
        })
      }
    };
  }

  // 401/403 or other non-404 error codes are login walls or access restrictions
  if (httpStatus === 401 || httpStatus === 403) {
    return {
      status: EvidenceStatus.COULD_NOT_VERIFY,
      isBroken: false,
      reason: 'login_wall_or_auth_required',
      issue: null
    };
  }

  if (typeof httpStatus === 'number' && httpStatus >= 400) {
    return {
      status: EvidenceStatus.COULD_NOT_VERIFY,
      isBroken: false,
      reason: `http_error_${httpStatus}`,
      issue: null
    };
  }

  return {
    status: EvidenceStatus.SOURCE_MATCHED,
    isBroken: false,
    reason: 'destination_reachable',
    issue: null
  };
}
