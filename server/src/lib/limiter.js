/**
 * server/src/lib/limiter.js
 *
 * In-memory concurrency limiter for JanPath audits.
 * Caps simultaneous audits to 2 without requiring Redis, queues, or background daemons.
 */

export function createAuditLimiter(maxConcurrent = 2) {
  const activeAudits = new Set();

  return {
    /**
     * Attempts to acquire a concurrency slot for an audit.
     * @param {string} auditId
     * @returns {boolean} True if slot was acquired, false if at capacity
     */
    acquire(auditId) {
      if (activeAudits.size >= maxConcurrent) {
        return false;
      }
      activeAudits.add(auditId);
      return true;
    },

    /**
     * Releases an active audit slot.
     * @param {string} auditId
     */
    release(auditId) {
      activeAudits.delete(auditId);
    },

    /**
     * Current count of running audits.
     * @returns {number}
     */
    getActiveCount() {
      return activeAudits.size;
    },

    /**
     * Checks if a slot is currently open.
     * @returns {boolean}
     */
    isAvailable() {
      return activeAudits.size < maxConcurrent;
    },

    /**
     * Clears all active slots (primarily for testing).
     */
    reset() {
      activeAudits.clear();
    }
  };
}

export const auditLimiter = createAuditLimiter(2);
