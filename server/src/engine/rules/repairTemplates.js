/**
 * server/src/engine/rules/repairTemplates.js
 *
 * Predefined, deterministic repair suggestions keyed by rule ID.
 * Filled with real evidence tokens. Never uses an LLM.
 */

export const RuleId = Object.freeze({
  MISSING_INFORMATION: 'missing_information',
  CONFLICT: 'conflict',
  SCATTERED_REQUIREMENTS: 'scattered_requirements',
  PAST_DEADLINE: 'past_deadline',
  BROKEN_NEXT_STEP: 'broken_next_step'
});

export const repairTemplates = {
  [RuleId.MISSING_INFORMATION]: ({ stepKey, term }) =>
    `Publish explicit, self-contained details for "${stepKey || term}" on the scheme landing page so citizens do not have to search external or secondary portals.`,

  [RuleId.CONFLICT]: ({ kind, val1, url1, val2, url2 }) =>
    `Reconcile conflicting values for ${kind}: "${val1}" on ${url1} versus "${val2}" on ${url2}. Update both pages to state the same canonical requirement.`,

  [RuleId.SCATTERED_REQUIREMENTS]: ({ items, landingUrl }) =>
    `Consolidate scattered requirements (${items.join(', ')}) into a single canonical checklist on ${landingUrl || 'the scheme overview page'}.`,

  [RuleId.PAST_DEADLINE]: ({ dateStr, url }) =>
    `Update potentially outdated deadline "${dateStr}" cited on ${url} to reflect the active application cycle, or clearly state that submissions are closed.`,

  [RuleId.BROKEN_NEXT_STEP]: ({ targetUrl, httpStatus }) =>
    `Fix broken call-to-action link pointing to ${targetUrl} (returned HTTP ${httpStatus}). Ensure the button links to an active application form.`
};
