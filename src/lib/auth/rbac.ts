import { Role } from '@prisma/client';

export type Permission =
  | 'complaint:create'
  | 'complaint:read'
  | 'complaint:update'
  | 'complaint:triage'
  | 'complaint:assign'
  | 'complaint:close'
  | 'complaint:reopen'
  | 'investigation:create'
  | 'investigation:read'
  | 'investigation:update'
  | 'investigation:approve'
  | 'capa:create'
  | 'capa:read'
  | 'capa:update'
  | 'capa:approve'
  | 'capa:verify'
  | 'capa:close'
  | 'audit:read'
  | 'reports:export'
  | 'admin:settings';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMINISTRATOR: [
    'complaint:create',
    'complaint:read',
    'complaint:update',
    'complaint:triage',
    'complaint:assign',
    'complaint:close',
    'complaint:reopen',
    'investigation:create',
    'investigation:read',
    'investigation:update',
    'investigation:approve',
    'capa:create',
    'capa:read',
    'capa:update',
    'capa:approve',
    'capa:verify',
    'capa:close',
    'audit:read',
    'reports:export',
    'admin:settings',
  ],
  QUALITY_APPROVER: [
    'complaint:create',
    'complaint:read',
    'complaint:update',
    'complaint:triage',
    'complaint:assign',
    'complaint:close',
    'complaint:reopen',
    'investigation:create',
    'investigation:read',
    'investigation:update',
    'investigation:approve',
    'capa:create',
    'capa:read',
    'capa:update',
    'capa:approve',
    'capa:verify',
    'capa:close',
    'audit:read',
    'reports:export',
  ],
  INVESTIGATOR: [
    'complaint:create',
    'complaint:read',
    'complaint:update',
    'complaint:triage',
    'investigation:create',
    'investigation:read',
    'investigation:update',
    'capa:create',
    'capa:read',
    'capa:update',
    'audit:read',
    'reports:export',
  ],
  COMPLAINT_REVIEWER: [
    'complaint:create',
    'complaint:read',
    'complaint:update',
    'complaint:triage',
    'complaint:assign',
    'investigation:read',
    'capa:read',
    'audit:read',
    'reports:export',
  ],
  READONLY_AUDITOR: [
    'complaint:read',
    'investigation:read',
    'capa:read',
    'audit:read',
    'reports:export',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(permission);
}

