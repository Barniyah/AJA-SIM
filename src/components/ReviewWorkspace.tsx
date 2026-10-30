import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Paperclip,
  ArrowRightLeft,
  Send,
  CornerDownLeft,
  Copy,
  Check,
  RotateCw,
  Lightbulb,
} from 'lucide-react';
import {
  AIFinding,
  AIReasoningContract,
  AIClassificationContract,
  LocalWorkflowStatus,
  RuleResult,
  ScenarioFixture,
  S5ReconciliationLedger,
} from '../types';
import { orchestrator } from '../orchestration';
import { formatSar, halalasToSar } from '../domain/ledger';

interface ReviewWorkspaceProps {
  fixture: ScenarioFixture;
  localStatus: LocalWorkflowStatus;
  ruleResult: RuleResult | null;
  aiReasoning: AIReasoningContract | null;
  aiClassification: AIClassificationContract | null;
  humanDecision: 'approved' | 'modified' | 'rejected' | null;
  claimApproved: boolean;
  claimExported: boolean;
  settlementCompleted: boolean;
  s5Ledger: S5ReconciliationLedger;
  onOpenLearnTogether: () => void;
}

export const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({
  fixture,
  localStatus,
  ruleResult,
  aiReasoning,
  aiClassification,
  humanDecision,
  claimApproved,
  claimExported,
  settlementCompleted,
  s5Ledger,
  onOpenLearnTogether,
}) => {
  const [memberIdInput, setMemberIdInput] = useState('');
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => {
    setMemberIdInput(fixture.patient.memberId || '');
  }, [fixture.patient.memberId]);

  // Keyboard shortcut Ctrl+Enter for approval
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (localStatus === 'بانتظار مراجع' && !claimApproved) {
          e.preventDefault();
          orchestrator.submitHumanDecision('approved', 'اعتماد مباشر عبر الاختصار السريع (Ctrl+Enter)');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localStatus, claimApproved]);

  const activeDoc = fixture.documents[0];
  const finding: AIFinding | undefined = aiReasoning?.findings?.[0];
  const quoteText = finding?.evidence?.[0]?.quote;

  // Highlight quote in document text
  const renderHighlightedDocument = () => {
    if (!activeDoc) {
      return <div className="text-slate-400 text-xs italic">لا توجد وثائق مرفقة في سجل المريض</div>;
    }

    if (!quoteText || !activeDoc.text.includes(quoteText)) {
      return (
        <pre className="text-xs font-sans text-slate-700 whitespace-pre-wrap leading-relaxed select-text">
          {activeDoc.text}
        </pre>
      );
    }

    const parts = activeDoc.text.split(quoteText);
    return (
      <div className="text-xs font-sans text-slate-700 whitespace-pre-wrap leading-relaxed select-text">
        {parts[0]}
        <mark className="bg-amber-100 text-amber-950 font-semibold px-1 py-0.5 rounded border border-amber-300">
          {quoteText}
        </mark>
        {parts.slice(1).join(quoteText)}
      </div>
    );
  };

  const handleCopyAppeal = () => {
    if (aiReasoning?.draftAppealAr) {
      navigator.clipboard.writeText(aiReasoning.draftAppealAr);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* RIGHT COLUMN (In RTL): Clinical Document & Evidence Viewer (7 cols) */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-sm text-slate-800">
                الملف السريري والأدلة الموثقة (Clinical Evidence)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono bidi-ltr">
                {activeDoc?.id || 'DOC-NONE'} v{activeDoc?.version || '1.0'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                وثيقة اصطناعية
              </span>
            </div>
          </div>

          {/* Active Clinical Document View */}
          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 mb-3 min-h-[180px]">
            <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center justify-between">
              <span>{activeDoc?.titleAr}</span>
              <span className="text-slate-400">{activeDoc?.author}</span>
            </div>
            {renderHighlightedDocument()}
          </div>

          {/* AI Evidence Insight Box */}
          {finding && (
            <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-teal-900 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>ملاحظة الاستدلال السريري (AI Finding):</span>
              </div>
              <p className="text-teal-950 mb-2 leading-relaxed">{finding.summaryAr}</p>
              {quoteText && (
                <div className="p-2 bg-white rounded-lg border border-teal-200/80 text-teal-900 text-[11px] flex items-start gap-2">
                  <span className="font-semibold text-teal-700 shrink-0">النص المقتبس حرفياً:</span>
                  <span className="italic font-medium text-slate-800">"{quoteText}"</span>
                </div>
              )}
              <div className="mt-2 text-teal-800 text-[11px] font-medium flex items-center gap-1">
                <span className="font-bold">الإجراء الموصى به:</span>
                <span>{finding.suggestedActionAr}</span>
              </div>
            </div>
          )}

          {/* Shadow Classification Info */}
          {aiClassification && (
            <div className="mt-2 p-2 bg-slate-100/70 rounded-lg border border-slate-200 text-[11px] flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="font-semibold text-slate-700">تصنيف دور لايا (في الظل):</span>
                <span>{aiClassification.category}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] bg-white border border-slate-200 font-medium">
                الأولوية: {aiClassification.priority === 'urgent' ? 'عاجلة' : 'اعتيادية'}
              </span>
            </div>
          )}
        </div>

        {/* Learn Together trigger after S4 */}
        {fixture.id === 'S4' && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-600 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>هل ترغب بمنع تكرار هذا الرفض للخدمة مستقبلاً؟</span>
            </div>
            <button
              onClick={onOpenLearnTogether}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition flex items-center gap-1"
            >
              <span>اقتراح قاعدة «نتعلّم معاً»</span>
            </button>
          </div>
        )}
      </div>

      {/* LEFT COLUMN: Human Review & Decision Workspace (5 cols) */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800">
              قرار المراجع البشري (Human in the Loop)
            </h3>
            <span className="text-[11px] text-slate-400">
              اختصار: <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono">Ctrl+Enter</kbd>
            </span>
          </div>

          {/* Claim Summary Card */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-3 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-600">
              <span>معرف المطالبة:</span>
              <span className="font-mono font-semibold text-slate-800 bidi-ltr">{fixture.claim.id}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>المريض التجريبي:</span>
              <span className="font-medium text-slate-800">{fixture.patient.nameAr}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>رقم العضوية:</span>
              <span className="font-mono font-medium text-slate-800 bidi-ltr">
                {fixture.patient.memberId || (
                  <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded">مفقود</span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>الخدمة المفوترة:</span>
              <span className="font-medium text-slate-800 text-left max-w-[200px] truncate" title={fixture.claim.serviceNameAr}>
                {fixture.claim.serviceCode} - {fixture.claim.serviceNameAr}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/80">
              <span className="font-bold text-slate-800">المبلغ المفوتر:</span>
              <span className="font-bold text-emerald-700 text-sm">{formatSar(fixture.claim.billedAmount)}</span>
            </div>
          </div>

          {/* S2 Specific: Member ID Correction Form */}
          {fixture.id === 'S2' && !fixture.patient.memberId && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 mb-3 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>حجب حتمي: رقم العضوية التأمينية مفقود (DEMO-REQ-001)</span>
              </div>
              <p className="text-rose-700 text-[11px]">
                توقفت المطالبة حتمياً؛ يرجى تزويد رقم العضوية الاصطناعي للمريض لإنشاء إصدار جديد v2 وإعادة فحص القواعد:
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={memberIdInput}
                  onChange={(e) => setMemberIdInput(e.target.value)}
                  placeholder="أدخل رقم العضوية مثلاً SYN-MEM-8842"
                  className="flex-1 px-2.5 py-1.5 bg-white border border-rose-300 rounded text-xs focus:ring-1 focus:ring-rose-500 font-mono bidi-ltr"
                />
                <button
                  onClick={() => setMemberIdInput('SYN-MEM-8842')}
                  className="px-2 py-1.5 text-[11px] bg-rose-200/70 hover:bg-rose-200 text-rose-900 rounded font-medium transition"
                >
                  تعبئة تلقائية
                </button>
              </div>
              <button
                onClick={() => orchestrator.correctMemberId(memberIdInput)}
                disabled={!memberIdInput.trim()}
                className="w-full mt-1 px-3 py-1.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white rounded font-bold text-xs transition"
              >
                تحديث رقم العضوية وإعادة الفحص
              </button>
            </div>
          )}

          {/* S3 Specific: Side-by-side Proposal Modification */}
          {fixture.id === 'S3' && localStatus === 'بانتظار مراجع' && !claimApproved && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 mb-3 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <ArrowRightLeft className="w-4 h-4 text-amber-700" />
                <span>المقارنة السريرية والمالية (مستوحى من Argon):</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-white rounded border border-amber-200">
                <div className="border-l border-slate-200 pl-2">
                  <div className="text-slate-500">الخدمة المفوترة الحالية:</div>
                  <div className="font-bold text-slate-800">DEMO-SVC-02 (جراحة صغرى)</div>
                  <div className="text-rose-600 font-bold">600 ر.س (غير موثقة)</div>
                </div>
                <div>
                  <div className="text-slate-500">التصحيح المقترح الموثق:</div>
                  <div className="font-bold text-emerald-800">DEMO-SVC-01 (استشارة عيادة)</div>
                  <div className="text-emerald-700 font-bold">200 ر.س (موثقة بالكامل)</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    orchestrator.submitHumanDecision(
                      'modified',
                      'تعديل الخدمة إلى استشارة طبية موثقة وفق ما ثبت في الملاحظة السريرية',
                      'DEMO-SVC-01',
                      200
                    )
                  }
                  className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-xs shadow-xs transition"
                >
                  اعتماد كاستشارة موثقة (200 ر.س)
                </button>
                <button
                  onClick={() =>
                    orchestrator.submitHumanDecision('rejected', 'رفض المطالبة نظراً لعدم تنفيذ الإجراء الجراحي المفوتر')
                  }
                  className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded font-semibold text-xs transition"
                >
                  رفض
                </button>
              </div>
            </div>
          )}

          {/* S4 Specific: Attach Report & Draft Appeal */}
          {fixture.id === 'S4' && (
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 mb-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-teal-900">
                  <Paperclip className="w-4 h-4 text-teal-700" />
                  <span>معالجة الرفض: إرفاق التقرير والاعتراض</span>
                </div>
                {fixture.claim.hasAttachmentInSubmission && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    تم إرفاق DOC-S4-1
                  </span>
                )}
              </div>

              {!fixture.claim.hasAttachmentInSubmission ? (
                <div>
                  <p className="text-teal-800 text-[11px] mb-2">
                    التقرير التشخيصي DOC-S4-1 معتمد ومتوفر في ملف المريض؛ انقر لإدراجه في حزمة الإرسال:
                  </p>
                  <button
                    onClick={() => orchestrator.attachMissingDocument()}
                    className="w-full py-1.5 bg-teal-700 hover:bg-teal-600 text-white rounded font-bold text-xs shadow-xs transition flex items-center justify-center gap-1"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>إرفاق التقرير التشخيصي وتحديث المطالبة</span>
                  </button>
                </div>
              ) : (
                aiReasoning?.draftAppealAr && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-teal-900 font-semibold">
                      <span>مسودة الاعتراض الآلية (Appeal Draft):</span>
                      <button
                        onClick={handleCopyAppeal}
                        className="flex items-center gap-1 text-teal-700 hover:text-teal-900"
                      >
                        {copiedDraft ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedDraft ? 'تم النسخ' : 'نسخ'}</span>
                      </button>
                    </div>
                    <div className="p-2 bg-white rounded border border-teal-200 text-[11px] text-slate-700 leading-relaxed font-sans select-text">
                      {aiReasoning.draftAppealAr}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* S5 Specific: Detailed Reconciliation Ledger */}
          {fixture.id === 'S5' && (
            <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-300 mb-3 text-xs space-y-2">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>دفتر التسوية المفصل المعتمد (Ledger S5):</span>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  {s5Ledger.isFullyReconciled ? 'مطابقة مكتملة' : 'فرق قيد التحقيق'}
                </span>
              </div>

              <div className="space-y-1 text-[11px] p-2 bg-white rounded border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>إجمالي الفاتورة:</span>
                  <span className="font-semibold text-slate-900">{formatSar(halalasToSar(s5Ledger.totalInvoiceHalalas))}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>الخصم التعاقدي للشبكة (10%):</span>
                  <span className="font-semibold text-slate-700">− {formatSar(halalasToSar(s5Ledger.contractualDiscountHalalas))}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>المبلغ المسموح به تعاقدياً:</span>
                  <span className="font-semibold text-slate-900">{formatSar(halalasToSar(s5Ledger.contractualAllowedHalalas))}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>تحمل المريض (محصل نقداً):</span>
                  <span className="font-semibold text-slate-700">− {formatSar(halalasToSar(s5Ledger.patientCopayHalalas))}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>صافي المستحق من التأمين:</span>
                  <span className="text-emerald-700">{formatSar(halalasToSar(s5Ledger.netInsurerDueHalalas))}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>إشعار دفعة التأمين الأولى (REMIT-S5-01):</span>
                  <span className="font-semibold text-blue-700">− {formatSar(halalasToSar(s5Ledger.firstPaymentHalalas))}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-700 pt-1 border-t border-rose-100">
                  <span>فرق التأمين المتبقي:</span>
                  <span>{formatSar(halalasToSar(s5Ledger.insuranceVarianceHalalas))}</span>
                </div>
              </div>

              {!s5Ledger.isFullyReconciled && (
                <button
                  onClick={() => orchestrator.addS5SupplementaryPayment()}
                  className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-xs shadow-xs transition flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>استلام الدفعة التكميلية (200 ر.س) وإتمام المطابقة البنكية</span>
                </button>
              )}
            </div>
          )}

          {/* Standard Human Approval Action (For S1, S4 after attachment, S5, or generic clean) */}
          {localStatus === 'بانتظار مراجع' && !claimApproved && fixture.id !== 'S3' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => orchestrator.submitHumanDecision('approved', 'تم التحقق والاعتماد البشري الكامل')}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد المطالبة (Ctrl+Enter)</span>
                </button>
                <button
                  onClick={() => setShowRejectInput(!showRejectInput)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition"
                >
                  رفض...
                </button>
              </div>

              {showRejectInput && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="سبب الرفض..."
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                  />
                  <button
                    onClick={() => {
                      orchestrator.submitHumanDecision('rejected', rejectionReason || 'رفض من المراجع');
                      setShowRejectInput(false);
                    }}
                    className="w-full py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded"
                  >
                    تأكيد الرفض
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Export to Payer Simulator Action once approved */}
          {claimApproved && !claimExported && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 font-bold text-emerald-900 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>المطالبة معتمدة بشرياً وجاهزة للإرسال الإلكتروني</span>
              </div>
              <button
                onClick={() => orchestrator.exportToPayerSimulator()}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>تصدير إلى محاكي التأمين ومطالبات نفيس</span>
              </button>
            </div>
          )}

          {/* Settled state badge */}
          {settlementCompleted && (
            <div className="p-3 bg-emerald-100 border border-emerald-400 rounded-xl text-center">
              <div className="text-emerald-950 font-bold text-xs flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>تم استلام الرد والتسوية البنكية بنجاح</span>
              </div>
              <p className="text-emerald-800 text-[11px] mt-1">
                تم حفظ ClaimResponse وسجل PaymentReconciliation في Medplum MockClient
              </p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span>حالة الاعتماد: {claimApproved ? 'معتمدة' : 'قيد المراجعة'}</span>
          <span>الإصدار: v{fixture.claim.id.split('-v')[1] || '1'}</span>
        </div>
      </div>
    </div>
  );
};
