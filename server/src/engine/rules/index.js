/**
 * server/src/engine/rules/index.js
 *
 * Deterministic Rules Runner:
 * Coordinates all rule checks (missing info, conflicts, scattered requirements,
 * past deadlines, broken next steps) without any LLM.
 */

import { evaluateMissingInformation } from './missingInformationRule.js';
import { evaluateConflicts } from './conflictRule.js';
import { evaluateScatteredRequirements } from './scatteredRule.js';
import { evaluatePastDeadlines } from './pastDeadlineRule.js';
import { evaluateNextStepDestination } from './brokenNextStepRule.js';

export {
  evaluateMissingInformation,
  evaluateConflicts,
  evaluateScatteredRequirements,
  evaluatePastDeadlines,
  evaluateNextStepDestination
};

/**
 * Runs all deterministic rules on an audit dataset.
 *
 * @param {Object} params
 * @param {Object} params.audit - The audit object
 * @param {Object[]} params.facts - Verified facts with evidence
 * @param {Object[]} [params.steps] - Step results from agent exploration
 * @param {string[]} [params.pagesText] - Text content of all retrieved pages
 * @param {Date|Object} [params.referenceDate] - Injectable reference date
 * @returns {Object[]} Array of detected issues
 */
export function runAllRules({
  audit,
  facts = [],
  steps = [],
  pagesText = [],
  referenceDate
}) {
  const issues = [];

  // 1. Missing information rules for any step reported 'not_found'
  if (Array.isArray(steps)) {
    for (const step of steps) {
      if (step.status_claimed === 'not_found') {
        const result = evaluateMissingInformation({
          stepResult: step,
          auditStatus: audit?.status,
          pagesText
        });
        if (result && result.issue) {
          issues.push(result.issue);
        }
      }
    }
  }

  // 2. Conflict rule across verified SOURCE_MATCHED facts
  const conflictIssues = evaluateConflicts(facts);
  issues.push(...conflictIssues);

  // 3. Scattered requirements rule
  const scatteredIssues = evaluateScatteredRequirements({
    facts,
    landingUrl: audit?.startUrl
  });
  issues.push(...scatteredIssues);

  // 4. Past deadline rule
  const deadlineIssues = evaluatePastDeadlines({
    facts,
    referenceDate
  });
  issues.push(...deadlineIssues);

  // 5. Deduplicate issues by ID
  const uniqueIssues = [];
  const seenIds = new Set();
  for (const issue of issues) {
    if (!seenIds.has(issue.id)) {
      seenIds.add(issue.id);
      uniqueIssues.push(issue);
    }
  }

  return uniqueIssues;
}
