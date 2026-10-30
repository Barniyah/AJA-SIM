import React from 'react';
import {
  Building2,
  Database,
  Cpu,
  BrainCircuit,
  UserCheck,
  SendHorizontal,
  Landmark,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { NodeStatus } from '../types';

interface LiveArchitectureProps {
  nodeStatuses: Record<string, NodeStatus>;
  onSelectNode: (nodeId: string) => void;
  selectedNodeId?: string;
}

export const LiveArchitecture: React.FC<LiveArchitectureProps> = ({
  nodeStatuses,
  onSelectNode,
  selectedNodeId,
}) => {
  const getNodeColor = (state: NodeStatus['state']) => {
    switch (state) {
      case 'PASS':
        return 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-emerald-100';
      case 'RUNNING':
        return 'border-teal-500 bg-teal-50 text-teal-900 shadow-teal-100 animate-pulse';
      case 'BLOCKED':
        return 'border-rose-500 bg-rose-50 text-rose-900 shadow-rose-100';
      case 'SKIPPED':
        return 'border-slate-300 bg-slate-50 text-slate-500';
      case 'FAILED':
        return 'border-amber-500 bg-amber-50 text-amber-900';
      default:
        return 'border-slate-200 bg-white text-slate-700 hover:border-slate-300';
    }
  };

  const getStatusIcon = (state: NodeStatus['state']) => {
    switch (state) {
      case 'PASS':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'RUNNING':
        return <Clock className="w-3.5 h-3.5 text-teal-600 animate-spin" />;
      case 'BLOCKED':
        return <XCircle className="w-3.5 h-3.5 text-rose-600" />;
      case 'SKIPPED':
        return <HelpCircle className="w-3.5 h-3.5 text-slate-400" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-slate-300" />;
    }
  };

  const renderNode = (
    id: string,
    titleAr: string,
    subAr: string,
    icon: React.ReactNode,
    customClass = ''
  ) => {
    const node = nodeStatuses[id] || { state: 'IDLE' };
    const isSelected = selectedNodeId === id;

    return (
      <div
        onClick={() => onSelectNode(id)}
        className={`cursor-pointer transition-all duration-200 p-3 rounded-xl border-2 shadow-sm flex flex-col justify-between select-none ${getNodeColor(
          node.state
        )} ${isSelected ? 'ring-2 ring-emerald-600 ring-offset-2' : ''} ${customClass}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="p-1.5 rounded-lg bg-white/80 border border-slate-200/50 shadow-xs">
            {icon}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/70 border border-slate-200/50">
            {getStatusIcon(node.state)}
            <span>{node.state}</span>
          </div>
        </div>

        <div className="mt-2">
          <div className="font-bold text-xs text-slate-900 leading-tight">{titleAr}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{subAr}</div>
        </div>

        {/* Dynamic Timing / Latency / Info Badge */}
        <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] flex items-center justify-between text-slate-600">
          <span>{node.infoAr || (node.state === 'SKIPPED' ? 'لم يستدعَ المزود' : 'جاهز')}</span>
          {typeof node.measuredLatencyMs === 'number' && node.state !== 'SKIPPED' && (
            <span className="font-mono font-medium text-emerald-700 bidi-ltr">
              {node.measuredLatencyMs} ms
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-700" />
          <h2 className="text-sm font-bold text-slate-800">
            المخطط الحي للنواة والأذرع (Hub & Spoke Architecture)
          </h2>
        </div>
        <span className="text-[11px] text-slate-500">
          تتحرك النبضات وتتحدث الحالات استجابة لأحداث التدفق الفعلي فقط
        </span>
      </div>

      {/* Grid Layout representing the Hub and Spoke Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        {/* RIGHT COLUMN (In RTL this is Right = Hospital HIS) */}
        <div className="flex flex-col justify-center space-y-4">
          <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>محاكيات المنشأة الصحية</span>
          </div>

          {renderNode(
            'his',
            'محاكي المستشفى (HIS)',
            'استلام بيانات الزيارة والملاحظات السريرية',
            <Building2 className="w-4 h-4 text-blue-600" />
          )}

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-slate-700">ترتيب النواة أولاً:</div>
            <div>يتم حفظ بيانات الحالة مع Task قبل تطبيق أي قواعد أو استدعاء نماذج الذكاء الاصطناعي.</div>
          </div>
        </div>

        {/* CENTER COLUMN (Top: Rules & AI, Center: Core Medplum MockClient, Bottom: Human Reviewer) */}
        <div className="flex flex-col space-y-3">
          {/* Top: Rules & AI */}
          <div className="grid grid-cols-2 gap-2">
            {renderNode(
              'rules',
              'محرك القواعد',
              'فحص حتمي للعقد والشروط',
              <Cpu className="w-4 h-4 text-purple-600" />
            )}
            {renderNode(
              'ai',
              'بوابة الذكاء الاصطناعي',
              'استدلال وتصنيف في الظل',
              <BrainCircuit className="w-4 h-4 text-teal-600" />
            )}
          </div>

          {/* Center: Medplum Hub Core */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur-xs opacity-20" />
            {renderNode(
              'core',
              'النواة ومستودع FHIR MockClient',
              'إدارة الموارد: Patient, Claim, Task, DocumentReference',
              <Database className="w-5 h-5 text-emerald-600" />,
              'border-emerald-600 bg-emerald-50/60 shadow-md ring-1 ring-emerald-500'
            )}
          </div>

          {/* Bottom: Human Reviewer */}
          <div>
            {renderNode(
              'reviewer',
              'المراجع البشري المختص',
              'اعتماد، تعديل، أو رفض قبل الإرسال للمؤمن',
              <UserCheck className="w-4 h-4 text-amber-600" />
            )}
          </div>
        </div>

        {/* LEFT COLUMN (In RTL Left = External Payer / Nphies & Bank Settlement) */}
        <div className="flex flex-col justify-center space-y-4">
          <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>الأطراف الخارجية والمحاكاة المالية</span>
          </div>

          {renderNode(
            'payer',
            'محاكي التأمين ومطالبات نفيس',
            'استلام الحزمة المعتمدة وإصدار ClaimResponse',
            <SendHorizontal className="w-4 h-4 text-indigo-600" />
          )}

          {renderNode(
            'bank',
            'محاكي البنك والتسوية',
            'مطابقة إشعارات السداد وفروق الحسابات',
            <Landmark className="w-4 h-4 text-emerald-700" />
          )}
        </div>
      </div>
    </div>
  );
};
