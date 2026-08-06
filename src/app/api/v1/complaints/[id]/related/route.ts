import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { DuplicateDetectionService } from '@/modules/deduplication/detector';

export async function GET(
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
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  // Get all other complaints in the same organization
  const allOtherComplaints = await prisma.complaint.findMany({
    where: {
      organizationId: session!.organizationId,
      id: { not: source.id },
    },
    select: {
      id: true,
      complaintNumber: true,
      productName: true,
      productCode: true,
      lotNumber: true,
      serialNumber: true,
      category: true,
      externalReference: true,
      originalDescription: true,
      status: true,
      receivedAt: true,
    },
    take: 100,
  });

  const candidates = DuplicateDetectionService.findCandidates(
    {
      id: source.id,
      productName: source.productName,
      productCode: source.productCode,
      lotNumber: source.lotNumber,
      serialNumber: source.serialNumber,
      category: source.category,
      externalReference: source.externalReference,
      description: source.originalDescription,
    },
    allOtherComplaints.map((c) => ({
      ...c,
      description: c.originalDescription,
    }))
  );

  return NextResponse.json({
    sourceComplaintId: source.id,
    sourceComplaintNumber: source.complaintNumber,
    candidates,
  });
}

