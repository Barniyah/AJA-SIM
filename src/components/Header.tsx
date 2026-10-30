import React from 'react';
import {
  Play,
  StepForward,
  RotateCcw,
  Square,
  Settings,
  Sparkles,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { LocalWorkflowStatus, ScenarioId } from '../types';
import { orchestrator } from '../orchestration';

interface HeaderProps {
  currentScenarioId: ScenarioId;
  localStatus: LocalWorkflowStatus;
  isRunning: boolean;
  isAutoRunning: boolean;
  mode: 'demo-static' | 'live-ai';
  onOpenSettings: () => void;
  onOpenCustomScenario: () => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScenarioId,
  localStatus,
  isRunning,
  isAutoRunning,
  mode,
  onOpenSettings,
  onOpenCustomScenario,
  onOpenHelp,
}) => {
  const scenarios: Array<{ id: ScenarioId; label: string; desc: string }> = [
    { id: 'S1', label: 'الحالة 1 (S1)', desc: 'مكتملة 300 ر.س' },
    { id: 'S2', label: 'الحالة 2 (S2)', desc: 'رقم عضوية ناقص' },
    { id: 'S3', label: 'الحالة 3 (S3)', desc: 'تعارض خدمة 600 ر.س' },
    { id: 'S4', label: 'الحالة 4 (S4)', desc: 'رفض مرفق 1000 ر.س' },
    { id: 'S5', label: 'الحالة 5 (S5)', desc: 'تسوية وفرق 200 ر.س' },
  ];

  const getStatusBadge = (status: LocalWorkflowStatus) => {
    switch (status) {
      case 'معتمدة':
      case 'تم الرد والتسوية':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'تحتاج استكمالاً':
      case 'مرفوضة من المراجع':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'بانتظار مراجع':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'تحليل AI':
      case 'فحص قواعد':
      case 'مصدرة للمحاكي':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/30 animate-pulse';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/40';
    }
  };

  return (
    <header className="bg-[#0F2922] text-white border-b border-emerald-950 shadow-md">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-lg shadow-inner">
            أ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">أجا | محاكي دورة الإيرادات وذكاء القيمة</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                بيانات اصطناعية تجريبية 100%
              </span>
            </div>
            <p className="text-xs text-emerald-200/70">
              محاكاة تفاعلية لحوكمة تدفق المطالبات، قواعد الأعمال، الذكاء الاصطناعي، والمراجعة البشرية
            </p>
          </div>
        </div>

        {/* Engine Badges & Settings Actions */}
        <div className="flex items-center gap-2">
          {/* Mode Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-emerald-950/70 border border-emerald-800/40 text-emerald-200">
            <span
              className={`w-2 h-2 rounded-full ${
                mode === 'live-ai' ? 'bg-teal-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span>{mode === 'live-ai' ? 'وضع AI حي (خادم آمن)' : 'الوضع الثابت (محاكاة)'}</span>
          </div>

          {/* Rules Badge */}
          <div className="hidden md:flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-emerald-950/70 border border-emerald-800/40 text-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-teal-400" />
            <span>{mode === 'live-ai' ? 'محرك القواعد: typesafe/jev-1.13' : 'قواعد تجريبية بديلة عن زِن'}</span>
          </div>

          <button
            onClick={onOpenCustomScenario}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-100 border border-emerald-700/60 transition"
            title="تخصيص حالة تجريبية جديدة"
          >
            <Sliders className="w-3.5 h-3.5 text-teal-300" />
            <span className="hidden sm:inline">تخصيص حالة</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-100 border border-emerald-700/60 transition"
            title="الإعدادات ومحركات الذكاء الاصطناعي"
          >
            <Settings className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden sm:inline">الإعدادات</span>
          </button>

          <button
            onClick={onOpenHelp}
            className="p-1.5 rounded-md text-emerald-200/80 hover:text-white hover:bg-emerald-800/60 transition"
            title="دليل الحالات والاستخدام"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scenarios Toolbar & Simulation Controls */}
      <div className="bg-[#0b1f1a] border-t border-emerald-900/60 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Scenario Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {scenarios.map((sc) => {
              const active = currentScenarioId === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => orchestrator.initRun(sc.id)}
                  className={`flex flex-col items-start px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-all ${
                    active
                      ? 'bg-emerald-600/90 text-white border-emerald-400/80 shadow font-bold'
                      : 'bg-emerald-950/40 text-emerald-200/80 border-emerald-900/60 hover:bg-emerald-900/50 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] opacity-90">{sc.label}</span>
                  <span className="font-normal text-[10px] text-emerald-100/70">{sc.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Action Control Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {/* Status indicator */}
            <div
              className={`px-2.5 py-1 rounded border text-xs font-medium flex items-center gap-1.5 ${getStatusBadge(
                localStatus
              )}`}
            >
              <span className="text-[10px] text-emerald-200/70">حالة المسار:</span>
              <span>{localStatus}</span>
            </div>

            {/* Next Step */}
            <button
              onClick={() => orchestrator.triggerNextStep()}
              disabled={isRunning || localStatus === 'تم الرد والتسوية' || localStatus === 'تحتاج استكمالاً'}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed shadow transition"
              title="تنفيذ الخطوة التالية في مسار المطالبة"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>الخطوة التالية</span>
            </button>

            {/* Auto Run */}
            {isAutoRunning ? (
              <button
                onClick={() => orchestrator.stopAutoRun()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow transition animate-pulse"
                title="إيقاف التشغيل التلقائي"
              >
                <Square className="w-3.5 h-3.5" />
                <span>إيقاف</span>
              </button>
            ) : (
              <button
                onClick={() => orchestrator.startAutoRun()}
                disabled={isRunning || localStatus === 'تم الرد والتسوية'}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow transition"
                title="تشغيل تلقائي حتى الوصول لقرار المراجع البشري"
              >
                <Play className="w-3.5 h-3.5" />
                <span>تشغيل تلقائي</span>
              </button>
            )}

            {/* Reset */}
            <button
              onClick={() => orchestrator.resetAll()}
              className="flex items-center gap-1 p-1.5 rounded-md text-xs font-medium bg-emerald-950 text-emerald-300 hover:text-white hover:bg-emerald-900 border border-emerald-800 transition"
              title="إعادة ضبط الحالة الحالية والعدادات"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
