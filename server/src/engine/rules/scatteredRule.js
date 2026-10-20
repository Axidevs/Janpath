/**
 * server/src/engine/rules/scatteredRule.js
 *
 * Deterministic Scattered Requirements Rule:
 * Identifies requirements (e.g. mandatory documents or proofs) distributed
 * across 2+ distinct pages where no single verified page contains them all.
 */

import { EvidenceStatus } from '../../../../shared/constants.js';
import { RuleId, repairTemplates } from './repairTemplates.js';
import { normalizeText } from '../../lib/normalize.js';

function normalizePageUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    const u = new URL(urlStr);
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return urlStr.trim().toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Evaluates whether required documents/items are scattered without a consolidated list.
 *
 * @param {Object} params
 * @param {Object[]} params.facts - All facts collected from exploration
 * @param {string} [params.landingUrl] - Primary scheme entry URL
 * @returns {Object[]} Array of generated scattered issues (at most 1)
 */
export function evaluateScatteredRequirements({ facts = [], landingUrl }) {
  // 1. Filter for verified document facts
  const verifiedDocFacts = facts.filter(
    (f) =>
      f &&
      f.kind === 'document' &&
      f.evidence &&
      f.evidence.status === EvidenceStatus.SOURCE_MATCHED
  );

  if (verifiedDocFacts.length < 2) {
    return [];
  }

  // 2. Map normalized items and the pages they appear on
  const itemPages = new Map(); // normalizedItem -> Set of normalized page URLs
  const itemLabels = new Map(); // normalizedItem -> original display label
  const allPages = new Set();
  const pageItems = new Map(); // normalized page URL -> Set of normalized items

  for (const f of verifiedDocFacts) {
    const normItem = normalizeText(String(f.value));
    const pageUrl = normalizePageUrl(f.url);
    if (!normItem || !pageUrl) continue;

    if (!itemPages.has(normItem)) {
      itemPages.set(normItem, new Set());
      itemLabels.set(normItem, f.value);
    }
    itemPages.get(normItem).add(pageUrl);
    allPages.add(pageUrl);

    if (!pageItems.has(pageUrl)) {
      pageItems.set(pageUrl, new Set());
    }
    pageItems.get(pageUrl).add(normItem);
  }

  const distinctItems = Array.from(itemPages.keys());
  if (distinctItems.length < 2 || allPages.size < 2) {
    return [];
  }

  // 3. Check if any single page contains ALL distinct items
  let hasConsolidatedPage = false;
  for (const itemsOnPage of pageItems.values()) {
    if (distinctItems.every((item) => itemsOnPage.has(item))) {
      hasConsolidatedPage = true;
      break;
    }
  }

  if (hasConsolidatedPage) {
    return [];
  }

  // No single page contains all requirements -> SCATTERED ISSUE
  const displayItems = distinctItems.map((k) => itemLabels.get(k) || k);
  const findingIds = verifiedDocFacts.map((f) => f.id).filter(Boolean);

  return [
    {
      id: `issue-scattered-documents`,
      ruleId: RuleId.SCATTERED_REQUIREMENTS,
      title: 'Mandatory requirements scattered across multiple pages',
      description: `Mandatory items (${displayItems.join(', ')}) are distributed across ${allPages.size} separate pages with no single canonical page containing all of them.`,
      severity: 'warning',
      findingIds,
      repairSuggestion: repairTemplates[RuleId.SCATTERED_REQUIREMENTS]({
        items: displayItems,
        landingUrl
      })
    }
  ];
}
