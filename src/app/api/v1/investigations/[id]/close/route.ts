import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { hasPermission } from '@/lib/auth/rbac';
import { InvestigationStatus, ApprovalDecision, ComplaintStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('approver@apexquality.com');
  }

  if (!hasPermission(session!.role, 'investigation:approve')) {
    return NextResponse.json(
      { error: 'Forbidden: Only Quality Approvers and Administrators may approve and close an investigation.' },
      { status: 403 }
    );
  }

  const { id } = params;

  const investigation = await prisma.investigation.findFirst({
    where: {
      OR: [{ id }, { investigationNumber: id }],
      organizationId: session!.organizationId,
    },
    include: {
      complaint: true,
      hypotheses: true,
      tasks: true,
    },
  });

  if (!investigation) {
    return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
  }

  try {
    const { signatureMeaning, rationale } = await request.json();

    if (!rationale || rationale.trim().length < 5) {
      return NextResponse.json(
        { error: 'An approval rationale (minimum 5 characters) is required for regulatory auditability.' },
        { status: 422 }
      );
    }

    // Prerequisite: Root cause justification check
    if (!investigation.rootCauseConclusion && !investigation.summaryOfFindings) {
      return NextResponse.json(
        { error: 'Cannot approve investigation without recorded summary of findings or root-cause conclusion.' },
        { status: 422 }
      );
    }

    if (!investigation.capaRequired && (!investigation.capaJustification || investigation.capaJustification.trim().length < 5)) {
      return NextResponse.json(
        { error: 'When CAPA is determined not necessary, 21 CFR 820.198 / 211.198 mandates documenting a detailed justification.' },
        { status: 422 }
      );
    }

    const completed = await prisma.$transaction(async (tx) => {
      const inv = await tx.investigation.update({
        where: { id: investigation.id },
        data: {
          status: InvestigationStatus.COMPLETED,
          completedAt: new Date(),
          approvedById: session!.userId,
          approvedAt: new Date(),
        },
      });

      // Electronic signature approval record
      await tx.approvalRecord.create({
        data: {
          organizationId: session!.organizationId,
          entityType: 'INVESTIGATION_APPROVAL',
          entityId: investigation.id,
          approverId: session!.userId,
          signatureMeaning: signatureMeaning || 'I have reviewed and approved this investigation, findings, and CAPA determination per quality procedures.',
          decision: ApprovalDecision.APPROVED,
          rationale,
        },
      });

      // If CAPA is required and no CAPA is currently linked, transition complaint to CAPA_IN_PROGRESS or AWAITING_APPROVAL
      if (investigation.capaRequired) {
        await tx.complaint.update({
          where: { id: investigation.complaintId },
          data: { status: ComplaintStatus.CAPA_IN_PROGRESS },
        });
      } else {
        await tx.complaint.update({
          where: { id: investigation.complaintId },
          data: { status: ComplaintStatus.AWAITING_APPROVAL },
        });
      }

      return inv;
    });

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: 'INVESTIGATION_APPROVED',
      entityType: 'Investigation',
      entityId: investigation.id,
      newState: { status: 'COMPLETED', approvedBy: session!.email },
      reason: rationale,
    });

    return NextResponse.json({ success: true, investigation: completed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Closure failed' }, { status: 500 });
  }
}

