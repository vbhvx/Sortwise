import { prisma } from '@/lib/db/prisma';
import { AuthSession } from '@/lib/auth/session';

export interface AuditLogParams {
  organizationId: string;
  actor?: AuthSession | null;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordAuditEvent(params: AuditLogParams) {
  try {
    const actorEmail = params.actor?.email || params.actorEmail || 'system@sortwise.internal';
    const actorId = params.actor?.userId || null;

    return await prisma.auditEvent.create({
      data: {
        organizationId: params.organizationId,
        actorId,
        actorEmail,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        previousState: params.previousState ? JSON.parse(JSON.stringify(params.previousState)) : undefined,
        newState: params.newState ? JSON.parse(JSON.stringify(params.newState)) : undefined,
        reason: params.reason || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    console.error('[AUDIT_LOG_ERROR] Failed to record audit event:', error);
    // Even if logging fails, in regulated systems we should not silently suppress, but throw or log alert
    return null;
  }
}

