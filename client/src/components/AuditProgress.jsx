import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertOctagon, Terminal, Radio } from 'lucide-react';
import { getEvents, getAudit } from '../api.js';

export default function AuditProgress({ auditId, onAuditComplete }) {
  const [events, setEvents] = useState([]);
  const [auditStatus, setAuditStatus] = useState('RUNNING');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!auditId) return;

    let timer = null;
    let isCancelled = false;

    const poll = async () => {
      try {
        const eventsData = await getEvents(auditId);
        if (isCancelled) return;

        if (eventsData.events) {
          setEvents(eventsData.events);
        }
        if (eventsData.status) {
          setAuditStatus(eventsData.status);
        }

        if (eventsData.status && eventsData.status !== 'RUNNING') {
          // Terminal status reached! Fetch full completed audit
          const fullAudit = await getAudit(auditId);
          if (!isCancelled) {
            onAuditComplete(fullAudit);
          }
          return;
        }

        // Continue polling every 2s
        timer = setTimeout(poll, 2000);
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Error polling events');
          timer = setTimeout(poll, 3000);
        }
      }
    };

    poll();

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [auditId]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-xl max-w-3xl mx-auto my-8">
      {/* Header status */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          {auditStatus === 'RUNNING' ? (
            <div className="relative">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            </div>
          ) : auditStatus === 'COMPLETED' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          ) : (
            <AlertOctagon className="w-6 h-6 text-rose-400" />
          )}

          <div>
            <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span>Autonomous Exploration in Progress</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Live Telemetry
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Audit ID: {auditId}</p>
          </div>
        </div>

        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300">
          {auditStatus}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-2.5 rounded bg-amber-950/60 border border-amber-800 text-amber-200 text-xs">
          Notice: {error}
        </div>
      )}

      {/* Terminal Live Stream Feed */}
      <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800 font-mono text-xs max-h-72 overflow-y-auto space-y-2">
        <div className="flex items-center gap-2 text-slate-500 text-[11px] border-b border-slate-800/80 pb-2 mb-2">
          <Terminal className="w-3.5 h-3.5" />
          <span>Real-time SSE event pipeline (read-only agent telemetry)</span>
        </div>

        {events.length === 0 ? (
          <div className="text-slate-500 italic py-4 text-center">
            Establishing secure connection with TinyFish agent...
          </div>
        ) : (
          events.map((evt, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-slate-300">
              <span className="text-slate-500 text-[10px] shrink-0 mt-0.5">
                {new Date(evt.timestamp || Date.now()).toLocaleTimeString()}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  evt.type === 'STARTED'
                    ? 'bg-blue-950 text-blue-400'
                    : evt.type === 'COMPLETE'
                    ? 'bg-emerald-950 text-emerald-400'
                    : evt.type === 'PROGRESS'
                    ? 'bg-purple-950 text-purple-400'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {evt.type}
              </span>
              <span className="text-slate-300 truncate">
                {evt.payload?.message ||
                  evt.payload?.step ||
                  (evt.payload?.startUrl ? `Start: ${evt.payload.startUrl}` : JSON.stringify(evt.payload || ''))}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Polling endpoint: <code className="text-slate-300">/api/audits/:id/events</code> every 2s</span>
        <span className="text-slate-500">Zero LLM second-guessing &bull; Deterministic engine</span>
      </div>
    </div>
  );
}
