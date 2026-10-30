import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialS5Ledger, addSupplementaryRemittance, halalasToSar } from './ledger';

test('S5 Initial Ledger calculates correct net insurer due and 200 SAR variance', () => {
  const ledger = createInitialS5Ledger();
  
  assert.equal(halalasToSar(ledger.totalInvoiceHalalas), 2000);
  assert.equal(halalasToSar(ledger.contractualDiscountHalalas), 200);
  assert.equal(halalasToSar(ledger.contractualAllowedHalalas), 1800);
  assert.equal(halalasToSar(ledger.patientCopayHalalas), 200);
  assert.equal(halalasToSar(ledger.netInsurerDueHalalas), 1600);
  assert.equal(halalasToSar(ledger.firstPaymentHalalas), 1400);
  assert.equal(halalasToSar(ledger.insuranceVarianceHalalas), 200);
  assert.equal(ledger.isFullyReconciled, false);
});

test('S5 Supplementary remittance resolves variance to 0 and reconciles when bank matched', () => {
  const initial = createInitialS5Ledger();
  const updated = addSupplementaryRemittance(
    initial,
    'REMIT-S5-02',
    200 * 100, // 200 SAR in halalas
    true
  );

  assert.equal(halalasToSar(updated.insuranceVarianceHalalas), 0);
  assert.equal(updated.isFullyReconciled, true);
  assert.equal(updated.supplementaryNoticeId, 'REMIT-S5-02');
});

test('S5 Duplicate remittance notice ID is rejected with error', () => {
  const initial = createInitialS5Ledger();
  
  assert.throws(() => {
    addSupplementaryRemittance(
      initial,
      'REMIT-S5-01', // Duplicate of firstPaymentNoticeId
      200 * 100,
      true
    );
  }, /Duplicate remittance notice ID rejected/);
});
