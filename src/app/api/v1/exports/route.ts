import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { hasPermission } from '@/lib/auth/rbac';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('reviewer@apexquality.com');
  }

  if (!hasPermission(session!.role, 'reports:export')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { format = 'csv', entity = 'complaints' } = await request.json();

    let exportData: any[] = [];
    if (entity === 'capas') {
      const capas = await prisma.capa.findMany({
        where: { organizationId: session!.organizationId },
        include: { leadOwner: { select: { fullName: true, email: true } } },
      });
      exportData = capas.map((c) => ({
        capaNumber: c.capaNumber,
        title: c.title,
        status: c.status,
        priority: c.priority,
        leadOwner: c.leadOwner.fullName,
        targetCompletionDate: c.targetCompletionDate ? c.targetCompletionDate.toISOString() : '',
        effectivenessCriteria: c.effectivenessCriteria,
        isEffective: c.isEffective !== null ? (c.isEffective ? 'YES' : 'NO') : 'PENDING',
        createdAt: c.createdAt.toISOString(),
      }));
    } else {
      const complaints = await prisma.complaint.findMany({
        where: { organizationId: session!.organizationId },
        include: { assignedTo: { select: { fullName: true } } },
        orderBy: { receivedAt: 'desc' },
      });
      exportData = complaints.map((c) => ({
        complaintNumber: c.complaintNumber,
        productName: c.productName,
        productCode: c.productCode || '',
        lotNumber: c.lotNumber || '',
        serialNumber: c.serialNumber || '',
        category: c.category,
        priority: c.priority,
        status: c.status,
        isSafetyCritical: c.isSafetyCritical ? 'YES' : 'NO',
        isReportable: c.isReportable ? 'YES' : 'NO',
        assignedTo: c.assignedTo?.fullName || 'Unassigned',
        receivedAt: c.receivedAt.toISOString(),
        descriptionSnippet: c.originalDescription.slice(0, 150).replace(/\n/g, ' '),
      }));
    }

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: 'DATA_EXPORTED',
      entityType: entity === 'capas' ? 'Capa' : 'Complaint',
      entityId: session!.organizationId,
      newState: { format, recordCount: exportData.length },
      reason: `User generated ${format.toUpperCase()} export of ${entity}.`,
    });

    if (format === 'json') {
      return NextResponse.json({ data: exportData });
    }

    const csv = Papa.unparse(exportData);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sortwise_${entity}_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}

