import React from 'react';
import { X, HelpCircle, BookOpen, CheckCircle, ShieldAlert, Sparkles, Layers } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-900">
              <BookOpen className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">دليل تشغيل محاكي دورة الإيرادات «أجا»</h3>
              <p className="text-xs text-slate-500">دليل تفاعلي للسيناريوهات الخمسة وأبعاد القيمة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
            <div className="font-bold text-emerald-950 text-sm">مفهوم التطبيق وفلسفة التصميم:</div>
            <p className="text-emerald-900 text-[11px]">
              «أجا» محاكي تفاعلي يجسد دورة الإيرادات الصحية الذكية. يعتمد مبدأ «النواة أولاً»؛ حيث تحفظ المطالبة وملف المريض ومهمة العمل (Task) داخل مستودع FHIR MockClient الحقيقي قبل استدعاء القواعد أو النماذج. لا يتم إرسال أي مطالبة للأطراف الخارجية قبل اعتماد المراجع البشري المختص.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="font-bold text-slate-900 text-sm">الحالات الخمس المعتمدة (القسم 11):</div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">الحالة 1 (S1) — مطالبة مكتملة الأركان (300 ر.س):</div>
              <p className="text-[11px] text-slate-600">
                فحص قواعد ناجح، جاهزة للمراجعة البشرية دون الحاجة لأي ذكاء اصطناعي. بعد الاعتماد يصدر محاكي التأمين رد موافقة وتسوية مالية كاملة.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">الحالة 2 (S2) — رقم عضوية ناقص (حجب حتمي):</div>
              <p className="text-[11px] text-slate-600">
                القاعدة الحتمية DEMO-REQ-001 توقف المسار فوراً لمنع رفع مطالبة بدون رقم عضوية. يتيح النظام إدخال رقم اصطناعي لإنشاء إصدار جديد v2 وإعادة فحص القواعد.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">الحالة 3 (S3) — تعارض التوثيق مع الخدمة (600 ر.س):</div>
              <p className="text-[11px] text-slate-600">
                فوترة إجراء جراحي بينما يذكر التقرير السريري صراحة أن الإجراء لم ينفذ بل استشارة فقط. يقدم الذكاء الاصطناعي دليلاً مظللاً بنص حرفي مطابق، ويتاح للمراجع تعديل الخدمة إلى استشارة موثقة بـ 200 ر.س أو رفضها.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">الحالة 4 (S4) — رفض مرفق، مسودة اعتراض، و«نتعلّم معاً»:</div>
              <p className="text-[11px] text-slate-600">
                مطالبة 1000 ر.س رُفضت لغياب التقرير. التقرير متوفر في ملف المريض وسقط من حزمة الإرسال. يرشد النظام لإرفاقه وتوليد مسودة اعتراض، ثم يقترح تفعيل قاعدة DEMO-REQ-004 لحجب تكرار هذا السقوط مستقبلاً بعد 3 اختبارات قبول.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">الحالة 5 (S5) — دفتر التسوية وفروق السداد:</div>
              <p className="text-[11px] text-slate-600">
                فاتورة 2000 − خصم 200 − تحمل مريض 200 = صافي مستحق التأمين 1600 ر.س. سداد أولي 1400 ر.س ينتج فرق 200 ر.س دقيقاً (لا يخلط بين الخصم والتحمل). ينشئ النظام مهمة متابعة ويمنع الإغلاق المالي حتى وصول الدفعة التكميلية والمطابقة البنكية.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="font-bold text-slate-900 text-sm">أبعاد القيمة الستة (3C + 3P ≡ V):</div>
            <p className="text-[11px] text-slate-600">
              عنوان مفاهيمي وليس جمعاً ماليّاً: الرعاية (Care - تغطية الأدلة)، التكلفة (Cost - تكلفة AI المقاسة)، المطالبات (Claims - اجتياز الفحص الأول)، المدفوعات (Payments - المبالغ المسواة والفروق)، الأداء (Performance - اكتمال التشغيلات)، والإنتاجية (Productivity - زمن المراجعة وتعديل المقترحات).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow transition"
          >
            فهمت، متابعة المحاكاة
          </button>
        </div>
      </div>
    </div>
  );
};
