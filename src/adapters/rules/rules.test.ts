import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationRulesAdapter } from './index';

test('S1 clean claim passes rules and routes to human-review', async () => {
  const adapter = new SimulationRulesAdapter();
  const res = await adapter.evaluate({
    claimId: 'CLM-S1-300',
    serviceCode: 'DEMO-SVC-01',
    amount: 300,
    memberId: 'SYN-MEM-1001',
  });

  assert.equal(res.passed, true);
  assert.equal(res.violations.length, 0);
  assert.equal(res.route, 'human-review');
});

test('S2 missing memberId is blocked deterministically with DEMO-REQ-001', async () => {
  const adapter = new SimulationRulesAdapter();
  const res = await adapter.evaluate({
    claimId: 'CLM-S2-300',
    serviceCode: 'DEMO-SVC-01',
    amount: 300,
    memberId: '',
  });

  assert.equal(res.passed, false);
  assert.equal(res.route, 'needs-correction');
  assert.ok(res.violations.some(v => v.ruleId === 'DEMO-REQ-001'));
});

test('S3 clinical note discrepancy routes to ai-evidence', async () => {
  const adapter = new SimulationRulesAdapter();
  const res = await adapter.evaluate({
    claimId: 'CLM-S3-600',
    serviceCode: 'DEMO-SVC-02',
    amount: 600,
    memberId: 'SYN-MEM-3003',
    docText: 'الملاحظة: حضر المراجع للاستشارة ولم ينفذ الإجراء في هذه الزيارة',
  });

  assert.equal(res.passed, false);
  assert.equal(res.route, 'ai-evidence');
  assert.ok(res.violations.some(v => v.ruleId === 'DEMO-REQ-003'));
});

test('Learn Together S4 rule proposal test runs all 3 tests successfully', async () => {
  const adapter = new SimulationRulesAdapter();
  const proposal = {
    id: 'PROP-01',
    ruleId: 'DEMO-REQ-004',
    nameAr: 'التحقق من إرفاق تقرير الفحص للخدمة DEMO-SVC-03',
    conditionSummaryAr: 'فحص وجود مرفق للخدمة DEMO-SVC-03',
    reasonAr: 'منع تكرار الرفض بسبب غياب التقرير',
    targetService: 'DEMO-SVC-03',
    version: '1.0',
    status: 'draft' as const,
  };

  const testResult = await adapter.testRuleProposal(proposal);
  assert.equal(testResult.test1Passed, true);
  assert.equal(testResult.test2Passed, true);
  assert.equal(testResult.test3Passed, true);
  assert.equal(testResult.allPassed, true);
});
