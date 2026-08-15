# Complaint Lifecycle & Workflow Engine

## 1. Lifecycle States

Sortwise implements a server-validated finite state machine:

| State | Purpose | Authorized Roles |
|---|---|---|
| `RECEIVED` | Initial intake state; source narrative preserved with SHA-256 hash. | All |
| `AWAITING_EXTRACTION` | Processing source text for candidate fields. | Reviewer, Admin |
| `EXTRACTION_COMPLETE` | Extracted fields and citations available for human confirmation. | Reviewer, Admin |
| `TRIAGE_REVIEW` | Reviewer evaluates risk, classification, and potential duplicates. | Reviewer, Approver, Admin |
| `UNDER_ASSESSMENT` | In-depth engineering or medical assessment underway. | Reviewer, Approver, Admin |
| `INVESTIGATION_REQUIRED` | Triage flagged case as requiring formal failure analysis. | Reviewer, Approver, Admin |
| `UNDER_INVESTIGATION` | Failure analysis active; tasks assigned, 5-Whys/Fishbone hypotheses recorded. | Investigator, Approver, Admin |
| `CAPA_IN_PROGRESS` | Root cause identified and systemic corrective/preventive actions triggered. | Investigator, Approver, Admin |
| `AWAITING_VERIFICATION` | Corrective actions implemented; monitoring effectiveness window. | Approver, Admin |
| `AWAITING_APPROVAL` | Investigation and CAPA completed; awaiting formal closure signature. | Approver, Admin |
| `CLOSED` | Formally closed with electronic signature and documented rationale. | Quality Approver, Admin |
| `REOPENED` | Reopened due to new clinical information or recurrence. | Quality Approver, Admin |
| `CANCELLED` | Invalid or retracted case. | Quality Approver, Admin |

---

## 2. Transition Rules & Pre-Requisites

- **Closure Prerequisites**:
  1. Actor must possess `complaint:close` permission (Quality Approver or Admin).
  2. Documented closure rationale is mandatory.
  3. If an investigation required CAPA, the linked CAPA must be completed and verified effective.
  4. Electronic signature approval record is generated and linked.
- **Reopening Prerequisites**:
  1. Actor must possess `complaint:reopen` permission.
  2. Mandatory documented reason.
  3. Previous closure history and audit records are preserved without overwriting.

