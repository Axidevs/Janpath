/**
 * server/src/engine/compare.js
 *
 * Deterministic Audit Comparison Engine:
 * Compares two audits (baseAudit and targetAudit) to determine issue evolution:
 * - RESOLVED: Confirmed fixed in target audit.
 * - NEW: Newly detected in target audit.
 * - PERSISTENT: Present in both audits.
 * - INCONCLUSIVE: Cannot confirm resolution due to failed or smaller re-audit.
 *
 * CRITICAL RULES:
 * 1. A failed or smaller re-audit must NEVER mark an old issue RESOLVED.
 * 2. If finding differences exist with identical page content hashes, label
 *    them as agent exploration variability, not a site change.
 */

import { AuditStatus, ComparisonStatus } from '../../../shared/constants.js';

/**
 * Determines whether page content has changed between two audits based on page hashes.
 *
 * @param {Array<{ url: string, hash: string }>} basePages
 * @param {Array<{ url: string, hash: string }>} targetPages
 * @returns {boolean}
 */
export function checkContentChanged(basePages = [], targetPages = []) {
  if (!basePages.length || !targetPages.length) {
    return true;
  }

  const baseMap = new Map();
  for (const p of basePages) {
    if (p.url && p.hash) baseMap.set(p.url, p.hash);
  }

  const targetMap = new Map();
  for (const p of targetPages) {
    if (p.url && p.hash) targetMap.set(p.url, p.hash);
  }

  // If different number of pages visited
  if (baseMap.size !== targetMap.size) {
    return true;
  }

  // Check if any page hash differs
  for (const [url, baseHash] of baseMap.entries()) {
    const targetHash = targetMap.get(url);
    if (!targetHash || targetHash !== baseHash) {
      return true;
    }
  }

  return false;
}

/**
 * Creates a stable deduplication/comparison key for an issue.
 * @param {Object} issue
 * @returns {string}
 */
function getIssueKey(issue) {
  if (!issue) return '';
  return `${issue.ruleId || 'unknown'}::${issue.title || ''}`;
}

/**
 * Compares a base audit with a target re-audit.
 *
 * @param {Object} baseAudit
 * @param {Object} targetAudit
 * @returns {{
 *   contentChanged: boolean,
 *   agentVariability: boolean,
 *   summary: { resolvedCount: number, newCount: number, persistentCount: number, inconclusiveCount: number },
 *   items: Array<{
 *     status: string,
 *     issue: Object,
 *     reason?: string,
 *     agentVariability?: boolean
 *   }>
 * }}
 */
export function compareAudits(baseAudit, targetAudit) {
  if (!baseAudit || !targetAudit) {
    throw new Error('Both baseAudit and targetAudit must be provided for comparison');
  }

  const contentChanged = checkContentChanged(baseAudit.pages, targetAudit.pages);

  // A failed or smaller re-audit must never mark an old issue RESOLVED
  const isTargetCompleted = targetAudit.status === AuditStatus.COMPLETED;
  const targetPageCount = (targetAudit.pages || []).length;
  const basePageCount = (baseAudit.pages || []).length;
  const isTargetSmallerScope = targetPageCount < basePageCount;

  const canResolve = isTargetCompleted && !isTargetSmallerScope;

  const baseIssues = baseAudit.issues || [];
  const targetIssues = targetAudit.issues || [];

  const baseIssueMap = new Map();
  for (const issue of baseIssues) {
    baseIssueMap.set(getIssueKey(issue), issue);
  }

  const targetIssueMap = new Map();
  for (const issue of targetIssues) {
    targetIssueMap.set(getIssueKey(issue), issue);
  }

  const items = [];
  let resolvedCount = 0;
  let newCount = 0;
  let persistentCount = 0;
  let inconclusiveCount = 0;

  // 1. Check issues present in baseAudit
  for (const [key, baseIssue] of baseIssueMap.entries()) {
    if (targetIssueMap.has(key)) {
      // Present in both audits -> PERSISTENT
      items.push({
        status: ComparisonStatus.PERSISTENT,
        issue: baseIssue,
        targetIssue: targetIssueMap.get(key)
      });
      persistentCount++;
    } else {
      // Absent in targetAudit
      if (canResolve) {
        // Confirmed fixed in a valid, equal-or-larger completed audit -> RESOLVED
        const isAgentVar = !contentChanged;
        items.push({
          status: ComparisonStatus.RESOLVED,
          issue: baseIssue,
          agentVariability: isAgentVar,
          reason: isAgentVar
            ? 'identical_page_hashes_indicate_agent_variability'
            : 'verified_fixed_in_completed_reaudit'
        });
        resolvedCount++;
      } else {
        // Cannot confirm resolution because target audit failed or had smaller scope -> INCONCLUSIVE
        const reason = !isTargetCompleted
          ? 'target_audit_not_completed'
          : 'target_audit_had_smaller_page_scope';
        items.push({
          status: ComparisonStatus.INCONCLUSIVE,
          issue: baseIssue,
          reason
        });
        inconclusiveCount++;
      }
    }
  }

  // 2. Check issues newly introduced in targetAudit
  for (const [key, targetIssue] of targetIssueMap.entries()) {
    if (!baseIssueMap.has(key)) {
      items.push({
        status: ComparisonStatus.NEW,
        issue: targetIssue
      });
      newCount++;
    }
  }

  // Flag overall agent variability if issue differences exist while page hashes remained completely identical
  const hasIssueDifferences = resolvedCount > 0 || newCount > 0;
  const agentVariability = !contentChanged && hasIssueDifferences;

  return {
    contentChanged,
    agentVariability,
    summary: {
      resolvedCount,
      newCount,
      persistentCount,
      inconclusiveCount
    },
    items
  };
}
