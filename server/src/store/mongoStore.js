/**
 * server/src/store/mongoStore.js
 *
 * MongoDB Atlas storage adapter using Mongoose models.
 * Implements the same async contract as memoryStore.
 */

import { Audit, RunEvent, Page } from '../models/index.js';

export const mongoStore = {
  async createAudit(data) {
    const doc = new Audit(data);
    await doc.save();
    return doc.toObject();
  },

  async getAudit(id) {
    const doc = await Audit.findById(id).lean();
    return doc;
  },

  async updateAudit(id, patch) {
    const doc = await Audit.findByIdAndUpdate(id, patch, { new: true }).lean();
    return doc;
  },

  async listAudits(filters = {}) {
    const query = {};
    if (filters.startUrl) {
      query.startUrl = filters.startUrl;
    }
    return Audit.find(query).sort({ createdAt: -1 }).lean();
  },

  async createRunEvent(eventData) {
    const doc = new RunEvent(eventData);
    await doc.save();
    return doc.toObject();
  },

  async getRunEvents(auditId, options = {}) {
    const query = { auditId };
    if (options.after) {
      query.timestamp = { $gt: new Date(options.after) };
    }
    return RunEvent.find(query).sort({ timestamp: 1 }).lean();
  },

  async savePage(pageData) {
    const doc = new Page(pageData);
    await doc.save();
    return doc.toObject();
  },

  async getPagesForAudit(auditId) {
    return Page.find({ auditId }).lean();
  }
};
