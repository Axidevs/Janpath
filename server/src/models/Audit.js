/**
 * server/src/models/Audit.js
 *
 * Mongoose schema for JanPath Audits.
 * Embeds findings, evidence, issues, page metadata, and raw exploration results.
 */

import mongoose from 'mongoose';
import { AuditStatus, EvidenceStatus, FindingStatus } from '../../../shared/constants.js';

const EvidenceSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    quote: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(EvidenceStatus),
      required: true
    },
    reason: { type: String, required: true },
    matchedContext: { type: String, default: null },
    matchedSnippet: { type: String, default: null },
    finalUrl: { type: String, default: null },
    verifiedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const FindingSubSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    stepKey: { type: String, required: true },
    kind: { type: String, required: true },
    value: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(FindingStatus),
      required: true
    },
    sourceUrl: { type: String },
    evidence: { type: EvidenceSubSchema, default: null },
    notes: { type: String }
  },
  { _id: false }
);

const IssueSubSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    ruleId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ['error', 'warning', 'info'],
      default: 'warning'
    },
    findingIds: [{ type: String }],
    repairSuggestion: { type: String, required: true }
  },
  { _id: false }
);

const PageMetaSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    hash: { type: String, required: true },
    charCount: { type: Number, default: 0 },
    retrievedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const AuditSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    startUrl: { type: String, required: true },
    goal: { type: String },
    status: {
      type: String,
      enum: Object.values(AuditStatus),
      default: AuditStatus.RUNNING,
      required: true
    },
    failureReason: { type: String },
    rawResult: { type: mongoose.Schema.Types.Mixed, default: null },
    findings: [FindingSubSchema],
    issues: [IssueSubSchema],
    pages: [PageMetaSubSchema],
    isDevSample: { type: Boolean, default: false },
    devSampleNotice: { type: String },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
  },
  {
    timestamps: true,
    collection: 'audits'
  }
);

export const Audit = mongoose.models.Audit || mongoose.model('Audit', AuditSchema);
