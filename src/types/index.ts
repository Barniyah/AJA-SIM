/**
 * Data contracts and types for AJA Revenue Cycle Simulator (أجا)
 * Reference: AJA_SIM_TECH.md v2.0
 */

export type ScenarioId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

export type TaskStandardStatus =
  | 'draft'
  | 'requested'
  | 'received'
  | 'accepted'
  | 'rejected'
  | 'ready'
  | 'cancelled'
  | 'in-progress'
  | 'on-hold'
  | 'failed'
  | 'completed'
  | 'entered-in-error';

export type LocalWorkflowStatus =
  | 'مستلمة' // Received
  | 'فحص قواعد' // Rule check
  | 'تحتاج استكمالاً' // Needs correction
  | 'تحليل AI' // AI analysis
  | 'بانتظار مراجع' // Awaiting human review
  | 'معتمدة' // Approved
  | 'مرفوضة من المراجع' // Rejected by reviewer
  | 'مصدرة للمحاكي' // Exported to payer simulator
  | 'تم الرد والتسوية' // Response & reconciled
  | 'متعثرة'; // Stalled / Error

export type RuleEngineType = 'zen' | 'typescript-demo' | 'typesafe-jev';

export interface RuleViolation {
  ruleId: string;
  field: string;
  severity: 'block' | 'review';
  messageAr: string;
}

export type RoutingDecision =
  | 'human-review'
  | 'needs-correction'
  | 'ai-evidence'
  | 'denial-review'
  | 'reconciliation';

export interface RuleResult {
  engine: RuleEngineType;
  ruleVersion: string;
  passed: boolean;
  violations: RuleViolation[];
  route: RoutingDecision;
}

export interface RuleInput {
  claimId: string;
  serviceCode: string;
  amount: number;
  memberId?: string;
  serviceDate?: string;
  diagnosisCode?: string;
  hasSupportingDoc?: boolean;
  docId?: string;
  docText?: string;
  isAppeal?: boolean;
  priorDenialCode?: string;
}

export interface EvidenceReference {
  sourceId: string;
  sourceVersion: string;
  quote: string;
}

export interface AIFinding {
  type: 'documentation_gap' | 'service_discrepancy' | 'missing_attachment' | 'general_observation';
  summaryAr: string;
  evidence: EvidenceReference[];
  suggestedActionAr: string;
}

export interface AIReasoningContract {
  schemaVersion: '1.0';
  status: 'suggestion' | 'insufficient_evidence';
  findings: AIFinding[];
  draftAppealAr: string | null;
  needsHumanReview: true;
  metadata?: {
    model: string;
    latencyMs: number;
    costUsd?: number | 'غير متاحة';
    isLive: boolean;
  };
}

export interface AIClassificationContract {
  category: string;
  priority: 'normal' | 'review' | 'urgent';
  reasonAr: string;
  needsHumanReview: true;
  metadata?: {
    model: string;
    latencyMs: number;
    isLive: boolean;
  };
}

export type EventType =
  | 'case.saved'
  | 'rules.completed'
  | 'payload.prepared'
  | 'ai.started'
  | 'ai.validated'
  | 'review.decided'
  | 'payer.response.saved'
  | 'settlement.saved'
  | 'rule.activated';

export interface SimulationEvent {
  eventId: string;
  runId: string;
  claimId: string;
  eventType: EventType;
  inputVersion: number;
  timestamp: string;
  mode: 'demo-static' | 'live-ai';
  summaryAr: string;
  details?: Record<string, unknown>;
}

export interface RuleProposal {
  id: string;
  ruleId: string;
  nameAr: string;
  conditionSummaryAr: string;
  reasonAr: string;
  targetService: string;
  version: string;
  status: 'draft' | 'tested' | 'approved' | 'active' | 'retired';
  testResults?: {
    test1Passed: boolean; // Service DEMO-SVC-03 without doc -> Blocked
    test2Passed: boolean; // Service DEMO-SVC-03 with doc -> Passed
    test3Passed: boolean; // Other service -> Not affected
  };
}

export interface S5ReconciliationLedger {
  claimId: string;
  totalInvoiceHalalas: number; // 200,000 = 2000 SAR
  contractualDiscountHalalas: number; // 20,000 = 200 SAR
  contractualAllowedHalalas: number; // 180,000 = 1800 SAR
  patientCopayHalalas: number; // 20,000 = 200 SAR (Collected separately)
  netInsurerDueHalalas: number; // 160,000 = 1600 SAR
  
  firstPaymentNoticeId: string;
  firstPaymentHalalas: number; // 140,000 = 1400 SAR
  firstPaymentBankMatched: boolean;
  
  insuranceVarianceHalalas: number; // 20,000 = 200 SAR
  
  supplementaryNoticeId?: string;
  supplementaryPaymentHalalas?: number; // 20,000 = 200 SAR
  supplementaryBankMatched?: boolean;
  
  investigationTaskId?: string;
  isFullyReconciled: boolean;
}

export interface ScenarioFixture {
  id: ScenarioId;
  nameAr: string;
  subtitleAr: string;
  descriptionAr: string;
  patient: {
    id: string;
    nameAr: string;
    nationalId: string;
    memberId: string;
    gender: 'male' | 'female';
    birthDate: string;
  };
  claim: {
    id: string;
    serviceCode: string;
    serviceNameAr: string;
    diagnosisCode: string;
    diagnosisNameAr: string;
    billedAmount: number; // SAR
    serviceDate: string;
    hasAttachmentInSubmission: boolean;
    attachmentDocId?: string;
  };
  documents: Array<{
    id: string;
    titleAr: string;
    version: string;
    synthetic: true;
    text: string;
    author: string;
  }>;
  expectedRuleOutcome: 'pass' | 'block' | 'review' | 'denial' | 'reconciliation';
  requiresAi: boolean;
  historicalDenial?: {
    code: string;
    reasonAr: string;
    date: string;
  };
}

export interface SimulationCapabilities {
  dataMode: 'medplum-mock-client';
  rulesEngine: RuleEngineType;
  classifierModel: string;
  reasonerModel: string;
  isLiveAvailable: boolean;
  hasOpenRouterKey: boolean;
  hasGeminiKey: boolean;
  systemNoticeAr: string;
}

export interface NodeStatus {
  id: 'his' | 'core' | 'rules' | 'ai' | 'reviewer' | 'payer' | 'bank';
  nameAr: string;
  state: 'IDLE' | 'RUNNING' | 'PASS' | 'BLOCKED' | 'SKIPPED' | 'FAILED';
  measuredLatencyMs?: number;
  lastActiveTimestamp?: string;
  infoAr?: string;
}

export interface ValueMetricsData {
  completedRunsCount: number;
  firstPassCleanCount: number;
  firstPassTotalEvaluated: number;
  correctionRequiredCount: number;
  humanReviewsCount: number;
  unmodifiedAcceptedProposalsCount: number;
  modifiedProposalsCount: number;
  rejectedProposalsCount: number;
  totalHumanReviewSeconds: number;
  measuredAiRunsCount: number;
  totalAiCostUsd: number;
  aiRunsWithCostCount: number;
  aiRunsWithoutCostCount: number;
  totalEvidenceObservations: number;
  validatedEvidenceObservations: number;
  totalUniqueClaimsReviewedValue: number;
  settledInsurancePaymentsSar: number;
  activeVarianceUnderInvestigationSar: number;
}
