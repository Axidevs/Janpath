import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Search,
  Filter,
  Info,
  Copy,
  Check
} from 'lucide-react';

export default function EvidenceExplorer({ audit, selectedStepKey, selectedFindingId }) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  if (!audit) return null;

  // Extract all evidence items from findings and raw facts
  const evidenceList = [];
  const findings = audit.findings || [];

  findings.forEach((finding) => {
    if (finding.evidence) {
      evidenceList.push({
        findingId: finding.id,
        stepKey: finding.stepKey,
        kind: finding.kind,
        value: finding.value,
        findingStatus: finding.status,
        url: finding.evidence.url || finding.sourceUrl,
        finalUrl: finding.evidence.finalUrl,
        quote: finding.evidence.quote,
        status: finding.evidence.status,
        reason: finding.evidence.reason,
        matchedContext: finding.evidence.matchedContext
      });
    }
  });

  // If no findings had evidence (e.g. raw facts only), extract from rawResult.facts
  if (evidenceList.length === 0 && audit.rawResult?.facts) {
    audit.rawResult.facts.forEach((fact, idx) => {
      evidenceList.push({
        findingId: `fact-${idx}`,
        stepKey: 'general',
        kind: fact.kind,
        value: fact.value,
        findingStatus: 'UNCONFIRMED',
        url: fact.url,
        finalUrl: fact.url,
        quote: fact.verbatim_quote,
        status: 'COULD_NOT_VERIFY',
        reason: 'unprocessed_fact',
        matchedContext: null
      });
    });
  }

  // Filter based on UI controls
  const filtered = evidenceList.filter((item) => {
    // Step filter
    if (selectedStepKey && item.stepKey !== selectedStepKey) {
      return false;
    }
    // Specific finding filter
    if (selectedFindingId && item.findingId !== selectedFindingId) {
      return false;
    }
    // Status filter
    if (filterStatus !== 'ALL' && item.status !== filterStatus) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inQuote = (item.quote || '').toLowerCase().includes(q);
      const inUrl = (item.url || '').toLowerCase().includes(q);
      const inKind = (item.kind || '').toLowerCase().includes(q);
      const inValue = (item.value || '').toLowerCase().includes(q);
      return inQuote || inUrl || inKind || inValue;
    }
    return true;
  });

  const handleCopyQuote = (id, quote) => {
    if (!quote) return;
    navigator.clipboard?.writeText(quote);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SOURCE_MATCHED':
        return {
          icon: CheckCircle2,
          text: 'Source Matched',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-300'
        };
      case 'QUOTE_NOT_FOUND':
        return {
          icon: AlertTriangle,
          text: 'Quote Not Found',
          className: 'bg-amber-50 text-amber-700 border-amber-300'
        };
      case 'COULD_NOT_VERIFY':
      default:
        return {
          icon: HelpCircle,
          text: 'Could Not Verify',
          className: 'bg-slate-100 text-slate-700 border-slate-300'
        };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Evidence Verification Explorer</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                  {filtered.length} {filtered.length === 1 ? 'citation' : 'citations'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Independent backend page retrieval and verbatim quote verification
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter quote or URL..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Mandatory Core Differentiator Disclaimer */}
        <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-900 text-xs">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Mandatory Evidence Disclaimer: </span>
            A match proves the quote exists in the retrieved text, not that the claim is true, current or applicable.
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/80 overflow-x-auto text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1 text-[11px]">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {['ALL', 'SOURCE_MATCHED', 'QUOTE_NOT_FOUND', 'COULD_NOT_VERIFY'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors ${
                filterStatus === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL' ? 'All Evidences' : st.replace(/_/g, ' ')}
            </button>
          ))}
          {selectedStepKey && (
            <span className="ml-auto text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">
              Step: {selectedStepKey}
            </span>
          )}
        </div>
      </div>

      {/* Citations List */}
      <div className="divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No verified evidence citations match the current filter.
          </div>
        ) : (
          filtered.map((item, idx) => {
            const badge = getStatusBadge(item.status);
            const StatusIcon = badge.icon;
            const isCopied = copiedId === item.findingId;

            return (
              <div key={`${item.findingId}-${idx}`} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${badge.className}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{badge.text}</span>
                    </span>

                    {item.reason && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {item.reason}
                      </span>
                    )}

                    {item.kind && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        Kind: <strong className="text-slate-700">{item.kind}</strong>
                        {item.value ? ` = "${item.value}"` : ''}
                      </span>
                    )}
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-mono truncate max-w-md"
                  >
                    <span className="truncate">{item.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>

                {/* Verbatim Quote Box */}
                <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                    <span>Cited Verbatim Quote</span>
                    <button
                      onClick={() => handleCopyQuote(item.findingId, item.quote)}
                      className="flex items-center gap-1 text-slate-500 hover:text-slate-800 normal-case font-normal text-[11px]"
                      title="Copy quote"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Quote</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-serif italic text-slate-800 text-sm leading-relaxed">
                    &ldquo;{item.quote || '(No quote text provided)'}&rdquo;
                  </div>
                </div>

                {/* Matched Context Snippet if present */}
                {item.matchedContext && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-[11px] text-slate-700">
                    <span className="font-bold text-emerald-900 block mb-0.5">
                      Matched Context on Retrieved Page:
                    </span>
                    <code className="text-slate-800 font-mono text-[11px] leading-relaxed break-words">
                      {item.matchedContext}
                    </code>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
