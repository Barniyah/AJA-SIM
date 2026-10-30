/**
 * Medplum MockClient Adapter
 * Uses genuine MockClient from @medplum/mock for in-memory FHIR resource storage
 * Reference: AJA_SIM_TECH.md Section 5
 */

import { MockClient } from '@medplum/mock';
import { Claim, ClaimResponse, DocumentReference, Patient, PaymentReconciliation, Task } from '@medplum/fhirtypes';
import { ScenarioFixture, TaskStandardStatus, LocalWorkflowStatus } from '../../types';

// Create a single MockClient instance for the browser session
export const medplum = new MockClient();

export interface MedplumRepositoryState {
  patient?: Patient;
  claim?: Claim;
  task?: Task;
  documents: DocumentReference[];
  claimResponse?: ClaimResponse;
  paymentReconciliation?: PaymentReconciliation;
}

/**
 * Initializes and saves a scenario fixture into the Medplum MockClient
 * "الكل يحفظ مع Task قبل قواعد الأعمال والتحليل"
 */
export async function seedScenarioInMedplum(
  fixture: ScenarioFixture,
  inputVersion = 1,
  overrideMemberId?: string
): Promise<MedplumRepositoryState> {
  const effectiveMemberId = overrideMemberId !== undefined ? overrideMemberId : fixture.patient.memberId;

  // 1. Save Patient (FHIR PUT create or update)
  const patientResource: Patient = {
    resourceType: 'Patient',
    id: fixture.patient.id,
    identifier: [
      {
        system: 'https://aja-sim.sa/fhir/sid/national-id',
        value: fixture.patient.nationalId,
      },
      ...(effectiveMemberId
        ? [
            {
              system: 'https://aja-sim.sa/fhir/sid/member-id',
              value: effectiveMemberId,
            },
          ]
        : []),
    ],
    name: [
      {
        use: 'official',
        text: fixture.patient.nameAr,
      },
    ],
    gender: fixture.patient.gender,
    birthDate: fixture.patient.birthDate,
  };
  const savedPatient = await medplum.updateResource<Patient>(patientResource);

  // 2. Save DocumentReferences for clinical notes
  const savedDocuments: DocumentReference[] = [];
  for (const doc of fixture.documents) {
    const docResource: DocumentReference = {
      resourceType: 'DocumentReference',
      id: doc.id,
      status: 'current',
      docStatus: 'final',
      type: {
        text: doc.titleAr,
      },
      subject: {
        reference: `Patient/${savedPatient.id}`,
        display: fixture.patient.nameAr,
      },
      date: new Date().toISOString(),
      author: [
        {
          display: doc.author,
        },
      ],
      description: doc.titleAr,
      content: [
        {
          attachment: {
            contentType: 'text/plain; charset=utf-8',
            title: doc.titleAr,
            data: btoa(unescape(encodeURIComponent(doc.text))), // Base64 representation in FHIR
          },
        },
      ],
    };
    const savedDoc = await medplum.updateResource<DocumentReference>(docResource);
    savedDocuments.push(savedDoc);
  }

  // 3. Save Claim
  const claimResource: Claim = {
    resourceType: 'Claim',
    id: `${fixture.claim.id}-v${inputVersion}`,
    status: 'active',
    type: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/claim-type',
          code: 'professional',
          display: 'Outpatient / Professional Clinic',
        },
      ],
    },
    use: 'claim',
    patient: {
      reference: `Patient/${savedPatient.id}`,
      display: fixture.patient.nameAr,
    },
    created: new Date().toISOString(),
    provider: {
      identifier: {
        system: 'https://aja-sim.sa/fhir/sid/org-id',
        value: 'ORG-HOSP-01',
      },
      display: 'مستشفى أجا التجريبي التخصصي',
    },
    priority: {
      coding: [
        {
          code: 'normal',
        },
      ],
    },
    total: {
      value: fixture.claim.billedAmount,
      currency: 'SAR',
    },
    diagnosis: [
      {
        sequence: 1,
        diagnosisCodeableConcept: {
          coding: [
            {
              system: 'https://aja-sim.sa/fhir/cs/demo-dx',
              code: fixture.claim.diagnosisCode,
              display: fixture.claim.diagnosisNameAr,
            },
          ],
        },
      },
    ],
    item: [
      {
        sequence: 1,
        productOrService: {
          coding: [
            {
              system: 'https://aja-sim.sa/fhir/cs/demo-svc',
              code: fixture.claim.serviceCode,
              display: fixture.claim.serviceNameAr,
            },
          ],
        },
        servicedDate: fixture.claim.serviceDate,
        net: {
          value: fixture.claim.billedAmount,
          currency: 'SAR',
        },
      },
    ],
    // Supporting info referencing document if attached
    supportingInfo:
      fixture.claim.hasAttachmentInSubmission && fixture.claim.attachmentDocId
        ? [
            {
              sequence: 1,
              category: {
                coding: [
                  {
                    code: 'attachment',
                    display: 'مستند داعم معتمد',
                  },
                ],
              },
              valueReference: {
                reference: `DocumentReference/${fixture.claim.attachmentDocId}`,
              },
            },
          ]
        : [],
  };
  const savedClaim = await medplum.updateResource<Claim>(claimResource);

  // 4. Save Task with standard status and Arabic businessStatus
  const taskResource: Task = {
    resourceType: 'Task',
    id: `TASK-${fixture.id}-v${inputVersion}`,
    status: 'requested', // standard FHIR status
    businessStatus: {
      text: 'مستلمة' as LocalWorkflowStatus,
    },
    intent: 'order',
    priority: 'routine',
    description: `متابعة دورة المطالبة ${fixture.claim.id} - ${fixture.nameAr}`,
    focus: {
      reference: `Claim/${savedClaim.id}`,
    },
    for: {
      reference: `Patient/${savedPatient.id}`,
      display: fixture.patient.nameAr,
    },
    authoredOn: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  };
  const savedTask = await medplum.updateResource<Task>(taskResource);

  return {
    patient: savedPatient,
    claim: savedClaim,
    task: savedTask,
    documents: savedDocuments,
  };
}

