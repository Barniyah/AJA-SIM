import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Trash2,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  getUserOpenRouterKey,
  setUserOpenRouterKey,
  clearUserOpenRouterKey,
  testOpenRouterKey,
  KeyTestResult,
} from '../adapters/keyStore';
import { orchestrator } from '../orchestration';
import { aiGateway } from '../adapters/ai';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotaMessage?: string;
  quotaDetails?: string;
  onKeySaved?: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  quotaMessage,
  quotaDetails,
  onKeySaved,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<KeyTestResult | null>(null);
  const [hasSavedKey, setHasSavedKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existing = getUserOpenRouterKey();
      setApiKeyInput(existing);
      setHasSavedKey(Boolean(existing));
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!apiKeyInput.trim()) {
      setTestResult({
        valid: false,
        messageAr: 'يرجى كتابة أو لصق مفتاح OpenRouter أولاً.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    const result = await testOpenRouterKey(apiKeyInput);
    setTestResult(result);
    setTesting(false);
  };

  const handleSaveKey = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      alert('يرجى إدخال مفتاح OpenRouter صالح.');
      return;
    }
    setUserOpenRouterKey(trimmed);
    setHasSavedKey(true);
    aiGateway.fetchCapabilities(); // Refresh capabilities with new key
    if (onKeySaved) onKeySaved();
    onClose();
  };

  const handleClearKey = () => {
    clearUserOpenRouterKey();
    setApiKeyInput('');
    setHasSavedKey(false);
    setTestResult(null);
    aiGateway.fetchCapabilities();
  };

  const handleSwitchToStatic = () => {
    orchestrator.setMode('demo-static');
    onClose();
  };

  const isExhaustionAlert = Boolean(quotaMessage);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2.5 rounded-xl ${
                isExhaustionAlert ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
              }`}
            >
              {isExhaustionAlert ? <AlertTriangle className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {isExhaustionAlert
                  ? 'تنبيه: نفاذ رصيد OpenRouter للوضع الحي'
                  : 'إعداد مفتاح OpenRouter للوضع الحي'}
              </h3>
              <p className="text-xs text-slate-500">
                استخدام مفتاحك البرمجي الخاص لمتابعة استدعاء النماذج الحية
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

        {/* Notice Banner */}
        {isExhaustionAlert && (
          <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs space-y-1.5">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{quotaMessage}</span>
            </div>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              رصيد حساب الاستضافة المخصص لخدمات OpenRouter قد نفد أو غير كافٍ لتنفيذ فحص القواعد أو الاستدلال الحي.
              يمكنك المتابعة بسهولة بإدخال مفتاح OpenRouter الخاص بك أدناه، أو التبديل إلى الوضع الثابت (المحاكاة) مجاناً دون الحاجة لأي مفتاح.
            </p>
            {quotaDetails && (
              <div className="mt-1 font-mono text-[10px] bg-white/70 p-1.5 rounded border border-amber-200 text-amber-900 bidi-ltr truncate">
                {quotaDetails}
              </div>
            )}
          </div>
        )}

        {/* Models Info */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>النماذج المستخدمة عند توفير المفتاح:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <div className="text-slate-400 text-[10px]">محرك القواعد:</div>
              <div className="font-mono font-semibold text-slate-800 bidi-ltr">typesafe/jev-1.13</div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <div className="text-slate-400 text-[10px]">الاستدلال والتصنيف:</div>
              <div className="font-mono font-semibold text-slate-800 bidi-ltr">qwen/qwen-2.5-72b-instruct</div>
            </div>
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold pt-0.5">
            ✓ حماية تامة: هذا المفتاح يستخدم حصراً عبر OpenRouter مع صفر استهلاك لحساب Google.
          </div>
        </div>

        {/* API Key Input Form */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-slate-700">
            <label htmlFor="openrouter-key-input" className="flex items-center gap-1">
              <span>مفتاح OpenRouter API (يبدأ بـ sk-or-...):</span>
            </label>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700 flex items-center gap-1 text-[11px]"
            >
              <span>إنشاء مفتاح من OpenRouter</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative">
            <input
              id="openrouter-key-input"
              type={showKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2.5 pl-10 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition"
              title={showKey ? 'إخفاء' : 'إظهار'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Test & Clear Actions */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testing || !apiKeyInput.trim()}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold transition disabled:opacity-40 flex items-center gap-1"
              >
                {testing && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>اختبار المفتاح</span>
              </button>

              {hasSavedKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-medium transition flex items-center gap-1"
                  title="مسح المفتاح المحفوظ والرجوع لمفتاح الخادم"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>إزالة المفتاح</span>
                </button>
              )}
            </div>

            <span className="text-[10px] text-slate-400">
              {hasSavedKey ? 'يوجد مفتاح مخصص محفوظ بمتصفحك' : 'يحفظ محلياً في متصفحك'}
            </span>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 ${
                testResult.valid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="font-semibold">{testResult.messageAr}</div>
                {testResult.valid && typeof testResult.usageUsd === 'number' && (
                  <div className="text-[10px] text-emerald-700">
                    الاستهلاك المسجل: ${testResult.usageUsd.toFixed(4)} USD
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <button
            onClick={handleSwitchToStatic}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition flex items-center justify-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>التبديل إلى الوضع الثابت (المحاكاة)</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition"
            >
              إلغاء
            </button>
            <button
              onClick={handleSaveKey}
              disabled={!apiKeyInput.trim()}
              className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              حفظ وتفعيل المفتاح
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
