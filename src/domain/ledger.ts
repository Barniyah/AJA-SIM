/**
 * S5 Reconciliation Ledger & Financial Domain Logic
 * All currency amounts are computed in integer Halalas (1 SAR = 100 Halalas)
 * Reference: AJA_SIM_TECH.md Section 11 (S5) & Section 13.1
 */

import { S5ReconciliationLedger } from '../types';

export function createInitialS5Ledger(): S5ReconciliationLedger {
  const totalInvoiceHalalas = 2000 * 100; // 200,000
  const contractualDiscountHalalas = 200 * 100; // 20,000
  const contractualAllowedHalalas = totalInvoiceHalalas - contractualDiscountHalalas; // 180,000
  const patientCopayHalalas = 200 * 100; // 20,000
  const netInsurerDueHalalas = contractualAllowedHalalas - patientCopayHalalas; // 160,000
  
  const firstPaymentHalalas = 1400 * 100; // 140,000
  const insuranceVarianceHalalas = netInsurerDueHalalas - firstPaymentHalalas; // 20,000 (200 SAR)

  return {
    claimId: 'CLM-S5-2000',
    totalInvoiceHalalas,
    contractualDiscountHalalas,
    contractualAllowedHalalas,
    patientCopayHalalas,
    netInsurerDueHalalas,
    firstPaymentNoticeId: 'REMIT-S5-01',
    firstPaymentHalalas,
    firstPaymentBankMatched: true,
    insuranceVarianceHalalas,
    isFullyReconciled: false,
  };
}

export function addSupplementaryRemittance(
  currentLedger: S5ReconciliationLedger,
  supplementaryNoticeId: string,
  supplementaryAmountHalalas: number,
  bankMatched: boolean
): S5ReconciliationLedger {
  // Prevent duplicate remittance ID
  if (supplementaryNoticeId === currentLedger.firstPaymentNoticeId) {
    throw new Error(`Duplicate remittance notice ID rejected: ${supplementaryNoticeId}`);
  }
  if (currentLedger.supplementaryNoticeId === supplementaryNoticeId) {
    throw new Error(`Supplementary remittance notice already processed: ${supplementaryNoticeId}`);
  }

  const remainingVariance = currentLedger.netInsurerDueHalalas - (currentLedger.firstPaymentHalalas + supplementaryAmountHalalas);
  const isFullyReconciled = remainingVariance === 0 && currentLedger.firstPaymentBankMatched && bankMatched;

  return {
    ...currentLedger,
    supplementaryNoticeId,
    supplementaryPaymentHalalas: supplementaryAmountHalalas,
    supplementaryBankMatched: bankMatched,
    insuranceVarianceHalalas: Math.max(0, remainingVariance),
    isFullyReconciled,
  };
}

export function halalasToSar(halalas: number): number {
  return halalas / 100;
}

export function formatSar(sar: number): string {
  return `${sar.toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ر.س`;
}
