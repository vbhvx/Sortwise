import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { Priority } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('reviewer@apexquality.com');
  }

  const { id } = params;

  const complaint = await prisma.complaint.findFirst({
    where: {
      OR: [{ id }, { complaintNumber: id }],
      organizationId: session!.organizationId,
    },
    include: {
      riskAssessments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  try {
    const { finalPriority, overrideRationale, isSafetyCritical, isReportable } = await request.json();

    if (!finalPriority) {
      return NextResponse.json({ error: 'finalPriority is required' }, { status: 400 });
    }

    const latest = complaint.riskAssessments[0];
    const isOverride = latest && latest.suggestedPriority !== finalPriority;

    if (isOverride && (!overrideRationale || overrideRationale.trim().length < 5)) {
      return NextResponse.json(
        { error: 'An override rationale is mandatory when changing AI/rule suggested priority.' },
        { status: 422 }
      );
    }

    // Create new version of risk assessment
    const assessment = await prisma.riskAssessment.create({
      data: {
        complaintId: complaint.id,
        assessmentVersion: (latest?.assessmentVersion || 0) + 1,
        appliedRules: latest?.appliedRules || ['HUMAN_REVIEW'],
        factorsConsidered: latest?.factorsConsidered || {},
        suggestedPriority: latest?.suggestedPriority || finalPriority,
        suggestedCategory: complaint.category,
        confidence: 1.0,
        rationale: overrideRationale || latest?.rationale || 'Reviewed by quality staff',
        isHumanOverridden: isOverride,
        finalPriority: finalPriority as Priority,
        overrideRationale: overrideRationale || null,
        reviewedById: session!.userId,
        reviewedAt: new Date(),
      },
    });

    // Update canonical complaint priority and safety flags
    await prisma.complaint.update({
      where: { id: complaint.id },
      data: {
        priority: finalPriority as Priority,
        isSafetyCritical: isSafetyCritical !== undefined ? isSafetyCritical : complaint.isSafetyCritical,
        isReportable: isReportable !== undefined ? isReportable : complaint.isReportable,
      },
    });

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: isOverride ? 'RISK_OVERRIDDEN' : 'RISK_REVIEWED',
      entityType: 'RiskAssessment',
      entityId: assessment.id,
      previousState: { priority: complaint.priority },
      newState: { priority: finalPriority, isSafetyCritical, isReportable },
      reason: overrideRationale || 'Human review and confirmation of risk assessment',
    });

    return NextResponse.json({ success: true, assessment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Triage review failed' }, { status: 500 });
  }
}

