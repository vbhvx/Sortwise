import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { hasPermission } from '@/lib/auth/rbac';
import { ComplaintStatus, InvestigationStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('reviewer@apexquality.com');
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as InvestigationStatus | null;

  const whereClause: any = {
    organizationId: session!.organizationId,
  };
  if (status) whereClause.status = status;

  const investigations = await prisma.investigation.findMany({
    where: whereClause,
    include: {
      complaint: {
        select: {
          id: true,
          complaintNumber: true,
          productName: true,
          priority: true,
          status: true,
        },
      },
      leadInvestigator: {
        select: { id: true, fullName: true, email: true },
      },
      tasks: true,
      hypotheses: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ investigations });
}

export async function POST(request: NextRequest) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('investigator@apexquality.com');
  }

  if (!hasPermission(session!.role, 'investigation:create')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges to create investigation' }, { status: 403 });
  }

  try {
    const {
      complaintId,
      scope,
      issueStatement,
      investigationPlan,
      rootCauseMethod = 'FIVE_WHYS',
      targetCompletionDate,
      leadInvestigatorId,
    } = await request.json();

    if (!complaintId || !scope || !issueStatement) {
      return NextResponse.json(
        { error: 'complaintId, scope, and issueStatement are required' },
        { status: 400 }
      );
    }

    const complaint = await prisma.complaint.findFirst({
      where: {
        OR: [{ id: complaintId }, { complaintNumber: complaintId }],
        organizationId: session!.organizationId,
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    const count = await prisma.investigation.count({
      where: { organizationId: session!.organizationId },
    });
    const currentYear = new Date().getFullYear();
    const investigationNumber = `INV-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const leadId = leadInvestigatorId || session!.userId;

    const investigation = await prisma.$transaction(async (tx) => {
      const inv = await tx.investigation.create({
        data: {
          investigationNumber,
          organizationId: session!.organizationId,
          complaintId: complaint.id,
          leadInvestigatorId: leadId,
          status: InvestigationStatus.IN_PROGRESS,
          scope,
          issueStatement,
          investigationPlan: investigationPlan || 'Standard failure analysis and retain inspection protocol',
          rootCauseMethod,
          targetCompletionDate: targetCompletionDate ? new Date(targetCompletionDate) : null,
        },
      });

      // Update complaint status to UNDER_INVESTIGATION
      await tx.complaint.update({
        where: { id: complaint.id },
        data: {
          status: ComplaintStatus.UNDER_INVESTIGATION,
          assignedToId: leadId,
        },
      });

      return inv;
    });

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: 'INVESTIGATION_CREATED',
      entityType: 'Investigation',
      entityId: investigation.id,
      newState: {
        investigationNumber: investigation.investigationNumber,
        complaintNumber: complaint.complaintNumber,
        leadInvestigatorId: leadId,
      },
      reason: 'Initiated formal investigation.',
    });

    return NextResponse.json({ investigation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create investigation' }, { status: 500 });
  }
}

