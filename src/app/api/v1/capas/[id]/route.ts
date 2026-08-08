import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { hasPermission } from '@/lib/auth/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('reviewer@apexquality.com');
  }

  const { id } = params;

  const capa = await prisma.capa.findFirst({
    where: {
      OR: [{ id }, { capaNumber: id }],
      organizationId: session!.organizationId,
    },
    include: {
      leadOwner: {
        select: { id: true, fullName: true, email: true, title: true, department: true },
      },
      approvedBy: {
        select: { id: true, fullName: true, email: true },
      },
      closedBy: {
        select: { id: true, fullName: true, email: true },
      },
      complaintLinks: {
        include: {
          complaint: {
            select: {
              id: true,
              complaintNumber: true,
              productName: true,
              lotNumber: true,
              status: true,
              priority: true,
              category: true,
              originalDescription: true,
            },
          },
          investigation: {
            select: {
              id: true,
              investigationNumber: true,
              status: true,
              rootCauseConclusion: true,
            },
          },
        },
      },
      evidence: {
        orderBy: { submittedAt: 'desc' },
      },
    },
  });

  if (!capa) {
    return NextResponse.json({ error: 'CAPA not found' }, { status: 404 });
  }

  // Fetch approval records for this CAPA
  const approvals = await prisma.approvalRecord.findMany({
    where: {
      organizationId: session!.organizationId,
      entityId: capa.id,
    },
    include: {
      approver: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { signedAt: 'desc' },
  });

  return NextResponse.json({ capa, approvals });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('investigator@apexquality.com');
  }

  if (!hasPermission(session!.role, 'capa:update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;

  const existing = await prisma.capa.findFirst({
    where: {
      OR: [{ id }, { capaNumber: id }],
      organizationId: session!.organizationId,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'CAPA not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      title,
      problemStatement,
      identifiedRootCause,
      correctiveActionPlan,
      preventiveActionPlan,
      effectivenessCriteria,
      implementationEvidenceSummary,
      targetCompletionDate,
      effectivenessReviewDate,
      priority,
      reason = 'CAPA record update',
    } = body;

    const updated = await prisma.capa.update({
      where: { id: existing.id },
      data: {
        title: title !== undefined ? title : existing.title,
        problemStatement: problemStatement !== undefined ? problemStatement : existing.problemStatement,
        identifiedRootCause: identifiedRootCause !== undefined ? identifiedRootCause : existing.identifiedRootCause,
        correctiveActionPlan: correctiveActionPlan !== undefined ? correctiveActionPlan : existing.correctiveActionPlan,
        preventiveActionPlan: preventiveActionPlan !== undefined ? preventiveActionPlan : existing.preventiveActionPlan,
        effectivenessCriteria: effectivenessCriteria !== undefined ? effectivenessCriteria : existing.effectivenessCriteria,
        implementationEvidenceSummary: implementationEvidenceSummary !== undefined ? implementationEvidenceSummary : existing.implementationEvidenceSummary,
        targetCompletionDate: targetCompletionDate !== undefined ? new Date(targetCompletionDate) : existing.targetCompletionDate,
        effectivenessReviewDate: effectivenessReviewDate !== undefined ? new Date(effectivenessReviewDate) : existing.effectivenessReviewDate,
        priority: priority !== undefined ? priority : existing.priority,
      },
    });

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: 'CAPA_UPDATED',
      entityType: 'Capa',
      entityId: existing.id,
      newState: { title: updated.title, priority: updated.priority },
      reason,
    });

    return NextResponse.json({ capa: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}

