import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { hasPermission } from '@/lib/auth/rbac';
import { CapaStatus, Priority } from '@prisma/client';

export async function GET(request: NextRequest) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('reviewer@apexquality.com');
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as CapaStatus | null;
  const priority = searchParams.get('priority') as Priority | null;

  const whereClause: any = {
    organizationId: session!.organizationId,
  };
  if (status) whereClause.status = status;
  if (priority) whereClause.priority = priority;

  const capas = await prisma.capa.findMany({
    where: whereClause,
    include: {
      leadOwner: {
        select: { id: true, fullName: true, email: true },
      },
      complaintLinks: {
        include: {
          complaint: {
            select: {
              id: true,
              complaintNumber: true,
              productName: true,
              status: true,
              priority: true,
            },
          },
          investigation: {
            select: {
              id: true,
              investigationNumber: true,
              status: true,
            },
          },
        },
      },
      evidence: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ capas });
}

export async function POST(request: NextRequest) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('investigator@apexquality.com');
  }

  if (!hasPermission(session!.role, 'capa:create')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges to create CAPA' }, { status: 403 });
  }

  try {
    const {
      title,
      problemStatement,
      identifiedRootCause,
      correctiveActionPlan,
      preventiveActionPlan,
      effectivenessCriteria,
      priority = Priority.HIGH,
      targetCompletionDate,
      leadOwnerId,
      complaintId,
      investigationId,
    } = await request.json();

    if (!title || !problemStatement || !identifiedRootCause || !correctiveActionPlan || !effectivenessCriteria) {
      return NextResponse.json(
        { error: 'title, problemStatement, identifiedRootCause, correctiveActionPlan, and effectivenessCriteria are required' },
        { status: 400 }
      );
    }

    const count = await prisma.capa.count({
      where: { organizationId: session!.organizationId },
    });
    const currentYear = new Date().getFullYear();
    const capaNumber = `CAPA-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const leadId = leadOwnerId || session!.userId;

    const capa = await prisma.$transaction(async (tx) => {
      const c = await tx.capa.create({
        data: {
          capaNumber,
          organizationId: session!.organizationId,
          title,
          problemStatement,
          identifiedRootCause,
          correctiveActionPlan,
          preventiveActionPlan: preventiveActionPlan || null,
          effectivenessCriteria,
          leadOwnerId: leadId,
          status: CapaStatus.PROPOSED,
          priority: priority as Priority,
          targetCompletionDate: targetCompletionDate ? new Date(targetCompletionDate) : null,
        },
      });

      // Link originating complaint if provided
      if (complaintId) {
        await tx.capaComplaintLink.create({
          data: {
            capaId: c.id,
            complaintId,
            investigationId: investigationId || null,
            linkedById: session!.userId,
          },
        });
      }

      return c;
    });

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: 'CAPA_CREATED',
      entityType: 'Capa',
      entityId: capa.id,
      newState: {
        capaNumber: capa.capaNumber,
        title: capa.title,
        priority: capa.priority,
        complaintId,
      },
      reason: 'Initiated new Corrective and Preventive Action record.',
    });

    return NextResponse.json({ capa }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create CAPA' }, { status: 500 });
  }
}

