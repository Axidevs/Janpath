/**
 * server/src/models/RunEvent.js
 *
 * Mongoose schema for audit run events.
 * Captures live SSE and progress events emitted during TinyFish exploration.
 */

import mongoose from 'mongoose';

const RunEventSchema = new mongoose.Schema(
  {
    auditId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    step: { type: String }
  },
  {
    timestamps: true,
    collection: 'runEvents'
  }
);

export const RunEvent = mongoose.models.RunEvent || mongoose.model('RunEvent', RunEventSchema);
