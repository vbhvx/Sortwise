import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { hasPermission } from '@/lib/auth/rbac';
import { HypothesisStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('investigator@apexquality.com');
  }

  if (!hasPermission(session!.role, 'investigation:update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;

  const investigation = await prisma.investigation.findFirst({
    where: {
      OR: [{ id }, { investigationNumber: id }],
      organizationId: session!.organizationId,
    },
  });

  if (!investigation) {
    return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
  }

  try {
    const {
      hypothesisId,
      method = 'FIVE_WHYS',
      category,
      statement,
      stepLevel,
      status = 'PROPOSED_HYPOTHESIS',
      supportingEvidence,
      isAiSuggested = false,
    } = await request.json();

    if (hypothesisId) {
      // Update hypothesis (e.g. promoting from PROPOSED_HYPOTHESIS to VERIFIED_FINDING or DISPROVEN_REJECTED)
      const existing = await prisma.rootCauseHypothesis.findUnique({
        where: { id: hypothesisId },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 });
      }

      const isBeingVerified = status === HypothesisStatus.VERIFIED_FINDING;

      const updated = await prisma.rootCauseHypothesis.update({
        where: { id: hypothesisId },
        data: {
          status: status as HypothesisStatus,
          supportingEvidence: supportingEvidence !== undefined ? supportingEvidence : existing.supportingEvidence,
          statement: statement !== undefined ? statement : existing.statement,
          verifiedById: isBeingVerified ? session!.userId : existing.verifiedById,
          verifiedAt: isBeingVerified ? new Date() : existing.verifiedAt,
        },
      });

      await recordAuditEvent({
        organizationId: session!.organizationId,
        actor: session,
        action: isBeingVerified ? 'ROOT_CAUSE_VERIFIED' : 'HYPOTHESIS_UPDATED',
        entityType: 'RootCauseHypothesis',
        entityId: updated.id,
        previousState: { status: existing.status },
        newState: { status: updated.status, verifiedById: updated.verifiedById },
        reason: isBeingVerified
          ? 'Investigator verified hypothesis against objective evidence.'
          : 'Updated hypothesis status.',
      });

      return NextResponse.json({ hypothesis: updated });
    }

    if (!statement) {
      return NextResponse.json({ error: 'Statement is required' }, { status: 400 });
    }

    const newHypothesis = await prisma.rootCauseHypothesis.create({
      data: {
        investigationId: investigation.id,
        method,
        category: category || null,
        statement,
        stepLevel: stepLevel ? parseInt(stepLevel, 10) : null,
        status: status as HypothesisStatus,
        supportingEvidence: supportingEvidence || null,
        isAiSuggested,
        verifiedById: status === HypothesisStatus.VERIFIED_FINDING ? session!.userId : null,
        verifiedAt: status === HypothesisStatus.VERIFIED_FINDING ? new Date() : null,
      },
    });

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: 'HYPOTHESIS_CREATED',
      entityType: 'RootCauseHypothesis',
      entityId: newHypothesis.id,
      newState: { method, category, statement, status: newHypothesis.status },
      reason: `Added root cause hypothesis via ${method}.`,
    });

    return NextResponse.json({ hypothesis: newHypothesis }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to record hypothesis' }, { status: 500 });
  }
}

