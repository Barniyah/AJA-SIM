/**
 * Business Rules Adapter
 * Supports both TypeScript Demo Engine (with explicit badge) and ZEN engine adapter
 * Reference: AJA_SIM_TECH.md Section 6 & Section 6.1
 */

import { RuleEngineType, RuleInput, RuleProposal, RuleResult, RuleViolation } from '../../types';

export class SimulationRulesAdapter {
  private engineType: RuleEngineType;
  private ruleVersion: string;
  private activeLearnedRule: RuleProposal | null = null;

  constructor(engineType: RuleEngineType = 'typescript-demo', ruleVersion = '2026.10-v2') {
    this.engineType = engineType;
    this.ruleVersion = ruleVersion;
  }

  public setEngineType(type: RuleEngineType) {
    this.engineType = type;
  }

  public getEngineType(): RuleEngineType {
    return this.engineType;
  }

  public getRuleVersion(): string {
    return this.ruleVersion;
  }

  public getActiveLearnedRule(): RuleProposal | null {
    return this.activeLearnedRule;
  }

  public setActiveLearnedRule(rule: RuleProposal | null) {
    this.activeLearnedRule = rule;
    if (rule && rule.status === 'active') {
      this.ruleVersion = '2026.10-v3-learned';
    } else {
      this.ruleVersion = '2026.10-v2';
    }
  }

  public async evaluate(
    input: RuleInput,
    mode: 'demo-static' | 'live-ai' = 'demo-static'
  ): Promise<RuleResult> {
    // 1. In Live AI mode, evaluate via OpenRouter decisions model typesafe/jev-1.13
    if (mode === 'live-ai') {
      try {
        const response = await fetch('/api/sim/rules/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...input,
            activeLearnedRule: this.activeLearnedRule,
          }),
        });

