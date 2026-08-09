import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { ComplaintStatus, Priority, CapaStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('reviewer@apexquality.com');
  }

  const orgId = session!.organizationId;

  const [
    totalComplaints,
    awaitingTriage,
    criticalComplaints,
    highComplaints,
    openInvestigations,
    openCapas,
    closedComplaints,
    allComplaints,
    allCapas,
    regulatoryList,
  ] = await Promise.all([
    prisma.complaint.count({ where: { organizationId: orgId } }),
    prisma.complaint.count({
      where: {
        organizationId: orgId,
        status: { in: [ComplaintStatus.RECEIVED, ComplaintStatus.AWAITING_EXTRACTION, ComplaintStatus.TRIAGE_REVIEW] },
      },
    }),
    prisma.complaint.count({
      where: {
        organizationId: orgId,
        priority: Priority.CRITICAL,
        status: { not: ComplaintStatus.CLOSED },
      },
    }),
    prisma.complaint.count({
      where: {
        organizationId: orgId,
        priority: Priority.HIGH,
        status: { not: ComplaintStatus.CLOSED },
      },
    }),
    prisma.investigation.count({
      where: {
        organizationId: orgId,
        status: { not: 'COMPLETED' },
      },
    }),
    prisma.capa.count({
      where: {
        organizationId: orgId,
        status: { notIn: [CapaStatus.CLOSED, CapaStatus.CANCELLED] },
      },
    }),
    prisma.complaint.count({
      where: { organizationId: orgId, status: ComplaintStatus.CLOSED },
    }),
    prisma.complaint.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        complaintNumber: true,
        category: true,
        priority: true,
        status: true,
        receivedAt: true,
        productName: true,
        lotNumber: true,
        isSafetyCritical: true,
        isReportable: true,
      },
      orderBy: { receivedAt: 'desc' },
    }),
    prisma.capa.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        capaNumber: true,
        status: true,
        priority: true,
        targetCompletionDate: true,
      },
    }),
    prisma.regulatoryApplicability.findMany({
      where: { organizationId: orgId },
    }),
  ]);

  // Aggregate category counts
  const categoryCounts: Record<string, number> = {};
  for (const c of allComplaints) {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
  }

  // Aggregate status counts
  const statusCounts: Record<string, number> = {};
  for (const c of allComplaints) {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  }

  // Aggregate priority counts
  const priorityCounts: Record<string, number> = {};
  for (const c of allComplaints) {
    priorityCounts[c.priority] = (priorityCounts[c.priority] || 0) + 1;
  }

  // Overdue actions count
  const now = new Date();
  const overdueCapas = allCapas.filter(
    (c) => c.targetCompletionDate && new Date(c.targetCompletionDate) < now && c.status !== CapaStatus.CLOSED
  ).length;

  return NextResponse.json({
    metrics: {
      totalComplaints,
      awaitingTriage,
      criticalComplaints,
      highComplaints,
      openInvestigations,
      openCapas,
      overdueCapas,
      closedComplaints,
      safetyCriticalCount: allComplaints.filter((c) => c.isSafetyCritical).length,
      reportableCount: allComplaints.filter((c) => c.isReportable).length,
    },
    categoryDistribution: Object.entries(categoryCounts).map(([name, count]) => ({ name, count })),
    statusDistribution: Object.entries(statusCounts).map(([name, count]) => ({ name, count })),
    priorityDistribution: Object.entries(priorityCounts).map(([name, count]) => ({ name, count })),
    regulatoryApplicability: regulatoryList,
  });
}

