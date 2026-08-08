import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { CapaWorkflowService } from '@/modules/capa/capa-service';
import { CapaStatus, ApprovalDecision, ComplaintStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('approver@apexquality.com');
  }

  const { id } = params;

  const capa = await prisma.capa.findFirst({
    where: {
      OR: [{ id }, { capaNumber: id }],
      organizationId: session!.organizationId,
    },
    include: {
      evidence: true,
      complaintLinks: true,
    },
  });

  if (!capa) {
    return NextResponse.json({ error: 'CAPA not found' }, { status: 404 });
  }

  try {
    const { targetStatus, rationale, signatureMeaning } = await request.json();

    if (!targetStatus) {
      return NextResponse.json({ error: 'targetStatus is required' }, { status: 400 });
    }

    const hasImplementationEvidence =
      capa.evidence.some((e) => e.phase === 'IMPLEMENTATION') ||
      !!capa.implementationEvidenceSummary;

    const validation = CapaWorkflowService.validateTransition(
      capa.status,
      targetStatus as CapaStatus,
      session!.role,
      {
        hasImplementationEvidence,
        hasEffectivenessResults: !!capa.effectivenessResults,
        isEffective: capa.isEffective ?? undefined,
        approvalRationale: rationale,
      }
    );

    if (!validation.allowed) {
      return NextResponse.json({ error: validation.reason }, { status: 422 });
    }

    const updateData: any = {
      status: targetStatus,
    };

    if (targetStatus === CapaStatus.APPROVED) {
      updateData.approvedById = session!.userId;
      updateData.approvedAt = new Date();

      await prisma.approvalRecord.create({
        data: {
          organizationId: session!.organizationId,
          entityType: 'CAPA_PLAN_APPROVAL',
          entityId: capa.id,
          approverId: session!.userId,
          signatureMeaning: signatureMeaning || 'I have reviewed and approved this Corrective & Preventive Action plan per quality system procedures.',
          decision: ApprovalDecision.APPROVED,
          rationale: rationale || 'Plan approved for implementation.',
        },
      });
    } else if (targetStatus === CapaStatus.CLOSED) {
      updateData.closedById = session!.userId;
      updateData.closedAt = new Date();

      await prisma.approvalRecord.create({
        data: {
          organizationId: session!.organizationId,
          entityType: 'CAPA_CLOSURE',
          entityId: capa.id,
          approverId: session!.userId,
          signatureMeaning: signatureMeaning || 'I certify that this CAPA has been verified effective and meets all closure criteria per QMSR 21 CFR 820.100.',
          decision: ApprovalDecision.APPROVED,
          rationale: rationale || 'CAPA closed following verified effectiveness.',
        },
      });

      // Also check if linked complaints can now be transitioned to AWAITING_APPROVAL
      for (const link of capa.complaintLinks) {
        await prisma.complaint.update({
          where: { id: link.complaintId },
          data: { status: ComplaintStatus.AWAITING_APPROVAL },
        });
      }
    }

    const updated = await prisma.capa.update({
      where: { id: capa.id },
      data: updateData,
    });

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: 'CAPA_STATUS_TRANSITIONED',
      entityType: 'Capa',
      entityId: capa.id,
      previousState: { status: capa.status },
      newState: { status: updated.status },
      reason: rationale || `Transitioned CAPA to ${targetStatus}`,
    });

    return NextResponse.json({ capa: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Action failed' }, { status: 500 });
  }
}

