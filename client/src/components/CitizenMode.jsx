
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
  ExternalLink
} from 'lucide-react';

export default function CitizenMode({ audit, selectedStepKey, onSelectFinding }) {
  if (!audit) return null;

  const rawSteps = audit.rawResult?.steps || [];
  const findings = audit.findings || [];
  const issues = audit.issues || [];
  const pages = audit.pages || [];

  // Filter steps if a journey step is selected.
  const displayedSteps = selectedStepKey
    ? rawSteps.filter((step) => step.step_key === selectedStepKey)
    : rawSteps;

  // Extract facts from audit findings.
  const ageMin = findings.find((f) => f.kind === 'age_min')?.value;
  const ageMax = findings.find((f) => f.kind === 'age_max')?.value;
  const feeAmount = findings.find((f) => f.kind === 'fee_amount')?.value;
  const deadlineDate = findings.find((f) => f.kind === 'deadline_date')?.value;
  const nextAction = findings.find((f) => f.kind === 'next_action_url');
  const documents = findings.filter((f) => f.kind === 'document');

  // Detect audit status and rule-based issues.
  const isExplorationFailed = audit.status === 'EXPLORATION_FAILED';
  const hasNoEvidence = findings.length === 0 && pages.length === 0;
  const cannotVerifyResults = isExplorationFailed || hasNoEvidence;

  const hasBrokenNextStep = issues.some(
    (issue) => issue.ruleId === 'broken_next_step'
  );
  const hasPastDeadline = issues.some(
    (issue) => issue.ruleId === 'past_deadline'
  );
  const hasScatteredReqs = issues.some(
    (issue) => issue.ruleId === 'scattered_requirements'
  );
  const hasConflict = issues.some(
    (issue) => issue.ruleId === 'conflicting_requirements'
  );

  // Avoid presenting missing information as verified facts.
  const bannerTone = cannotVerifyResults || hasBrokenNextStep
    ? 'bg-rose-50/70 border-rose-200 text-rose-950'
    : hasPastDeadline
    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
    : 'bg-emerald-50/70 border-emerald-200 text-emerald-950';

  const iconTone = cannotVerifyResults || hasBrokenNextStep
    ? 'bg-rose-100 text-rose-700'
    : hasPastDeadline
    ? 'bg-amber-100 text-amber-700'
    : 'bg-emerald-100 text-emerald-700';

  const verdictTitle = isExplorationFailed
    ? 'Audit Failed — Results Could Not Be Verified'
    : hasNoEvidence
    ? 'Insufficient Evidence — Results Could Not Be Verified'
    : hasBrokenNextStep
    ? 'Citizen Cannot Complete Online Submission (Broken Link)'
    : hasPastDeadline
    ? 'Warning: Application Window May Be Closed (Past Deadline Date)'
    : 'Audit Completed — Review Findings Before Applying';

  const verdictDescription = isExplorationFailed
    ? 'The audit agent could not complete website exploration. No conclusions can be drawn from this run. Check the agent execution and try again.'
    : hasNoEvidence
    ? 'This audit contains no findings or visited pages. Eligibility, required documents, deadlines and application links remain unverified.'
    : hasBrokenNextStep
    ? 'The application submission link appears to be broken. Verify the result and check for an official alternative before applying.'
    : hasPastDeadline
    ? 'The audit detected a deadline that may have passed. Confirm whether an official extension has been announced.'
    : 'Review the evidence and findings below. Only treat information supported by evidence as verified.';

  return (
    <div className="space-y-6">
      {/* Citizen Journey Verdict Banner */}
      <div
        className={`p-6 rounded-xl border shadow-sm ${bannerTone}`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconTone}`}
          >
            {cannotVerifyResults || hasBrokenNextStep ? (
              <XCircle className="w-6 h-6" />
            ) : hasPastDeadline ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-white/80 border border-current">
                Citizen Journey Verdict
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Task: {audit.goal || 'Complete Public Service Application'}
              </span>
            </div>

            <h3 className="text-lg font-bold tracking-tight">
              {verdictTitle}
            </h3>

            <p className="text-sm mt-1 leading-relaxed">
              {verdictDescription}
            </p>

            {audit.failureReason && isExplorationFailed && (
              <p className="text-xs mt-2 font-mono break-words">
                Failure reason: {audit.failureReason}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Citizen Key Facts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Age Limit */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Age Limit</span>
          </div>

          <div className="text-lg font-bold text-slate-900">
            {cannotVerifyResults
              ? 'Not verified'
              : ageMin != null && ageMax != null
              ? `${ageMin} – ${ageMax} Years`
              : ageMin != null
              ? `Min ${ageMin} Years`
              : ageMax != null
              ? `Max ${ageMax} Years`
              : 'Not specified'}
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {cannotVerifyResults
              ? 'Audit evidence unavailable'
              : ageMin != null || ageMax != null
              ? 'Review supporting evidence'
              : 'Not confirmed in scope'}
          </div>
        </div>

        {/* Application Fee */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>Application Fee</span>
          </div>

          <div className="text-lg font-bold text-slate-900">
            {cannotVerifyResults
              ? 'Not verified'
              : feeAmount === '0' || feeAmount === 0
              ? '₹0 (Free)'
              : feeAmount != null
              ? `₹${feeAmount}`
              : 'Not confirmed'}
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {cannotVerifyResults
              ? 'No conclusion can be drawn'
              : 'Check the official fee requirements'}
          </div>
        </div>

        {/* Application Deadline */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span>Application Deadline</span>
          </div>

          <div className="text-lg font-bold text-slate-900">
            {cannotVerifyResults ? 'Not verified' : deadlineDate || 'Not confirmed'}
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {cannotVerifyResults ? (
              'Audit evidence unavailable'
            ) : hasPastDeadline ? (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Potentially outdated
              </span>
            ) : (
              'Check the official notification'
            )}
          </div>
        </div>

        {/* Online Portal CTA */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-2">
            <ExternalLink className="w-4 h-4 text-amber-600" />
            <span>Online Portal CTA</span>
          </div>

          <div className="text-base font-bold truncate">
            {cannotVerifyResults ? (
              <span className="text-rose-600">Not verified</span>
            ) : hasBrokenNextStep ? (
              <span className="text-rose-600">Broken link</span>
            ) : nextAction?.value ? (
              <span className="text-emerald-700">Located</span>
            ) : (
              <span className="text-slate-500">Not confirmed</span>
            )}
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {cannotVerifyResults
              ? 'Audit evidence unavailable'
              : hasBrokenNextStep
              ? 'Submission link reported broken'
              : nextAction?.value
              ? 'Review the supporting evidence'
              : 'No link confirmed in this audit'}
          </div>
        </div>
      </div>

      {/* Document Checklist and Citizen Next Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Preparation Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 gap-2">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <h4 className="font-bold text-slate-900 text-sm">
                Citizen Document Preparation Checklist
              </h4>
            </div>

            {hasScatteredReqs && !cannotVerifyResults && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Scattered on multiple pages
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 mb-4">
            {cannotVerifyResults
              ? 'The audit could not verify the documents required for this application.'
              : 'Review the evidence for each document before starting your application.'}
          </p>

          <div className="space-y-3">
            {cannotVerifyResults ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 text-center">
                Audit evidence is unavailable. Required documents cannot be confirmed from this run.
              </div>
            ) : documents.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
                No individual documents were confirmed in this audit run. This does not prove that no documents are required.
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
                        &ldquo;{doc.evidence?.quote || 'Evidence quote unavailable'}&rdquo;
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
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 gap-2">
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

          {cannotVerifyResults && displayedSteps.length === 0 ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 text-center">
              No journey steps could be verified because this audit did not produce usable evidence.
            </div>
          ) : displayedSteps.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
              No journey steps were recorded for this selection.
            </div>
          ) : (
            <div className="space-y-3">
              {displayedSteps.map((step, idx) => {
                const isFound = step.status_claimed === 'found';
                const isPartial = step.status_claimed === 'partially_found';

                return (
                  <div
                    key={step.step_key || idx}
                    className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-[10px]">
                          {idx + 1}
                        </span>
                        {(step.step_key || 'unknown_step').replace(/_/g, ' ')}
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
                        {(step.status_claimed || 'unconfirmed').replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed">
                      {step.summary || 'No step summary provided by agent.'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
