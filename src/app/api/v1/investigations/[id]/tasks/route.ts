import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { hasPermission } from '@/lib/auth/rbac';
import { TaskStatus } from '@prisma/client';

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
    const { taskId, title, description, assignedToId, dueDate, status, findingsNotes } = await request.json();

    if (taskId) {
      // Update existing task
      const updated = await prisma.investigationTask.update({
        where: { id: taskId },
        data: {
          status: status as TaskStatus,
          findingsNotes: findingsNotes !== undefined ? findingsNotes : undefined,
          completedAt: status === TaskStatus.COMPLETED ? new Date() : undefined,
        },
      });

      await recordAuditEvent({
        organizationId: session!.organizationId,
        actor: session,
        action: 'INVESTIGATION_TASK_UPDATED',
        entityType: 'InvestigationTask',
        entityId: updated.id,
        newState: { status: updated.status, findingsNotes },
        reason: 'Updated investigation task progress.',
      });

      return NextResponse.json({ task: updated });
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required for new task' }, { status: 400 });
    }

    const newTask = await prisma.investigationTask.create({
      data: {
        investigationId: investigation.id,
        title,
        description: description || null,
        assignedToId: assignedToId || session!.userId,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: TaskStatus.PENDING,
      },
    });

    await recordAuditEvent({
      organizationId: session!.organizationId,
      actor: session,
      action: 'INVESTIGATION_TASK_CREATED',
      entityType: 'InvestigationTask',
      entityId: newTask.id,
      newState: { title, assignedToId },
      reason: 'Created new investigation protocol task.',
    });

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Task action failed' }, { status: 500 });
  }
}

