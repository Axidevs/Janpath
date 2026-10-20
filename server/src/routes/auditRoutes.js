/**
 * server/src/routes/auditRoutes.js
 *
 * Express route handlers for the JanPath API:
 * - POST /api/audits
 * - GET  /api/audits/:id
 * - GET  /api/audits/:id/events?after=
 * - GET  /api/audits?startUrl=
 * - POST /api/audits/:id/reaudit
 * - GET  /api/audits/compare?base=&target=
 */

import express from 'express';
import {
  CreateAuditRequestSchema,
  CompareQuerySchema,
  AuditQuerySchema
} from '../../../shared/schemas.js';
import { AuditStatus } from '../../../shared/constants.js';
import { validateUrl } from '../lib/urlGuard.js';
import { compareAudits } from '../engine/compare.js';

export function createAuditRouter({ store, limiter, config, runAuditTask }) {
  const router = express.Router();

  // POST /api/audits - Start new audit
  router.post('/audits', async (req, res, next) => {
    try {
      const parseResult = CreateAuditRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors.map((e) => e.message).join(', ')
          }
        });
      }

      const { startUrl, goal } = parseResult.data;

      // Security check: validate domain allowlist and protocol
      const guard = validateUrl(startUrl, config?.fixtureHost);
      if (!guard.allowed) {
        return res.status(400).json({
          error: {
            code: 'INVALID_URL',
            message: `URL rejected by security guard: ${guard.reason}`
          }
        });
      }

      // Concurrency check: in-memory limiter (max 2)
      if (!limiter.isAvailable()) {
        return res.status(429).json({
          error: {
            code: 'CONCURRENCY_LIMIT_REACHED',
            message: 'Maximum of 2 concurrent audits allowed'
          }
        });
      }

      const auditId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      limiter.acquire(auditId);

      const auditRecord = await store.createAudit({
        _id: auditId,
        startUrl: guard.normalizedUrl || startUrl,
        goal,
        status: AuditStatus.RUNNING,
        findings: [],
        issues: [],
        pages: []
      });

      // Record initial START event
      await store.createRunEvent({
        auditId,
        type: 'STARTED',
        payload: { startUrl: auditRecord.startUrl, goal }
      });

      // Launch async orchestration task if provided
      if (typeof runAuditTask === 'function') {
        runAuditTask(auditId).catch((err) => {
          // Release slot on unexpected crash
          limiter.release(auditId);
        });
      }

      return res.status(201).json({
        auditId,
        status: AuditStatus.RUNNING
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/audits/compare?base=&target= - Compare two audits
  router.get('/audits/compare', async (req, res, next) => {
    try {
      const parseResult = CompareQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Both "base" and "target" query parameters are required'
          }
        });
      }

      const { base, target } = parseResult.data;
      const [baseAudit, targetAudit] = await Promise.all([
        store.getAudit(base),
        store.getAudit(target)
      ]);

      if (!baseAudit || !targetAudit) {
        return res.status(404).json({
          error: {
            code: 'AUDIT_NOT_FOUND',
            message: 'One or both audits specified for comparison were not found'
          }
        });
      }

      const comparison = compareAudits(baseAudit, targetAudit);

      return res.status(200).json({
        baseAuditId: base,
        targetAuditId: target,
        ...comparison
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/audits - List audits (optional ?startUrl=)
  router.get('/audits', async (req, res, next) => {
    try {
      const parseResult = AuditQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors.map((e) => e.message).join(', ')
          }
        });
      }

      const audits = await store.listAudits(parseResult.data);
      return res.status(200).json({ audits });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/audits/:id - Get specific audit
  router.get('/audits/:id', async (req, res, next) => {
    try {
      const audit = await store.getAudit(req.params.id);
      if (!audit) {
        return res.status(404).json({
          error: {
            code: 'AUDIT_NOT_FOUND',
            message: `Audit "${req.params.id}" not found`
          }
        });
      }

      return res.status(200).json(audit);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/audits/:id/events?after= - Poll run events
  router.get('/audits/:id/events', async (req, res, next) => {
    try {
      const audit = await store.getAudit(req.params.id);
      if (!audit) {
        return res.status(404).json({
          error: {
            code: 'AUDIT_NOT_FOUND',
            message: `Audit "${req.params.id}" not found`
          }
        });
      }

      const events = await store.getRunEvents(req.params.id, {
        after: req.query.after
      });

      return res.status(200).json({
        auditId: req.params.id,
        status: audit.status,
        events
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/audits/:id/reaudit - Re-audit the same URL
  router.post('/audits/:id/reaudit', async (req, res, next) => {
    try {
      const baseAudit = await store.getAudit(req.params.id);
      if (!baseAudit) {
        return res.status(404).json({
          error: {
            code: 'AUDIT_NOT_FOUND',
            message: `Base audit "${req.params.id}" not found`
          }
        });
      }

      if (!limiter.isAvailable()) {
        return res.status(429).json({
          error: {
            code: 'CONCURRENCY_LIMIT_REACHED',
            message: 'Maximum of 2 concurrent audits allowed'
          }
        });
      }

      const reauditId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      limiter.acquire(reauditId);

      await store.createAudit({
        _id: reauditId,
        startUrl: baseAudit.startUrl,
        goal: baseAudit.goal,
        status: AuditStatus.RUNNING,
        findings: [],
        issues: [],
        pages: []
      });

      await store.createRunEvent({
        auditId: reauditId,
        type: 'STARTED',
        payload: {
          startUrl: baseAudit.startUrl,
          reauditOf: baseAudit._id
        }
      });

      if (typeof runAuditTask === 'function') {
        runAuditTask(reauditId).catch(() => {
          limiter.release(reauditId);
        });
      }

      return res.status(201).json({
        auditId: reauditId,
        status: AuditStatus.RUNNING,
        baseAuditId: baseAudit._id
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
