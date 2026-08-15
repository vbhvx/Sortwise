# Audit Trail & Record Retention (21 CFR Part 11)

## 1. Durable Audit Trail Architecture

In compliance with FDA 21 CFR Part 11 and ISO 13485:2016 record controls:
- Every material action (complaint creation, field override, status transition, duplicate review, hypothesis certification, CAPA verification, closure) generates an immutable `AuditEvent`.
- Each audit event captures:
  - `id`: Unique identifier
  - `organizationId`: Tenant isolation key
  - `actorId` and `actorEmail`: Unambiguous attribution
  - `action`: Specific quality action verb
  - `entityType` and `entityId`: Target record reference
  - `previousState` and `newState`: Serialized state diff
  - `reason`: Mandatory documented justification
  - `createdAt`: High-resolution server timestamp

## 2. Immutability & Anti-Tamper Controls

- Ordinary application routes provide **no endpoints** for editing or deleting historical audit records.
- Source complaint narratives are cryptographically hashed using SHA-256 upon intake. The resulting hash is preserved in `complaint_sources` to provide tamper evidence if database records were altered out-of-band.

## 3. Electronic Signature Records

Formal sign-offs (e.g. Complaint Closure, Investigation Sign-off, CAPA Plan Approval, CAPA Effectiveness Verification) create dedicated `ApprovalRecord` rows storing:
- Legal signature meaning (e.g., &ldquo;I certify that this complaint has been evaluated per QMSR 820 procedures&rdquo;)
- Certified approver identity
- Timestamp
- Decision and rationale