/**
 * Updates Task workflow status in Medplum MockClient
 */
export async function updateMedplumTaskStatus(
  taskId: string,
  standardStatus: TaskStandardStatus,
  businessStatusAr: LocalWorkflowStatus
): Promise<Task> {
  const existing = await medplum.readResource('Task', taskId);
  const updated: Task = {
    ...existing,
    status: standardStatus,
    businessStatus: {
      text: businessStatusAr,
    },
    lastModified: new Date().toISOString(),
  };
  return medplum.updateResource(updated);
}

/**
 * Saves mock ClaimResponse from Payer simulator
 */
export async function saveMedplumClaimResponse(
  claimId: string,
  patientId: string,
  outcome: 'complete' | 'error' | 'partial',
  dispositionAr: string,
  totalPaymentSar: number
): Promise<ClaimResponse> {
  const claimResponse: ClaimResponse = {
    resourceType: 'ClaimResponse',
    id: `RESP-${claimId}-${Date.now()}`,
    status: 'active',
    type: {
      coding: [
        {
          code: 'professional',
        },
      ],
    },
    use: 'claim',
    patient: {
      reference: `Patient/${patientId}`,
    },
    created: new Date().toISOString(),
    insurer: {
      display: 'شركة تأمين أجا التجريبية للرعاية الصحية',
    },
    request: {
      reference: `Claim/${claimId}`,
    },
    outcome: outcome,
    disposition: dispositionAr,
    payment: {
      type: {
        text: 'تحويل إلكتروني تجريبي',
      },
      amount: {
        value: totalPaymentSar,
        currency: 'SAR',
      },
      date: new Date().toISOString(),
    },
  };
  return medplum.createResource<ClaimResponse>(claimResponse);
}

/**
 * Saves mock PaymentReconciliation
 */
export async function saveMedplumPaymentReconciliation(
  claimId: string,
  amountSar: number,
  dispositionAr: string
): Promise<PaymentReconciliation> {
  const reconciliation: PaymentReconciliation = {
    resourceType: 'PaymentReconciliation',
    id: `REC-${claimId}-${Date.now()}`,
    status: 'active',
    period: {
      start: new Date().toISOString(),
      end: new Date().toISOString(),
    },
    created: new Date().toISOString(),
    paymentAmount: {
      value: amountSar,
      currency: 'SAR',
    },
    disposition: dispositionAr,
  };
  return medplum.createResource<PaymentReconciliation>(reconciliation);
}
