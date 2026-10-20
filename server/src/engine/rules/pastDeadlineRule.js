/**
 * server/src/engine/rules/pastDeadlineRule.js
 *
 * Deterministic Past Deadline Rule:
 * Flags explicit dates earlier than the reference date in IST.
 *
 * CRITICAL REQUIREMENTS:
 * 1. NEVER use Date.parse.
 * 2. Parse dd/mm/yyyy and explicit Indian text date formats.
 * 3. Takes an injectable referenceDate.
 * 4. Label: "potentially outdated".
 */

import { EvidenceStatus } from '../../../../shared/constants.js';
import { RuleId, repairTemplates } from './repairTemplates.js';
import { parseExplicitDate, isDateStrictlyPast } from './dateParser.js';

/**
 * Evaluates deadline facts for potentially outdated dates.
 *
 * @param {Object} params
 * @param {Object[]} params.facts - Array of facts
 * @param {Date|Object} [params.referenceDate] - Injectable reference date
 * @returns {Object[]} Generated past deadline issues
 */
export function evaluatePastDeadlines({ facts = [], referenceDate }) {
  const issues = [];

  const deadlineFacts = facts.filter(
    (f) =>
      f &&
      f.kind === 'deadline_date' &&
      f.evidence &&
      f.evidence.status === EvidenceStatus.SOURCE_MATCHED
  );

  for (const fact of deadlineFacts) {
    // Try parsing date from fact value first, then fallback to quote
    const parsed =
      parseExplicitDate(String(fact.value)) ||
      parseExplicitDate(String(fact.verbatim_quote));

    if (!parsed) {
      // Unparseable or relative date (e.g. "open all year") -> uncertain, do not flag
      continue;
    }

    if (isDateStrictlyPast(parsed, referenceDate)) {
      issues.push({
        id: `issue-past-deadline-${fact.id || issues.length + 1}`,
        ruleId: RuleId.PAST_DEADLINE,
        title: 'Application deadline is potentially outdated',
        description: `Explicit deadline "${parsed.raw}" cited on ${fact.url} is earlier than current date (IST). Citizen may be unable to submit an application.`,
        severity: 'warning',
        label: 'potentially outdated',
        findingIds: [fact.id].filter(Boolean),
        repairSuggestion: repairTemplates[RuleId.PAST_DEADLINE]({
          dateStr: parsed.raw,
          url: fact.url
        })
      });
    }
  }

  return issues;
}
