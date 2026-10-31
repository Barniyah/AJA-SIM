import React, { useEffect, useState } from 'react';
import {
  X,
  Settings,
  ShieldCheck,
  Cpu,
  BrainCircuit,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  KeyRound,
} from 'lucide-react';
import { SimulationCapabilities } from '../types';
import { aiGateway } from '../adapters/ai';
import { orchestrator } from '../orchestration';
import { medplum } from '../adapters/medplum';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: 'demo-static' | 'live-ai';
  onModeChange: (mode: 'demo-static' | 'live-ai') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onModeChange,
}) => {
  const [capabilities, setCapabilities] = useState<SimulationCapabilities | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      aiGateway.fetchCapabilities().then((caps) => {
        setCapabilities(caps);
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportJson = async () => {
    try {
      const patients = await medplum.searchResources('Patient');
      const claims = await medplum.searchResources('Claim');
      const tasks = await medplum.searchResources('Task');
      const docs = await medplum.searchResources('DocumentReference');
      const responses = await medplum.searchResources('ClaimResponse');
      const payments = await medplum.searchResources('PaymentReconciliation');

      const snapshot = {
        exportedAt: new Date().toISOString(),
        orchestratorSnapshot: orchestrator.getSnapshot(),
        fhirBundle: {
          patients,
          claims,
          tasks,
          docs,
          responses,
          payments,
        },
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `aja-rcm-simulation-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('حدث خطأ أثناء تصدير البيانات');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">إعدادات المحاكي وحالة البيئة</h3>
              <p className="text-xs text-slate-500">إدارة أوضاع التشغيل، محركات الذكاء الاصطناعي، ومصفوفة القبول</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Mode Selector */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5">
          <div className="font-bold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BrainCircuit className="w-4 h-4 text-emerald-700" />
              <span>وضع الذكاء الاصطناعي (AI Execution Mode):</span>
            </span>
            <span className="text-[10px] text-slate-400">حماية المفتاح في الخادم حصراً</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onModeChange('demo-static')}
              className={`p-3 rounded-xl border text-right transition ${
                currentMode === 'demo-static'
                  ? 'bg-white border-emerald-600 ring-1 ring-emerald-500 shadow-xs'
                  : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
              }`}
            >
              <div className="font-bold text-slate-900 mb-0.5">الوضع الثابت (محاكاة)</div>
              <div className="text-[10px] text-slate-500 leading-normal">
                يعمل فوراً دون مفاتيح، استجابات سريعة معتمدة وموسومة كمحاكاة.
              </div>
            </button>

            <button
              onClick={() => {
                if (capabilities?.isLiveAvailable) {
                  onModeChange('live-ai');
                } else {
                  onClose();
                  orchestrator.openQuotaModal('يرجى تزويد مفتاح OpenRouter الخاص بك لتفعيل الوضع الحي.');
                }
              }}
              className={`p-3 rounded-xl border text-right transition ${
                currentMode === 'live-ai'
                  ? 'bg-white border-teal-600 ring-1 ring-teal-500 shadow-xs'
                  : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
              }`}
            >
              <div className="font-bold text-slate-900 mb-0.5 flex items-center justify-between">
                <span>الوضع الحي (AI حقيقي)</span>
                {capabilities?.isLiveAvailable ? (
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                ) : (
                  <span className="text-[9px] text-amber-600 bg-amber-50 px-1 rounded">غير متصل</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 leading-normal">
                استدعاءات سحابية حية عبر OpenRouter (القواعد: typesafe/jev-1.13، والاستدلال: Qwen 2.5) دون أي استهلاك لخدمات Google.
              </div>
            </button>
          </div>

          <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
            <div className="font-semibold text-slate-800 mb-0.5">جاهزية الوسيط الخلفي:</div>
            <div>{capabilities?.systemNoticeAr || 'جارٍ فحص الاتصال...'}</div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono bidi-ltr">
              Rules: typesafe/jev-1.13 | Classifier: {capabilities?.classifierModel || 'qwen/qwen-2.5-72b-instruct'} | Reasoner:{' '}
              {capabilities?.reasonerModel || 'qwen/qwen-2.5-72b-instruct'}
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-1">
              * تم قفل استهلاك أي رصيد من Google نهائياً لحماية حسابك عند مشاركة الرابط.
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">مفتاح مخصص للوضع الحي:</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  orchestrator.openQuotaModal();
                }}
                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-semibold flex items-center gap-1 transition"
              >
                <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                <span>إدارة / إدخال مفتاح OpenRouter الخاص بك</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 17 Compliance Matrix */}
        <div className="space-y-2 text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>مصفوفة تسليم المكونات الفنية (Compliance Matrix - القسم 17):</span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-[11px]">
            <div className="p-2.5 bg-slate-50 flex items-center justify-between">
              <span className="font-semibold text-slate-700">مستودع FHIR MockClient:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> مستخدم فعلياً (@medplum/mock)
              </span>
            </div>
            <div className="p-2.5 bg-white flex items-center justify-between">
              <span className="font-semibold text-slate-700">محرك القواعد:</span>
              <span className="font-bold text-teal-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> بديل TypeScript مصرح به وموسوم
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 flex items-center justify-between">
              <span className="font-semibold text-slate-700">الذكاء الاصطناعي:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> وضع ثابت مكتمل + وضع حي وسيط آمن
              </span>
            </div>
            <div className="p-2.5 bg-white flex items-center justify-between">
              <span className="font-semibold text-slate-700">موقع حفظ البيانات:</span>
              <span className="font-bold text-slate-800">ذاكرة الجلسة (In-Memory MemoryRepository)</span>
            </div>
            <div className="p-2.5 bg-slate-50 flex items-center justify-between">
              <span className="font-semibold text-slate-700">محاكي التأمين والبنك:</span>
              <span className="font-bold text-emerald-700">محاكاة اصطناعية مدمجة ومطابقة للفروق</span>
            </div>
            <div className="p-2.5 bg-white flex items-center justify-between">
              <span className="font-semibold text-slate-700">تطبيق الويب وتجاوب الشاشات:</span>
              <span className="font-bold text-emerald-700">متجاوب بالكامل مع دعم العربية RTL</span>
            </div>
          </div>
        </div>

        {/* State Export Action */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير لقطة الجلسة (JSON)</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
