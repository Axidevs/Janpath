/**
 * server/src/models/Page.js
 *
 * Mongoose schema for retrieved pages.
 * Stores normalized/raw text and cryptographic hash for verification and re-audit comparison.
 */

import mongoose from 'mongoose';

const PageSchema = new mongoose.Schema(
  {
    auditId: { type: String, required: true, index: true },
    url: { type: String, required: true, index: true },
    hash: { type: String, required: true },
    charCount: { type: Number, required: true },
    text: { type: String, required: true },
    status: { type: Number, default: 200 },
    retrievedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    collection: 'pages'
  }
);

export const Page = mongoose.models.Page || mongoose.model('Page', PageSchema);
