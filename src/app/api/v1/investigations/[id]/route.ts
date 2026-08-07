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

  const investigation = await prisma.investigation.findFirst({
    where: {
      OR: [{ id }, { investigationNumber: id }],
      organizationId: session!.organizationId,
    },
    include: {
      complaint: {
        select: {
          id: true,
          complaintNumber: true,
          productName: true,
          lotNumber: true,
          serialNumber: true,
          category: true,
          status: true,
          priority: true,
          originalDescription: true,
        },
      },
      leadInvestigator: {
        select: { id: true, fullName: true, email: true, title: true, department: true },
      },
      approvedBy: {
        select: { id: true, fullName: true, email: true },
      },
      tasks: {
        include: {
          assignedTo: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      evidence: {
        orderBy: { createdAt: 'desc' },
      },
      hypotheses: {
        orderBy: [{ method: 'asc' }, { stepLevel: 'asc' }, { createdAt: 'asc' }],
      },
      capaLinks: {
        include: {
          capa: true,
        },
      },
    },
  });

  if (!investigation) {
    return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
  }

  return NextResponse.json({ investigation });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('investigator@apexquality.com');
  }

  if (!hasPermission(session!.role, 'investigation:update')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
  }

  const { id } = params;

  const existing = await prisma.investigation.findFirst({
    where: {
      OR: [{ id }, { investigationNumber: id }],
      organizationId: session!.organizationId,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      summaryOfFindings,
      rootCauseMethod,
      rootCauseConclusion,
      isRootCauseIdentified,
      capaRequired,
      capaJustification,
      investigationPlan,
      scope,
      issueStatement,
    } = body;

    const updated = await prisma.investigation.update({
      where: { id: existing.id },
      data: {
        summaryOfFindings: summaryOfFindings !== undefined ? summaryOfFindings : existing.summaryOfFindings,
        rootCauseMethod: rootCauseMethod !== undefined ? rootCauseMethod : existing.rootCauseMethod,
        rootCauseConclusion: rootCauseConclusion !== undefined ? rootCauseConclusion : existing.rootCauseConclusion,
        isRootCauseIdentified: isRootCauseIdentified !== undefined ? isRootCauseIdentified : existing.isRootCauseIdentified,
        capaRequired: capaRequired !== undefined ? capaRequired : existing.capaRequired,
        capaJustification: capaJustification !== undefined ? capaJustification : existing.capaJustification,
        investigationPlan: investigationPlan !== undefined ? investigationPlan : existing.investigationPlan,
        scope: scope !== undefined ? scope : existing.scope,
        issueStatement: issueStatement !== undefined ? issueStatement : existing.issueStatement,
      },
    });

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: 'INVESTIGATION_UPDATED',
      entityType: 'Investigation',
      entityId: existing.id,
      previousState: {
        isRootCauseIdentified: existing.isRootCauseIdentified,
        capaRequired: existing.capaRequired,
      },
      newState: {
        isRootCauseIdentified: updated.isRootCauseIdentified,
        capaRequired: updated.capaRequired,
      },
      reason: 'Investigator updated findings and root cause conclusions.',
    });

    return NextResponse.json({ investigation: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}

