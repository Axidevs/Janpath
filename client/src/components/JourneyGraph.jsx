import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  UserCheck,
  FileText,
  ListOrdered,
  Calendar,
  ExternalLink
} from 'lucide-react';

const STEP_METADATA = [
  {
    key: 'eligibility',
    label: 'Eligibility',
    subtitle: 'Age & Income Criteria',
    icon: UserCheck
  },
  {
    key: 'documents',
    label: 'Documents',
    subtitle: 'Required Proofs',
    icon: FileText
  },
  {
    key: 'application_steps',
    label: 'Procedure',
    subtitle: 'Submission Steps',
    icon: ListOrdered
  },
  {
    key: 'deadline',
    label: 'Deadline',
    subtitle: 'Closing Date',
    icon: Calendar
  },
  {
    key: 'next_action',
    label: 'Application Link',
    subtitle: 'Actionable CTA',
    icon: ExternalLink
  }
];

export default function JourneyGraph({ audit, selectedStep, onSelectStep }) {
  if (!audit) return null;

  // Derive highest-severity status for each step key from findings and raw steps
  const getStepStatus = (stepKey) => {
    // 1. Check if there are findings for this step
    const stepFindings = (audit.findings || []).filter((f) => f.stepKey === stepKey);
    if (stepFindings.length > 0) {
      if (stepFindings.some((f) => f.status === 'NOT_FOUND_IN_SCOPE')) return 'NOT_FOUND_IN_SCOPE';
      if (stepFindings.some((f) => f.status === 'UNCONFIRMED')) return 'UNCONFIRMED';
      if (stepFindings.some((f) => f.status === 'UNVERIFIED_CLAIM')) return 'UNVERIFIED_CLAIM';
      if (stepFindings.every((f) => f.status === 'VERIFIED_FOUND')) return 'VERIFIED_FOUND';
    }

    // 2. Fallback to rawResult.steps if findings empty
    const rawStep = (audit.rawResult?.steps || []).find((s) => s.step_key === stepKey);
    if (rawStep) {
      if (rawStep.status_claimed === 'found') return 'VERIFIED_FOUND';
      if (rawStep.status_claimed === 'partially_found') return 'UNVERIFIED_CLAIM';
      if (rawStep.status_claimed === 'not_found') return 'NOT_FOUND_IN_SCOPE';
    }

    return 'UNCONFIRMED';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED_FOUND':
        return {
          icon: CheckCircle2,
          bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-300',
          dotColor: 'bg-emerald-500',
          badgeText: 'Verified'
        };
      case 'UNVERIFIED_CLAIM':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-amber-50 text-amber-700 border-amber-300',
          dotColor: 'bg-amber-500',
          badgeText: 'Unverified Claim'
        };
      case 'NOT_FOUND_IN_SCOPE':
        return {
          icon: XCircle,
          bgColor: 'bg-rose-50 text-rose-700 border-rose-300',
          dotColor: 'bg-rose-500',
          badgeText: 'Missing In Scope'
        };
      case 'UNCONFIRMED':
      default:
        return {
          icon: HelpCircle,
          bgColor: 'bg-slate-100 text-slate-700 border-slate-300',
          dotColor: 'bg-slate-400',
          badgeText: 'Unconfirmed'
        };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Citizen Journey Pipeline</span>
            <span className="text-xs font-normal text-slate-500">
              &bull; Click any step node to inspect supporting evidence
            </span>
          </h2>
        </div>

        {/* Legend */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Verified Found
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Unverified
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Missing in Scope
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> Unconfirmed
          </span>
        </div>
      </div>

      {/* Pipeline Track */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 relative">
        {STEP_METADATA.map((step, idx) => {
          const status = getStepStatus(step.key);
          const badge = getStatusBadge(status);
          const IconComponent = step.icon;
          const StatusIcon = badge.icon;
          const isSelected = selectedStep === step.key;

          return (
            <div key={step.key} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectStep(isSelected ? null : step.key)}
                className={`w-full text-left p-3 rounded-lg border transition-all text-xs relative ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/40 shadow-sm'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                    <IconComponent className="w-4 h-4 text-slate-700" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.bgColor}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    <span>{badge.badgeText}</span>
                  </span>
                </div>

                <div className="font-bold text-slate-900 text-xs truncate">
                  {step.label}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {step.subtitle}
                </div>
              </button>

              {idx < STEP_METADATA.length - 1 && (
                <ArrowRight className="hidden sm:block w-4 h-4 text-slate-300 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
