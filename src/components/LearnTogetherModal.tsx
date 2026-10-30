import React, { useState } from 'react';
import {
  Lightbulb,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  X,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { RuleProposal } from '../types';
import { rulesAdapter } from '../adapters/rules';
import { orchestrator } from '../orchestration';

interface LearnTogetherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LearnTogetherModal: React.FC<LearnTogetherModalProps> = ({ isOpen, onClose }) => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<{
    test1Passed: boolean;
    test2Passed: boolean;
    test3Passed: boolean;
    allPassed: boolean;
  } | null>(null);

  if (!isOpen) return null;

  const currentActiveRule = rulesAdapter.getActiveLearnedRule();

  const proposal: RuleProposal = {
    id: 'PROP-S4-01',
    ruleId: 'DEMO-REQ-004',
    nameAr: 'التحقق الاستباقي من إرفاق تقرير الفحص المعتمد للخدمة DEMO-SVC-03 قبل الإرسال',
    conditionSummaryAr: 'إذا كانت الخدمة DEMO-SVC-03، فيجب التحقق من وجود مستند داعم بحزمة الإرسال',
    reasonAr: 'تكرار الرفض التأميني بسبب سقوط التقرير المتوفر في الأرشيف من حزمة الإرسال الإلكتروني',
    targetService: 'DEMO-SVC-03',
    version: '1.0',
    status: currentActiveRule?.status === 'active' ? 'active' : 'draft',
  };

  const handleRunTests = async () => {
    setTesting(true);
    const results = await rulesAdapter.testRuleProposal(proposal);
    setTestResults(results);
    setTesting(false);
  };

  const handleActivateRule = () => {
    rulesAdapter.setActiveLearnedRule({
      ...proposal,
      status: 'active',
    });
    orchestrator.triggerNextStep(); // Refresh state
    onClose();
  };

  const handleDeactivateRule = () => {
    rulesAdapter.setActiveLearnedRule(null);
    orchestrator.triggerNextStep();
    setTestResults(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
              <Lightbulb className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                مبادرة «نتعلّم معاً» — اقتراح واعتماد قاعدة احترازية
              </h3>
              <p className="text-xs text-slate-500">
                تحويل الدروس المستفادة من الرفض التأميني إلى قاعدة تحقق حتمية تحت إشراف الإنسان
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

        {/* Rule Details Card */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm">{proposal.nameAr}</span>
            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 bidi-ltr">
              {proposal.ruleId}
            </span>
          </div>
          <div className="text-slate-600">
            <span className="font-semibold text-slate-800">سبب الاقتراح: </span>
            <span>{proposal.reasonAr}</span>
          </div>
          <div className="text-slate-600">
            <span className="font-semibold text-slate-800">الشرط الفني: </span>
            <span className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 inline-block bidi-ltr">
              {proposal.conditionSummaryAr}
            </span>
          </div>
          <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
            * القاعدة لا تتفعل تلقائياً؛ يلزم تشغيل حزمة الاختبارات الثلاثة أولاً ثم الحصول على موافقة صريحة من المستخدم داخل الجلسة.
          </div>
        </div>

        {/* 3 Mandatory Test Cases */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-800">
            <span>اختبارات القبول الثلاثة الإلزامية:</span>
            <button
              onClick={handleRunTests}
              disabled={testing}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition disabled:opacity-50"
            >
              <Play className="w-3 h-3" />
              <span>{testing ? 'جارٍ الاختبار...' : 'تشغيل الاختبارات'}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {/* Test 1 */}
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800">1. الخدمة المعنية (DEMO-SVC-03) بدون مرفق</div>
                <div className="text-[11px] text-slate-500">النتيجة المتوقعة: حجب حتمي وتنبيه بنقص المستند</div>
              </div>
              {testResults ? (
                testResults.test1Passed ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                    <CheckCircle2 className="w-4 h-4" /> اجتياز
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                    <XCircle className="w-4 h-4" /> فشل
                  </span>
                )
              ) : (
                <span className="text-slate-400 text-[11px]">بانتظار الفحص</span>
              )}
            </div>

            {/* Test 2 */}
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800">2. الخدمة نفسها (DEMO-SVC-03) مع إرفاق التقرير</div>
                <div className="text-[11px] text-slate-500">النتيجة المتوقعة: اجتياز كامل وسماح بالإرسال</div>
              </div>
              {testResults ? (
                testResults.test2Passed ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                    <CheckCircle2 className="w-4 h-4" /> اجتياز
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                    <XCircle className="w-4 h-4" /> فشل
                  </span>
                )
              ) : (
                <span className="text-slate-400 text-[11px]">بانتظار الفحص</span>
              )}
            </div>

            {/* Test 3 */}
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800">3. خدمات عيادية أخرى (DEMO-SVC-01) بدون مرفق</div>
                <div className="text-[11px] text-slate-500">النتيجة المتوقعة: عدم التأثر واستمرار المسار الطبيعي</div>
              </div>
              {testResults ? (
                testResults.test3Passed ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                    <CheckCircle2 className="w-4 h-4" /> اجتياز
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                    <XCircle className="w-4 h-4" /> فشل
                  </span>
                )
              ) : (
                <span className="text-slate-400 text-[11px]">بانتظار الفحص</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {currentActiveRule?.status === 'active' ? (
            <button
              onClick={handleDeactivateRule}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs transition flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إلغاء تفعيل القاعدة والرجوع للإصدار السابق</span>
            </button>
          ) : (
            <div className="text-slate-400 text-[11px]">القاعدة غير نشطة حالياً</div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition"
            >
              إلغاء
            </button>
            <button
              onClick={handleActivateRule}
              disabled={!testResults?.allPassed || currentActiveRule?.status === 'active'}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>موافقة وتفعيل القاعدة للجلسة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
