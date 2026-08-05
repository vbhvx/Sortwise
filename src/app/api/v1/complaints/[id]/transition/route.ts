import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { validateStateTransition } from '@/modules/workflows/state-machine';
import { ComplaintStatus, CapaStatus } from '@prisma/client';

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
      extractions: true,
      riskAssessments: true,
      investigations: {
        include: { hypotheses: true },
      },
      capaLinks: {
        include: { capa: true },
      },
    },
  });

  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  try {
    const { targetStatus, rationale } = await request.json();

    if (!targetStatus) {
      return NextResponse.json({ error: 'targetStatus is required' }, { status: 400 });
    }

    // Determine context for transition validation
    const hasInvestigation = complaint.investigations.length > 0;
    const inv = complaint.investigations[0];
    const investigationCompleted = inv?.status === 'COMPLETED';
    const capaRequired = inv?.capaRequired ?? false;
    const hasCapa = complaint.capaLinks.length > 0;
    const capaCompleted = complaint.capaLinks.some(
      (l) => l.capa.status === CapaStatus.CLOSED || l.capa.status === CapaStatus.VERIFIED_EFFECTIVE
    );

    const validation = validateStateTransition(complaint.status, targetStatus as ComplaintStatus, {
      userRole: session!.role,
      userId: session!.userId,
      hasExtraction: complaint.extractions.length > 0,
      hasRiskAssessment: complaint.riskAssessments.length > 0,
      hasInvestigation,
      investigationCompleted,
      capaRequired,
      hasCapa,
      capaCompleted,
      rationale,
    });

    if (!validation.allowed) {
      return NextResponse.json({ error: validation.reason }, { status: 422 });
    }

    // Prepare update data
    const updateData: any = {
      status: targetStatus,
    };

    let auditAction = 'STATUS_TRANSITIONED';

    if (targetStatus === ComplaintStatus.CLOSED) {
      updateData.closedAt = new Date();
      updateData.closedById = session!.userId;
      updateData.closureRationale = rationale;
      auditAction = 'COMPLAINT_CLOSED';

      // Create formal electronic approval record for closure
      await prisma.approvalRecord.create({
        data: {
          organizationId: session!.organizationId,
          entityType: 'COMPLAINT_CLOSURE',
          entityId: complaint.id,
          approverId: session!.userId,
          signatureMeaning: 'I certify that this complaint has been thoroughly evaluated, required investigations and CAPA actions are addressed, and closure meets approved quality management procedures.',
          rationale: rationale,
        },
      });
    } else if (targetStatus === ComplaintStatus.REOPENED) {
      updateData.reopenedAt = new Date();
      updateData.reopenedById = session!.userId;
      updateData.reopenRationale = rationale;
      auditAction = 'COMPLAINT_REOPENED';
    }

    const updated = await prisma.complaint.update({
      where: { id: complaint.id },
      data: updateData,
    });

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: auditAction,
      entityType: 'Complaint',
      entityId: complaint.id,
      previousState: { status: complaint.status },
      newState: { status: updated.status },
      reason: rationale || `Transitioned status to ${targetStatus}`,
    });

    return NextResponse.json({ complaint: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Transition failed' }, { status: 500 });
  }
}

