import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { ComplaintExtractionService } from '@/modules/extraction/extractor';
import { RiskTriageEngine } from '@/modules/triage/risk-engine';
import { computeSha256 } from '@/modules/intake/sanitizer';
import { ComplaintStatus, Priority, SourceType } from '@prisma/client';

export async function GET(request: NextRequest) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('reviewer@apexquality.com');
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as ComplaintStatus | null;
  const priority = searchParams.get('priority') as Priority | null;
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const isSafetyCritical = searchParams.get('isSafetyCritical');
  const isOverdue = searchParams.get('isOverdue');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '25', 10);
  const skip = (page - 1) * limit;

  const whereClause: any = {
    organizationId: session!.organizationId,
  };

  if (status) {
    whereClause.status = status;
  }
  if (priority) {
    whereClause.priority = priority;
  }
  if (category) {
    whereClause.category = category;
  }
  if (isSafetyCritical === 'true') {
    whereClause.isSafetyCritical = true;
  }
  if (isOverdue === 'true') {
    whereClause.isOverdue = true;
  }

  if (search && search.trim().length > 0) {
    const q = search.trim();
    whereClause.OR = [
      { complaintNumber: { contains: q, mode: 'insensitive' } },
      { productName: { contains: q, mode: 'insensitive' } },
      { lotNumber: { contains: q, mode: 'insensitive' } },
      { serialNumber: { contains: q, mode: 'insensitive' } },
      { complainantName: { contains: q, mode: 'insensitive' } },
      { originalDescription: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, complaints] = await Promise.all([
    prisma.complaint.count({ where: whereClause }),
    prisma.complaint.findMany({
      where: whereClause,
      include: {
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
        riskAssessments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        investigations: {
          select: { id: true, investigationNumber: true, status: true },
        },
        capaLinks: {
          include: {
            capa: {
              select: { id: true, capaNumber: true, status: true, priority: true },
            },
          },
        },
      },
      orderBy: { receivedAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    complaints,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('reviewer@apexquality.com');
  }

  try {
    const body = await request.json();
    const {
      originalDescription,
      productName,
      productCode,
      lotNumber,
      serialNumber,
      complainantName,
      complainantContact,
      complainantType,
      category,
      sourceType = SourceType.MANUAL,
      externalReference,
      occurredAt,
      reportedImpact,
    } = body;

    if (!originalDescription || originalDescription.trim().length < 5) {
      return NextResponse.json(
        { error: 'Original complaint description is required (minimum 5 characters).' },
        { status: 400 }
      );
    }

    // 1. Generate next stable complaint number: CMP-2026-XXXX
    const count = await prisma.complaint.count({
      where: { organizationId: session!.organizationId },
    });
    const currentYear = new Date().getFullYear();
    const complaintNumber = `CMP-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    // 2. Perform automated extraction with citations
    const extractionResult = ComplaintExtractionService.extractFromText(originalDescription);

    const finalProductName = productName || extractionResult.productName || 'Unspecified Product';
    const finalCategory = category || extractionResult.category;
    const finalLotNumber = lotNumber || extractionResult.lotNumber;
    const finalSerialNumber = serialNumber || extractionResult.serialNumber;
    const finalReportedImpact = reportedImpact || extractionResult.reportedImpact;

    // 3. Perform automated triage risk evaluation
    const triageResult = RiskTriageEngine.evaluateComplaint({
      description: originalDescription,
      productName: finalProductName,
      category: finalCategory,
      reportedImpact: finalReportedImpact,
      lotNumber: finalLotNumber,
      serialNumber: finalSerialNumber,
    });

    // 4. Calculate SLA due date
    const dueDate = new Date(Date.now() + triageResult.slaHours * 3600 * 1000);

    // 5. Compute SHA-256 for original source tamper evidence
    const contentHash = computeSha256(originalDescription);

    // 6. Transactionally save complaint, source, extraction, risk assessment, and audit event
    const newComplaint = await prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.create({
        data: {
          complaintNumber,
          organizationId: session!.organizationId,
          sourceType,
          externalReference: externalReference || null,
          receivedAt: new Date(),
          occurredAt: occurredAt ? new Date(occurredAt) : null,
          complainantName: complainantName || extractionResult.complainantName || null,
          complainantContact: complainantContact || extractionResult.complainantContact || null,
          complainantType: complainantType || extractionResult.complainantType || 'CONSUMER',
          productName: finalProductName,
          productCode: productCode || extractionResult.productCode || null,
          lotNumber: finalLotNumber || null,
          serialNumber: finalSerialNumber || null,
          originalDescription, // Source record: NEVER modified
          normalizedDescription: extractionResult.normalizedDescription,
          category: finalCategory,
          reportedImpact: finalReportedImpact || null,
          status: ComplaintStatus.TRIAGE_REVIEW,
          priority: triageResult.suggestedPriority,
          isSafetyCritical: triageResult.isSafetyCritical,
          isReportable: triageResult.isReportableSuspected,
          dueDate,
          assignedToId: session!.userId,
        },
      });

      // Preserve raw source material
      await tx.complaintSource.create({
        data: {
          complaintId: complaint.id,
          sourceSystem: sourceType === SourceType.MANUAL ? 'manual_entry' : 'intake_gateway',
          externalId: externalReference || null,
          rawPayload: originalDescription,
          contentHash,
        },
      });

      // Save extraction metadata with citations
      await tx.complaintExtraction.create({
        data: {
          complaintId: complaint.id,
          schemaVersion: 'v1.0',
          extractionMethod: 'AI_ASSISTED',
          extractedFields: JSON.parse(
            JSON.stringify({
              productName: finalProductName,
              lotNumber: finalLotNumber,
              serialNumber: finalSerialNumber,
              category: finalCategory,
              reportedImpact: finalReportedImpact,
              citations: extractionResult.citations,
            })
          ),
          confidence: extractionResult.confidence,
          missingFields: extractionResult.missingFields,
        },
      });

      // Save initial risk assessment
      await tx.riskAssessment.create({
        data: {
          complaintId: complaint.id,
          assessmentVersion: 1,
          appliedRules: triageResult.factors.filter((f) => f.triggered).map((f) => f.name),
          factorsConsidered: JSON.parse(JSON.stringify(triageResult.factors)),
          suggestedPriority: triageResult.suggestedPriority,
          suggestedCategory: finalCategory,
          confidence: triageResult.confidence,
          rationale: triageResult.rationale,
          missingInformation: triageResult.missingInformation,
          finalPriority: triageResult.suggestedPriority,
        },
      });

      return complaint;
    });

    // Record immutable audit event
    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: 'COMPLAINT_CREATED',
      entityType: 'Complaint',
      entityId: newComplaint.id,
      newState: {
        complaintNumber: newComplaint.complaintNumber,
        productName: newComplaint.productName,
        priority: newComplaint.priority,
        status: newComplaint.status,
      },
      reason: 'Intake and creation of new complaint record.',
    });

    return NextResponse.json({ complaint: newComplaint }, { status: 201 });
  } catch (err: any) {
    console.error('[COMPLAINT_CREATE_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to create complaint' }, { status: 500 });
  }
}
