/**
 * Pre-validated Static AI Fixtures
 * Reference: AJA_SIM_TECH.md Section 7 & Section 9
 */

import { AIClassificationContract, AIReasoningContract } from '../../types';

export const STATIC_AI_REASONING: Record<string, AIReasoningContract> = {
  S3: {
    schemaVersion: '1.0',
    status: 'suggestion',
    findings: [
      {
        type: 'service_discrepancy',
        summaryAr: 'الملاحظة السريرية الرسمية تؤكد صراحة أن الإجراء الجراحي لم يُنفذ خلال هذه الزيارة، وأن الخدمة الفعلية اقتصرت على الاستشارة الطبية وتوعية المريض',
        evidence: [
          {
            sourceId: 'DOC-S3-1',
            sourceVersion: '1.0',
            quote: 'حضر المراجع للاستشارة ولم ينفذ الإجراء في هذه الزيارة',
          },
        ],
        suggestedActionAr: 'تعديل الخدمة المفوترة من (DEMO-SVC-02 بقيمة 600 ر.س) إلى استشارة عيادة موثقة (DEMO-SVC-01 بقيمة 200 ر.س تعاقدياً) أو رفض المطالبة الحالية',
      },
    ],
    draftAppealAr: null,
    needsHumanReview: true,
    metadata: {
      model: 'Qwen-2.5-72B (محاكاة ثابتة)',
      latencyMs: 1420,
      costUsd: 0,
      isLive: false,
    },
  },

  S4: {
    schemaVersion: '1.0',
    status: 'suggestion',
    findings: [
      {
        type: 'missing_attachment',
        summaryAr: 'رُفضت المطالبة بسبب غياب المستند الداعم؛ تم التحقق من وجود التقرير التشخيصي المعتمد في أرشيف المريض ولم يُرفق بحزمة الإرسال الأصلية',
        evidence: [
          {
            sourceId: 'DOC-S4-1',
            sourceVersion: '1.0',
            quote: 'التقرير مكتمل ومعتمد طبياً ومستوفٍ لكافة الاشتراطات الفنية للمطالبة',
          },
        ],
        suggestedActionAr: 'إدراج التقرير التشخيصي المعتمد DOC-S4-1 ضمن مرفقات حزمة الإرسال وتقديم مسودة اعتراض رسمي',
      },
    ],
    draftAppealAr: 'السادة شركة تأمين أجا التجريبية المحترمين، بالإشارة إلى المطالبة رقم CLM-S4-1000 المرفوضة برمز DENIAL-NO-ATTACHMENT، نفيدكم بأنه تم إرفاق التقرير التشخيصي المعتمد (DOC-S4-1) المؤرخ بتاريخ 2026-10-24 والمثبت لاستحقاق الخدمة DEMO-SVC-03 وفق شروط العقد التجريبي. نرجو إعادة معالجة المطالبة واعتمادها.',
    needsHumanReview: true,
    metadata: {
      model: 'Qwen-2.5-72B (محاكاة ثابتة)',
      latencyMs: 1680,
      costUsd: 0,
      isLive: false,
    },
  },
};

export const STATIC_AI_CLASSIFICATION: Record<string, AIClassificationContract> = {
  S3: {
    category: 'تعارض توثيق سريري مع الترميز المفوتر',
    priority: 'review',
    reasonAr: 'تناقض بين الإجراء الجراحي المفوتر والملاحظة السريرية المكتوبة',
    needsHumanReview: true,
    metadata: {
      model: 'Laya-Classifier-Alt (محاكاة في الظل)',
      latencyMs: 410,
      isLive: false,
    },
  },
  S4: {
    category: 'رفض إجرائي لغياب مستند متوفر محلياً',
    priority: 'urgent',
    reasonAr: 'المستند الداعم متوفر في الأرشيف ولكنه سقط من حزمة الإرسال الإلكتروني',
    needsHumanReview: true,
    metadata: {
      model: 'Laya-Classifier-Alt (محاكاة في الظل)',
      latencyMs: 380,
      isLive: false,
    },
  },
};
