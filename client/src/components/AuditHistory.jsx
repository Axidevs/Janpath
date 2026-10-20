import React, { useEffect, useState } from 'react';
import {
  History,
  RotateCcw,
  ExternalLink,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Play
} from 'lucide-react';
import { listAudits, reaudit } from '../api.js';

export default function AuditHistory({ onSelectAudit, onAuditStarted, onNewAuditClick }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reauditingId, setReauditingId] = useState(null);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAudits();
      setAudits(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load audit history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleReaudit = async (id, startUrl) => {
    setReauditingId(id);
    try {
      const result = await reaudit(id);
      onAuditStarted(result.auditId, startUrl);
    } catch (err) {
      alert(`Re-audit error: ${err.message}`);
    } finally {
      setReauditingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return {
          icon: CheckCircle2,
          className: 'bg-emerald-50 text-emerald-700 border-emerald-300'
        };
      case 'PARTIAL':
        return {
          icon: AlertTriangle,
          className: 'bg-amber-50 text-amber-700 border-amber-300'
        };
      case 'RUNNING':
        return {
          icon: Clock,
          className: 'bg-blue-50 text-blue-700 border-blue-300 animate-pulse'
        };
      case 'EXPLORATION_FAILED':
      default:
        return {
          icon: XCircle,
          className: 'bg-rose-50 text-rose-700 border-rose-300'
        };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <History className="w-5 h-5 text-slate-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Audit Run History
            </h3>
            <p className="text-xs text-slate-500">
              Persisted audit executions across sessions
            </p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          <span>Loading past audit records...</span>
        </div>
      ) : audits.length === 0 ? (
        <div className="p-12 text-center">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800 mb-1">
            No audits recorded yet
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Launch your first citizen journey audit using the New Audit form, or inspect the local fixture site.
          </p>
          <button
            onClick={onNewAuditClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch New Audit</span>
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {audits.map((audit) => {
            const badge = getStatusBadge(audit.status);
            const StatusIcon = badge.icon;
            const findingsCount = audit.findings?.length || 0;
            const issuesCount = audit.issues?.length || 0;

            return (
              <div
                key={audit._id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border uppercase ${badge.className}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      <span>{audit.status}</span>
                    </span>

                    <span className="font-mono text-[11px] text-slate-400">
                      {audit._id}
                    </span>

                    <span className="text-slate-400 text-[11px]">
                      &bull; {new Date(audit.createdAt || Date.now()).toLocaleString()}
                    </span>
                  </div>

                  <div className="font-mono text-xs text-slate-900 font-semibold truncate">
                    {audit.startUrl}
                  </div>

                  {audit.goal && (
                    <div className="text-[11px] text-slate-500 line-clamp-1 italic">
                      Goal: &ldquo;{audit.goal}&rdquo;
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                    <span>
                      Findings: <strong className="text-slate-800">{findingsCount}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Issues: <strong className="text-slate-800">{issuesCount}</strong>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onSelectAudit(audit)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Report</span>
                  </button>

                  <button
                    onClick={() => handleReaudit(audit._id, audit.startUrl)}
                    disabled={reauditingId === audit._id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs transition-colors"
                    title="Launch re-audit of the exact same start URL"
                  >
                    <RotateCcw
                      className={`w-3.5 h-3.5 ${
                        reauditingId === audit._id ? 'animate-spin' : ''
                      }`}
                    />
                    <span>Re-audit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
