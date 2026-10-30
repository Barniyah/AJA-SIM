import React, { useState } from 'react';
import { X, Sliders, AlertTriangle, Play, Sparkles } from 'lucide-react';
import { ScenarioFixture, ScenarioId } from '../types';
import { SCENARIO_FIXTURES } from '../fixtures/scenarios';
import { orchestrator } from '../orchestration';

interface CustomScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseScenarioId: ScenarioId;
}

export const CustomScenarioModal: React.FC<CustomScenarioModalProps> = ({
  isOpen,
  onClose,
  baseScenarioId,
}) => {
  const [selectedBase, setSelectedBase] = useState<ScenarioId>(baseScenarioId || 'S1');
  const [patientName, setPatientName] = useState('سعد بن خالد (اصطناعي)');
  const [memberId, setMemberId] = useState('SYN-MEM-9901');
  const [serviceCode, setServiceCode] = useState('DEMO-SVC-01');
  const [billedAmount, setBilledAmount] = useState(300);
  const [clinicalText, setClinicalText] = useState(
    'زيارة استشارة طبية تجريبية لمتابعة فحص وقائي دوري. العلامات الحيوية طبيعية.'
  );

  if (!isOpen) return null;

  const handleBaseChange = (id: ScenarioId) => {
    setSelectedBase(id);
    const fixture = SCENARIO_FIXTURES[id];
    setPatientName(`${fixture.patient.nameAr} (مخصص)`);
    setMemberId(fixture.patient.memberId);
    setServiceCode(fixture.claim.serviceCode);
    setBilledAmount(fixture.claim.billedAmount);
    setClinicalText(fixture.documents[0]?.text || '');
  };

  const handleLaunchCustom = () => {
    const base = SCENARIO_FIXTURES[selectedBase];
    const customFixture: ScenarioFixture = {
      ...base,
      id: selectedBase,
      nameAr: `حالة مخصصة مشتقة من ${selectedBase}`,
      subtitleAr: 'تجربة مدخلات اصطناعية مخصصة',
      descriptionAr: 'حالة اختبارية معدلة يدوياً بواسطة المستخدم لفحص استجابة القواعد والذكاء الاصطناعي.',
      patient: {
        ...base.patient,
        nameAr: patientName,
        memberId,
      },
      claim: {
        ...base.claim,
        id: `CLM-CUSTOM-${Date.now().toString(36).toUpperCase()}`,
        serviceCode,
        billedAmount: Number(billedAmount),
      },
      documents: [
        {
          id: `DOC-CUSTOM-${selectedBase}`,
          titleAr: 'سجل الملاحظات السريرية المخصص',
          version: '1.0',
          synthetic: true,
          author: 'طبيب اصطناعي مخصص',
          text: clinicalText.slice(0, 2000), // Max 2000 chars
        },
      ],
    };

    orchestrator.initRun(selectedBase, customFixture);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-100 text-teal-900">
              <Sliders className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">تخصيص حالة تجريبية جديدة</h3>
              <p className="text-xs text-slate-500">
                اشتقاق حالة اختبارية من السيناريوهات الخمسة دون المساس بالأصول
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PHI Warning */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-bold">تنبيه صارم: </span>
            يمنع منعاً باتاً إدخال أي بيانات حقيقية لمرضى أو منشآت. استخدم أسماء وأرقاماً اصطناعية فقط. الحد الأقصى للنص السريري هو 2000 حرف.
          </p>
        </div>

        {/* Base Scenario Selector */}
        <div className="space-y-1.5 text-xs">
          <label className="font-bold text-slate-800">الحالة الأساسية للاشتقاق:</label>
          <div className="grid grid-cols-5 gap-1.5">
            {(['S1', 'S2', 'S3', 'S4', 'S5'] as ScenarioId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => handleBaseChange(id)}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  selectedBase === id
                    ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {id}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">اسم المريض الاصطناعي:</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">رقم العضوية (أو فارغ لاختبار S2):</label>
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bidi-ltr"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">كود الخدمة:</label>
            <select
              value={serviceCode}
              onChange={(e) => setServiceCode(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
            >
              <option value="DEMO-SVC-01">DEMO-SVC-01 (استشارة عيادة 300/200 ر.س)</option>
              <option value="DEMO-SVC-02">DEMO-SVC-02 (إجراء صغرى 600 ر.س)</option>
              <option value="DEMO-SVC-03">DEMO-SVC-03 (فحص متقدم 1000 ر.س)</option>
              <option value="DEMO-SVC-05">DEMO-SVC-05 (حزمة تأهيل 2000 ر.س)</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">المبلغ المفوتر (ر.س):</label>
            <input
              type="number"
              value={billedAmount}
              onChange={(e) => setBilledAmount(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>
        </div>

        {/* Clinical Note Text */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center">
            <label className="font-semibold text-slate-700">النص السريري وملاحظات الكشف:</label>
            <span className="text-[10px] text-slate-400 font-mono">{clinicalText.length} / 2000 حرف</span>
          </div>
          <textarea
            value={clinicalText}
            onChange={(e) => setClinicalText(e.target.value.slice(0, 2000))}
            rows={4}
            className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-sans focus:ring-1 focus:ring-teal-500 leading-relaxed"
          />
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition"
          >
            إلغاء
          </button>
          <button
            onClick={handleLaunchCustom}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow transition flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>بدء تشغيل الحالة المخصصة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
