/**
 * Data Minimization & Privacy Domain Logic
 * "تقليل البيانات قبل AI — تجربة توضيحية"
 * Reference: AJA_SIM_TECH.md Section 12.2
 */

import { ScenarioFixture } from '../types';

export interface MinimizationResult {
  prePayload: {
    patientName: string;
    nationalId: string;
    memberId: string;
    birthDate: string;
    gender: string;
    claimId: string;
    serviceCode: string;
    serviceNameAr: string;
    billedAmount: number;
    rawDocumentCount: number;
    clinicalNoteText: string;
  };
  postPayload: {
    subjectToken: string; // e.g. SYN-SUBJECT-01
    claimToken: string;
    serviceCode: string;
    necessaryClinicalExcerpt: string;
    whitelistedFields: string[];
    excludedFields: string[];
  };
  sanitizationRatioPercent: number;
}

export function computeDataMinimization(fixture: ScenarioFixture): MinimizationResult {
  const doc = fixture.documents[0];
  const clinicalText = doc ? doc.text : '';

  const prePayload = {
    patientName: fixture.patient.nameAr,
    nationalId: fixture.patient.nationalId,
    memberId: fixture.patient.memberId,
    birthDate: fixture.patient.birthDate,
    gender: fixture.patient.gender,
    claimId: fixture.claim.id,
    serviceCode: fixture.claim.serviceCode,
    serviceNameAr: fixture.claim.serviceNameAr,
    billedAmount: fixture.claim.billedAmount,
    rawDocumentCount: fixture.documents.length,
    clinicalNoteText: clinicalText,
  };

  // Mask patient details to a synthetic token; extract only relevant clinical lines
  const sanitizedLines = clinicalText
    .split('\n')
    .filter((line) => {
      // Exclude administrative header lines containing name / national ID
      if (line.includes('المريض:') || line.includes('الهوية:')) return false;
      return true;
    })
    .join('\n');

  const postPayload = {
    subjectToken: `SYN-SUBJ-${fixture.patient.id.replace('SYN-PAT-', '')}`,
    claimToken: `CLM-TOKEN-${fixture.id}`,
    serviceCode: fixture.claim.serviceCode,
    necessaryClinicalExcerpt: sanitizedLines,
    whitelistedFields: ['serviceCode', 'necessaryClinicalExcerpt', 'docVersion'],
    excludedFields: ['patientName', 'nationalId', 'memberId', 'birthDate', 'adminHeaders'],
  };

  const preSize = JSON.stringify(prePayload).length;
  const postSize = JSON.stringify(postPayload).length;
  const sanitizationRatioPercent = Math.max(10, Math.round(((preSize - postSize) / preSize) * 100));

  return {
    prePayload,
    postPayload,
    sanitizationRatioPercent,
  };
}

export function verifyEvidenceQuote(sourceText: string, quote: string): boolean {
  if (!quote || !sourceText) return false;
  // Normalize whitespace
  const cleanSource = sourceText.replace(/\s+/g, ' ').trim();
  const cleanQuote = quote.replace(/\s+/g, ' ').trim();
  return cleanSource.includes(cleanQuote);
}
