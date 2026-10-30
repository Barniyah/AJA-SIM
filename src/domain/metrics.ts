/**
 * 6 Value Dimensions Calculator (3C + 3P ≡ V)
 * Reference: AJA_SIM_TECH.md Section 13 & 13.1
 */

import { ValueMetricsData } from '../types';

export function createInitialMetrics(): ValueMetricsData {
  return {
    completedRunsCount: 0,
    firstPassCleanCount: 0,
    firstPassTotalEvaluated: 0,
    correctionRequiredCount: 0,
    humanReviewsCount: 0,
    unmodifiedAcceptedProposalsCount: 0,
    modifiedProposalsCount: 0,
    rejectedProposalsCount: 0,
    totalHumanReviewSeconds: 0,
    measuredAiRunsCount: 0,
    totalAiCostUsd: 0,
    aiRunsWithCostCount: 0,
    aiRunsWithoutCostCount: 0,
    totalEvidenceObservations: 0,
    validatedEvidenceObservations: 0,
    totalUniqueClaimsReviewedValue: 0,
    settledInsurancePaymentsSar: 0,
    activeVarianceUnderInvestigationSar: 0,
  };
}

export interface FormattedValueDimension {
  key: 'care' | 'cost' | 'claims' | 'payments' | 'performance' | 'productivity';
  letter: string;
  nameAr: string;
  valueDisplay: string;
  subtextAr: string;
  definitionAr: string;
  sourceAr: string;
  denominatorInfoAr: string;
}

