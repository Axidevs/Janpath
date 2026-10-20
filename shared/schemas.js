/**
 * shared/schemas.js
 *
 * Zod validation schemas for JanPath:
 * - TinyFish agent result payload
 * - API request & response contracts
 * - Internal audit, finding, and evidence structures
 */

import { z } from 'zod';
import {
  EvidenceStatus,
  FindingStatus,
  AuditStatus,
  StepKey,
  StepClaimStatus,
  FactKind
} from './constants.js';

// ==========================================
// 1. TinyFish Agent Result Schemas
// ==========================================

export const AgentStepResultSchema = z.object({
  step_key: z.enum([
    StepKey.ELIGIBILITY,
    StepKey.DOCUMENTS,
    StepKey.APPLICATION_STEPS,
    StepKey.DEADLINE,
    StepKey.NEXT_ACTION
  ]),
  status_claimed: z.enum([
    StepClaimStatus.FOUND,
    StepClaimStatus.PARTIALLY_FOUND,
    StepClaimStatus.NOT_FOUND
  ]),
  summary: z.string().min(1)
});

export const AgentFactResultSchema = z.object({
  kind: z.enum([
    FactKind.AGE_MIN,
    FactKind.AGE_MAX,
    FactKind.FEE_AMOUNT,
    FactKind.DEADLINE_DATE,
    FactKind.DOCUMENT
  ]),
  value: z.string().min(1),
  url: z.string().url(),
  verbatim_quote: z.string().min(1)
});

export const AgentResultSchema = z.object({
  steps: z.array(AgentStepResultSchema),
  facts: z.array(AgentFactResultSchema),
  pages_visited: z.array(z.string().url()),
  click_path: z.array(z.string()),
  limitations: z.string().nullable()
});

export const HttpUrlSchema = z.string().url().refine(
  (val) => {
    try {
      const parsed = new URL(val);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  },
  { message: 'URL must use http or https protocol' }
);

// ==========================================
// 2. API Request & Payload Schemas
// ==========================================

export const CreateAuditRequestSchema = z.object({
  startUrl: HttpUrlSchema,
  goal: z.string().optional()
});

export const ReauditRequestSchema = z.object({
  startUrl: HttpUrlSchema.optional()
}).optional();

export const CompareQuerySchema = z.object({
  base: z.string().min(1),
  target: z.string().min(1)
});

export const AuditQuerySchema = z.object({
  startUrl: z.string().url().optional()
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string()
  })
});

// ==========================================
// 3. Evidence, Finding, Issue & Audit Schemas
// ==========================================

export const EvidenceSchema = z.object({
  url: z.string().url(),
  quote: z.string(),
  status: z.enum([
    EvidenceStatus.SOURCE_MATCHED,
    EvidenceStatus.QUOTE_NOT_FOUND,
    EvidenceStatus.COULD_NOT_VERIFY
  ]),
  reason: z.string(),
  matchedContext: z.string().nullable().optional(),
  matchedSnippet: z.string().nullable().optional(),
  finalUrl: z.string().nullable().optional(),
  verifiedAt: z.string().or(z.date()).optional()
});

export const FindingSchema = z.object({
  id: z.string(),
  stepKey: z.enum([
    StepKey.ELIGIBILITY,
    StepKey.DOCUMENTS,
    StepKey.APPLICATION_STEPS,
    StepKey.DEADLINE,
    StepKey.NEXT_ACTION
  ]),
  kind: z.string(),
  value: z.string(),
  status: z.enum([
    FindingStatus.VERIFIED_FOUND,
    FindingStatus.UNVERIFIED_CLAIM,
    FindingStatus.NOT_FOUND_IN_SCOPE,
    FindingStatus.UNCONFIRMED
  ]),
  sourceUrl: z.string().optional(),
  evidence: EvidenceSchema.nullable().optional(),
  notes: z.string().optional()
});

export const IssueSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(['error', 'warning', 'info']),
  findingIds: z.array(z.string()),
  repairSuggestion: z.string()
});

export const AuditPageRecordSchema = z.object({
  url: z.string().url(),
  hash: z.string(),
  charCount: z.number().int().nonnegative(),
  retrievedAt: z.string().or(z.date()).optional(),
  status: z.number().int().optional()
});

export const AuditSchema = z.object({
  _id: z.string(),
  startUrl: z.string().url(),
  status: z.enum([
    AuditStatus.RUNNING,
    AuditStatus.COMPLETED,
    AuditStatus.PARTIAL,
    AuditStatus.EXPLORATION_FAILED
  ]),
  failureReason: z.string().optional(),
  createdAt: z.string().or(z.date()),
  completedAt: z.string().or(z.date()).optional(),
  rawResult: AgentResultSchema.nullable().optional(),
  findings: z.array(FindingSchema),
  issues: z.array(IssueSchema),
  pages: z.array(AuditPageRecordSchema),
  isDevSample: z.boolean().optional(),
  devSampleNotice: z.string().optional()
});
