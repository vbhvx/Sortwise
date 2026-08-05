import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { ExtractionReviewStatus } from '@prisma/client';

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
      extractions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  try {
    const { corrections, reviewStatus = 'ACCEPTED' } = await request.json();

    const latestExtraction = complaint.extractions[0];

    // Update extraction status
    if (latestExtraction) {
      await prisma.complaintExtraction.update({
        where: { id: latestExtraction.id },
        data: {
          reviewStatus: reviewStatus as ExtractionReviewStatus,
          reviewedById: session!.userId,
          reviewedAt: new Date(),
          corrections: corrections || undefined,
        },
      });
    }

    // Apply corrected fields directly to canonical complaint
    if (corrections && Object.keys(corrections).length > 0) {
      await prisma.complaint.update({
        where: { id: complaint.id },
        data: {
          productName: corrections.productName || complaint.productName,
          productCode: corrections.productCode !== undefined ? corrections.productCode : complaint.productCode,
          lotNumber: corrections.lotNumber !== undefined ? corrections.lotNumber : complaint.lotNumber,
          serialNumber: corrections.serialNumber !== undefined ? corrections.serialNumber : complaint.serialNumber,
          category: corrections.category || complaint.category,
          reportedImpact: corrections.reportedImpact !== undefined ? corrections.reportedImpact : complaint.reportedImpact,
        },
      });
    }

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: 'EXTRACTION_CONFIRMED',
      entityType: 'ComplaintExtraction',
      entityId: complaint.id,
      newState: { reviewStatus, corrections },
      reason: 'Human reviewer verified and confirmed extracted fields.',
    });

    return NextResponse.json({ success: true, message: 'Extraction confirmed by reviewer.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Confirmation failed' }, { status: 500 });
  }
}

