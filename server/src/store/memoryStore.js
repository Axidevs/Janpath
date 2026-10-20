/**
 * server/src/store/memoryStore.js
 *
 * In-memory storage implementation for tests, dev environments,
 * and environments without a live MongoDB connection.
 */

export function createMemoryStore() {
  const audits = new Map();
  const runEvents = [];
  const pages = [];

  return {
    async createAudit(data) {
      const audit = {
        createdAt: new Date().toISOString(),
        findings: [],
        issues: [],
        pages: [],
        ...data
      };
      audits.set(audit._id, audit);
      return audit;
    },

    async getAudit(id) {
      return audits.get(id) || null;
    },

    async updateAudit(id, patch) {
      const existing = audits.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...patch };
      audits.set(id, updated);
      return updated;
    },

    async listAudits(filters = {}) {
      let list = Array.from(audits.values());
      if (filters.startUrl) {
        list = list.filter((a) => a.startUrl === filters.startUrl);
      }
      // Sort newest first
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async createRunEvent(eventData) {
      const event = {
        _id: `evt-${runEvents.length + 1}`,
        timestamp: new Date().toISOString(),
        ...eventData
      };
      runEvents.push(event);
      return event;
    },

    async getRunEvents(auditId, options = {}) {
      let list = runEvents.filter((e) => e.auditId === auditId);
      if (options.after) {
        const afterDate = new Date(options.after);
        list = list.filter((e) => new Date(e.timestamp) > afterDate);
      }
      return list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    async savePage(pageData) {
      const page = {
        _id: `pg-${pages.length + 1}`,
        retrievedAt: new Date().toISOString(),
        ...pageData
      };
      pages.push(page);
      return page;
    },

    async getPagesForAudit(auditId) {
      return pages.filter((p) => p.auditId === auditId);
    },

    clear() {
      audits.clear();
      runEvents.length = 0;
      pages.length = 0;
    }
  };
}

export const memoryStore = createMemoryStore();
