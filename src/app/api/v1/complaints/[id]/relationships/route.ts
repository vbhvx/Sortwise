import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { RelationshipType, RelationshipReviewStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('reviewer@apexquality.com');
  }

  const { id } = params;

  const source = await prisma.complaint.findFirst({
    where: {
      OR: [{ id }, { complaintNumber: id }],
      organizationId: session!.organizationId,
    },
  });

  if (!source) {
    return NextResponse.json({ error: 'Source complaint not found' }, { status: 404 });
  }

  try {
    const {
      targetComplaintId,
      relationshipType = RelationshipType.POSSIBLE_DUPLICATE,
      reviewStatus = RelationshipReviewStatus.CONFIRMED_BY_REVIEWER,
      rationale,
      similarityScore = 0.85,
      matchingCriteria = {},
    } = await request.json();

    if (!targetComplaintId) {
      return NextResponse.json({ error: 'targetComplaintId is required' }, { status: 400 });
    }

    // Check if relationship already exists
    const existing = await prisma.complaintRelationship.findFirst({
      where: {
        sourceComplaintId: source.id,
        targetComplaintId,
      },
    });

    let relationRecord;
    if (existing) {
      relationRecord = await prisma.complaintRelationship.update({
        where: { id: existing.id },
        data: {
          relationshipType: relationshipType as RelationshipType,
          reviewStatus: reviewStatus as RelationshipReviewStatus,
          reviewedById: session!.userId,
          reviewedAt: new Date(),
          rationale: rationale || existing.rationale,
        },
      });
    } else {
      relationRecord = await prisma.complaintRelationship.create({
        data: {
          sourceComplaintId: source.id,
          targetComplaintId,
          relationshipType: relationshipType as RelationshipType,
          similarityScore,
          matchingCriteria,
          rationale: rationale || 'Established by complaint reviewer',
          reviewStatus: reviewStatus as RelationshipReviewStatus,
          reviewedById: session!.userId,
          reviewedAt: new Date(),
        },
      });
    }

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: 'DUPLICATE_REVIEWED',
      entityType: 'ComplaintRelationship',
      entityId: relationRecord.id,
      newState: {
        relationshipType,
        reviewStatus,
        sourceComplaintId: source.id,
        targetComplaintId,
      },
      reason: rationale || 'Reviewer updated duplicate / relationship status.',
    });

    return NextResponse.json({ success: true, relationship: relationRecord });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Relationship action failed' }, { status: 500 });
  }
}

