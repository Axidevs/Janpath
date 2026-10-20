import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  CheckCircle2,
  AlertOctagon,
  Clock,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { compareAudits, listAudits } from '../api.js';

export default function ComparisonView({ activeAudit }) {
  const [audits, setAudits] = useState([]);
  const [baseId, setBaseId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load available audits for selector
  useEffect(() => {
    let isCancelled = false;
    const fetchList = async () => {
      try {
        const list = await listAudits();
        if (!isCancelled && list) {
          setAudits(list);
          if (list.length >= 2) {
            setBaseId(list[1]._id);
            setTargetId(list[0]._id);
          } else if (list.length === 1 && activeAudit?._id) {
            setBaseId(list[0]._id);
            setTargetId(activeAudit._id);
          }
        }
      } catch (err) {
        // Ignored in offline demo mode
      }
    };
    fetchList();
    return () => {
      isCancelled = true;
    };
  }, [activeAudit]);

  const handleRunComparison = async () => {
    if (!baseId || !targetId) {
      setError('Please select both a Base Audit and a Target Audit to compare.');
      return;
    }
    if (baseId === targetId) {
      setError('Base Audit and Target Audit must be different runs.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await compareAudits(baseId, targetId);
      setComparison(result);
    } catch (err) {
      setError(err.message || 'Failed to compare audits');
      setComparison(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
          <GitCompare className="w-5 h-5 text-purple-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Audit Regression & Resolution Comparator
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Base Audit (Earlier Run / Baseline):
            </label>
            <select
              value={baseId}
              onChange={(e) => setBaseId(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
            >
              <option value="">Select baseline audit...</option>
              {audits.map((a) => (
                <option key={a._id} value={a._id}>
                  {a._id} ({new Date(a.createdAt || Date.now()).toLocaleTimeString()}) - {a.status}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden lg:flex items-center justify-center pb-2 text-slate-400">
            <ArrowRight className="w-5 h-5" />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Audit (Later Run / Fix Attempt):
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
            >
              <option value="">Select target audit...</option>
              {audits.map((a) => (
                <option key={a._id} value={a._id}>
                  {a._id} ({new Date(a.createdAt || Date.now()).toLocaleTimeString()}) - {a.status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={handleRunComparison}
            disabled={loading || !baseId || !targetId}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <GitCompare className="w-3.5 h-3.5" />}
            <span>Compare Audits Deterministically</span>
          </button>

          {error && <span className="text-xs text-rose-600 font-medium">{error}</span>}
        </div>
      </div>

      {/* Comparison Results */}
      {comparison && (() => {
        const items = comparison.items || [];
        const resolvedItems = items.filter((i) => i.status === 'RESOLVED');
        const newItems = items.filter((i) => i.status === 'NEW');
        const persistentItems = items.filter((i) => i.status === 'PERSISTENT');
        const inconclusiveItems = items.filter((i) => i.status === 'INCONCLUSIVE');

        return (
          <div className="space-y-6">
            {/* Summary Metric Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
                <div className="text-xs text-emerald-700 font-semibold mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Resolved Issues</span>
                </div>
                <div className="text-2xl font-bold text-emerald-700">
                  {comparison.summary?.resolvedCount ?? resolvedItems.length}
                </div>
                <div className="text-[11px] text-emerald-600/80 mt-1">
                  Defects fixed in target
                </div>
              </div>

              <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-sm">
                <div className="text-xs text-rose-700 font-semibold mb-1 flex items-center gap-1">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span>New Issues</span>
                </div>
                <div className="text-2xl font-bold text-rose-700">
                  {comparison.summary?.newCount ?? newItems.length}
                </div>
                <div className="text-[11px] text-rose-600/80 mt-1">
                  New regressions detected
                </div>
              </div>

              <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
                <div className="text-xs text-amber-700 font-semibold mb-1 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Persistent Issues</span>
                </div>
                <div className="text-2xl font-bold text-amber-700">
                  {comparison.summary?.persistentCount ?? persistentItems.length}
                </div>
                <div className="text-[11px] text-amber-600/80 mt-1">
                  Unresolved across both runs
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs text-slate-700 font-semibold mb-1 flex items-center gap-1">
                  <HelpCircle className="w-4 h-4 text-slate-500" />
                  <span>Inconclusive</span>
                </div>
                <div className="text-2xl font-bold text-slate-700">
                  {comparison.summary?.inconclusiveCount ?? inconclusiveItems.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Unverified or partial claims
                </div>
              </div>
            </div>

            {/* Diffs Breakdown Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                Detailed Issue Status Transitions
              </h4>

              {/* Resolved */}
              {resolvedItems.map((item, idx) => (
                <div
                  key={`res-${idx}`}
                  className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-emerald-800 uppercase text-[10px] px-1.5 py-0.5 rounded bg-emerald-100">
                      RESOLVED
                    </span>
                    <span className="font-semibold text-slate-900">
                      {item.issue?.title || item.issue?.ruleId}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs">
                    {item.issue?.description || item.issue?.repairSuggestion}
                  </p>
                </div>
              ))}

              {/* New */}
              {newItems.map((item, idx) => (
                <div
                  key={`new-${idx}`}
                  className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-rose-800 uppercase text-[10px] px-1.5 py-0.5 rounded bg-rose-100">
                      NEW REGRESSION
                    </span>
                    <span className="font-semibold text-slate-900">
                      {item.issue?.title || item.issue?.ruleId}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs">
                    {item.issue?.description || item.issue?.repairSuggestion}
                  </p>
                </div>
              ))}

              {/* Persistent */}
              {persistentItems.map((item, idx) => (
                <div
                  key={`pers-${idx}`}
                  className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-amber-800 uppercase text-[10px] px-1.5 py-0.5 rounded bg-amber-100">
                      PERSISTENT DEFECT
                    </span>
                    <span className="font-semibold text-slate-900">
                      {item.issue?.title || item.issue?.ruleId}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs">
                    {item.issue?.description || item.issue?.repairSuggestion}
                  </p>
                </div>
              ))}

              {items.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">
                  No rule differences detected between the two audit runs.
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