        if (response.ok) {
          const liveResult: RuleResult = await response.json();
          return liveResult;
        }
      } catch (err) {
        console.warn('Live rules evaluation failed, falling back to local evaluation:', err);
      }
    }

    // 2. Deterministic Local Evaluation (Fallback / Demo-Static Mode)
    const violations: RuleViolation[] = [];

    // Rule 1: DEMO-REQ-001 - Member ID existence
    if (!input.memberId || input.memberId.trim() === '') {
      violations.push({
        ruleId: 'DEMO-REQ-001',
        field: 'memberId',
        severity: 'block',
        messageAr: 'رقم العضوية التأمينية مفقود في بيانات المطالبة؛ يجب استكمال رقم العضوية',
      });
    }

    // Rule 2: DEMO-REQ-002 - Amount and service date
    if (input.amount <= 0) {
      violations.push({
        ruleId: 'DEMO-REQ-002',
        field: 'amount',
        severity: 'block',
        messageAr: 'مبلغ المطالبة يجب أن يكون قيمة موجبة صحيحة',
      });
    }

    // Rule 3: Active Learned Rule (DEMO-REQ-004) from "نتعلم معًا" S4
    if (
      this.activeLearnedRule &&
      this.activeLearnedRule.status === 'active' &&
      input.serviceCode === 'DEMO-SVC-03'
    ) {
      if (!input.hasSupportingDoc) {
        violations.push({
          ruleId: 'DEMO-REQ-004',
          field: 'hasSupportingDoc',
          severity: 'block',
          messageAr: 'قاعدة احترازية نشطة: الخدمة DEMO-SVC-03 تتطلب إرفاق تقرير الفحص المعتمد بالحزمة قبل الإرسال',
        });
      }
    }

    // Rule 4: S4 Prior Denial handling
    if (input.priorDenialCode && !input.isAppeal) {
      return {
        engine: this.engineType,
        ruleVersion: this.ruleVersion,
        passed: false,
        violations: [
          {
            ruleId: 'DEMO-DENIAL-01',
            field: 'status',
            severity: 'review',
            messageAr: `مطالبة مرفوضة سابقاً برمز (${input.priorDenialCode}) تتطلب استرجاع الدليل وصياغة اعتراض`,
          },
        ],
        route: 'denial-review',
      };
    }

    // Rule 5: S3 Documentation mismatch review trigger
    if (input.serviceCode === 'DEMO-SVC-02') {
      if (
        input.docText &&
        (input.docText.includes('ولم ينفذ الإجراء') || input.docText.includes('استشارة فقط'))
      ) {
        violations.push({
          ruleId: 'DEMO-REQ-003',
          field: 'serviceCode',
          severity: 'review',
          messageAr: 'التوثيق السريري المرفق يتعارض مع كود الإجراء الجراحي؛ التقرير يفيد بالاكتفاء بالاستشارة',
        });
        return {
          engine: this.engineType,
          ruleVersion: this.ruleVersion,
          passed: false,
          violations,
          route: 'ai-evidence',
        };
      }
    }

    // Rule 6: S5 Financial Reconciliation Routing
    if (input.serviceCode === 'DEMO-SVC-05') {
      return {
        engine: this.engineType,
        ruleVersion: this.ruleVersion,
        passed: violations.length === 0,
        violations,
        route: 'reconciliation',
      };
    }

    // Blocking violations route to correction
    const hasBlock = violations.some((v) => v.severity === 'block');
    if (hasBlock) {
      return {
        engine: this.engineType,
        ruleVersion: this.ruleVersion,
        passed: false,
        violations,
        route: 'needs-correction',
      };
    }

    // Review violations route to human review
    if (violations.length > 0) {
      return {
        engine: this.engineType,
        ruleVersion: this.ruleVersion,
        passed: false,
        violations,
        route: 'human-review',
      };
    }

    // Clean pass
    return {
      engine: this.engineType,
      ruleVersion: this.ruleVersion,
      passed: true,
      violations: [],
      route: 'human-review',
    };
  }

  /**
   * Runs the 3 mandatory test cases for the "نتعلم معًا" rule proposal
   * Reference: AJA_SIM_TECH.md Section 6.1
   */
  public async testRuleProposal(proposal: RuleProposal): Promise<{
    test1Passed: boolean;
    test2Passed: boolean;
    test3Passed: boolean;
    allPassed: boolean;
  }> {
    // Save current active state
    const originalLearned = this.activeLearnedRule;

    // Temporarily activate for testing
    this.activeLearnedRule = { ...proposal, status: 'active' };

    // Test 1: Service DEMO-SVC-03 without doc -> MUST block
    const res1 = await this.evaluate({
      claimId: 'TEST-01',
      serviceCode: 'DEMO-SVC-03',
      amount: 1000,
      memberId: 'SYN-MEM-TEST',
      hasSupportingDoc: false,
    });
    const test1Passed = res1.violations.some((v) => v.ruleId === 'DEMO-REQ-004');

    // Test 2: Service DEMO-SVC-03 with doc -> MUST pass
    const res2 = await this.evaluate({
      claimId: 'TEST-02',
      serviceCode: 'DEMO-SVC-03',
      amount: 1000,
      memberId: 'SYN-MEM-TEST',
      hasSupportingDoc: true,
    });
    const test2Passed = res2.passed === true;

    // Test 3: Other service (DEMO-SVC-01) without doc -> NOT affected
    const res3 = await this.evaluate({
      claimId: 'TEST-03',
      serviceCode: 'DEMO-SVC-01',
      amount: 300,
      memberId: 'SYN-MEM-TEST',
      hasSupportingDoc: false,
    });
    const test3Passed = !res3.violations.some((v) => v.ruleId === 'DEMO-REQ-004');

    // Restore original
    this.activeLearnedRule = originalLearned;

    return {
      test1Passed,
      test2Passed,
      test3Passed,
      allPassed: test1Passed && test2Passed && test3Passed,
    };
  }
}

export const rulesAdapter = new SimulationRulesAdapter('typescript-demo');
