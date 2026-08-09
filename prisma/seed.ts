import { PrismaClient, Role, SourceType, ComplaintStatus, Priority, ExtractionReviewStatus, RelationshipType, RelationshipReviewStatus, InvestigationStatus, TaskStatus, HypothesisStatus, CapaStatus, ApprovalDecision } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hash(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

async function main() {
  console.log('🌱 Starting comprehensive database seed for Sortwise Quality Platform...');

  // Clean existing records in correct foreign key order
  await prisma.approvalRecord.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.aiAnalysisRun.deleteMany();
  await prisma.regulatoryApplicability.deleteMany();
  await prisma.capaEvidence.deleteMany();
  await prisma.capaComplaintLink.deleteMany();
  await prisma.capa.deleteMany();
  await prisma.rootCauseHypothesis.deleteMany();
  await prisma.investigationEvidence.deleteMany();
  await prisma.investigationTask.deleteMany();
  await prisma.investigation.deleteMany();
  await prisma.complaintRelationship.deleteMany();
  await prisma.riskAssessment.deleteMany();
  await prisma.complaintExtraction.deleteMany();
  await prisma.complaintAttachment.deleteMany();
  await prisma.complaintSource.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.organizationMembership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Apex Biomedical Quality Systems',
      slug: 'apex-biomedical',
      industry: 'Medical Devices & Combination Products',
      settings: {
        enforceMdrEscalation: true,
        requireElectronicSignatures: true,
        slaHoursByPriority: {
          CRITICAL: 24,
          HIGH: 48,
          MEDIUM: 72,
          LOW: 120,
        },
      },
    },
  });

  // 2. Create Users with Distinct Roles
  const passwordHash = await bcrypt.hash('QualityPassword2026!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@apexquality.com',
      fullName: 'Dr. Arthur Vance, VP Quality & Compliance',
      title: 'VP of Quality Assurance',
      department: 'Executive Quality Office',
      passwordHash,
      memberships: {
        create: {
          organizationId: org.id,
          role: Role.ADMINISTRATOR,
        },
      },
    },
  });

  const reviewer = await prisma.user.create({
    data: {
      email: 'reviewer@apexquality.com',
      fullName: 'Sarah Chen, RAC',
      title: 'Senior Complaint Triage Specialist',
      department: 'Post-Market Surveillance',
      passwordHash,
      memberships: {
        create: {
          organizationId: org.id,
          role: Role.COMPLAINT_REVIEWER,
        },
      },
    },
  });

  const investigator = await prisma.user.create({
    data: {
      email: 'investigator@apexquality.com',
      fullName: 'Marcus Brody, PE',
      title: 'Principal Biomedical Failure Analyst',
      department: 'Root Cause Engineering',
      passwordHash,
      memberships: {
        create: {
          organizationId: org.id,
          role: Role.INVESTIGATOR,
        },
      },
    },
  });

  const approver = await prisma.user.create({
    data: {
      email: 'approver@apexquality.com',
      fullName: 'Elena Rostova, MD',
      title: 'Head of Quality Management & Medical Safety',
      department: 'Quality Assurance & Regulatory',
      passwordHash,
      memberships: {
        create: {
          organizationId: org.id,
          role: Role.QUALITY_APPROVER,
        },
      },
    },
  });

  const auditor = await prisma.user.create({
    data: {
      email: 'auditor@apexquality.com',
      fullName: 'Thomas Sterling, Lead Auditor',
      title: 'External Quality & Compliance Auditor',
      department: 'Global Regulatory Audit Services',
      passwordHash,
      memberships: {
        create: {
          organizationId: org.id,
          role: Role.READONLY_AUDITOR,
        },
      },
    },
  });

  console.log('✓ Users and memberships created');

  // 3. Regulatory Applicability Register
  await prisma.regulatoryApplicability.createMany({
    data: [
      {
        organizationId: org.id,
        standardName: 'FDA QMSR 21 CFR 820',
        industryScope: 'Medical Device Quality System Regulation (ISO 13485 Harmonization)',
        officialReference: 'FDA QMSR Final Rule (Effective Feb 2, 2026) - 89 FR 7496',
        status: 'ACTIVE',
        applicableClauses: [
          '820.10: General requirements',
          '820.35: Control of records & complaint files',
          '820.198: Complaint handling procedures and mandatory investigations',
          '820.100: Corrective and preventive actions (CAPA)',
        ],
        complianceOwner: 'Dr. Arthur Vance',
      },
      {
        organizationId: org.id,
        standardName: 'US FDA 21 CFR 211.198',
        industryScope: 'Finished Pharmaceuticals - Complaint Files',
        officialReference: '21 CFR § 211.198 (Complaint files, investigation procedures, record retention)',
        status: 'ACTIVE',
        applicableClauses: [
          'Written procedures describing the handling of all written and oral complaints',
          'Review by the quality control unit of any complaint involving product failure',
          'Written record of investigation including findings and follow-up',
          'Documentation when an investigation is determined not to be necessary',
        ],
        complianceOwner: 'Elena Rostova, MD',
      },
      {
        organizationId: org.id,
        standardName: 'ISO 13485:2016',
        industryScope: 'Medical Devices - Quality Management Systems - Requirements for Regulatory Purposes',
        officialReference: 'ISO 13485:2016 Clause 8.2.2 (Complaint handling) & Clause 8.5.2 (Corrective action)',
        status: 'ACTIVE',
        applicableClauses: [
          'Clause 8.2.2: Timely complaint handling and investigation records',
          'Clause 8.2.3: Reporting to regulatory authorities',
          'Clause 8.5.2: Investigation of root cause and action implementation',
          'Clause 8.5.3: Preventive action verification',
        ],
        complianceOwner: 'Sarah Chen, RAC',
      },
    ],
  });

  // 4. Create Complaints across lifecycle

  // Case 1: AccuRate Plus Infusion Pump 3000 (Safety Critical, Under Investigation, Has CAPA)
  const desc1 = `During clinical administration of IV fentanyl in the Post-Anesthesia Care Unit (PACU), AccuRate Plus Infusion Pump 3000 (Serial: SN-90412, Lot: LOT-2026A) abruptly ceased delivery with an unrecoverable 'Hardware Exception 0x44B' without sounding the primary occlusion audible alarm. The nurse discovered the pump frozen during vitals check after 25 minutes of halted analgesic delivery. Patient reported breakthrough pain requiring immediate manual syringe push. Device retained by hospital biomedical engineering. Complainant: Dr. Rachel Gomez, Chief Nurse Anesthetist (rgomez@stjudemedical.org).`;
  const cmp1 = await prisma.complaint.create({
    data: {
      complaintNumber: 'CMP-2026-0001',
      organizationId: org.id,
      sourceType: SourceType.EMAIL,
      externalReference: 'HOSP-PACU-9921',
      receivedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      occurredAt: new Date(Date.now() - 6 * 24 * 3600 * 1000),
      complainantName: 'Dr. Rachel Gomez',
      complainantContact: 'rgomez@stjudemedical.org',
      complainantType: 'HEALTHCARE_PROVIDER',
      productName: 'AccuRate Plus Infusion Pump 3000',
      productCode: 'REF-IP3000',
      lotNumber: 'LOT-2026A',
      serialNumber: 'SN-90412',
      originalDescription: desc1,
      normalizedDescription: 'AccuRate Plus Infusion Pump 3000 experienced unrecoverable error 0x44B and alarm silence during analgesic infusion in PACU. Patient experienced breakthrough pain.',
      category: 'Software / Firmware Malfunction',
      reportedImpact: 'Patient Injury / Adverse Reaction',
      status: ComplaintStatus.UNDER_INVESTIGATION,
      priority: Priority.CRITICAL,
      isSafetyCritical: true,
      isReportable: true,
      assignedToId: investigator.id,
      dueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000),
    },
  });

  await prisma.complaintSource.create({
    data: {
      complaintId: cmp1.id,
      sourceSystem: 'clinical_email_intake',
      externalId: 'EMAIL-MSG-448102',
      contentHash: hash(desc1),
      rawPayload: desc1,
    },
  });

  await prisma.complaintExtraction.create({
    data: {
      complaintId: cmp1.id,
      schemaVersion: 'v1.0',
      extractionMethod: 'AI_ASSISTED',
      extractedFields: {
        product: 'AccuRate Plus Infusion Pump 3000',
        productCode: 'REF-IP3000',
        lot: 'LOT-2026A',
        serialNumber: 'SN-90412',
        failureMode: 'Hardware Exception 0x44B and silent alarm failure',
        harmReported: 'Breakthrough acute pain requiring clinical intervention',
      },
      confidence: 0.94,
      reviewStatus: ExtractionReviewStatus.ACCEPTED,
      reviewedById: reviewer.id,
      reviewedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
    },
  });

  await prisma.riskAssessment.create({
    data: {
      complaintId: cmp1.id,
      assessmentVersion: 1,
      appliedRules: ['RF-002: Acute Clinical Harm', 'RF-004: In-Service Delivery Failure'],
      factorsConsidered: {
        patientHarm: 'High (Pain breakthrough, delayed analgesic therapy in PACU)',
        deviceCriticality: 'Critical (Class IIb Infusion system)',
        recurrencePotential: 'Moderate',
      },
      suggestedPriority: Priority.CRITICAL,
      suggestedCategory: 'Software / Firmware Malfunction',
      confidence: 0.95,
      rationale: 'In-service failure during narcotic delivery with alarm silence meets FDA 21 CFR 803 MDR 30-day reporting criteria and QMSR mandatory root-cause investigation.',
      finalPriority: Priority.CRITICAL,
      reviewedById: approver.id,
      reviewedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
    },
  });

  // Investigation for CMP-2026-0001
  const inv1 = await prisma.investigation.create({
    data: {
      investigationNumber: 'INV-2026-0001',
      organizationId: org.id,
      complaintId: cmp1.id,
      leadInvestigatorId: investigator.id,
      status: InvestigationStatus.IN_PROGRESS,
      scope: 'Hardware board revision Rev-D watchdog timer and piezo buzzer circuit on AccuRate 3000 Lot 2026A',
      issueStatement: 'Pump froze unexpectedly with exception 0x44B and buzzer failed to sound emergency backup alarm.',
      investigationPlan: '1. Secure returned unit SN-90412. 2. Flash EEPROM memory dump. 3. Bench test optical encoder under simulated high backpressure.',
      summaryOfFindings: 'EEPROM crash log confirmed watchdog timer reset loop caused by race condition in firmware v3.2.1 when polling rotary encoder during simultaneous LCD backlight refresh.',
      rootCauseMethod: 'FIVE_WHYS',
      rootCauseConclusion: 'Firmware interrupt priority inversion between encoder ISR and display thread, aggravated by piezo solder joint crack.',
      isRootCauseIdentified: true,
      capaRequired: true,
      capaJustification: 'Firmware architecture bug affects all units running v3.2.1; requires systemic firmware patch and recall review.',
    },
  });

  // 5 Whys Hypotheses for INV-2026-0001
  await prisma.rootCauseHypothesis.createMany({
    data: [
      {
        investigationId: inv1.id,
        method: 'FIVE_WHYS',
        stepLevel: 1,
        statement: 'Why did the pump stop delivering? The microcontroller suffered an unhandled watchdog reset loop.',
        status: HypothesisStatus.VERIFIED_FINDING,
        supportingEvidence: 'Crash dump log at memory offset 0x004F3B indicates watchdog timer expired.',
        verifiedById: investigator.id,
        verifiedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      },
      {
        investigationId: inv1.id,
        method: 'FIVE_WHYS',
        stepLevel: 2,
        statement: 'Why did the watchdog timer expire? The main execution loop was locked in a spinning mutex.',
        status: HypothesisStatus.VERIFIED_FINDING,
        supportingEvidence: 'Disassembly analysis of firmware build 3.2.1.',
        verifiedById: investigator.id,
        verifiedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      },
      {
        investigationId: inv1.id,
        method: 'FIVE_WHYS',
        stepLevel: 3,
        statement: 'Why was the mutex locked? Rotary optical encoder ISR interrupted the LCD SPI transfer while holding resource lock.',
        status: HypothesisStatus.VERIFIED_FINDING,
        supportingEvidence: 'Logic analyzer capture reproduces lockup when encoder is rapidly rotated.',
        verifiedById: investigator.id,
        verifiedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      },
      {
        investigationId: inv1.id,
        method: 'FIVE_WHYS',
        stepLevel: 4,
        statement: 'Why was priority inversion possible? Priority inheritance protocol was disabled in FreeRTOS kernel configuration.',
        status: HypothesisStatus.VERIFIED_FINDING,
        supportingEvidence: 'FreeRTOSConfig.h configUSE_MUTEXES was set to 1 but configUSE_RECURSIVE_MUTEXES was 0.',
        verifiedById: investigator.id,
        verifiedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      },
      {
        investigationId: inv1.id,
        method: 'FIVE_WHYS',
        stepLevel: 5,
        statement: 'ROOT CAUSE: Software architectural design defect: missing mutex timeout guard and untested task preemption during fast rotary inputs.',
        status: HypothesisStatus.VERIFIED_FINDING,
        supportingEvidence: 'Static code analysis confirmed vulnerability across all firmware releases 3.2.0 - 3.2.1.',
        verifiedById: investigator.id,
        verifiedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      },
    ],
  });

  // Investigation Tasks
  await prisma.investigationTask.createMany({
    data: [
      {
        investigationId: inv1.id,
        title: 'Extract and analyze non-volatile EEPROM crash dump',
        assignedToId: investigator.id,
        status: TaskStatus.COMPLETED,
        findingsNotes: 'Extracted 16KB error log showing error 0x44B.',
        completedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      },
      {
        investigationId: inv1.id,
        title: 'Perform Hardware Environmental Stress Screening on Piezo Buzzer',
        assignedToId: investigator.id,
        status: TaskStatus.IN_PROGRESS,
        dueDate: new Date(Date.now() + 1 * 24 * 3600 * 1000),
      },
    ],
  });

  // CAPA for CMP-2026-0001
  const capa1 = await prisma.capa.create({
    data: {
      capaNumber: 'CAPA-2026-0001',
      organizationId: org.id,
      title: 'Remediation of Firmware Mutex Priority Inversion and Piezo Alarm Solder Inspection',
      problemStatement: 'AccuRate 3000 infusion systems running v3.2.1 can experience unresponsive watchdog resets with silent alarm during concurrent high-frequency dial inputs.',
      identifiedRootCause: 'FreeRTOS priority inversion without timeout safeguard in rotary encoder handler.',
      correctiveActionPlan: '1. Develop and validate Firmware Release v3.2.2 with priority inheritance and 50ms mutex timeout. 2. Quarantine factory stock of 1,200 units.',
      preventiveActionPlan: '1. Update automated static analysis rule in CI/CD pipeline to flag un-timeouted mutex acquisitions. 2. Implement automated 72-hour automated robotic knob cycling regression tests.',
      leadOwnerId: investigator.id,
      targetCompletionDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      status: CapaStatus.IN_PROGRESS,
      priority: Priority.CRITICAL,
      effectivenessCriteria: 'Zero watchdog reset events recorded across 5,000 hours of accelerated multi-threaded bench testing, and 100% successful alarm annunciations.',
      effectivenessReviewDate: new Date(Date.now() + 60 * 24 * 3600 * 1000),
    },
  });

  await prisma.capaComplaintLink.create({
    data: {
      capaId: capa1.id,
      complaintId: cmp1.id,
      investigationId: inv1.id,
      linkedById: investigator.id,
    },
  });

  // Case 2: OptiFlow FX Hemodialyzer (Packaging & Sterile Barrier Defect)
  const desc2 = `Dialysis Clinic reported micro-puncture in sterile chevron pouch seal for OptiFlow FX Hemodialyzer (Ref: OPT-FX-80, Lot: LOT-8829). Staff detected loose paper backing prior to patient cannulation. No patient exposure occurred. Retained defective pouch. Complainant: David Miller, Biomedical Tech (dmiller@nephrocare.com).`;
  const cmp2 = await prisma.complaint.create({
    data: {
      complaintNumber: 'CMP-2026-0002',
      organizationId: org.id,
      sourceType: SourceType.MANUAL,
      externalReference: 'RMA-NEPHRO-401',
      receivedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      occurredAt: new Date(Date.now() - 11 * 24 * 3600 * 1000),
      complainantName: 'David Miller',
      complainantContact: 'dmiller@nephrocare.com',
      complainantType: 'HEALTHCARE_PROVIDER',
      productName: 'OptiFlow FX Hemodialyzer',
      productCode: 'OPT-FX-80',
      lotNumber: 'LOT-8829',
      originalDescription: desc2,
      normalizedDescription: 'OptiFlow FX Hemodialyzer pouch seal breach detected during pre-use setup. No patient harm reported.',
      category: 'Packaging & Sterile Barrier Defect',
      reportedImpact: 'No Patient Harm / Pre-Use Defect',
      status: ComplaintStatus.CAPA_IN_PROGRESS,
      priority: Priority.HIGH,
      isSafetyCritical: true,
      assignedToId: investigator.id,
      dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
    },
  });

  await prisma.complaintSource.create({
    data: {
      complaintId: cmp2.id,
      sourceSystem: 'qa_portal',
      contentHash: hash(desc2),
      rawPayload: desc2,
    },
  });

  await prisma.riskAssessment.create({
    data: {
      complaintId: cmp2.id,
      assessmentVersion: 1,
      appliedRules: ['RF-003: Sterile Barrier Compromise'],
      factorsConsidered: {
        barrierIntegrity: 'Compromised seal channel',
        exposure: 'Intercepted before patient use',
      },
      suggestedPriority: Priority.HIGH,
      rationale: 'Loss of sterile barrier is high risk under ISO 11607-1. Requires investigation of sealing line parameters.',
      finalPriority: Priority.HIGH,
      reviewedById: approver.id,
      reviewedAt: new Date(Date.now() - 9 * 24 * 3600 * 1000),
    },
  });

  // Investigation for CMP-2026-0002 with Fishbone
  const inv2 = await prisma.investigation.create({
    data: {
      investigationNumber: 'INV-2026-0002',
      organizationId: org.id,
      complaintId: cmp2.id,
      leadInvestigatorId: investigator.id,
      status: InvestigationStatus.COMPLETED,
      scope: 'Sealer Line 4 thermal calibration and Tyvek batch film Lot TF-991',
      issueStatement: 'Pouch chevron seal channel leakage observed in Lot LOT-8829.',
      investigationPlan: 'Dye penetration testing per ASTM F1929 and thermocouple calibration checks.',
      summaryOfFindings: 'Dye penetration confirmed channel leak on upper left chevron. Calibrated thermocouple probe on Sealer 4 showed 8°C cold spot caused by loose heating element cartridge.',
      rootCauseMethod: 'FISHBONE_6M',
      rootCauseConclusion: 'Packaging machine sealing bar heating cartridge mechanical looseness caused localized cold spot below minimum seal activation temperature.',
      isRootCauseIdentified: true,
      capaRequired: true,
      completedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      approvedById: approver.id,
      approvedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    },
  });

  // Fishbone Hypotheses for INV-2026-0002
  await prisma.rootCauseHypothesis.createMany({
    data: [
      {
        investigationId: inv2.id,
        method: 'FISHBONE_6M',
        category: 'MACHINE',
        statement: 'Sealer 4 heating cartridge loose in aluminum fixture causing uneven temperature distribution.',
        status: HypothesisStatus.VERIFIED_FINDING,
        supportingEvidence: 'Thermal imaging camera revealed cold zone (132°C vs nominal 145°C) at chevron vertex.',
        verifiedById: investigator.id,
        verifiedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      },
      {
        investigationId: inv2.id,
        method: 'FISHBONE_6M',
        category: 'MATERIAL',
        statement: 'Tyvek substrate pinholes or uneven adhesive coating weight.',
        status: HypothesisStatus.DISPROVEN_REJECTED,
        supportingEvidence: 'Vendor CoA for Lot TF-991 confirmed adhesive coat weight of 18.5 gsm, within specification.',
        verifiedById: investigator.id,
        verifiedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      },
      {
        investigationId: inv2.id,
        method: 'FISHBONE_6M',
        category: 'METHOD',
        statement: 'Daily pre-shift heat seal peel test was skipped or improperly logged by line operator.',
        status: HypothesisStatus.DISPROVEN_REJECTED,
        supportingEvidence: 'Shift DHR logs show passing peel strength of 2.1 N/15mm at start of shift.',
        verifiedById: investigator.id,
        verifiedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      },
    ],
  });

  // CAPA for CMP-2026-0002
  const capa2 = await prisma.capa.create({
    data: {
      capaNumber: 'CAPA-2026-0002',
      organizationId: org.id,
      title: 'Packaging Line 4 Thermal Bar Redesign and Daily Multi-Point Thermocouple Verification',
      problemStatement: 'Thermal bar temperature gradient resulted in intermittent chevron seal leaks.',
      identifiedRootCause: 'Heating cartridge set-screw backed out due to machine vibration during extended runs.',
      correctiveActionPlan: 'Replaced set-screw with high-temperature Nord-Lock vibration-resistant lock washers. Implemented daily 5-point surface thermocouple verification before line start.',
      preventiveActionPlan: 'Standardize vibration-resistant fastening on Packaging Lines 1 through 5.',
      leadOwnerId: investigator.id,
      status: CapaStatus.IMPLEMENTED,
      priority: Priority.HIGH,
      implementationEvidenceSummary: 'Nord-Lock washers installed on lines 1-5; Work Instruction WI-PACK-012 updated and 14 packaging technicians trained.',
      effectivenessCriteria: 'Zero seal failures in dye penetration audit of 30 pouches per lot across 10 consecutive lots.',
      effectivenessReviewDate: new Date(Date.now() + 45 * 24 * 3600 * 1000),
    },
  });

  await prisma.capaComplaintLink.create({
    data: {
      capaId: capa2.id,
      complaintId: cmp2.id,
      investigationId: inv2.id,
      linkedById: investigator.id,
    },
  });

  await prisma.capaEvidence.create({
    data: {
      capaId: capa2.id,
      phase: 'IMPLEMENTATION',
      title: 'Maintenance Work Order WO-8819 Verification Sheet',
      description: 'Photos and torque verification of Nord-Lock washers installed on Sealer 4 heating bar.',
      fileHash: hash('WO-8819-EVIDENCE-BLOB'),
      submittedById: investigator.id,
    },
  });

  // Case 3: Sterile Cefazolin Injection (Particulate Contamination - Awaiting Verification)
  const desc3 = `Hospital Pharmacy IV cleanroom technician noticed white translucent floating flakes during reconstitution of Sterile Cefazolin Sodium Injection (1g Vial, Lot: BATCH-CEF-774, Ref: CEFA-1G). Vial rejected before dispensing. Retained 3 unopened vials from same carton. Complainant: Linda Wu, PharmD (pharmacy@memorialhealth.org).`;
  const cmp3 = await prisma.complaint.create({
    data: {
      complaintNumber: 'CMP-2026-0003',
      organizationId: org.id,
      sourceType: SourceType.MANUAL,
      externalReference: 'PHARM-2026-103',
      receivedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000),
      complainantName: 'Linda Wu, PharmD',
      complainantContact: 'pharmacy@memorialhealth.org',
      complainantType: 'HEALTHCARE_PROVIDER',
      productName: 'Sterile Cefazolin Sodium Injection (1g Vial)',
      productCode: 'CEFA-1G',
      lotNumber: 'BATCH-CEF-774',
      originalDescription: desc3,
      normalizedDescription: 'Particulate matter in reconstituted Cefazolin 1g vial. Intercepted by pharmacist.',
      category: 'Particulate & Chemical Contamination',
      reportedImpact: 'No Patient Harm / Pre-Use Defect',
      status: ComplaintStatus.AWAITING_VERIFICATION,
      priority: Priority.HIGH,
      isSafetyCritical: true,
      assignedToId: reviewer.id,
    },
  });

  await prisma.complaintSource.create({
    data: {
      complaintId: cmp3.id,
      sourceSystem: 'pharmacy_portal',
      contentHash: hash(desc3),
      rawPayload: desc3,
    },
  });

  // Case 4 & Case 5: Needle Shield Stiff & Lock Failure (Duplicates / Related cases)
  const desc4 = `Home care nurse reported that UltraSafe Safety Shield Syringe (3ml, Lot: SYR-5501, Ref: USS-3ML) needle shield mechanism required excessive force to lock, causing near-miss needle stick. Complainant: Karen White, RN.`;
  const cmp4 = await prisma.complaint.create({
    data: {
      complaintNumber: 'CMP-2026-0004',
      organizationId: org.id,
      sourceType: SourceType.MANUAL,
      externalReference: 'HCN-RN-221',
      receivedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      complainantName: 'Karen White, RN',
      complainantType: 'HEALTHCARE_PROVIDER',
      productName: 'UltraSafe Safety Shield Syringe (3ml)',
      productCode: 'USS-3ML',
      lotNumber: 'SYR-5501',
      originalDescription: desc4,
      normalizedDescription: 'Needle safety shield required excessive force to engage.',
      category: 'Product Defect',
      reportedImpact: 'Treatment Delay (Clinically Significant)',
      status: ComplaintStatus.TRIAGE_REVIEW,
      priority: Priority.MEDIUM,
      assignedToId: reviewer.id,
    },
  });

  await prisma.complaintSource.create({
    data: {
      complaintId: cmp4.id,
      sourceSystem: 'web_portal',
      contentHash: hash(desc4),
      rawPayload: desc4,
    },
  });

  const desc5 = `UltraSafe Safety Shield Syringe (3ml, Lot: SYR-5501, Ref: USS-3ML) safety latch failed to engage post intramuscular injection. Nurse had to dispose in sharps container without active lock. Same batch SYR-5501. Complainant: Mark Davis, Clinic Manager.`;
  const cmp5 = await prisma.complaint.create({
    data: {
      complaintNumber: 'CMP-2026-0005',
      organizationId: org.id,
      sourceType: SourceType.EMAIL,
      externalReference: 'CLINIC-IR-882',
      receivedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      complainantName: 'Mark Davis',
      complainantType: 'HEALTHCARE_PROVIDER',
      productName: 'UltraSafe Safety Shield Syringe (3ml)',
      productCode: 'USS-3ML',
      lotNumber: 'SYR-5501',
      originalDescription: desc5,
      normalizedDescription: 'Safety latch failed to lock on 3ml syringe batch SYR-5501.',
      category: 'Product Defect',
      reportedImpact: 'No Patient Harm / Pre-Use Defect',
      status: ComplaintStatus.TRIAGE_REVIEW,
      priority: Priority.MEDIUM,
      assignedToId: reviewer.id,
    },
  });

  await prisma.complaintSource.create({
    data: {
      complaintId: cmp5.id,
      sourceSystem: 'email_service',
      contentHash: hash(desc5),
      rawPayload: desc5,
    },
  });

  // Complaint Relationship between CMP-2026-0004 and CMP-2026-0005
  await prisma.complaintRelationship.create({
    data: {
      sourceComplaintId: cmp4.id,
      targetComplaintId: cmp5.id,
      relationshipType: RelationshipType.RELATED_COMPLAINT,
      similarityScore: 0.88,
      matchingCriteria: {
        sharedLot: 'SYR-5501',
        sharedProduct: 'UltraSafe Safety Shield Syringe (3ml)',
        sameComponent: 'Safety shield latching mechanism',
      },
      rationale: 'Both complaints describe safety shield actuation/locking failure on the exact same manufacturing batch SYR-5501.',
      reviewStatus: RelationshipReviewStatus.PROPOSED_BY_SYSTEM,
    },
  });

  // Case 6: AirPulse Ventilator (Closed with formal electronic approval & rationale)
  const desc6 = `AirPulse V-400 Critical Care Ventilator (Serial: VENT-400-088, Lot: VENT-LOT-9) displayed exhalation valve calibration warning during routine pre-use test. Unit did not pass automatic leak test. Filter was replaced with new bacterial filter and passed all diagnostic checks. No patient affected. Complainant: BioMed Dept, St. Luke's.`;
  const cmp6 = await prisma.complaint.create({
    data: {
      complaintNumber: 'CMP-2026-0006',
      organizationId: org.id,
      sourceType: SourceType.MANUAL,
      externalReference: 'BMED-STLUKE-771',
      receivedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000),
      complainantName: 'BioMed Dept, St. Luke’s',
      complainantType: 'HEALTHCARE_PROVIDER',
      productName: 'AirPulse V-400 Critical Care Ventilator',
      productCode: 'AP-V400',
      serialNumber: 'VENT-400-088',
      lotNumber: 'VENT-LOT-9',
      originalDescription: desc6,
      normalizedDescription: 'Pre-use calibration warning resolved by routine consumer filter replacement per user manual.',
      category: 'Product Defect',
      reportedImpact: 'No Patient Harm / Pre-Use Defect',
      status: ComplaintStatus.CLOSED,
      priority: Priority.LOW,
      assignedToId: reviewer.id,
      closureRationale: 'Investigation determined non-product defect. Issue caused by routine expiration of consumable expiratory bacterial filter. Replacing filter restored standard operation. No CAPA required.',
      closedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      closedById: approver.id,
    },
  });

  await prisma.complaintSource.create({
    data: {
      complaintId: cmp6.id,
      sourceSystem: 'manual_entry',
      contentHash: hash(desc6),
      rawPayload: desc6,
    },
  });

  // Electronic Signature Approval Record for CMP-2026-0006 Closure
  await prisma.approvalRecord.create({
    data: {
      organizationId: org.id,
      entityType: 'COMPLAINT_CLOSURE',
      entityId: cmp6.id,
      approverId: approver.id,
      signatureMeaning: 'I have reviewed the investigation and confirm that the issue was resolved without systemic quality defect per 21 CFR 820.198.',
      decision: ApprovalDecision.APPROVED,
      rationale: 'Consumable filter replacement resolved issue; device performance verified compliant.',
      signedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    },
  });

  // Case 7: CardioSync Leadless Pacemaker (Received - Fresh Intake for user testing)
  const desc7 = `CardioSync Leadless Pacemaker 500 (Ref: CSP-500, Serial: CSP-99218) implanted 6 months ago. During outpatient follow-up clinic visit, programmer wand experienced telemetry timeout after multiple interrogations. Physician had to reposition wand 4 times before intermittent communication established. Device battery and pacing threshold measured normal. Complainant: Dr. Jonathan Bell, Cardiac Electrophysiologist (jbell@heartcenter.org).`;
  const cmp7 = await prisma.complaint.create({
    data: {
      complaintNumber: 'CMP-2026-0007',
      organizationId: org.id,
      sourceType: SourceType.MANUAL,
      externalReference: 'EP-CLINIC-7729',
      receivedAt: new Date(),
      complainantName: 'Dr. Jonathan Bell',
      complainantContact: 'jbell@heartcenter.org',
      complainantType: 'HEALTHCARE_PROVIDER',
      productName: 'CardioSync Leadless Pacemaker 500',
      productCode: 'CSP-500',
      serialNumber: 'CSP-99218',
      originalDescription: desc7,
      normalizedDescription: 'Telemetry interrogation timeout with implanted leadless pacemaker.',
      category: 'Software / Firmware Malfunction',
      reportedImpact: 'Treatment Delay (Clinically Significant)',
      status: ComplaintStatus.RECEIVED,
      priority: Priority.CRITICAL,
      isSafetyCritical: true,
      assignedToId: reviewer.id,
    },
  });

  await prisma.complaintSource.create({
    data: {
      complaintId: cmp7.id,
      sourceSystem: 'clinical_intake_portal',
      contentHash: hash(desc7),
      rawPayload: desc7,
    },
  });

  // 5. Durable Audit Trail
  await prisma.auditEvent.createMany({
    data: [
      {
        organizationId: org.id,
        actorId: reviewer.id,
        actorEmail: reviewer.email,
        action: 'COMPLAINT_CREATED',
        entityType: 'Complaint',
        entityId: cmp1.id,
        newState: { complaintNumber: cmp1.complaintNumber, priority: cmp1.priority },
        reason: 'Received clinical complaint via hospital email.',
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      },
      {
        organizationId: org.id,
        actorId: approver.id,
        actorEmail: approver.email,
        action: 'RISK_ASSESSED',
        entityType: 'RiskAssessment',
        entityId: cmp1.id,
        newState: { priority: 'CRITICAL', isSafetyCritical: true },
        reason: 'Confirmed critical safety risk and 24h MDR reporting evaluation requirement.',
        createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
      },
      {
        organizationId: org.id,
        actorId: investigator.id,
        actorEmail: investigator.email,
        action: 'INVESTIGATION_STARTED',
        entityType: 'Investigation',
        entityId: inv1.id,
        newState: { investigationNumber: inv1.investigationNumber, lead: investigator.fullName },
        reason: 'Assigned biomedical engineering failure analysis.',
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      },
      {
        organizationId: org.id,
        actorId: investigator.id,
        actorEmail: investigator.email,
        action: 'CAPA_CREATED',
        entityType: 'Capa',
        entityId: capa1.id,
        newState: { capaNumber: capa1.capaNumber, priority: capa1.priority },
        reason: 'Initiated CAPA for FreeRTOS firmware priority inversion remediation.',
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      },
      {
        organizationId: org.id,
        actorId: approver.id,
        actorEmail: approver.email,
        action: 'COMPLAINT_CLOSED',
        entityType: 'Complaint',
        entityId: cmp6.id,
        newState: { status: 'CLOSED' },
        reason: 'Consumable filter replacement resolved issue; verified by biomed engineers.',
        createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      },
    ],
  });

  console.log('✓ Seed completed successfully with full complaint lifecycle and audit records.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

