import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import AuditForm from './components/AuditForm.jsx';
import AuditProgress from './components/AuditProgress.jsx';
import JourneyGraph from './components/JourneyGraph.jsx';
import CitizenMode from './components/CitizenMode.jsx';
import OwnerMode from './components/OwnerMode.jsx';
import EvidenceExplorer from './components/EvidenceExplorer.jsx';
import AuditHistory from './components/AuditHistory.jsx';
import ComparisonView from './components/ComparisonView.jsx';

import { SAMPLE_AUDIT } from './data/sampleAudit.js';
import { getAudit, listAudits } from './api.js';

import {
  Compass,
  Sparkles,
  ShieldCheck,
  Users,
  Wrench,
  AlertOctagon,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('citizen');
  const [activeAudit, setActiveAudit] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [runningAuditId, setRunningAuditId] = useState(null);
  const [selectedStepKey, setSelectedStepKey] = useState(null);
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Attempt to load most recent audit on initial mount; if none, prompt empty state
  useEffect(() => {
    let isCancelled = false;
    const loadInitial = async () => {
      try {
        const list = await listAudits();
        if (!isCancelled && list && list.length > 0) {
          // Fetch full recent audit
          const full = await getAudit(list[0]._id);
          if (!isCancelled && full) {
            setActiveAudit(full);
          }
        }
      } catch (err) {
        // Fallback to offline empty state
      }
    };
    loadInitial();
    return () => {
      isCancelled = true;
    };
  }, []);

  const handleAuditStarted = (auditId) => {
    setRunningAuditId(auditId);
    setSelectedStepKey(null);
    setSelectedFindingId(null);
  };

  const handleAuditComplete = (fullAudit) => {
    setActiveAudit(fullAudit);
    setRunningAuditId(null);
  };

  const handleLoadSample = () => {
    setActiveAudit(SAMPLE_AUDIT);
    setSelectedStepKey(null);
    setSelectedFindingId(null);
    setActiveTab('citizen');
  };

  const handleSelectFinding = (findingId) => {
    setSelectedFindingId(findingId);
    // Smooth scroll down to Evidence Explorer
    const explorerEl = document.getElementById('evidence-explorer-section');
    if (explorerEl) {
      explorerEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewAuditClick={() => setIsFormOpen(true)}
        onLoadSampleClick={handleLoadSample}
        activeAudit={activeAudit}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Live Running Progress Card */}
        {runningAuditId && (
          <AuditProgress
            auditId={runningAuditId}
            onAuditComplete={handleAuditComplete}
          />
        )}

        {/* Global Loading Indicator */}
        {loading && (
          <div className="p-12 text-center text-slate-500 text-sm">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading audit journey details...</span>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-600 hover:text-rose-900 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active Audit Loaded View */}
        {activeAudit && !runningAuditId && (
          <div>
            {/* Partial Audit Warning Banner if status === PARTIAL */}
            {activeAudit.status === 'PARTIAL' && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Partial Exploration Warning: </span>
                  The agent exploration stopped before all paths could be traversed. Only visited steps are evaluated. Unconfirmed items are not proof of absence.
                </div>
              </div>
            )}

            {/* Exploration Failed Banner if status === EXPLORATION_FAILED */}
            {activeAudit.status === 'EXPLORATION_FAILED' && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Exploration Failed: </span>
                  The audit agent was unable to complete the journey on this domain. Check network access or domain allowlist policies.
                </div>
              </div>
            )}

            {/* Top Interactive Journey Graph */}
            <JourneyGraph
              audit={activeAudit}
              selectedStep={selectedStepKey}
              onSelectStep={(stepKey) => {
                setSelectedStepKey(stepKey);
                setSelectedFindingId(null);
              }}
            />

            {/* Tab Body Switching */}
            {activeTab === 'citizen' && (
              <div className="space-y-6">
                <CitizenMode
                  audit={activeAudit}
                  selectedStepKey={selectedStepKey}
                  onSelectFinding={handleSelectFinding}
                />
                <div id="evidence-explorer-section">
                  <EvidenceExplorer
                    audit={activeAudit}
                    selectedStepKey={selectedStepKey}
                    selectedFindingId={selectedFindingId}
                  />
                </div>
              </div>
            )}

            {activeTab === 'owner' && (
              <div className="space-y-6">
                <OwnerMode
                  audit={activeAudit}
                  onSelectFinding={handleSelectFinding}
                />
                <div id="evidence-explorer-section">
                  <EvidenceExplorer
                    audit={activeAudit}
                    selectedStepKey={selectedStepKey}
                    selectedFindingId={selectedFindingId}
                  />
                </div>
              </div>
            )}

            {activeTab === 'compare' && (
              <ComparisonView activeAudit={activeAudit} />
            )}

            {activeTab === 'history' && (
              <AuditHistory
                onSelectAudit={(audit) => {
                  setActiveAudit(audit);
                  setSelectedStepKey(null);
                  setSelectedFindingId(null);
                  setActiveTab('citizen');
                }}
                onAuditStarted={handleAuditStarted}
                onNewAuditClick={() => setIsFormOpen(true)}
              />
            )}
          </div>
        )}

        {/* Empty State when no audit is active and not currently running */}
        {!activeAudit && !runningAuditId && (
          <div>
            {activeTab === 'history' ? (
              <AuditHistory
                onSelectAudit={(audit) => {
                  setActiveAudit(audit);
                  setActiveTab('citizen');
                }}
                onAuditStarted={handleAuditStarted}
                onNewAuditClick={() => setIsFormOpen(true)}
              />
            ) : (
              <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-emerald-600/20">
                  <Compass className="w-9 h-9" />
                </div>

                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
                  Test the Journey, Not Just the Website
                </h1>

                <p className="mt-3 text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  JanPath verifies whether a citizen can actually complete a public-service task.
                  Independent backend page retrieval guarantees every finding is backed by verified verbatim evidence.
                </p>

                {/* Quick Start Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => setIsFormOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02]"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Launch New Audit</span>
                  </button>

                  <button
                    onClick={handleLoadSample}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm border border-slate-200 shadow-sm transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Explore Dev Sample Data</span>
                  </button>
                </div>

                {/* 3 Pillar Feature Cards */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                      <Users className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1">
                      Citizen Mode
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Plain-language answers for citizens: eligibility, required document checklists, deadlines, and actionable next steps.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1">
                      Owner Mode
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Technical findings, broken next-step detection, scattered document alerts, and exact repair suggestions for web teams.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-4">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1">
                      Evidence Verification Engine
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Independent backend page retrieval verifies quotes in retrieved text. Zero hallucinated claims or invented scores.
                    </p>
                  </div>
                </div>

                {/* Mandatory Disclaimer Note */}
                <div className="mt-12 p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs max-w-2xl mx-auto flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed text-left">
                    <strong>Evidence Guarantee:</strong> A match proves the quote exists in the retrieved text, not that the claim is true, current or applicable.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Audit Launch Modal */}
      <AuditForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onAuditStarted={handleAuditStarted}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">JanPath</span>
            <span>&bull; Public Service Citizen Journey Auditor</span>
          </div>
          <div>
            <span>Deterministic Rules &bull; Verbatim Quote Verification &bull; No LLM Hallucinations</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
