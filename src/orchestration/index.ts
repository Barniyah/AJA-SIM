/**
 * Simulation Orchestrator & State Machine
 * Manages run cycles, Task progression, idempotency, and event dispatching
 * Reference: AJA_SIM_TECH.md Section 10
 */

import {
  AIFinding,
  AIReasoningContract,
  AIClassificationContract,
  EventType,
  LocalWorkflowStatus,
  NodeStatus,
  RuleProposal,
  RuleResult,
  ScenarioFixture,
  ScenarioId,
  SimulationEvent,
  ValueMetricsData,
} from '../types';
import { SCENARIO_FIXTURES } from '../fixtures/scenarios';
import {
  medplum,
  saveMedplumClaimResponse,
  saveMedplumPaymentReconciliation,
  seedScenarioInMedplum,
  updateMedplumTaskStatus,
} from '../adapters/medplum';
import { rulesAdapter } from '../adapters/rules';
import { aiGateway } from '../adapters/ai';
import { computeDataMinimization, MinimizationResult } from '../domain/minimization';
import { createInitialMetrics } from '../domain/metrics';
import { addSupplementaryRemittance, createInitialS5Ledger, halalasToSar } from '../domain/ledger';
import { QuotaExceededError } from '../adapters/keyStore';

export type OrchestratorListener = () => void;

export class SimulationOrchestrator {
  private currentScenarioId: ScenarioId = 'S1';
  private runId = '';
  private inputVersion = 1;
  private mode: 'demo-static' | 'live-ai' = 'demo-static';
  private localStatus: LocalWorkflowStatus = 'مستلمة';
  private isRunning = false;
  private isAutoRunning = false;
  private isCustomized = false;
  private quotaAlert: {
    isOpen: boolean;
    message: string;
    details?: string;
  } | null = null;

  // Active state data
  private currentFixture: ScenarioFixture = SCENARIO_FIXTURES.S1;
  private ruleResult: RuleResult | null = null;
  private minimizationResult: MinimizationResult | null = null;
  private aiReasoning: AIReasoningContract | null = null;
  private aiClassification: AIClassificationContract | null = null;
  private humanDecision: 'approved' | 'modified' | 'rejected' | null = null;
  private humanDecisionReason = '';
  private humanReviewStartTime = 0;
  private claimApproved = false;
  private claimExported = false;
  private settlementCompleted = false;

  // S5 ledger
  private s5Ledger = createInitialS5Ledger();

  // Metrics & Event Log
  private metrics: ValueMetricsData = createInitialMetrics();
  private events: SimulationEvent[] = [];
  private processedActionKeys = new Set<string>();

  // Architecture Nodes State
  private nodeStatuses: Record<string, NodeStatus> = {
    his: { id: 'his', nameAr: 'محاكي المستشفى (HIS)', state: 'PASS' },
    core: { id: 'core', nameAr: 'النواة ومستودع FHIR Task', state: 'IDLE' },
    rules: { id: 'rules', nameAr: 'محرك القواعد الحتمية', state: 'IDLE' },
    ai: { id: 'ai', nameAr: 'بوابة الذكاء الاصطناعي', state: 'IDLE' },
    reviewer: { id: 'reviewer', nameAr: 'المراجع البشري المختص', state: 'IDLE' },
    payer: { id: 'payer', nameAr: 'محاكي التأمين ومطالبات نفيس', state: 'IDLE' },
    bank: { id: 'bank', nameAr: 'محاكي البنك والتسوية', state: 'IDLE' },
  };

  private listeners: Set<OrchestratorListener> = new Set();

  constructor() {
    this.initRun('S1');
  }

