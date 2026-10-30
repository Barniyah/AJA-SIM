import React, { useState } from 'react';
import {
  TrendingUp,
  HeartPulse,
  DollarSign,
  FileCheck2,
  Wallet,
  Activity,
  Zap,
  Info,
  X,
} from 'lucide-react';
import { FormattedValueDimension, formatValueDimensions } from '../domain/metrics';
import { ValueMetricsData } from '../types';

interface ValueMetricsProps {
  metrics: ValueMetricsData;
}

export const ValueMetrics: React.FC<ValueMetricsProps> = ({ metrics }) => {
  const [selectedDimension, setSelectedDimension] = useState<FormattedValueDimension | null>(null);

  const dimensions = formatValueDimensions(metrics);

  const getDimensionIcon = (key: FormattedValueDimension['key']) => {
    switch (key) {
      case 'care':
        return <HeartPulse className="w-4 h-4 text-rose-500" />;
      case 'cost':
        return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'claims':
        return <FileCheck2 className="w-4 h-4 text-blue-500" />;
      case 'payments':
        return <Wallet className="w-4 h-4 text-teal-600" />;
      case 'performance':
        return <Activity className="w-4 h-4 text-purple-500" />;
      case 'productivity':
        return <Zap className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-700" />
          <h2 className="text-sm font-bold text-slate-800">
            أبعاد القيمة الستة (3C + 3P ≡ V) — قياسات الجلسة الفعلية
          </h2>
        </div>
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          انقر على أي مؤشر لعرض معادلته ومصدره ومقامه الرياضي الدقيق
        </span>
      </div>

      {/* 6 Value Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {dimensions.map((dim) => (
          <div
            key={dim.key}
            onClick={() => setSelectedDimension(dim)}
            className="cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-emerald-300 hover:shadow-xs transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="p-1 rounded-md bg-white border border-slate-200/80 shadow-2xs">
                  {getDimensionIcon(dim.key)}
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-400 group-hover:text-emerald-700 bidi-ltr">
                  {dim.letter}
                </span>
              </div>
              <div className="font-semibold text-xs text-slate-700 truncate" title={dim.nameAr}>
                {dim.nameAr.split('(')[0].trim()}
              </div>
            </div>

            <div className="mt-2">
              <div className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-800">
                {dim.valueDisplay}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5" title={dim.subtextAr}>
                {dim.subtextAr}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Explanatory Modal when a dimension card is clicked */}
      {selectedDimension && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-mono font-bold text-xs bidi-ltr">
                  {selectedDimension.letter}
                </div>
                <h3 className="font-bold text-base text-slate-900">{selectedDimension.nameAr}</h3>
              </div>
              <button
                onClick={() => setSelectedDimension(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-center">
              <div className="text-xs text-emerald-800 font-semibold">القيمة المقاسة في الجلسة:</div>
              <div className="text-2xl font-extrabold text-emerald-950 mt-1">
                {selectedDimension.valueDisplay}
              </div>
              <div className="text-xs text-emerald-700 mt-1">{selectedDimension.subtextAr}</div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-900 block mb-0.5">التعريف التشغيلي:</span>
                <p className="text-slate-600 leading-relaxed">{selectedDimension.definitionAr}</p>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-0.5">المصدر وطريقة القياس:</span>
                <p className="text-slate-600 leading-relaxed">{selectedDimension.sourceAr}</p>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-0.5">حساب المقام وحالات الصفر:</span>
                <p className="text-slate-600 leading-relaxed">{selectedDimension.denominatorInfoAr}</p>
                <span className="text-[11px] text-amber-700 font-medium block mt-1">
                  * عند كون المقام صفراً يظهر المؤشر «لا بيانات» منعاً للتضليل الإحصائي.
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedDimension(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
