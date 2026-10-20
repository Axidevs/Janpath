/**
 * server/src/engine/rules/conflictRule.js
 *
 * Deterministic Conflict Detection Rule:
 * Identifies contradictory requirements for the same fact kind on different pages.
 *
 * CRITICAL CONDITIONS:
 * 1. ONLY between facts where BOTH pieces of evidence have status === SOURCE_MATCHED.
 * 2. Facts must reside on DIFFERENT pages (different normalized URLs).
 * 3. Values must differ.
 * 4. Decoy Prevention: Facts must relate to the same subject scope. For example,
 *    an applicant's age limit must NOT conflict with a children's hostel age rule.
 */

import { EvidenceStatus } from '../../../../shared/constants.js';
import { RuleId, repairTemplates } from './repairTemplates.js';
import { normalizeText } from '../../lib/normalize.js';

const CHILD_HOSTEL_KEYWORDS = /\b(child|children|hostel|ward|infant|dependent|nursery|baalika|baalak)\b/i;

/**
 * Normalizes URL for page comparison (strips trailing slashes, lowercases).
 * @param {string} urlStr
 * @returns {string}
 */
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
 * Infers the subject scope of a fact from its quote or explicit scope attribute.
 * Prevents decoys like applicant age vs. child/dependent/hostel age from falsely conflicting.
 *
 * @param {Object} fact
 * @returns {string} 'child_hostel' | 'applicant'
 */
export function inferFactSubject(fact) {
  if (fact.scope) return fact.scope;
  const quote = fact.verbatim_quote || '';
  if (CHILD_HOSTEL_KEYWORDS.test(quote)) {
    return 'child_hostel';
  }
  return 'applicant';
}

/**
 * Evaluates verified facts for conflicts.
 *
 * @param {Object[]} facts - Array of fact objects
 * @returns {Object[]} Array of generated conflict issues
 */
export function evaluateConflicts(facts = []) {
  const issues = [];
  const seenPairs = new Set();

  // 1. Filter only facts with verified SOURCE_MATCHED evidence
  const verifiedFacts = facts.filter(
    (f) => f && f.evidence && f.evidence.status === EvidenceStatus.SOURCE_MATCHED
  );

  for (let i = 0; i < verifiedFacts.length; i++) {
    for (let j = i + 1; j < verifiedFacts.length; j++) {
      const f1 = verifiedFacts[i];
      const f2 = verifiedFacts[j];

      // Must be the same fact kind
      if (f1.kind !== f2.kind) continue;

      // Must be on DIFFERENT pages
      const page1 = normalizePageUrl(f1.url);
      const page2 = normalizePageUrl(f2.url);
      if (!page1 || !page2 || page1 === page2) continue;

      // Must have different normalized values
      const val1 = normalizeText(String(f1.value));
      const val2 = normalizeText(String(f2.value));
      if (val1 === val2) continue;

      // Decoy Guard: Must share the same subject scope
      const sub1 = inferFactSubject(f1);
      const sub2 = inferFactSubject(f2);
      if (sub1 !== sub2) {
        // Different subjects (e.g. applicant age vs children hostel age) -> NO CONFLICT
        continue;
      }

      // Avoid duplicate issue pairs in symmetric comparisons
      const pairKey = [f1.id || f1.url, f2.id || f2.url].sort().join('::');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      issues.push({
        id: `issue-conflict-${f1.kind}-${issues.length + 1}`,
        ruleId: RuleId.CONFLICT,
        title: `Contradictory ${f1.kind} requirements across pages`,
        description: `Page ${f1.url} states "${f1.value}" while page ${f2.url} states "${f2.value}".`,
        severity: 'error',
        findingIds: [f1.id, f2.id].filter(Boolean),
        repairSuggestion: repairTemplates[RuleId.CONFLICT]({
          kind: f1.kind,
          val1: f1.value,
          url1: f1.url,
          val2: f2.value,
          url2: f2.url
        })
      });
    }
  }

  return issues;
}
