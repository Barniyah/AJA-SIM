import React, { useState, useEffect } from 'react';
import {
  Code,
  Shield,
  FileCheck,
  ListOrdered,
  Copy,
  Check,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { RuleProposal, RuleResult, SimulationEvent } from '../types';
import { medplum } from '../adapters/medplum';
import { MinimizationResult } from '../domain/minimization';
import { CONTRACT_RULES_INFO } from '../fixtures/scenarios';

interface InspectorDrawerProps {
  minimizationResult: MinimizationResult | null;
  ruleResult: RuleResult | null;
  activeLearnedRule: RuleProposal | null;
  events: SimulationEvent[];
  claimId: string;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  minimizationResult,
  ruleResult,
  activeLearnedRule,
  events,
  claimId,
}) => {
  const [activeTab, setActiveTab] = useState<'fhir' | 'sanitized' | 'rules' | 'events'>('fhir');
  const [fhirJson, setFhirJson] = useState<string>('{}');
  const [copied, setCopied] = useState(false);

  // Fetch live resources from Medplum MockClient
  useEffect(() => {
    async function loadFhirState() {
      try {
        const patients = await medplum.searchResources('Patient');
        const claims = await medplum.searchResources('Claim');
        const tasks = await medplum.searchResources('Task');
        const docs = await medplum.searchResources('DocumentReference');
        const responses = await medplum.searchResources('ClaimResponse');
        const payments = await medplum.searchResources('PaymentReconciliation');

        const bundle = {
          resourceType: 'Bundle',
          type: 'collection',
          totalResources: patients.length + claims.length + tasks.length + docs.length + responses.length + payments.length,
          entry: [
            ...tasks.map((r) => ({ resource: r })),
            ...claims.map((r) => ({ resource: r })),
            ...patients.map((r) => ({ resource: r })),
            ...docs.map((r) => ({ resource: r })),
            ...responses.map((r) => ({ resource: r })),
            ...payments.map((r) => ({ resource: r })),
          ],
        };
        setFhirJson(JSON.stringify(bundle, null, 2));
      } catch (err) {
        console.error('Error fetching FHIR state:', err);
      }
    }
    loadFhirState();
  }, [claimId, events]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[480px]">
      {/* Tab Bar */}
      <div className="flex border-b border-slate-200 bg-slate-50/80 px-2 pt-2 gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('fhir')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
            activeTab === 'fhir'
              ? 'bg-white text-emerald-800 border-emerald-600 shadow-xs'
              : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>موارد FHIR وTask</span>
        </button>

        <button
          onClick={() => setActiveTab('sanitized')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
            activeTab === 'sanitized'
              ? 'bg-white text-emerald-800 border-emerald-600 shadow-xs'
              : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>تقليل البيانات قبل AI</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
            activeTab === 'rules'
              ? 'bg-white text-emerald-800 border-emerald-600 shadow-xs'
              : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>القواعد وإصداراتها</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
            activeTab === 'events'
              ? 'bg-white text-emerald-800 border-emerald-600 shadow-xs'
              : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>سجل الأحداث ({events.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 p-3 overflow-y-auto bg-slate-50/30">
        {/* Tab 1: FHIR Resources */}
        {activeTab === 'fhir' && (
          <div className="space-y-2 h-full flex flex-col">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span>قراءة حية ومباشرة من ذاكرة Medplum MockClient:</span>
              <button
                onClick={() => handleCopy(fhirJson)}
                className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ' : 'نسخ JSON'}</span>
              </button>
            </div>
            <pre className="flex-1 p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-auto bidi-ltr">
              {fhirJson}
            </pre>
          </div>
        )}

        {/* Tab 2: Data Minimization Diff */}
        {activeTab === 'sanitized' && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950">
              <div className="font-bold mb-1">تقليل البيانات قبل AI — تجربة توضيحية:</div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                يتم تنقيح الحقول الإدارية والشخصية واستبدال المعرفات برموز اصطناعية داخل الجلسة، مع تمرير النص السريري اللازم للنموذج فقط. العنوان تجربة توضيحية وليس شهادة امتثال PDPL.
              </p>
            </div>

            {minimizationResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Pre-sanitization */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-700 flex items-center justify-between">
                    <span>المدخل قبل التنقيح (Pre-Minimization):</span>
                    <span className="text-slate-400 font-mono text-[10px]">Raw HIS</span>
                  </div>
                  <pre className="p-2 bg-slate-100 rounded text-[11px] text-slate-800 font-mono overflow-auto max-h-[220px] bidi-ltr">
                    {JSON.stringify(minimizationResult.prePayload, null, 2)}
                  </pre>
                </div>

                {/* Post-sanitization */}
                <div className="p-3 bg-white rounded-xl border border-emerald-300 space-y-1.5">
                  <div className="font-bold text-emerald-800 flex items-center justify-between">
                    <span>المدخل المرسل للنموذج (Sanitized Payload):</span>
                    <span className="text-emerald-700 font-bold text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded">
                      تقليل بنسبة {minimizationResult.sanitizationRatioPercent}%
                    </span>
                  </div>
                  <pre className="p-2 bg-emerald-950 text-emerald-300 rounded text-[11px] font-mono overflow-auto max-h-[220px] bidi-ltr">
                    {JSON.stringify(minimizationResult.postPayload, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Business Rules & Versions */}
        {activeTab === 'rules' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-lg text-slate-700">
              <span className="font-semibold">إصدار محرك القواعد الحالي:</span>
              <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded bidi-ltr">
                {ruleResult?.ruleVersion || '2026.10-v2'} ({ruleResult?.engine || 'typescript-demo'})
              </span>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-800">قواعد العقد التجريبي النشطة:</div>
              {CONTRACT_RULES_INFO.map((r) => {
                const isViolated = ruleResult?.violations.some((v) => v.ruleId === r.id);
                return (
                  <div
                    key={r.id}
                    className={`p-2.5 rounded-xl border transition ${
                      isViolated
                        ? 'bg-rose-50 border-rose-300 text-rose-950'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="font-mono text-emerald-700 bidi-ltr">{r.id}</span>
                        <span>{r.nameAr}</span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          r.severity === 'block'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {r.severity === 'block' ? 'حاجبة (Block)' : 'مراجعة (Review)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">{r.descriptionAr}</p>
                  </div>
                );
              })}
            </div>

            {activeLearnedRule && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>قاعدة تجريبية نشطة من مبادرة «نتعلّم معاً»:</span>
                </div>
                <div className="text-[11px] text-emerald-800">
                  {activeLearnedRule.nameAr} ({activeLearnedRule.ruleId})
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Unified Event Log */}
        {activeTab === 'events' && (
          <div className="space-y-2 text-xs">
            {events.length === 0 ? (
              <div className="text-center text-slate-400 py-8">لا توجد أحداث مسجلة بعد</div>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.eventId}
                  className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-start justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 bidi-ltr">
                        {ev.eventType}
                      </span>
                      <span className="text-slate-400 text-[10px] font-mono bidi-ltr">{ev.runId}</span>
                    </div>
                    <p className="text-slate-800 font-medium text-[11px]">{ev.summaryAr}</p>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono shrink-0 bidi-ltr">
                    {ev.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
