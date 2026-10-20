/**
 * shared/constants.js
 *
 * Core status taxonomy and shared enums for JanPath.
 * Single source of truth across backend, rules engine, and frontend.
 */

// Evidence verification statuses
export const EvidenceStatus = Object.freeze({
  SOURCE_MATCHED: 'SOURCE_MATCHED',
  QUOTE_NOT_FOUND: 'QUOTE_NOT_FOUND',
  COULD_NOT_VERIFY: 'COULD_NOT_VERIFY'
});

// Finding classification statuses
export const FindingStatus = Object.freeze({
  VERIFIED_FOUND: 'VERIFIED_FOUND',
  UNVERIFIED_CLAIM: 'UNVERIFIED_CLAIM',
  NOT_FOUND_IN_SCOPE: 'NOT_FOUND_IN_SCOPE',
  UNCONFIRMED: 'UNCONFIRMED'
});

// Audit lifecycle statuses
export const AuditStatus = Object.freeze({
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  PARTIAL: 'PARTIAL',
  EXPLORATION_FAILED: 'EXPLORATION_FAILED'
});

// Comparison statuses between two audits
export const ComparisonStatus = Object.freeze({
  RESOLVED: 'RESOLVED',
  NEW: 'NEW',
  PERSISTENT: 'PERSISTENT',
  INCONCLUSIVE: 'INCONCLUSIVE'
});

// Known step keys for the exploration schema
export const StepKey = Object.freeze({
  ELIGIBILITY: 'eligibility',
  DOCUMENTS: 'documents',
  APPLICATION_STEPS: 'application_steps',
  DEADLINE: 'deadline',
  NEXT_ACTION: 'next_action'
});

// Claimed status from agent exploration
export const StepClaimStatus = Object.freeze({
  FOUND: 'found',
  PARTIALLY_FOUND: 'partially_found',
  NOT_FOUND: 'not_found'
});

// Known fact kinds
export const FactKind = Object.freeze({
  AGE_MIN: 'age_min',
  AGE_MAX: 'age_max',
  FEE_AMOUNT: 'fee_amount',
  DEADLINE_DATE: 'deadline_date',
  DOCUMENT: 'document'
});