export function formatValueDimensions(metrics: ValueMetricsData): FormattedValueDimension[] {
  // 1. Care (C1) - Evidence Coverage
  const careValue =
    metrics.totalEvidenceObservations === 0
      ? 'لا بيانات'
      : `${Math.round((metrics.validatedEvidenceObservations / metrics.totalEvidenceObservations) * 100)}%`;

  // 2. Cost (C2) - AI Cost
  let costValue = '0.00 $';
  let costSubtext = 'لا استدعاءات مدفوعة';
  if (metrics.measuredAiRunsCount > 0) {
    if (metrics.aiRunsWithCostCount > 0) {
      costValue = `${metrics.totalAiCostUsd.toFixed(4)} $`;
      costSubtext = `متوسط ${(metrics.totalAiCostUsd / metrics.aiRunsWithCostCount).toFixed(4)}$ لكل استدعاء`;
    } else {
      costValue = 'غير متاحة';
      costSubtext = `${metrics.measuredAiRunsCount} استدعاء بدون تكلفة معلنة`;
    }
  }

  // 3. Claims (C3) - First Pass Clean Rate
  const claimsValue =
    metrics.firstPassTotalEvaluated === 0
      ? 'لا بيانات'
      : `${Math.round((metrics.firstPassCleanCount / metrics.firstPassTotalEvaluated) * 100)}%`;

  // 4. Payments (P1) - Settled Payments & Variance
  const paymentsValue = `${metrics.settledInsurancePaymentsSar.toLocaleString('ar-SA')} ر.س`;
  const paymentsSubtext =
    metrics.activeVarianceUnderInvestigationSar > 0
      ? `فرق قيد التحقيق: ${metrics.activeVarianceUnderInvestigationSar.toLocaleString('ar-SA')} ر.س`
      : 'لا توجد فروق معلقة';

  // 5. Performance (P2) - Completed Runs Rate
  const perfRate =
    metrics.firstPassTotalEvaluated === 0
      ? 'لا بيانات'
      : `${Math.round((metrics.completedRunsCount / Math.max(metrics.firstPassTotalEvaluated, metrics.completedRunsCount)) * 100)}%`;

  // 6. Productivity (P3) - Human Review Speed & Modification Rate
  const avgReviewSec =
    metrics.humanReviewsCount === 0
      ? 'لا بيانات'
      : `${(metrics.totalHumanReviewSeconds / metrics.humanReviewsCount).toFixed(1)} ث`;
  const modRate =
    metrics.humanReviewsCount === 0
      ? '0%'
      : `${Math.round(((metrics.modifiedProposalsCount + metrics.rejectedProposalsCount) / metrics.humanReviewsCount) * 100)}%`;

  return [
    {
      key: 'care',
      letter: 'C1',
      nameAr: 'الرعاية وتغطية الأدلة (Care)',
      valueDisplay: careValue,
      subtextAr: `${metrics.validatedEvidenceObservations} ملاحظة موثقة من إجمالي ${metrics.totalEvidenceObservations}`,
      definitionAr: 'نسبة الملاحظات والتوصيات المستندة إلى نص حرفي ومصدر موثق داخل الملف السريري.',
      sourceAr: 'فحص مصفوفة الأدلة مقارنة بالنص المعتمد في DocumentReference.',
      denominatorInfoAr: 'المقام: إجمالي عدد ملاحظات الذكاء الاصطناعي المعروضة للمراجع.',
    },
    {
      key: 'cost',
      letter: 'C2',
      nameAr: 'تكلفة الذكاء الاصطناعي (Cost)',
      valueDisplay: costValue,
      subtextAr: costSubtext,
      definitionAr: 'إجمالي التكلفة المادية المقاسة لاستدعاءات النماذج التوليدية والتصنيفية.',
      sourceAr: 'استجابة مزود الخدمة الخارجي أو تسعيرة الرموز المعتمدة.',
      denominatorInfoAr: 'المقام: عدد الاستدعاءات المنفذة ذات التكلفة المعلنة (الاستدعاءات المتروكة تكلفتها 0$).',
    },
    {
      key: 'claims',
      letter: 'C3',
      nameAr: 'اجتياز الفحص الأول (Claims)',
      valueDisplay: claimsValue,
      subtextAr: `${metrics.firstPassCleanCount} مطالبة نظيفة من أصل ${metrics.firstPassTotalEvaluated}`,
      definitionAr: 'نسبة المطالبات التي اجتازت كافة قواعد الأعمال الحتمية بنجاح من المحاولة الأولى دون حجب.',
      sourceAr: 'مخرجات محرك القواعد الحتمية عند الفحص الأولي للتشغيل.',
      denominatorInfoAr: 'المقام: عدد التشغيلات الفريدة التي أجرت فحصاً أولياً في الجلسة.',
    },
    {
      key: 'payments',
      letter: 'P1',
      nameAr: 'المدفوعات والتسوية (Payments)',
      valueDisplay: paymentsValue,
      subtextAr: paymentsSubtext,
      definitionAr: 'مجموع المبالغ المحصلة فعلياً من محاكي التأمين والمطابقة بنكياً مع تتبع الفروق.',
      sourceAr: 'سجلات PaymentReconciliation وإشعارات التحويل المؤكدة بنكياً.',
      denominatorInfoAr: 'المقام: صافي المبالغ المستحقة تعاقدياً والمطابقة في إشعارات السداد.',
    },
    {
      key: 'performance',
      letter: 'P2',
      nameAr: 'اكتمال التشغيلات (Performance)',
      valueDisplay: perfRate,
      subtextAr: `${metrics.completedRunsCount} تشغيل مكتمل للنهاية`,
      definitionAr: 'نسبة التشغيلات التي وصلت إلى حالتها النهائية المحددة (اعتماد، تسوية، أو حجب مبرر).',
      sourceAr: 'حالات المهام المكتملة في سجل الأحداث المحلي.',
      denominatorInfoAr: 'المقام: إجمالي عدد مسارات المطالبات التي بدأت في الجلسة.',
    },
    {
      key: 'productivity',
      letter: 'P3',
      nameAr: 'الإنتاجية وسرعة المراجعة (Productivity)',
      valueDisplay: avgReviewSec,
      subtextAr: `نسبة تعديل المقترحات: ${modRate}`,
      definitionAr: 'متوسط الزمن المستغرق من قبل المراجع البشري لاتخاذ قرار الاعتماد أو التعديل بعد جاهزية البيانات.',
      sourceAr: 'فارق الطابع الزمني بين جاهزية التوصية وقرار المراجع.',
      denominatorInfoAr: 'المقام: عدد القرارات البشرية المسجلة (يستبعد زمن معالجة الشبكة والذكاء الاصطناعي).',
    },
  ];
}
