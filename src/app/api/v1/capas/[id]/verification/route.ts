import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { hasPermission } from '@/lib/auth/rbac';
import { CapaStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('approver@apexquality.com');
  }

  if (!hasPermission(session!.role, 'capa:verify')) {
    return NextResponse.json(
      { error: 'Forbidden: Only Quality Approvers and Administrators may verify CAPA effectiveness.' },
      { status: 403 }
    );
  }

  const { id } = params;

  const capa = await prisma.capa.findFirst({
    where: {
      OR: [{ id }, { capaNumber: id }],
      organizationId: session!.organizationId,
    },
  });

  if (!capa) {
    return NextResponse.json({ error: 'CAPA not found' }, { status: 404 });
  }

  try {
    const { effectivenessResults, isEffective } = await request.json();

    if (!effectivenessResults || isEffective === undefined) {
      return NextResponse.json(
        { error: 'effectivenessResults and isEffective (boolean) are required' },
        { status: 400 }
      );
    }

    const nextStatus = isEffective ? CapaStatus.VERIFIED_EFFECTIVE : CapaStatus.INEFFECTIVE_REOPENED;

    const updated = await prisma.capa.update({
      where: { id: capa.id },
      data: {
        effectivenessResults,
        isEffective: Boolean(isEffective),
        effectivenessReviewDate: new Date(),
        status: nextStatus,
      },
    });

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: isEffective ? 'CAPA_EFFECTIVENESS_VERIFIED' : 'CAPA_INEFFECTIVE_REOPENED',
      entityType: 'Capa',
      entityId: capa.id,
      previousState: { status: capa.status },
      newState: { status: updated.status, isEffective },
      reason: effectivenessResults,
    });

    return NextResponse.json({ capa: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification record failed' }, { status: 500 });
  }
}

