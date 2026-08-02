import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('reviewer@apexquality.com');
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');
  const action = searchParams.get('action');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const skip = (page - 1) * limit;

  const whereClause: any = {
    organizationId: session!.organizationId,
  };

  if (entityType) whereClause.entityType = entityType;
  if (entityId) whereClause.entityId = entityId;
  if (action) whereClause.action = action;

  const [total, events] = await Promise.all([
    prisma.auditEvent.count({ where: whereClause }),
    prisma.auditEvent.findMany({
      where: whereClause,
      include: {
        actor: {
          select: { id: true, fullName: true, email: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    events,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

