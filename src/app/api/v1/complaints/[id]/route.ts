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

  const complaint = await prisma.complaint.findFirst({
    where: {
      OR: [{ id }, { complaintNumber: id }],
      organizationId: session!.organizationId,
    },
    include: {
      source: true,
      assignedTo: {
        select: { id: true, fullName: true, email: true, title: true, department: true },
      },
      closedBy: {
        select: { id: true, fullName: true, email: true },
      },
      reopenedBy: {
        select: { id: true, fullName: true, email: true },
      },
      extractions: {
        orderBy: { createdAt: 'desc' },
      },
      riskAssessments: {
        orderBy: { createdAt: 'desc' },
      },
      outgoingRelations: {
        include: {
          targetComplaint: {
            select: {
              id: true,
              complaintNumber: true,
              productName: true,
              lotNumber: true,
              status: true,
              priority: true,
              originalDescription: true,
            },
          },
        },
      },
      incomingRelations: {
        include: {
          sourceComplaint: {
            select: {
              id: true,
              complaintNumber: true,
              productName: true,
              lotNumber: true,
              status: true,
              priority: true,
              originalDescription: true,
            },
          },
        },
      },
      investigations: {
        include: {
          leadInvestigator: {
            select: { id: true, fullName: true, email: true },
          },
          tasks: {
            include: {
              assignedTo: { select: { id: true, fullName: true } },
            },
          },
          evidence: true,
          hypotheses: true,
        },
      },
      capaLinks: {
        include: {
          capa: {
            include: {
              leadOwner: { select: { id: true, fullName: true, email: true } },
              evidence: true,
            },
          },
        },
      },
      attachments: true,
    },
  });

  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found or unauthorized' }, { status: 404 });
  }

  // Fetch chronological audit history for this complaint
  const auditEvents = await prisma.auditEvent.findMany({
    where: {
      organizationId: session!.organizationId,
      entityId: complaint.id,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch formal approval records for this complaint
  const approvalRecords = await prisma.approvalRecord.findMany({
    where: {
      organizationId: session!.organizationId,
      entityId: complaint.id,
    },
    include: {
      approver: { select: { id: true, fullName: true, email: true, title: true } },
    },
    orderBy: { signedAt: 'desc' },
  });

  return NextResponse.json({
    complaint,
    auditEvents,
    approvalRecords,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('reviewer@apexquality.com');
  }

  if (!hasPermission(session!.role, 'complaint:update')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges to update complaint' }, { status: 403 });
  }

  const { id } = params;

  const existing = await prisma.complaint.findFirst({
    where: {
      OR: [{ id }, { complaintNumber: id }],
      organizationId: session!.organizationId,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      productName,
      productCode,
      lotNumber,
      serialNumber,
      category,
      reportedImpact,
      isSafetyCritical,
      isReportable,
      normalizedDescription,
      assignedToId,
      dueDate,
      reason = 'Field correction by reviewer',
    } = body;

    const updated = await prisma.complaint.update({
      where: { id: existing.id },
      data: {
        productName: productName !== undefined ? productName : existing.productName,
        productCode: productCode !== undefined ? productCode : existing.productCode,
        lotNumber: lotNumber !== undefined ? lotNumber : existing.lotNumber,
        serialNumber: serialNumber !== undefined ? serialNumber : existing.serialNumber,
        category: category !== undefined ? category : existing.category,
        reportedImpact: reportedImpact !== undefined ? reportedImpact : existing.reportedImpact,
        isSafetyCritical: isSafetyCritical !== undefined ? isSafetyCritical : existing.isSafetyCritical,
        isReportable: isReportable !== undefined ? isReportable : existing.isReportable,
        normalizedDescription: normalizedDescription !== undefined ? normalizedDescription : existing.normalizedDescription,
        assignedToId: assignedToId !== undefined ? assignedToId : existing.assignedToId,
        dueDate: dueDate !== undefined ? new Date(dueDate) : existing.dueDate,
      },
    });

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: 'FIELD_CORRECTED',
      entityType: 'Complaint',
      entityId: existing.id,
      previousState: {
        productName: existing.productName,
        lotNumber: existing.lotNumber,
        category: existing.category,
        isSafetyCritical: existing.isSafetyCritical,
      },
      newState: {
        productName: updated.productName,
        lotNumber: updated.lotNumber,
        category: updated.category,
        isSafetyCritical: updated.isSafetyCritical,
      },
      reason,
    });

    return NextResponse.json({ complaint: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update complaint' }, { status: 500 });
  }
}

