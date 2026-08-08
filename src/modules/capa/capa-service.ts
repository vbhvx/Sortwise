import { CapaStatus, Role, Priority } from '@prisma/client';
import { hasPermission } from '@/lib/auth/rbac';

export interface CapaTransitionValidation {
  allowed: boolean;
  reason?: string;
}

export const CAPA_ALLOWED_TRANSITIONS: Record<CapaStatus, CapaStatus[]> = {
  PROPOSED: [CapaStatus.UNDER_REVIEW, CapaStatus.CANCELLED],
  UNDER_REVIEW: [CapaStatus.APPROVED, CapaStatus.PROPOSED, CapaStatus.CANCELLED],
  APPROVED: [CapaStatus.IN_PROGRESS, CapaStatus.CANCELLED],
  IN_PROGRESS: [CapaStatus.IMPLEMENTED, CapaStatus.CANCELLED],
  IMPLEMENTED: [CapaStatus.EFFECTIVENESS_REVIEW, CapaStatus.IN_PROGRESS],
  EFFECTIVENESS_REVIEW: [
    CapaStatus.VERIFIED_EFFECTIVE,
    CapaStatus.INEFFECTIVE_REOPENED,
  ],
  VERIFIED_EFFECTIVE: [CapaStatus.CLOSED],
  INEFFECTIVE_REOPENED: [CapaStatus.IN_PROGRESS, CapaStatus.UNDER_REVIEW],
  CLOSED: [CapaStatus.INEFFECTIVE_REOPENED],
  CANCELLED: [CapaStatus.PROPOSED],
};

export class CapaWorkflowService {
  static validateTransition(
    currentStatus: CapaStatus,
    targetStatus: CapaStatus,
    userRole: Role,
    context: {
      hasImplementationEvidence?: boolean;
      hasEffectivenessResults?: boolean;
      isEffective?: boolean;
      approvalRationale?: string;
    }
  ): CapaTransitionValidation {
    const validTargets = CAPA_ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!validTargets.includes(targetStatus)) {
      return {
        allowed: false,
        reason: `Invalid CAPA transition from ${currentStatus} to ${targetStatus}. Valid options: ${validTargets.join(', ')}`,
      };
    }

    // Role checks
    if (targetStatus === CapaStatus.APPROVED) {
      if (!hasPermission(userRole, 'capa:approve')) {
        return {
          allowed: false,
          reason: 'Only Quality Approvers and Administrators can formally approve a CAPA action plan.',
        };
      }
    }

    if (targetStatus === CapaStatus.IMPLEMENTED) {
      if (!context.hasImplementationEvidence) {
        return {
          allowed: false,
          reason: 'Cannot mark CAPA as implemented without recorded implementation evidence.',
        };
      }
    }

    if (targetStatus === CapaStatus.VERIFIED_EFFECTIVE) {
      if (!hasPermission(userRole, 'capa:verify')) {
        return {
          allowed: false,
          reason: 'Only Quality Approvers and Administrators can certify CAPA effectiveness verification.',
        };
      }
      if (!context.hasEffectivenessResults || context.isEffective !== true) {
        return {
          allowed: false,
          reason: 'Verification results must be documented and effectiveness confirmed before marking as VERIFIED_EFFECTIVE.',
        };
      }
    }

    if (targetStatus === CapaStatus.CLOSED) {
      if (!hasPermission(userRole, 'capa:close')) {
        return {
          allowed: false,
          reason: 'Only Quality Approvers and Administrators can formally close a CAPA.',
        };
      }
      if (currentStatus !== CapaStatus.VERIFIED_EFFECTIVE) {
        return {
          allowed: false,
          reason: 'CAPA cannot be closed until effectiveness verification has been successfully completed.',
        };
      }
    }

    return { allowed: true };
  }
}

