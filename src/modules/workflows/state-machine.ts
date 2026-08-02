import { ComplaintStatus, Role, Priority } from '@prisma/client';
import { hasPermission } from '@/lib/auth/rbac';

export interface TransitionContext {
  userRole: Role;
  userId: string;
  hasExtraction?: boolean;
  hasRiskAssessment?: boolean;
  hasInvestigation?: boolean;
  investigationCompleted?: boolean;
  hasRootCause?: boolean;
  capaRequired?: boolean;
  hasCapa?: boolean;
  capaCompleted?: boolean;
  hasFormalApproval?: boolean;
  rationale?: string;
}

export interface TransitionValidationResult {
  allowed: boolean;
  reason?: string;
  requiredFields?: string[];
}

export const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  RECEIVED: [
    ComplaintStatus.AWAITING_EXTRACTION,
    ComplaintStatus.TRIAGE_REVIEW,
    ComplaintStatus.CANCELLED,
  ],
  AWAITING_EXTRACTION: [
    ComplaintStatus.EXTRACTION_COMPLETE,
    ComplaintStatus.TRIAGE_REVIEW,
    ComplaintStatus.CANCELLED,
  ],
  EXTRACTION_COMPLETE: [
    ComplaintStatus.TRIAGE_REVIEW,
    ComplaintStatus.UNDER_ASSESSMENT,
    ComplaintStatus.CANCELLED,
  ],
  TRIAGE_REVIEW: [
    ComplaintStatus.UNDER_ASSESSMENT,
    ComplaintStatus.INVESTIGATION_REQUIRED,
    ComplaintStatus.AWAITING_APPROVAL,
    ComplaintStatus.CLOSED,
    ComplaintStatus.CANCELLED,
  ],
  UNDER_ASSESSMENT: [
    ComplaintStatus.INVESTIGATION_REQUIRED,
    ComplaintStatus.AWAITING_APPROVAL,
    ComplaintStatus.CLOSED,
    ComplaintStatus.CANCELLED,
  ],
  INVESTIGATION_REQUIRED: [
    ComplaintStatus.UNDER_INVESTIGATION,
    ComplaintStatus.CANCELLED,
  ],
  UNDER_INVESTIGATION: [
    ComplaintStatus.CAPA_IN_PROGRESS,
    ComplaintStatus.AWAITING_VERIFICATION,
    ComplaintStatus.AWAITING_APPROVAL,
    ComplaintStatus.CANCELLED,
  ],
  CAPA_IN_PROGRESS: [
    ComplaintStatus.AWAITING_VERIFICATION,
    ComplaintStatus.UNDER_INVESTIGATION,
    ComplaintStatus.CANCELLED,
  ],
  AWAITING_VERIFICATION: [
    ComplaintStatus.AWAITING_APPROVAL,
    ComplaintStatus.CAPA_IN_PROGRESS,
    ComplaintStatus.UNDER_INVESTIGATION,
  ],
  AWAITING_APPROVAL: [
    ComplaintStatus.CLOSED,
    ComplaintStatus.UNDER_INVESTIGATION,
    ComplaintStatus.CAPA_IN_PROGRESS,
  ],
  CLOSED: [
    ComplaintStatus.REOPENED,
  ],
  REOPENED: [
    ComplaintStatus.UNDER_ASSESSMENT,
    ComplaintStatus.UNDER_INVESTIGATION,
    ComplaintStatus.TRIAGE_REVIEW,
  ],
  CANCELLED: [
    ComplaintStatus.REOPENED,
  ],
};

export function validateStateTransition(
  currentStatus: ComplaintStatus,
  targetStatus: ComplaintStatus,
  context: TransitionContext
): TransitionValidationResult {
  // 1. Check if the transition is defined in the state graph
  const validNextStates = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!validNextStates.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition complaint from ${currentStatus} to ${targetStatus}. Valid target states are: ${validNextStates.join(', ')}`,
    };
  }

  // 2. Role permission checks
  if (targetStatus === ComplaintStatus.CLOSED) {
    if (!hasPermission(context.userRole, 'complaint:close')) {
      return {
        allowed: false,
        reason: 'Only Quality Approvers and Administrators have authorization to close a complaint.',
      };
    }

    if (!context.rationale || context.rationale.trim().length < 5) {
      return {
        allowed: false,
        reason: 'A documented closure rationale (minimum 5 characters) is required for compliance auditability.',
      };
    }

    if (context.capaRequired && !context.capaCompleted) {
      return {
        allowed: false,
        reason: 'Cannot close complaint: Linked CAPA is required and has not yet been verified/completed.',
      };
    }
  }

  if (targetStatus === ComplaintStatus.REOPENED) {
    if (!hasPermission(context.userRole, 'complaint:reopen')) {
      return {
        allowed: false,
        reason: 'Only Quality Approvers and Administrators have authority to reopen a closed complaint.',
      };
    }

    if (!context.rationale || context.rationale.trim().length < 5) {
      return {
        allowed: false,
        reason: 'A documented reason for reopening is required by quality procedures.',
      };
    }
  }

  if (targetStatus === ComplaintStatus.UNDER_INVESTIGATION) {
    if (!hasPermission(context.userRole, 'investigation:create')) {
      return {
        allowed: false,
        reason: 'User does not have permission to initiate or work on an investigation.',
      };
    }
  }

  if (targetStatus === ComplaintStatus.CAPA_IN_PROGRESS) {
    if (!hasPermission(context.userRole, 'capa:create')) {
      return {
        allowed: false,
        reason: 'User does not have permission to initiate a CAPA workflow.',
      };
    }
  }

  return { allowed: true };
}

