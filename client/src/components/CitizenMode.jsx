import React from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  FileCheck,
  UserCheck,
  CreditCard,
  ExternalLink,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Clock
} from 'lucide-react';

export default function CitizenMode({ audit, selectedStepKey, onSelectFinding }) {
  if (!audit) return null;

  const rawSteps = audit.rawResult?.steps || [];
  const findings = audit.findings || [];
  const issues = audit.issues || [];

  // Filter if user selected a step on JourneyGraph
  const displayedSteps = selectedStepKey
    ? rawSteps.filter((s) => s.step_key === selectedStepKey)
    : rawSteps;

  // Key facts extracted
  const ageMin = findings.find((f) => f.kind === 'age_min')?.value;
  const ageMax = findings.find((f) => f.kind === 'age_max')?.value;
  const feeAmount = findings.find((f) => f.kind === 'fee_amount')?.value;
  const deadlineDate = findings.find((f) => f.kind === 'deadline_date')?.value;
  const nextAction = findings.find((f) => f.kind === 'next_action_url');
  const documents = findings.filter((f) => f.kind === 'document');

  // Any critical blockers (e.g., broken next step, past deadline)?
  const hasBrokenNextStep = issues.some((i) => i.ruleId === 'broken_next_step');
  const hasPastDeadline = issues.some((i) => i.ruleId === 'past_deadline');
  const hasScatteredReqs = issues.some((i) => i.ruleId === 'scattered_requirements');
  const hasConflict = issues.some((i) => i.ruleId === 'conflicting_requirements');

  return (
    <div className="space-y-6">
      {/* Top Citizen Journey Verdict Banner */}
      <div
        className={`p-6 rounded-xl border shadow-sm ${
          hasBrokenNextStep
            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
            : hasPastDeadline
            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              hasBrokenNextStep
                ? 'bg-rose-100 text-rose-700'
                : hasPastDeadline
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {hasBrokenNextStep ? (
              <XCircle className="w-6 h-6" />
            ) : hasPastDeadline ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-white/80 border border-current">
                Citizen Journey Verdict
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Task: {audit.goal || 'Complete Public Service Application'}
              </span>
            </div>

            <h3 className="text-lg font-bold tracking-tight">
              {hasBrokenNextStep
                ? 'Citizen Cannot Complete Online Submission (Broken Link)'
                : hasPastDeadline
                ? 'Warning: Application Window May Be Closed (Past Deadline Date)'
                : 'All Core Steps Found — Verify Required Documents Before Applying'}
            </h3>

            <p className="text-sm mt-1 text-slate-700 leading-relaxed">
              {hasBrokenNextStep
                ? 'The official application submission button links to a non-existent page (HTTP 404). Do not wait until the deadline; verify alternate application channels or contact scheme helpdesk.'
                : hasPastDeadline
                ? 'The portal displays an explicit closing date that has passed. Please confirm whether a deadline extension has been officially gazetted.'
                : 'Information for eligibility, required proofs, and submission steps has been located on official pages.'}
            </p>
          </div>
        </div>
      </div>

      {/* Citizen Key Facts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Age limit card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Age Limit</span>
          </div>
          <div className="text-lg font-bold text-slate-900">
            {ageMin && ageMax
              ? `${ageMin} – ${ageMax} Years`
              : ageMin
              ? `Min ${ageMin} Years`
              : ageMax
              ? `Max ${ageMax} Years`
              : 'Not specified'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {ageMin ? 'Verified on official guidelines page' : 'Not confirmed in scope'}
          </div>
        </div>

        {/* Fee card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>Application Fee</span>
          </div>
          <div className="text-lg font-bold text-slate-900">
            {feeAmount === '0' || feeAmount === 0 ? '₹0 (Free)' : feeAmount ? `₹${feeAmount}` : 'No Fee Claimed'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Free application for eligible citizens
          </div>
        </div>

        {/* Deadline card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span>Application Deadline</span>
          </div>
          <div className="text-lg font-bold text-slate-900 truncate">
            {deadlineDate || 'No date stated'}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            {hasPastDeadline ? (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Potentially Outdated
              </span>
            ) : (
              <span>Check scheme notification</span>
            )}
          </div>
        </div>

        {/* Next Action card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-2">
            <ExternalLink className="w-4 h-4 text-amber-600" />
            <span>Online Portal CTA</span>
          </div>
          <div className="text-base font-bold truncate">
            {hasBrokenNextStep ? (
              <span className="text-rose-600">Broken Link (404)</span>
            ) : nextAction?.value ? (
              <span className="text-emerald-700">Available</span>
            ) : (
              <span className="text-slate-500">Not Found</span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">
            {hasBrokenNextStep
              ? 'Submission button fails'
              : nextAction?.value
              ? 'Action link located'
              : 'Action step absent'}
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: Document Checklist & Action Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Preparation Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <h4 className="font-bold text-slate-900 text-sm">
                Citizen Document Preparation Checklist
              </h4>
            </div>
            {hasScatteredReqs && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Scattered on multiple pages
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 mb-4">
            Gather and verify these documents before starting your application. Click any document to view its verified quote in the explorer.
          </p>

          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
                No individual documents were confirmed in this audit run.
              </div>
            ) : (
              documents.map((doc, idx) => (
                <div
                  key={doc.id || idx}
                  onClick={() => onSelectFinding?.(doc.id)}
                  className="p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-lg cursor-pointer transition-colors text-xs flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      ✓
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {doc.value}
                      </div>
                      <div className="text-[11px] text-slate-500 italic mt-0.5 font-serif line-clamp-2">
                        &ldquo;{doc.evidence?.quote || 'Document verified in guidelines'}&rdquo;
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold uppercase shrink-0">
                    Inspect
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Citizen Step-by-Step Guidance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-slate-900 text-sm">
                Step-by-Step Citizen Next Steps
              </h4>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {displayedSteps.length} steps tracked
            </span>
          </div>

          <div className="space-y-3">
            {displayedSteps.map((step, idx) => {
              const isFound = step.status_claimed === 'found';
              const isPartial = step.status_claimed === 'partially_found';

              return (
                <div
                  key={step.step_key || idx}
                  className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-[10px]">
                        {idx + 1}
                      </span>
                      {step.step_key.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        isFound
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPartial
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {step.status_claimed.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed">
                    {step.summary || 'No step summary provided by agent.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
