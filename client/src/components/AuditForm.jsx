import React, { useState } from 'react';
import { Play, Sparkles, AlertCircle, ShieldCheck, X } from 'lucide-react';
import { createAudit } from '../api.js';

const PRESETS = [
  {
    label: 'Scholarship Microsite (Local Fixture)',
    url: 'http://localhost:3002/',
    goal: 'Test citizen scholarship journey: check age limit, required documents, deadline, and application form link.'
  },
  {
    label: 'National Scholarship Portal (Gov.in)',
    url: 'https://scholarships.gov.in/scheme-portal',
    goal: 'Explore whether a citizen can apply for higher education scholarship, find fee exemptions, and download application guidelines.'
  },
  {
    label: 'National Informatics Centre (Nic.in)',
    url: 'https://nsp.nic.in/scheme',
    goal: 'Find eligibility rules, list of required income and domicile proofs, and verify online apply button.'
  }
];

export default function AuditForm({ isOpen, onClose, onAuditStarted }) {
  const [startUrl, setStartUrl] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startUrl.trim()) {
      setError('Please provide a valid starting URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createAudit({
        startUrl: startUrl.trim(),
        goal: goal.trim() || undefined
      });
      onAuditStarted(result.auditId, startUrl.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to start audit');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setStartUrl(preset.url);
    setGoal(preset.goal);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base text-white">Start New Citizen Journey Audit</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to Start Audit</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Quick Test Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="text-left p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-xs text-slate-700 transition-all flex flex-col justify-between"
                >
                  <span className="font-semibold text-slate-900 block truncate">
                    {preset.label}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono truncate mt-1">
                    {preset.url}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Public Service URL *
            </label>
            <input
              type="url"
              required
              value={startUrl}
              onChange={(e) => setStartUrl(e.target.value)}
              placeholder="https://scholarships.gov.in/scheme..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-mono placeholder:text-slate-400 transition"
            />
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Allowlisted: *.gov.in, *.nic.in, *.ac.in, or configured test fixture.</span>
            </div>
          </div>

          {/* Citizen Task Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Specific Citizen Task (Optional)
            </label>
            <textarea
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Test if a citizen can complete a scholarship application, verify eligibility criteria, documents checklist, and deadline."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm placeholder:text-slate-400 transition"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Exploration is strictly read-only. The agent will never attempt login, registration, or form submissions.
            </p>
          </div>

          {/* Submit CTAs */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Launching Agent...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Audit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
