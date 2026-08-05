import { Priority } from '@prisma/client';

export interface RiskFactorEvaluation {
  id: string;
  name: string;
  triggered: boolean;
  severityWeight: number; // 1 to 10
  rationale: string;
  evidenceFound?: string;
}

export interface RiskAssessmentEvaluationResult {
  ruleVersion: number;
  factors: RiskFactorEvaluation[];
  suggestedPriority: Priority;
  suggestedCategory: string;
  totalScore: number;
  maxScore: number;
  confidence: number;
  rationale: string;
  missingInformation: string[];
  isSafetyCritical: boolean;
  isReportableSuspected: boolean; // Flagged for human review under FDA MDR / Vigilance
  escalationRequired: boolean;
  slaHours: number; // SLA deadline hours based on risk
}

export class RiskTriageEngine {
  static evaluateComplaint(data: {
    description: string;
    productName: string;
    category?: string;
    reportedImpact?: string | null;
    lotNumber?: string | null;
    serialNumber?: string | null;
    recurrenceCount?: number;
  }): RiskAssessmentEvaluationResult {
    const text = `${data.description} ${data.reportedImpact || ''} ${data.category || ''}`.toLowerCase();
    const factors: RiskFactorEvaluation[] = [];
    const missingInfo: string[] = [];

    // Factor 1: Fatality or permanent life-threatening injury
    const deathOrFatal = /death|fatal|deceased|expired|cardiac arrest|brain death/i.test(text);
    factors.push({
      id: 'RF-001',
      name: 'Fatal Outcome or Permanent Harm',
      triggered: deathOrFatal,
      severityWeight: 10,
      rationale: deathOrFatal
        ? 'Report mentions patient death or irreversible bodily harm.'
        : 'No indications of fatal outcome detected in narrative.',
      evidenceFound: deathOrFatal ? 'Detected keywords associated with fatal harm' : undefined,
    });

    // Factor 2: Acute injury, hospitalization, ICU admission
    const acuteInjury = /injury|hospitaliz|icu|intensive care|anaphylaxis|sepsis|emergency|unconscious|hemorrhage/i.test(text);
    factors.push({
      id: 'RF-002',
      name: 'Acute Severe Injury or Hospitalization',
      triggered: acuteInjury,
      severityWeight: 9,
      rationale: acuteInjury
        ? 'Report indicates clinical intervention, hospitalization, or serious injury.'
        : 'No acute hospitalization or severe injury mentioned.',
      evidenceFound: acuteInjury ? 'Detected clinical intervention or injury keywords' : undefined,
    });

    // Factor 3: Sterile barrier breach or microbial contamination
    const sterileBreach = /steril|seal breach|torn pouch|puncture|leak|contaminat|foreign matter|microb|particulate|mold|cloudy/i.test(text);
    factors.push({
      id: 'RF-003',
      name: 'Sterility Compromise or Particulate Contamination',
      triggered: sterileBreach,
      severityWeight: 8,
      rationale: sterileBreach
        ? 'Report identifies potential sterile package breach or foreign particulate contamination.'
        : 'No sterile barrier or particulate defect identified.',
      evidenceFound: sterileBreach ? 'Detected sterility/contamination terminology' : undefined,
    });

    // Factor 4: Device malfunction during active patient treatment (Infusion, ventilation, pacing)
    const deviceFailure = /stopped unexpectedly|overdose|infusion rate error|shut down|blank screen|freeze|false reading|alarm failure/i.test(text);
    factors.push({
      id: 'RF-004',
      name: 'Active Therapy Malfunction / Diagnostic Error',
      triggered: deviceFailure,
      severityWeight: 7,
      rationale: deviceFailure
        ? 'Device or diagnostic failed while in use or during critical delivery.'
        : 'No in-use delivery failure detected.',
      evidenceFound: deviceFailure ? 'Detected active operational malfunction keywords' : undefined,
    });

    // Factor 5: Batch or Lot recurrence signal
    const isRecurring = (data.recurrenceCount || 0) >= 2;
    factors.push({
      id: 'RF-005',
      name: 'Known Batch/Lot Recurrence Pattern',
      triggered: isRecurring,
      severityWeight: 6,
      rationale: isRecurring
        ? `Found ${data.recurrenceCount} previous complaints associated with this product/lot.`
        : 'No high-frequency recurrence detected for this lot/product.',
      evidenceFound: isRecurring ? `${data.recurrenceCount} existing cases found` : undefined,
    });

    // Factor 6: Missing safety critical information
    if (!data.lotNumber) {
      missingInfo.push('Lot/Batch number is unknown, impeding immediate batch quarantine review.');
    }
    if (!data.reportedImpact || data.reportedImpact.toLowerCase().includes('unspecified')) {
      missingInfo.push('Clinical impact on the patient is unconfirmed in initial narrative.');
    }

    // Calculate score
    const triggeredWeights = factors
      .filter((f) => f.triggered)
      .map((f) => f.severityWeight);
    const totalScore = triggeredWeights.reduce((a, b) => a + b, 0);
    const maxScore = factors.reduce((a, b) => a + b.severityWeight, 0);

    let suggestedPriority: Priority = Priority.LOW;
    let slaHours = 72; // default 3 days
    let isSafetyCritical = false;
    let isReportableSuspected = false;
    let escalationRequired = false;

    if (deathOrFatal || totalScore >= 18) {
      suggestedPriority = Priority.CRITICAL;
      isSafetyCritical = true;
      isReportableSuspected = true;
      escalationRequired = true;
      slaHours = 24; // Immediate 24h review required under 21 CFR 803 / MDR
    } else if (acuteInjury || sterileBreach || totalScore >= 12) {
      suggestedPriority = Priority.HIGH;
      isSafetyCritical = true;
      escalationRequired = true;
      slaHours = 48;
    } else if (deviceFailure || isRecurring || totalScore >= 6) {
      suggestedPriority = Priority.MEDIUM;
      slaHours = 72;
    } else {
      suggestedPriority = Priority.LOW;
      slaHours = 120;
    }

    // Missing info rule: if missing lot and injury occurred, keep priority at least HIGH
    if (acuteInjury && !data.lotNumber) {
      suggestedPriority = Priority.CRITICAL;
      escalationRequired = true;
    }

    const confidence = missingInfo.length > 0 ? 0.75 : 0.95;

    const rationale = `Evaluated 5 regulatory risk factors. Triggered ${
      triggeredWeights.length
    } factors (Score: ${totalScore}/${maxScore}). ${
      isSafetyCritical
        ? 'CRITICAL SAFETY RISK: Immediate review required. Potential regulatory reportability.'
        : 'Quality defect under routine review threshold.'
    } ${missingInfo.length > 0 ? `Uncertainties identified: ${missingInfo.join(' ')}` : ''}`;

    return {
      ruleVersion: 1,
      factors,
      suggestedPriority,
      suggestedCategory: data.category || 'Product Defect',
      totalScore,
      maxScore,
      confidence,
      rationale,
      missingInformation: missingInfo,
      isSafetyCritical,
      isReportableSuspected,
      escalationRequired,
      slaHours,
    };
  }
}

