/**
 * AJA Revenue Cycle Simulator & Value Intelligence
 * Main Application Component
 * Reference: AJA_SIM_TECH.md v2.0
 */

import React, { useEffect, useState } from 'react';
import { orchestrator } from './orchestration';
import { Header } from './components/Header';
import { ValueMetrics } from './components/ValueMetrics';
import { LiveArchitecture } from './components/LiveArchitecture';
import { ReviewWorkspace } from './components/ReviewWorkspace';
import { InspectorDrawer } from './components/InspectorDrawer';
import { LearnTogetherModal } from './components/LearnTogetherModal';
import { CustomScenarioModal } from './components/CustomScenarioModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';

export default function App() {
  const [snapshot, setSnapshot] = useState(orchestrator.getSnapshot());
  const [isLearnTogetherOpen, setIsLearnTogetherOpen] = useState(false);
  const [isCustomScenarioOpen, setIsCustomScenarioOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('core');

  useEffect(() => {
    const unsubscribe = orchestrator.subscribe(() => {
      setSnapshot({ ...orchestrator.getSnapshot() });
    });
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* 1. Header & Navigation Controls */}
      <Header
        currentScenarioId={snapshot.currentScenarioId}
        localStatus={snapshot.localStatus}
        isRunning={snapshot.isRunning}
        isAutoRunning={snapshot.isAutoRunning}
        mode={snapshot.mode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCustomScenario={() => setIsCustomScenarioOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {/* Scenario Banner Overview */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
                {snapshot.currentScenarioId}
              </span>
              <h2 className="text-base font-bold text-slate-900">{snapshot.fixture.nameAr}</h2>
              {snapshot.isCustomized && (
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-semibold">
                  حالة مخصصة
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
              {snapshot.fixture.descriptionAr}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-left md:text-right text-[11px] text-slate-500">
              <div>معرف التشغيل: <span className="font-mono text-slate-800 font-semibold bidi-ltr">{snapshot.runId}</span></div>
              <div>المطالبة: <span className="font-mono text-slate-800 font-semibold bidi-ltr">{snapshot.fixture.claim.id}</span></div>
            </div>
          </div>
        </div>

        {/* 2. Value Metrics Strip (6 Dimensions 3C + 3P = V) */}
        <ValueMetrics metrics={snapshot.metrics} />

        {/* 3. Live Architecture (Hub and Spoke Centerpiece) */}
        <LiveArchitecture
          nodeStatuses={snapshot.nodeStatuses}
          selectedNodeId={selectedNodeId}
          onSelectNode={(id) => setSelectedNodeId(id)}
        />

        {/* 4. Side-by-Side Review Workspace */}
        <ReviewWorkspace
          fixture={snapshot.fixture}
          localStatus={snapshot.localStatus}
          ruleResult={snapshot.ruleResult}
          aiReasoning={snapshot.aiReasoning}
          aiClassification={snapshot.aiClassification}
          humanDecision={snapshot.humanDecision}
          claimApproved={snapshot.claimApproved}
          claimExported={snapshot.claimExported}
          settlementCompleted={snapshot.settlementCompleted}
          s5Ledger={snapshot.s5Ledger}
          onOpenLearnTogether={() => setIsLearnTogetherOpen(true)}
        />

        {/* 5. Technical Inspector Drawer (4 Tabs) */}
        <InspectorDrawer
          minimizationResult={snapshot.minimizationResult}
          ruleResult={snapshot.ruleResult}
          activeLearnedRule={snapshot.activeLearnedRule}
          events={snapshot.events}
          claimId={snapshot.fixture.claim.id}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            «أجا | محاكي دورة الإيرادات وذكاء القيمة» — منصة استعراض ومحاكاة تجريبية، كافة البيانات والعقود والجهات اصطناعية.
          </div>
          <div className="text-slate-400 font-mono text-[11px] bidi-ltr">
            Medplum MockClient v2026.10 | Tailwind v4 | Express Node
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LearnTogetherModal
        isOpen={isLearnTogetherOpen}
        onClose={() => setIsLearnTogetherOpen(false)}
      />

      <CustomScenarioModal
        isOpen={isCustomScenarioOpen}
        onClose={() => setIsCustomScenarioOpen(false)}
        baseScenarioId={snapshot.currentScenarioId}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentMode={snapshot.mode}
        onModeChange={(newMode) => orchestrator.setMode(newMode)}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
