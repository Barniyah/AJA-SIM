/**
 * AI Gateway Adapter
 * Connects to server-side AI endpoints with seamless static fixture fallback
 * Reference: AJA_SIM_TECH.md Section 7, 8, 9 & 12.2
 */

import { AIClassificationContract, AIReasoningContract, ScenarioId, SimulationCapabilities } from '../../types';
import { STATIC_AI_CLASSIFICATION, STATIC_AI_REASONING } from './fixtures';
import { verifyEvidenceQuote } from '../../domain/minimization';

export interface AIInvocationRequest {
  scenarioId: ScenarioId;
  claimId: string;
  serviceCode: string;
  clinicalExcerpt: string;
  isAppeal?: boolean;
  priorDenialCode?: string;
  mode: 'demo-static' | 'live-ai';
  isCustomized?: boolean;
}

export class AIGatewayAdapter {
  private capabilities: SimulationCapabilities | null = null;

  public async fetchCapabilities(): Promise<SimulationCapabilities> {
    try {
      const res = await fetch('/api/sim/capabilities');
      if (res.ok) {
        this.capabilities = await res.json();
        return this.capabilities!;
      }
    } catch {
      // Fallback if running client-only
    }

    this.capabilities = {
      dataMode: 'medplum-mock-client',
      rulesEngine: 'typescript-demo',
      classifierModel: 'Qwen/Qwen2.5-72B-Instruct',
      reasonerModel: 'Qwen/Qwen2.5-72B-Instruct',
      isLiveAvailable: false,
      hasOpenRouterKey: false,
      hasGeminiKey: false,
      systemNoticeAr: 'الوضع الثابت (محاكاة) نشط تلقائياً دون الحاجة لأي مفاتيح برمجية خارجية.',
    };
    return this.capabilities;
  }

  public getCachedCapabilities(): SimulationCapabilities | null {
    return this.capabilities;
  }

  public async reason(req: AIInvocationRequest): Promise<AIReasoningContract> {
    const startTime = performance.now();

    // 1. If user explicitly requests Live AI, try calling backend
    if (req.mode === 'live-ai') {
      try {
        const response = await fetch('/api/sim/ai/reason', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId: req.scenarioId,
            serviceCode: req.serviceCode,
            clinicalExcerpt: req.clinicalExcerpt,
            isAppeal: req.isAppeal,
            priorDenialCode: req.priorDenialCode,
          }),
        });

        if (response.ok) {
          const liveData: AIReasoningContract = await response.json();
          // Validate evidence quote locally
          this.validateEvidenceQuotes(liveData, req.clinicalExcerpt);
          return liveData;
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server AI error: ${response.status}`);
        }
      } catch (err: unknown) {
        console.warn('Live AI call failed, falling back to static fixture:', err);
      }
    }

    // 2. Static Demo Mode
    await new Promise((resolve) => setTimeout(resolve, 600)); // Brief realistic simulation delay
    const latencyMs = Math.round(performance.now() - startTime);

    // If scenario was customized and text changed completely in static mode, do not reuse stale fixture
    if (req.isCustomized) {
      return {
        schemaVersion: '1.0',
        status: 'insufficient_evidence',
        findings: [
          {
            type: 'general_observation',
            summaryAr: 'تم تعديل النص السريري المخصص؛ لا توجد استجابة تجريبية ثابتة لهذه المدخلات الجديدة. يرجى المراجعة يدوياً أو تفعيل الذكاء الاصطناعي الحي.',
            evidence: [],
            suggestedActionAr: 'المراجعة البشرية المباشرة لملف الحالة المعدل',
          },
        ],
        draftAppealAr: null,
        needsHumanReview: true,
        metadata: {
          model: 'وضع المحاكاة الثابتة',
          latencyMs,
          costUsd: 0,
          isLive: false,
        },
      };
    }

    const staticFixture = STATIC_AI_REASONING[req.scenarioId];
    if (staticFixture) {
      const cloned = JSON.parse(JSON.stringify(staticFixture)) as AIReasoningContract;
      cloned.metadata = {
        model: cloned.metadata?.model || 'Qwen-2.5-72B (محاكاة ثابتة)',
        latencyMs,
        costUsd: 0,
        isLive: false,
      };
      this.validateEvidenceQuotes(cloned, req.clinicalExcerpt);
      return cloned;
    }

    // Default insufficient evidence for scenarios without AI need
    return {
      schemaVersion: '1.0',
      status: 'insufficient_evidence',
      findings: [],
      draftAppealAr: null,
      needsHumanReview: true,
      metadata: {
        model: 'محاكاة (لا يتطلب استدلال)',
        latencyMs: 100,
        costUsd: 0,
        isLive: false,
      },
    };
  }

  public async classify(req: AIInvocationRequest): Promise<AIClassificationContract> {
    const startTime = performance.now();

    if (req.mode === 'live-ai') {
      try {
        const response = await fetch('/api/sim/ai/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId: req.scenarioId,
            serviceCode: req.serviceCode,
            clinicalExcerpt: req.clinicalExcerpt,
          }),
        });

        if (response.ok) {
          const liveData: AIClassificationContract = await response.json();
          return liveData;
        }
      } catch (err) {
        console.warn('Live classification call failed, falling back to static fixture:', err);
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);
    const staticFixture = STATIC_AI_CLASSIFICATION[req.scenarioId] || {
      category: 'مطالبة اعتيادية قياسية',
      priority: 'normal',
      reasonAr: 'المطالبة تتبع المسار الروتيني لقواعد العقد',
      needsHumanReview: true,
      metadata: {
        model: 'Laya-Classifier-Alt (محاكاة في الظل)',
        latencyMs,
        isLive: false,
      },
    };

    return {
      ...staticFixture,
      metadata: {
        ...staticFixture.metadata,
        latencyMs,
        isLive: false,
      },
    };
  }

  private validateEvidenceQuotes(data: AIReasoningContract, sourceText: string) {
    if (!data.findings) return;
    for (const finding of data.findings) {
      if (finding.evidence) {
        finding.evidence = finding.evidence.filter((ev) => {
          const isValid = verifyEvidenceQuote(sourceText, ev.quote);
          if (!isValid) {
            console.warn(`Evidence quote rejected - does not match source: "${ev.quote}"`);
          }
          return isValid;
        });
      }
    }
  }
}

export const aiGateway = new AIGatewayAdapter();
