export interface FiveWhysStep {
  level: number;
  question: string;
  statement: string;
  isRootCause: boolean;
  status: 'PROPOSED_HYPOTHESIS' | 'UNDER_TESTING' | 'VERIFIED_FINDING' | 'DISPROVEN_REJECTED';
  evidenceNotes?: string;
}

export interface FishboneBranch {
  category: 'MANPOWER' | 'MACHINE' | 'METHOD' | 'MATERIAL' | 'MEASUREMENT' | 'ENVIRONMENT';
  categoryLabel: string;
  causes: Array<{
    id: string;
    statement: string;
    status: 'PROPOSED_HYPOTHESIS' | 'VERIFIED_FINDING' | 'DISPROVEN_REJECTED';
    evidenceNotes?: string;
  }>;
}

export interface AiInvestigationAssistanceResult {
  investigationPlanSuggestion: string;
  suggestedTasks: Array<{ title: string; description: string; priority: string }>;
  suggestedHypotheses: Array<{
    method: 'FIVE_WHYS' | 'FISHBONE_6M';
    category?: string;
    statement: string;
    rationale: string;
    testingGuidance: string;
  }>;
  keyUnansweredQuestions: string[];
}

export class RootCauseAnalysisService {
  /**
   * Generates structured investigation assistance based on complaint domain.
   * Labeling is strictly ADVISORY/HYPOTHESIS.
   */
  static generateInvestigationGuidance(complaint: {
    productName: string;
    category: string;
    description: string;
    lotNumber?: string | null;
  }): AiInvestigationAssistanceResult {
    const text = complaint.description.toLowerCase();
    const isPumping = /pump|infusion|flow rate|bolus|delivery/i.test(text);
    const isSterility = /steril|seal|leak|torn|pouch|contamination/i.test(text);
    const isSoftware = /software|firmware|screen|error code|crash|freeze/i.test(text);

    let plan = `Conduct standard Root Cause Investigation for ${complaint.productName} regarding ${complaint.category}. Verify device/sample retention, inspect batch production records, evaluate incoming component quality, and perform controlled laboratory reproduction.`;

    const tasks = [
      {
        title: 'Retrieve and Quarantine Retain Samples / Device',
        description: `Secure returned physical unit or lot retain samples (Lot: ${complaint.lotNumber || 'Unknown'}) into quality quarantine cabinet.`,
        priority: 'HIGH',
      },
      {
        title: 'Review Device History Record (DHR) / Batch Production Records',
        description: 'Examine environmental controls, calibration logs, torque checks, and in-process test results during production.',
        priority: 'HIGH',
      },
      {
        title: 'Perform Dimensional & Functional Failure Testing',
        description: 'Execute approved engineering test protocol to reproduce the reported failure mode under controlled conditions.',
        priority: 'MEDIUM',
      },
      {
        title: 'Evaluate Supplier Certificate of Analysis (CoA) for Raw Components',
        description: 'Verify if incoming resin, motor, sensor, or sterile barrier film met vendor specifications.',
        priority: 'MEDIUM',
      },
    ];

    const hypotheses: AiInvestigationAssistanceResult['suggestedHypotheses'] = [];

    if (isSterility) {
      hypotheses.push({
        method: 'FISHBONE_6M',
        category: 'MACHINE',
        statement: 'Heat sealer temperature/pressure drift on Packaging Line 2 resulted in suboptimal tensile pouch bond.',
        rationale: 'Sterile seal failure reports often correlate with ultrasonic or thermal sealing tool micro-deviations.',
        testingGuidance: 'Perform dye penetration test (ASTM F1929) and seal peel strength analysis (ASTM F88).',
      });
      hypotheses.push({
        method: 'FISHBONE_6M',
        category: 'MATERIAL',
        statement: 'Tyvek/Polyethylene film thickness variation from raw material supplier Lot RM-449.',
        rationale: 'Variation in substrate density can lead to pinholes or channel leaks.',
        testingGuidance: 'Measure substrate caliper and burst test retains.',
      });
    } else if (isPumping || isSoftware) {
      hypotheses.push({
        method: 'FIVE_WHYS',
        statement: 'Level 1: Motor driver reported rotational slip under backpressure.',
        rationale: 'Occlusion sensor triggered alert intermittently.',
        testingGuidance: 'Run continuous fluid dynamics backpressure test up to 20 psi.',
      });
      hypotheses.push({
        method: 'FIVE_WHYS',
        statement: 'Level 2: Optical encoder wheel had micro-scratches causing missed pulse interrupts.',
        rationale: 'Missed pulse interrupts lead to MCU safety watchdog reset.',
        testingGuidance: 'Perform optical profilometry on returned encoder disc.',
      });
    } else {
      hypotheses.push({
        method: 'FISHBONE_6M',
        category: 'METHOD',
        statement: 'Assembly procedure SOP-302 step 4 lacks specific torque tolerance gauge for final fastener tightening.',
        rationale: 'Operator torque variation can induce mechanical binding during clinical vibration.',
        testingGuidance: 'Perform gauge R&R on assembly cell and check torque wrench calibrations.',
      });
    }

    const keyUnansweredQuestions = [
      'Was the complaint unit retained and available for physical return to the manufacturer?',
      'Did the event occur during patient pre-flight setup or while connected to the active patient line?',
      `Are there other complaints logged from Lot ${complaint.lotNumber || 'N/A'} within the past 90 days?`,
      'Was an error message or visual indicator displayed prior to the event?',
    ];

    return {
      investigationPlanSuggestion: plan,
      suggestedTasks: tasks,
      suggestedHypotheses: hypotheses,
      keyUnansweredQuestions,
    };
  }
}

