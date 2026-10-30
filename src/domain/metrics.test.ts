import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialMetrics, formatValueDimensions } from './metrics';

test('Initial metrics return "لا بيانات" for zero denominator rates without crashing', () => {
  const initial = createInitialMetrics();
  const dimensions = formatValueDimensions(initial);
  
  const care = dimensions.find(d => d.key === 'care')!;
  assert.equal(care.valueDisplay, 'لا بيانات');

  const claims = dimensions.find(d => d.key === 'claims')!;
  assert.equal(claims.valueDisplay, 'لا بيانات');

  const productivity = dimensions.find(d => d.key === 'productivity')!;
  assert.equal(productivity.valueDisplay, 'لا بيانات');
});

test('Populated metrics compute correct percentages and averages', () => {
  const metrics = createInitialMetrics();
  metrics.firstPassTotalEvaluated = 10;
  metrics.firstPassCleanCount = 8;
  metrics.totalEvidenceObservations = 4;
  metrics.validatedEvidenceObservations = 4;
  metrics.humanReviewsCount = 2;
  metrics.totalHumanReviewSeconds = 12;
  metrics.settledInsurancePaymentsSar = 1600;

  const dimensions = formatValueDimensions(metrics);

  const care = dimensions.find(d => d.key === 'care')!;
  assert.equal(care.valueDisplay, '100%');

  const claims = dimensions.find(d => d.key === 'claims')!;
  assert.equal(claims.valueDisplay, '80%');

  const productivity = dimensions.find(d => d.key === 'productivity')!;
  assert.equal(productivity.valueDisplay, '6.0 ث');

  const payments = dimensions.find(d => d.key === 'payments')!;
  assert.ok(payments.valueDisplay.includes('١٬٦٠٠') || payments.valueDisplay.includes('1,600') || payments.valueDisplay.includes('1600'));
});
