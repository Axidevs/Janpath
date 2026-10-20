import React from 'react';
import { Compass, Users, Wrench, GitCompare, History, PlusCircle, FileText } from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  onNewAuditClick,
  onLoadSampleClick,
  activeAudit
}) {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-inner">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">JanPath</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Citizen Journey Auditor
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Test the Journey, Not Just the Website
              </p>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('citizen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'citizen'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Citizen Mode</span>
            </button>

            <button
              onClick={() => setActiveTab('owner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'owner'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Owner Mode</span>
            </button>

            <button
              onClick={() => setActiveTab('compare')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'compare'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              <span className="hidden md:inline">Compare Audits</span>
              <span className="md:hidden">Compare</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden md:inline">History</span>
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            <button
              onClick={onLoadSampleClick}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
              title="Load pre-built dev sample audit data"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Dev Sample</span>
            </button>

            <button
              onClick={onNewAuditClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">New Audit</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Audit Banner */}
      {activeAudit && (
        <div className="bg-slate-950 border-t border-slate-800 px-4 py-1.5 text-xs text-slate-400 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-2 truncate max-w-3xl">
            <span className="font-semibold text-slate-300">Auditing:</span>
            <span className="text-emerald-400 font-mono truncate">{activeAudit.startUrl}</span>
            {activeAudit.isDevSample && (
              <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded font-medium">
                dev sample
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-slate-500 font-mono">{activeAudit._id}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                activeAudit.status === 'COMPLETED'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : activeAudit.status === 'RUNNING'
                  ? 'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse'
                  : activeAudit.status === 'PARTIAL'
                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}
            >
              {activeAudit.status}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