  public subscribe(listener: OrchestratorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getSnapshot() {
    return {
      currentScenarioId: this.currentScenarioId,
      runId: this.runId,
      inputVersion: this.inputVersion,
      mode: this.mode,
      localStatus: this.localStatus,
      isRunning: this.isRunning,
      isAutoRunning: this.isAutoRunning,
      isCustomized: this.isCustomized,
      fixture: this.currentFixture,
      ruleResult: this.ruleResult,
      minimizationResult: this.minimizationResult,
      aiReasoning: this.aiReasoning,
      aiClassification: this.aiClassification,
      humanDecision: this.humanDecision,
      humanDecisionReason: this.humanDecisionReason,
      claimApproved: this.claimApproved,
      claimExported: this.claimExported,
      settlementCompleted: this.settlementCompleted,
      s5Ledger: this.s5Ledger,
      metrics: this.metrics,
      events: this.events,
      nodeStatuses: this.nodeStatuses,
      activeLearnedRule: rulesAdapter.getActiveLearnedRule(),
      quotaAlert: this.quotaAlert,
    };
  }

  public setMode(newMode: 'demo-static' | 'live-ai') {
    this.mode = newMode;
    this.notify();
  }

  public openQuotaModal(message?: string, details?: string) {
    this.quotaAlert = {
      isOpen: true,
      message: message || 'إدارة مفتاح OpenRouter للوضع الحي وتفاصيل الرصيد',
      details,
    };
    this.notify();
  }

  public closeQuotaModal() {
    this.quotaAlert = null;
    this.notify();
  }

  public handleQuotaExceeded(err: QuotaExceededError | Error) {
    this.isAutoRunning = false;
    this.isRunning = false;
    const msg = err.message || 'نفد رصيد حساب OpenRouter للوضع الحي.';
    const details = (err as QuotaExceededError).details;
    this.quotaAlert = {
      isOpen: true,
      message: msg,
      details,
    };
    this.nodeStatuses.ai.state = 'BLOCKED';
    this.nodeStatuses.ai.infoAr = 'توقف: رصيد OpenRouter غير كافٍ';
    this.emitEvent('system.quota_exhausted', `تنبيه رصيد الذكاء الاصطناعي: ${msg}`, { details });
    this.notify();
  }

  public initRun(scenarioId: ScenarioId, customFixture?: ScenarioFixture) {
    this.currentScenarioId = scenarioId;
    this.runId = `RUN-${scenarioId}-${Date.now().toString(36).toUpperCase()}`;
    this.inputVersion = 1;
    this.currentFixture = customFixture ? JSON.parse(JSON.stringify(customFixture)) : JSON.parse(JSON.stringify(SCENARIO_FIXTURES[scenarioId]));
    this.isCustomized = Boolean(customFixture);
    this.localStatus = 'مستلمة';
    this.isRunning = false;
    this.isAutoRunning = false;
    this.ruleResult = null;
    this.aiReasoning = null;
    this.aiClassification = null;
    this.humanDecision = null;
    this.humanDecisionReason = '';
    this.claimApproved = false;
    this.claimExported = false;
    this.settlementCompleted = false;
    this.quotaAlert = null;
    this.processedActionKeys.clear();

    if (scenarioId === 'S5') {
      this.s5Ledger = createInitialS5Ledger();
      this.metrics.activeVarianceUnderInvestigationSar = halalasToSar(this.s5Ledger.insuranceVarianceHalalas);
    } else {
      this.metrics.activeVarianceUnderInvestigationSar = 0;
    }

    this.minimizationResult = computeDataMinimization(this.currentFixture);

    // Reset node states
    Object.keys(this.nodeStatuses).forEach((key) => {
      this.nodeStatuses[key].state = key === 'his' ? 'PASS' : 'IDLE';
      this.nodeStatuses[key].infoAr = undefined;
    });

    this.emitEvent('case.saved', 'تم استلام وتوثيق ملف الحالة وحفظ المهمة في مستودع FHIR MockClient');
    seedScenarioInMedplum(this.currentFixture, this.inputVersion).catch(console.error);

    this.notify();
  }

  private emitEvent(eventType: EventType, summaryAr: string, details?: Record<string, unknown>) {
    const actionKey = `${this.runId}_v${this.inputVersion}_${eventType}`;
    // Guard against duplicate event logging
    if (this.processedActionKeys.has(actionKey) && eventType !== 'case.saved') {
      return;
    }
    this.processedActionKeys.add(actionKey);

    const event: SimulationEvent = {
      eventId: `EV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      runId: this.runId,
      claimId: this.currentFixture.claim.id,
      eventType,
      inputVersion: this.inputVersion,
      timestamp: new Date().toLocaleTimeString('ar-SA'),
      mode: this.mode,
      summaryAr,
      details,
    };
    this.events.unshift(event);
  }

  /**
   * Step 1: Run Business Rules Check
   */
  public async executeRulesCheck(): Promise<RuleResult | null> {
    this.isRunning = true;
    this.nodeStatuses.core.state = 'PASS';
    this.nodeStatuses.rules.state = 'RUNNING';
    this.notify();

    const startTime = performance.now();
    const doc = this.currentFixture.documents[0];

    try {
      const result = await rulesAdapter.evaluate(
        {
          claimId: this.currentFixture.claim.id,
          serviceCode: this.currentFixture.claim.serviceCode,
          amount: this.currentFixture.claim.billedAmount,
          memberId: this.currentFixture.patient.memberId,
          serviceDate: this.currentFixture.claim.serviceDate,
          diagnosisCode: this.currentFixture.claim.diagnosisCode,
          hasSupportingDoc: this.currentFixture.claim.hasAttachmentInSubmission,
          docId: doc?.id,
          docText: doc?.text,
          priorDenialCode: this.currentFixture.historicalDenial?.code,
        },
        this.mode
      );

      const elapsed = Math.round(performance.now() - startTime);
      this.ruleResult = result;
      this.nodeStatuses.rules.measuredLatencyMs = elapsed;

      // Track First-Pass Clean metric on version 1
      if (this.inputVersion === 1) {
        this.metrics.firstPassTotalEvaluated += 1;
        if (result.passed) {
          this.metrics.firstPassCleanCount += 1;
        }
      }

      if (!result.passed) {
        if (result.route === 'needs-correction') {
          this.localStatus = 'تحتاج استكمالاً';
          this.nodeStatuses.rules.state = 'BLOCKED';
          this.nodeStatuses.rules.infoAr = result.violations[0]?.messageAr;
          this.metrics.correctionRequiredCount += 1;
          await updateMedplumTaskStatus(`TASK-${this.currentFixture.id}-v${this.inputVersion}`, 'on-hold', 'تحتاج استكمالاً');
        } else if (result.route === 'denial-review' || result.route === 'ai-evidence') {
          this.localStatus = 'فحص قواعد';
          this.nodeStatuses.rules.state = 'PASS';
        }
      } else {
        this.nodeStatuses.rules.state = 'PASS';
        this.localStatus = 'بانتظار مراجع';
        this.humanReviewStartTime = Date.now();
        await updateMedplumTaskStatus(`TASK-${this.currentFixture.id}-v${this.inputVersion}`, 'ready', 'بانتظار مراجع');
      }

      this.emitEvent('rules.completed', `اكتمال فحص القواعد (${result.engine}) - النتيجة: ${result.passed ? 'اجتياز' : 'تتطلب إجراء'}`, {
        violationsCount: result.violations.length,
        route: result.route,
      });

      this.isRunning = false;
      this.notify();
      return result;
    } catch (err: unknown) {
      if (err instanceof QuotaExceededError) {
        this.handleQuotaExceeded(err);
        return null;
      }
      this.isRunning = false;
      this.notify();
      throw err;
    }
  }

  /**
   * Step 2: Trigger AI Analysis (Reasoning + Classification)
   */
  public async executeAiAnalysis(): Promise<void> {
    if (!this.currentFixture.requiresAi && !this.isCustomized) {
      this.nodeStatuses.ai.state = 'SKIPPED';
      this.nodeStatuses.ai.infoAr = 'لم يستدعَ المزود (لا تتطلب استدلالاً)';
      this.localStatus = 'بانتظار مراجع';
      this.humanReviewStartTime = Date.now();
      this.notify();
      return;
    }

    this.isRunning = true;
    this.localStatus = 'تحليل AI';
    this.nodeStatuses.ai.state = 'RUNNING';
    this.notify();

    this.emitEvent('ai.started', `بدء استدعاء الذكاء الاصطناعي (${this.mode === 'live-ai' ? 'حي' : 'ثابت'})`);

    const doc = this.currentFixture.documents[0];
    const excerpt = doc ? doc.text : '';

    try {
      const [reasoning, classification] = await Promise.all([
        aiGateway.reason({
          scenarioId: this.currentScenarioId,
          claimId: this.currentFixture.claim.id,
          serviceCode: this.currentFixture.claim.serviceCode,
          clinicalExcerpt: excerpt,
          priorDenialCode: this.currentFixture.historicalDenial?.code,
          mode: this.mode,
          isCustomized: this.isCustomized,
        }),
        aiGateway.classify({
          scenarioId: this.currentScenarioId,
          claimId: this.currentFixture.claim.id,
          serviceCode: this.currentFixture.claim.serviceCode,
          clinicalExcerpt: excerpt,
          mode: this.mode,
          isCustomized: this.isCustomized,
        }),
      ]);

      this.aiReasoning = reasoning;
      this.aiClassification = classification;
      this.nodeStatuses.ai.state = 'PASS';
      this.nodeStatuses.ai.measuredLatencyMs = reasoning.metadata?.latencyMs || 1200;
      this.nodeStatuses.ai.infoAr = `${reasoning.metadata?.model}`;

      // Metrics updates
      this.metrics.measuredAiRunsCount += 1;
      if (typeof reasoning.metadata?.costUsd === 'number') {
        this.metrics.totalAiCostUsd += reasoning.metadata.costUsd;
        this.metrics.aiRunsWithCostCount += 1;
      } else {
        this.metrics.aiRunsWithoutCostCount += 1;
      }

      // Evidence coverage metric
      const findings = reasoning.findings || [];
      this.metrics.totalEvidenceObservations += findings.length;
      const validatedCount = findings.filter((f: AIFinding) => f.evidence && f.evidence.length > 0).length;
      this.metrics.validatedEvidenceObservations += validatedCount;

      this.localStatus = 'بانتظار مراجع';
      this.humanReviewStartTime = Date.now();
      await updateMedplumTaskStatus(`TASK-${this.currentFixture.id}-v${this.inputVersion}`, 'ready', 'بانتظار مراجع');

      this.emitEvent('ai.validated', `تم التحقق من مخرجات النموذج ومطابقة الاقتباسات السريرية`, {
        findingsCount: findings.length,
        model: reasoning.metadata?.model,
      });

      this.isRunning = false;
      this.notify();
    } catch (err: unknown) {
      if (err instanceof QuotaExceededError) {
        this.handleQuotaExceeded(err);
        return;
      }
      this.isRunning = false;
      this.notify();
      throw err;
    }
  }

  /**
   * Step 3: Human Review Decision (Approval / Modification / Rejection)
   */
  public async submitHumanDecision(
    decision: 'approved' | 'modified' | 'rejected',
    reasonAr: string,
    modifiedServiceCode?: string,
    modifiedAmount?: number
  ): Promise<void> {
    const reviewDurationSec = this.humanReviewStartTime > 0 ? (Date.now() - this.humanReviewStartTime) / 1000 : 5;
    this.metrics.humanReviewsCount += 1;
    this.metrics.totalHumanReviewSeconds += reviewDurationSec;

    this.humanDecision = decision;
    this.humanDecisionReason = reasonAr;
    this.nodeStatuses.reviewer.state = decision === 'rejected' ? 'BLOCKED' : 'PASS';
    this.nodeStatuses.reviewer.infoAr = `القرار: ${decision === 'approved' ? 'اعتماد' : decision === 'modified' ? 'تعديل' : 'رفض'}`;

    if (decision === 'approved') {
      this.claimApproved = true;
      this.localStatus = 'معتمدة';
      this.metrics.unmodifiedAcceptedProposalsCount += 1;
      this.metrics.totalUniqueClaimsReviewedValue += this.currentFixture.claim.billedAmount;
      await updateMedplumTaskStatus(`TASK-${this.currentFixture.id}-v${this.inputVersion}`, 'accepted', 'معتمدة');
      this.emitEvent('review.decided', `اعتمد المراجع البشري المطالبة بمبلغ ${this.currentFixture.claim.billedAmount} ر.س`);
    } else if (decision === 'modified') {
      this.metrics.modifiedProposalsCount += 1;
      this.claimApproved = false;
      this.inputVersion += 1;
      if (modifiedServiceCode) {
        this.currentFixture.claim.serviceCode = modifiedServiceCode;
        this.currentFixture.claim.serviceNameAr = 'استشارة طبية موثقة في العيادة الخارجية (مصححة من المراجع)';
      }
      if (modifiedAmount) {
        this.currentFixture.claim.billedAmount = modifiedAmount;
      }
      // Re-seed updated version in Medplum
      await seedScenarioInMedplum(this.currentFixture, this.inputVersion);
      this.emitEvent('review.decided', `قام المراجع بتعديل الخدمة إلى ${modifiedServiceCode || 'استشارة'} والمبلغ إلى ${modifiedAmount || 200} ر.س - إنشاء إصدار جديد v${this.inputVersion}`);
      // Re-evaluate rules on modified version
      await this.executeRulesCheck();
    } else {
      this.metrics.rejectedProposalsCount += 1;
      this.localStatus = 'مرفوضة من المراجع';
      await updateMedplumTaskStatus(`TASK-${this.currentFixture.id}-v${this.inputVersion}`, 'rejected', 'مرفوضة من المراجع');
      this.emitEvent('review.decided', `رفض المراجع البشري رفع المطالبة: ${reasonAr}`);
    }

    this.notify();
  }

  /**
   * Correction for S2: Correct member ID
   */
  public async correctMemberId(newMemberId: string): Promise<void> {
    if (!newMemberId || newMemberId.trim() === '') return;
    this.currentFixture.patient.memberId = newMemberId.trim();
    this.inputVersion += 1;
    await seedScenarioInMedplum(this.currentFixture, this.inputVersion, newMemberId.trim());
    this.emitEvent('case.saved', `تم تحديث رقم العضوية التأمينية إلى (${newMemberId.trim()}) وإنشاء إصدار جديد v${this.inputVersion}`);
    await this.executeRulesCheck();
  }

  /**
   * Action for S4: Attach missing document to submission package
   */
  public async attachMissingDocument(): Promise<void> {
    this.currentFixture.claim.hasAttachmentInSubmission = true;
    this.inputVersion += 1;
    await seedScenarioInMedplum(this.currentFixture, this.inputVersion);
    this.emitEvent('case.saved', `تم إرفاق التقرير التشخيصي DOC-S4-1 بحزمة المطالبة وإعداد مسودة الاعتراض`);
    await this.executeRulesCheck();
  }

  /**
   * Step 4: Export to Mock Payer & Settlement
   */
  public async exportToPayerSimulator(): Promise<void> {
    if (!this.claimApproved) {
      throw new Error('لا يمكن الإرسال للمحاكي قبل اعتماد المطالبة بشرياً');
    }
    if (this.claimExported) {
      return; // Prevent duplicate export
    }

    this.isRunning = true;
    this.claimExported = true;
    this.localStatus = 'مصدرة للمحاكي';
    this.nodeStatuses.payer.state = 'RUNNING';
    this.notify();

    await new Promise((resolve) => setTimeout(resolve, 800)); // Payer simulation latency

    const amount = this.currentFixture.claim.billedAmount;
    await saveMedplumClaimResponse(
      this.currentFixture.claim.id,
      this.currentFixture.patient.id,
      'complete',
      'موافقة كاملة على المطالبة المعتمدة بعد مطابقة المعايير الطبية والتعاقدية',
      amount
    );

    this.nodeStatuses.payer.state = 'PASS';
    this.nodeStatuses.bank.state = 'PASS';
    this.localStatus = 'تم الرد والتسوية';
    this.settlementCompleted = true;
    this.metrics.completedRunsCount += 1;
    this.metrics.settledInsurancePaymentsSar += amount;

    await saveMedplumPaymentReconciliation(this.currentFixture.claim.id, amount, 'تسوية مصرفية تجريبية مطابقة');
    await updateMedplumTaskStatus(`TASK-${this.currentFixture.id}-v${this.inputVersion}`, 'completed', 'تم الرد والتسوية');

    this.emitEvent('payer.response.saved', `استلام إشعار موافقة اصطناعي من محاكي التأمين بالمبلغ الكامل (${amount} ر.س)`);
    this.emitEvent('settlement.saved', `اكتمال التسوية والمطابقة البنكية التجريبية وقفل ملف المطالبة`);

    this.isRunning = false;
    this.notify();
  }

  /**
   * S5: Add supplementary remittance & bank match
   */
  public async addS5SupplementaryPayment(): Promise<void> {
    try {
      this.s5Ledger = addSupplementaryRemittance(
        this.s5Ledger,
        'REMIT-S5-02',
        200 * 100, // 200 SAR
        true
      );
      this.metrics.activeVarianceUnderInvestigationSar = 0;
      this.metrics.settledInsurancePaymentsSar += 200;
      this.metrics.completedRunsCount += 1;
      this.settlementCompleted = true;
      this.localStatus = 'تم الرد والتسوية';
      this.nodeStatuses.bank.state = 'PASS';

      await updateMedplumTaskStatus(`TASK-S5-v${this.inputVersion}`, 'completed', 'تم الرد والتسوية');
      this.emitEvent('settlement.saved', 'تم استلام الدفعة التكميلية (200 ر.س) برمز REMIT-S5-02 وإتمام المطابقة البنكية بنجاح');
      this.notify();
    } catch (err: any) {
      alert(err.message);
    }
  }

  /**
   * Next Step Orchestration Helper
   */
  public async triggerNextStep(): Promise<void> {
    if (this.isRunning) return;

    if (!this.ruleResult) {
      await this.executeRulesCheck();
      return;
    }

    if (this.ruleResult.route === 'needs-correction') {
      return; // Awaiting correction
    }

    if (!this.aiReasoning && (this.currentFixture.requiresAi || this.isCustomized)) {
      await this.executeAiAnalysis();
      return;
    }

    if (!this.claimApproved && this.localStatus === 'بانتظار مراجع') {
      // Prompt user or wait for human decision
      return;
    }

    if (this.claimApproved && !this.claimExported) {
      await this.exportToPayerSimulator();
      return;
    }
  }

  /**
   * Auto-Run: executes pipeline up to the Human Review stage, then safely stops
   */
  public async startAutoRun(): Promise<void> {
    this.isAutoRunning = true;
    this.notify();

    // 1. Rules check
    if (!this.ruleResult) {
      const res = await this.executeRulesCheck();
      if (!res.passed && res.route === 'needs-correction') {
        this.isAutoRunning = false;
        this.notify();
        return;
      }
    }

    // 2. AI analysis if needed
    if (!this.aiReasoning && (this.currentFixture.requiresAi || this.isCustomized)) {
      await this.executeAiAnalysis();
    }

    // Stop at human review
    this.isAutoRunning = false;
    this.notify();
  }

  public stopAutoRun() {
    this.isAutoRunning = false;
    this.notify();
  }

  public resetAll() {
    this.metrics = createInitialMetrics();
    this.events = [];
    this.initRun(this.currentScenarioId);
  }
}

export const orchestrator = new SimulationOrchestrator();
