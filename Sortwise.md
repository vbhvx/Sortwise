# Technical Specification: AI-Assisted Complaint Management & Quality Intelligence Platform

**Project type:** Full-stack engineering and AI application  
**Product category:** Complaint Management · Quality Management · AI-Assisted Triage · Root-Cause Analysis · CAPA  
**Target industries:** Manufacturing · Pharmaceuticals · Medical Devices · Other complaint-driven quality operations  
**Platform:** Responsive web application  
**Architecture:** Next.js · React · TypeScript · PostgreSQL  
**AI capabilities:** Complaint extraction · Classification assistance · Risk indicators · Duplicate detection · Investigation support · Root-cause analysis assistance  
**Core principle:** Every complaint must have a traceable path from initial report to review, investigation, resolution, and any resulting corrective action.

## Objective

Build a complete, maintainable complaint management platform that transforms inconsistent, unstructured complaint reports into organized, reviewable, risk-aware, and auditable workflows.

Organizations handling customer complaints often depend on emails, forms, spreadsheets, support tickets, and manually written reports. Information is inconsistent, important details can be missed, similar cases may be handled separately, and decisions are difficult to trace across the full complaint lifecycle.

This creates several problems:

- Complaints take too long to review and classify.
- Important risk indicators can remain hidden in unstructured descriptions.
- Duplicate complaints consume investigation resources.
- Product, batch, supplier, and issue relationships are difficult to identify.
- Root-cause investigations are inconsistent.
- Corrective actions become disconnected from the complaints that triggered them.
- Review approvals and decision histories are difficult to reconstruct.
- Organizations struggle to demonstrate why a complaint was classified, investigated, escalated, or closed.

Build a system that connects the entire lifecycle:

**Complaint intake → Data extraction → Triage → Risk assessment → Duplicate review → Investigation → Root-cause analysis → Corrective action → Verification → Closure.**

AI should reduce repetitive analysis and help reviewers find relevant evidence. It must not silently replace qualified human judgment, invent complaint details, manufacture investigation findings, or make unapproved safety or regulatory decisions.

**Priority order:** data integrity → complaint traceability → risk-aware triage → duplicate detection → controlled investigation workflows → CAPA traceability → AI reliability → auditability → security → testing and deployment.

The deliverable must be a working application, not simply a dashboard mockup, chatbot, or collection of generated summaries.

---

## 1. Scope and acceptance criteria

### Required for the initial release

- Secure authentication and role-based access.
- Organization and workspace management where multi-tenant operation is required.
- Complaint creation through manual entry and supported document imports.
- Structured complaint forms and unstructured-text intake.
- Normalization into a canonical complaint data model.
- Evidence-preserving complaint extraction.
- Configurable complaint categories and statuses.
- Human-reviewable triage and risk indicators.
- Duplicate and related-case detection.
- Complaint search, filtering, and case history.
- Investigation assignments, tasks, findings, and supporting evidence.
- Root-cause analysis assistance.
- CAPA creation and linkage to originating complaints and investigations.
- Review, approval, verification, and closure workflows.
- Immutable or tamper-evident audit history for material actions.
- AI-generated suggestions with supporting evidence and human-review status.
- Notifications and escalation rules.
- Dashboard metrics based on reproducible calculations.
- Searchable reports and data export.
- Automated tests for critical workflows and permissions.
- Reproducible local setup, environment configuration, and deployment documentation.

### Required functional behavior

The system must allow a reviewer to:

1. Receive or create a complaint.
2. Review the original source information.
3. Inspect extracted fields and correct errors.
4. Assess the complaint using the applicable risk workflow.
5. Review possible duplicates or related cases.
6. Determine the required next step through the authorized workflow.
7. Assign an investigation when required.
8. Record findings, evidence, and root-cause hypotheses.
9. Create corrective or preventive actions when justified.
10. Verify action effectiveness where required.
11. Close the case only after applicable review and approval requirements are satisfied.
12. Reconstruct who did what, when, and why from the audit history.

### Explicitly out of scope unless the core system is complete

- Automatically determining that a product is safe.
- Automatically rejecting complaints solely because an AI model rates them as low risk.
- Making final reportability decisions without the required human review.
- Automatically closing a complaint because a language model generated a resolution.
- Claiming compliance with every regulated industry.
- Replacing an organization's approved quality-management procedures.
- Automatically submitting regulatory reports without a separately authorized and validated workflow.
- Training custom machine-learning models before a reliable baseline workflow exists.
- Building unnecessary microservices or distributed infrastructure.
- Generating fictional complaint data that looks like authentic production records.
- Treating a generated CAPA recommendation as proof that an action was implemented or effective.

The application should initially provide complaint management and quality-workflow capabilities that can be configured for a particular operating context. Additional compliance-specific behavior must be enabled only after the applicable requirements have been identified and implemented.

---

## 2. Product principles and operating boundaries

### 2.1 Preserve the original evidence

The submitted complaint is the source record.

Never overwrite the original complaint text merely because it has been normalized, summarized, translated, or classified by AI.

Keep the original content and any extracted or derived representations distinguishable.

### 2.2 Separate facts from interpretations

Every important case attribute should distinguish between:

- Information explicitly provided by the complainant.
- Information extracted from an imported document.
- Information entered or corrected by an employee.
- A deterministic rule result.
- An AI-generated suggestion.
- An investigator's finding.
- An approved quality decision.
- An unresolved question or hypothesis.

A generated summary must not silently become an approved investigation finding.

### 2.3 Human accountability

Safety-critical, reportability-related, high-risk, and closure decisions must follow the configured approval process.

AI may identify possible risks, missing information, relevant cases, or potential causes. Authorized personnel remain responsible for decisions that require human judgment.

### 2.4 Evidence-backed recommendations

The platform must explain why a complaint was flagged, why a duplicate is suspected, or why a particular root cause was suggested.

Where evidence is insufficient, the system must say so.

### 2.5 Traceability across the lifecycle

A complaint should not become disconnected from its investigation, identified root cause, corrective action, verification evidence, or closure decision.

Maintain explicit relationships between all relevant records.

### 2.6 Configurable workflows, not hardcoded regulations

Complaint types, severity definitions, deadlines, approval requirements, retention rules, and reportability workflows can vary by product, industry, organization, and jurisdiction.

Keep these rules configurable and versioned.

Do not assume that a single universal workflow satisfies every quality-management or regulatory requirement.

---

## 3. Target users and workflow

### Primary persona: complaint reviewer

Receives inconsistent reports, identifies missing information, assigns categories, checks for duplicates, and determines the next review step.

### Secondary persona: quality or investigation specialist

Investigates complaints, reviews evidence, documents findings, identifies root causes, and tracks corrective actions.

### Quality manager or approver

Reviews escalations, oversees quality decisions, approves required actions, and verifies that closure conditions have been met.

### System administrator

Configures users, roles, complaint categories, severity criteria, workflow rules, and permitted integrations.

### Auditor or read-only reviewer

Inspects complaint records, approvals, evidence, audit history, and relevant reports without modifying records.

### Core workflow

```text
Complaint Submitted
        |
        v
Original Record Preserved
        |
        v
Extraction and Validation
        |
        v
Human Review of Extracted Fields
        |
        v
Triage and Risk Assessment
        |
        v
Duplicate / Related-Case Review
        |
        v
Investigation Decision
        |
        v
Investigation and Evidence
        |
        v
Root-Cause Analysis
        |
        v
Corrective / Preventive Actions
        |
        v
Action Verification
        |
        v
Authorized Closure
```

Actual workflow transitions must depend on the configured complaint type, risk assessment, and approval requirements. Not every complaint requires the same investigation or CAPA path.

---

## 4. Technology stack and architecture

Inspect the existing repository before changing the stack. Preserve viable existing infrastructure.

If building from scratch, use a straightforward TypeScript-based architecture.

| Component | Recommended choice | Purpose |
|---|---|---|
| Frontend | Next.js, React, TypeScript | Responsive application |
| Styling | Tailwind CSS or existing design system | Consistent UI |
| Backend | Next.js server modules or a separate typed API service | Business logic and workflows |
| Validation | Zod or equivalent | Runtime validation |
| Database | PostgreSQL | Persistent complaint and quality records |
| ORM | Prisma or equivalent | Schema and migrations |
| File storage | Private object storage | Complaint documents and evidence |
| Background jobs | Durable worker where required | Imports, extraction, notifications |
| AI integration | Replaceable LLM adapter | Extraction assistance and analysis |
| Search | PostgreSQL full-text search initially | Complaint and evidence search |
| Similarity search | Optional embedding/vector service | Duplicate-candidate discovery |
| Testing | Unit and integration tests | Workflow and data correctness |
| Browser testing | Playwright | End-to-end validation |
| Deployment | Compatible managed application and database hosting | Reproducible operations |
| CI | Lint, type, test, and build checks | Engineering verification |

Use a modular monolith for the initial implementation.

Separate the following logical domains:

- Complaint intake.
- Document and evidence management.
- Extraction and normalization.
- Triage and risk assessment.
- Duplicate detection.
- Investigations.
- Root-cause analysis.
- CAPA.
- Workflow and approvals.
- Audit and reporting.
- AI services.
- Integration adapters.
- Identity and authorization.

Do not introduce separate services unless the existing architecture or measured workload justifies them.

---

## 5. High-level system architecture

```text
Complaint Sources
    ├── Manual Forms
    ├── Emails / Text Imports
    ├── Supported Documents
    └── Configured External Integrations
                  |
                  v
          Intake and Validation
                  |
                  v
       Original Record Preservation
                  |
                  v
      Extraction and Normalization
                  |
                  v
          Canonical Complaint
                  |
       +----------+-----------+
       |          |           |
       v          v           v
     Triage    Duplicate    Evidence
    Assistance Detection   Management
       |          |           |
       +----------+-----------+
                  |
                  v
       Human-Reviewed Workflow
                  |
        +---------+---------+
        |                   |
        v                   v
  Investigation       Escalation /
        |               Approval
        v
  Root-Cause Analysis
        |
        v
  Corrective / Preventive Actions
        |
        v
  Verification and Closure
        |
        v
  Reports + Audit Trail
```

### Architecture rules

- The original complaint record must remain available after processing.
- Derived fields must retain source and extraction provenance.
- The complaint and quality workflow must not depend on an AI provider being available.
- Every material status transition must be validated server-side.
- User permissions must be checked at every operation.
- AI suggestions must remain distinguishable from human decisions.
- Audit history must not be editable through ordinary application workflows.
- Failed integrations or AI calls must not silently change the complaint's meaning or status.
- High-risk and overdue cases must not become invisible because of background-job failures.

---

## 6. Complaint intake and data normalization

### 6.1 Supported intake methods

Support:

- Manual complaint entry.
- Structured complaint forms.
- CSV import where appropriate.
- Supported document uploads.
- Email or ticket imports only when explicitly implemented and configured.
- Authorized external integrations where verified.

Do not claim support for every PDF, email system, ticketing application, or document type.

### 6.2 Canonical complaint model

Normalize each complaint into a common data structure while preserving the original source.

A complaint should support fields such as:

| Field | Purpose |
|---|---|
| Complaint ID | Stable internal identifier |
| Organization ID | Tenant or workspace ownership |
| External reference | Source-system identifier where available |
| Source type | Manual, import, email, integration, or other configured source |
| Received timestamp | When the organization received the complaint |
| Occurrence timestamp | When the reported event occurred, if known |
| Complainant reference | Authorized reference to the complainant |
| Product or service | Reported product, service, or affected process |
| Batch, lot, or serial reference | Relevant traceability identifier, where applicable |
| Original description | Preserved complaint text |
| Normalized description | Optional structured representation |
| Complaint category | Assigned or proposed classification |
| Reported impact | Information supplied about consequences |
| Risk assessment | Versioned assessment result |
| Duplicate candidates | References to potentially related records |
| Status | Current workflow state |
| Owner | Assigned reviewer or investigator |
| Investigation reference | Related investigation |
| CAPA references | Related corrective actions |
| Source references | Documents, emails, and other evidence |
| Created and updated timestamps | Record lifecycle |
| Review status | Whether required human review is complete |

Industry-specific fields must be added through validated extensions rather than forcing every organization into one incompatible schema.

### 6.3 Preserve raw source material

For every imported complaint, retain a reference to the original document or record when retention and access policies permit.

Record:

- Source system.
- Original external identifier.
- Received time.
- Import or processing batch.
- File hash where appropriate.
- Extraction version.
- Validation outcomes.
- Original-to-normalized field mapping.

Do not use a generated summary as a substitute for the original complaint.

### 6.4 Extraction and validation

The extraction pipeline must:

1. Read a supported input.
2. Identify available fields.
3. Extract candidate values.
4. Validate field types and formatting.
5. Preserve citations to the source location where possible.
6. Identify missing or conflicting information.
7. Request human correction where needed.
8. Save the normalized record after the required validation step.

For documents, retain page references or text-span references when practical so reviewers can check extracted values against their source.

If OCR or document parsing fails, mark extraction as incomplete rather than inventing missing values.

### 6.5 Data-quality statuses

Support clear states such as:

- Received.
- Awaiting extraction.
- Extraction complete.
- Review required.
- Incomplete.
- Validation failed.
- Ready for triage.
- Processing failed.

Do not make a complaint appear complete simply because an ingestion job ended.

---

## 7. Risk-based triage

Implement a configurable triage engine that helps users identify which cases require prompt review.

### 7.1 Triage objectives

Assist reviewers in determining:

- What type of complaint has been received.
- Whether the reported issue may affect safety or product quality.
- Whether the complaint needs urgent review.
- Whether additional information is required.
- Whether an investigation may be warranted.
- Whether a configured escalation process should be triggered.
- Whether a deadline or service-level objective applies.

The triage system must not silently make final safety or regulatory decisions.

### 7.2 Risk factors

Support configurable factors appropriate to the organization and industry, such as:

- Reported injury or harm.
- Potential product malfunction.
- Product contamination or quality defect.
- Severity of the reported outcome.
- Potential scope or number of affected units.
- Recurrence of similar complaints.
- Evidence of an unresolved product issue.
- Product or batch traceability.
- Missing or contradictory information.
- Relevant source-system classifications.

The exact factors, scoring rules, weights, and escalation thresholds must be approved by the organization. Do not invent a supposedly universal risk-scoring formula.

### 7.3 Risk assessment output

Store:

- Assessment version.
- Applied rules.
- Evidence used.
- Missing information.
- Suggested priority or review category.
- Rationale.
- Confidence or uncertainty information where justified.
- Responsible reviewer.
- Human decision and timestamp.
- Any override and its documented reason.

If an AI model contributes to triage, keep its proposed classification separate from the final approved assessment.

### 7.4 Human review and escalation

High-risk indicators, possible serious harm, and other configured escalation conditions must trigger the approved review process.

The system must not automatically downgrade a case because an AI model cannot detect risk in the text.

Missing information must not automatically mean low risk.

A reviewer must be able to override an AI suggestion, and the system must record the decision and its rationale.

### 7.5 Deadlines and overdue cases

Support configurable review deadlines and escalation rules.

Calculate deadlines using the applicable rule configuration and recorded timestamps.

Display overdue cases clearly. Failed notifications must not erase or reset overdue status.

---

## 8. Duplicate detection and related-case analysis

Implement duplicate detection as a reviewable matching workflow, not an automatic deletion mechanism.

### 8.1 Matching signals

Use available evidence such as:

- Product or service identifier.
- Batch, lot, or serial number.
- Normalized problem description.
- Error or defect category.
- Occurrence date.
- Reported symptoms.
- External reference.
- Shared documented attributes.
- Text similarity where appropriate.

Use exact identifiers and deterministic matches first. Use semantic similarity or embeddings only as additional signals.

### 8.2 Duplicate classifications

Distinguish:

- Confirmed duplicate.
- Possible duplicate.
- Related complaint.
- Similar problem, distinct case.
- Unrelated complaint.
- Insufficient information.

A related complaint is not necessarily a duplicate. Different customers may independently report the same genuine issue.

### 8.3 Duplicate-review interface

Show:

- Matching complaint references.
- Similarity or matching criteria.
- Shared and conflicting fields.
- Source descriptions.
- Relevant product or batch metadata.
- Current status of related cases.
- A rationale for the suggested relationship.

Allow authorized reviewers to confirm, reject, or defer the suggestion.

### 8.4 Duplicate behavior

Never delete a complaint simply because an AI model considers it similar to another record.

If a confirmed duplicate is linked to a primary case, preserve the duplicate record's identifier, source, history, and relationship.

The system must preserve the ability to inspect each original report independently.

### 8.5 Related-case clustering

Support an optional view that groups complaints with common characteristics.

Clusters must show the underlying complaint records and the rules or similarity criteria used to group them.

Do not claim that a cluster proves a common root cause. That conclusion belongs to the subsequent investigation process.

---

## 9. Complaint lifecycle and workflow engine

Implement a configurable state machine that governs complaint progression.

### 9.1 Suggested states

Possible states include:

`received`, `processing`, `needs_information`, `triage_review`, `under_assessment`, `investigation_required`, `under_investigation`, `capa_in_progress`, `awaiting_verification`, `awaiting_approval`, `closed`, `reopened`, `cancelled`.

Use only states supported by the actual operating model. Their transitions and meaning must be documented.

### 9.2 Transition controls

Every state transition must verify:

- Current status.
- Requested transition.
- User role and permissions.
- Required fields.
- Required review records.
- Applicable approval rules.
- Mandatory supporting evidence.
- Deadline and escalation implications.

A frontend button is not an authorization control.

### 9.3 Assignment and ownership

Support assignment to reviewers, investigators, approvers, or designated teams.

Track assignment changes, responsibilities, due dates, and completion status.

Do not allow an unrelated user to modify a complaint merely because they know its identifier.

### 9.4 Reopening

Allow authorized users to reopen a closed complaint when supported by the approved workflow.

Record the reason, actor, timestamp, and subsequent state transitions.

Do not erase the original closure decision.

### 9.5 Closure criteria

Define closure rules per complaint type and operating context.

Possible requirements include:

- Required investigation completed or justified as not required.
- Required findings documented.
- Required actions completed.
- Required verification completed.
- Required reviews and approvals recorded.
- Supporting evidence retained.
- Closure rationale supplied.

Do not force every complaint through CAPA if the applicable procedure does not require it. Conversely, do not skip mandatory actions merely to simplify closure.

---

## 10. Investigation and root-cause analysis

Provide structured investigation tools that allow investigators to record facts, hypotheses, evidence, and conclusions separately.

### 10.1 Investigation record

Each investigation should support:

- Linked complaint or complaint cluster.
- Investigation owner.
- Investigation scope.
- Issue statement.
- Investigation plan.
- Tasks and due dates.
- Evidence references.
- Findings.
- Hypotheses.
- Root-cause conclusions.
- Unresolved questions.
- Required approvals.
- Investigation outcome.
- Closure or escalation rationale.

### 10.2 Evidence management

Allow evidence attachments and references to relevant records.

For each evidence item, preserve appropriate metadata such as:

- Evidence ID.
- Type.
- Source.
- Linked complaint or investigation.
- Upload or observation timestamp.
- Submitter.
- File hash where appropriate.
- Description.
- Version.
- Access classification.
- Retention policy.

Never replace original evidence with an AI summary.

### 10.3 Root-cause analysis support

Provide optional templates for commonly used approaches, such as:

- Five Whys.
- Fishbone or cause-and-effect analysis.
- Failure mode or defect categorization.
- Evidence-based hypothesis testing.

The platform should not force one method on every case.

### 10.4 AI-assisted investigation

The assistant may:

- Summarize the complaint and available evidence.
- Extract relevant facts from approved documents.
- Identify missing information.
- Suggest investigation questions.
- Highlight similar historical cases.
- Propose possible root-cause hypotheses.
- Help structure findings.
- Draft an investigation summary.

Every AI-generated hypothesis must be labeled as a hypothesis.

The system must not promote a possible root cause to an approved finding without the required human decision and supporting evidence.

### 10.5 Investigation closure

Record:

- Findings.
- Evidence reviewed.
- Determined root cause, if established.
- Remaining uncertainty.
- Whether further investigation is needed.
- The responsible reviewer.
- Approval details.
- Related corrective actions.

If the cause remains unknown, represent that outcome explicitly rather than fabricating a conclusive explanation.

---

## 11. Corrective and Preventive Action (CAPA)

Implement CAPA management as a traceable workflow connected to complaint and investigation records.

### 11.1 CAPA record

Support fields such as:

- CAPA ID.
- Title and description.
- Triggering complaints.
- Related investigations.
- Identified issue and root cause.
- Corrective action.
- Preventive action, where applicable.
- Owner.
- Due date.
- Priority.
- Required approvals.
- Implementation evidence.
- Verification plan.
- Effectiveness criteria.
- Verification results.
- Final approval.
- Status and timestamps.

### 11.2 CAPA lifecycle

A configurable workflow may include:

`proposed → under_review → approved → in_progress → implemented → effectiveness_review → completed`.

Additional states may be needed for rejection, cancellation, overdue work, or reopening.

Validate every transition according to configured permissions and prerequisites.

### 11.3 Action verification

Distinguish between:

- Action proposed.
- Action approved.
- Action implemented.
- Evidence submitted.
- Effectiveness verified.
- Action formally closed.

An action being marked implemented does not automatically establish effectiveness.

Capture the verification evidence, criteria, reviewer, result, and any required follow-up.

### 11.4 Complaint-to-CAPA traceability

Users must be able to navigate both directions:

- From complaint to investigation and CAPA.
- From CAPA to all linked complaints and investigations.

Support multiple complaints linked to one CAPA where the approved operating model permits this.

Prevent duplicate action records where multiple similar complaints lead to a shared corrective effort.

### 11.5 Overdue actions

Track action owners, due dates, overdue states, and escalations.

If a required action becomes overdue, preserve that condition even if a background notification fails.

---

## 12. AI architecture and evidence grounding

The AI subsystem must improve efficiency without becoming the system of record or the final decision-maker.

### 12.1 Supported AI tasks

Implement AI as a collection of bounded capabilities:

- Complaint field extraction.
- Plain-language complaint summaries.
- Suggested categorization.
- Missing-information detection.
- Duplicate candidate discovery.
- Triage-support explanations.
- Similar-case search summaries.
- Investigation planning assistance.
- Root-cause hypothesis generation.
- Draft CAPA suggestions.
- Draft communications or reports.

Do not attempt to build every capability before the core complaint lifecycle works reliably.

### 12.2 AI processing pipeline

1. Retrieve the authorized source record.
2. Identify the task and required data.
3. Minimize the information sent to the model.
4. Send a structured, schema-constrained request.
5. Validate the model response.
6. Check references against actual source records.
7. Store the output as a proposal or analysis result.
8. Present the evidence and uncertainty to the reviewer.
9. Capture human acceptance, correction, or rejection.
10. Record the applicable model, prompt, and processing version metadata where appropriate.

### 12.3 Evidence grounding

The AI must only cite documents and complaint records that were actually retrieved.

For each important suggested fact, retain a reference to its source where technically feasible.

If a source is unavailable, contradictory, or insufficient, the model must acknowledge the gap.

Do not fabricate quotations, document references, complaint identifiers, product attributes, root causes, or safety findings.

### 12.4 Structured output

Use typed schemas for AI responses.

For example, a triage suggestion could include:

- Proposed category.
- Proposed priority.
- Evidence references.
- Missing fields.
- Rationale.
- Uncertainty indicators.
- Suggested next review step.

Treat this output as an advisory result, not an approved workflow decision.

### 12.5 AI failure behavior

If the AI service is unavailable or returns invalid output:

- Preserve the original complaint.
- Continue manual review.
- Mark the AI task as failed or unavailable.
- Record a safe diagnostic.
- Avoid changing approved values.
- Allow retry within defined resource limits.

### 12.6 Prompt-injection defense

Treat complaint text, attached documents, email content, external case records, and other imported material as untrusted data.

Instructions found inside a complaint or attachment must never override the application's authorization or AI policies.

The AI must not receive unrestricted SQL, unrestricted network access, or direct tools for bypassing workflow approvals.

### 12.7 AI quality evaluation

Maintain a versioned evaluation dataset covering:

- Field extraction.
- Classification.
- Missing information.
- Duplicate suggestions.
- Risk-related language.
- Contradictory evidence.
- Unsupported conclusions.
- Prompt-injection attempts.

Evaluate the system on relevant, approved examples before enabling a model or prompt version in production.

Do not claim that an AI confidence score is calibrated or that a model is clinically, scientifically, or regulatorily validated without supporting validation evidence.

---

## 13. Regulatory configuration and auditability

This platform must support auditable complaint operations, but it must not claim blanket regulatory compliance.

The applicable requirements depend on the product, industry, operating jurisdiction, and organizational procedures.

### 13.1 Regulatory applicability register

Before enabling a regulated workflow, document:

- Target industry and product scope.
- Operating jurisdiction.
- Applicable rules and standards.
- Official source references.
- Review date.
- Required records and retention.
- Required review or approval steps.
- Reportability assessment process.
- Role and responsibility requirements.
- Validation requirements.
- Responsible compliance owner.
- Approval status.

For US medical-device complaint workflows, review the FDA's current [Quality Management System Regulation (QMSR)](https://www.fda.gov/medical-devices/postmarket-requirements-devices/quality-management-system-regulation-qmsr), which became effective on February 2, 2026. Applicability depends on the regulated product and manufacturer context.

For US drug-product complaint records, review the current text of [21 CFR 211.198](https://ecfr.io/Title-21/Section-211.198). Its complaint-file provisions address written procedures, complaint review, investigation-related records, and documentation when an investigation is not considered necessary.

These examples do not establish that the application is compliant with either framework. The implementation team must determine which requirements apply to the intended users and operating model.

### 13.2 Configurable compliance controls

Implement configurable controls for:

- Required fields.
- Review responsibility.
- Investigation requirements.
- Escalation conditions.
- Approval steps.
- Document retention.
- Closure prerequisites.
- Record corrections.
- Audit events.
- Report templates.

Version material rule changes. A historical complaint should retain the rule and workflow context applicable to its recorded decisions.

### 13.3 Audit history

Maintain a durable history of material events, including:

- Complaint creation.
- Import and extraction.
- Field corrections.
- Classification changes.
- Risk assessments.
- Duplicate review decisions.
- Assignment changes.
- Investigation findings.
- Root-cause conclusions.
- CAPA changes.
- Approvals.
- Closure and reopening.
- Exports and relevant administrative actions.

Each audit event should contain an event ID, actor, action, target record, timestamp, relevant previous and new values where appropriate, and a reason for consequential decisions.

Protect audit records from editing through ordinary application workflows. Use appropriate integrity controls for the deployment's requirements.

### 13.4 Electronic approvals

If approval records are used to satisfy a regulated operating requirement, define and validate the necessary identity, authentication, attribution, meaning, timestamp, record linkage, and integrity controls.

Do not assume a simple button click constitutes a legally sufficient electronic signature.

### 13.5 Compliance claims

Do not label the application “FDA compliant,” “GMP compliant,” or universally compliant merely because it records complaints and audit events.

Compliance depends on the applicable requirements, the complete operating process, validated controls, records, organizational procedures, and actual implementation.

---

## 14. Database schema

Use PostgreSQL with versioned migrations, foreign keys, indexes, and appropriate tenant isolation.

The minimum conceptual schema should include the following.

| Table | Purpose |
|---|---|
| `organizations` | Organization or workspace ownership |
| `users` | User identity and status |
| `organization_memberships` | Organization membership and role |
| `complaints` | Canonical complaint records |
| `complaint_sources` | Original source metadata and provenance |
| `complaint_attachments` | Evidence attachments and storage references |
| `complaint_extractions` | Versioned extracted fields and confidence metadata |
| `complaint_classifications` | Proposed and approved classifications |
| `risk_assessments` | Versioned rule- and human-reviewed risk results |
| `complaint_relationships` | Duplicate and related-case links |
| `investigations` | Investigation scope, owner, status, and findings |
| `investigation_tasks` | Assigned tasks and due dates |
| `investigation_evidence` | Evidence associated with investigations |
| `root_cause_hypotheses` | Proposed causes and verified findings |
| `capas` | Corrective and preventive actions |
| `capa_complaint_links` | Complaint-to-CAPA relationships |
| `capa_evidence` | Implementation and verification evidence |
| `workflow_definitions` | Configurable states and transitions |
| `workflow_versions` | Versioned workflow configurations |
| `approvals` | Review and approval records |
| `audit_events` | Durable record of material actions |
| `ai_analysis_runs` | AI task metadata and outcomes |
| `notifications` | Escalations and user notifications |
| `integration_runs` | External intake or synchronization history |

### Core table behavior

**`complaints`**

Include a stable ID, organization ID, source reference, receipt and occurrence timestamps, complainant reference where permitted, product identifiers, original description, normalized fields, current status, owner, and timestamps.

**`complaint_sources`**

Preserve the source system, external identifier, original record reference, ingestion time, source content hash, and permitted raw-source reference.

**`complaint_extractions`**

Store extracted values, evidence references, schema version, extraction method, processing status, and review state.

**`risk_assessments`**

Store the rule version, factors considered, source evidence, suggested outcome, uncertainty, reviewer, final decision, and rationale.

**`complaint_relationships`**

Store the relationship type, linked records, matching method, evidence, reviewer decision, and timestamps.

**`investigations`**

Store the investigation scope, assigned owner, status, findings, supporting evidence, relevant root-cause records, and review outcome.

**`capas`**

Store action descriptions, responsible owners, dates, status, required approvals, implementation evidence, verification criteria, effectiveness results, and closure information.

**`approvals`**

Store the approved record, action, actor, timestamp, applicable version, decision, and reason where required.

**`audit_events`**

Store material events in a durable form. Prevent ordinary application permissions from editing or deleting the audit history.

### Database requirements

- Enforce organization ownership and user permissions.
- Use transactions for multi-record state changes.
- Preserve complaint-source evidence.
- Record relationships without cascading away important historical evidence.
- Use unique constraints for stable external identifiers where appropriate.
- Index complaint status, received date, product identifiers, category, priority, owner, and organization.
- Define file-retention and deletion rules.
- Keep secrets out of ordinary data records.
- Support versioned schema and workflow migrations.
- Ensure tenant isolation is enforced server-side and, where appropriate, through database policies.
- Never store model-generated data as verified facts without the required review.

---

## 15. Backend API contract

Implement versioned, validated APIs. Enforce authorization and workflow rules on the server.

### Complaints

- `GET /api/v1/complaints`
- `POST /api/v1/complaints`
- `GET /api/v1/complaints/{complaintId}`
- `PATCH /api/v1/complaints/{complaintId}`
- `POST /api/v1/complaints/{complaintId}/submit`
- `POST /api/v1/complaints/{complaintId}/assign`
- `POST /api/v1/complaints/{complaintId}/transition`

### Intake and extraction

- `POST /api/v1/intake`
- `POST /api/v1/complaints/{complaintId}/extract`
- `GET /api/v1/complaints/{complaintId}/extraction`
- `POST /api/v1/complaints/{complaintId}/confirm-extraction`
- `GET /api/v1/imports/{batchId}`

Implement only the source formats and ingestion methods that actually exist. Validate source records before committing normalized data.

### Triage and risk assessment

- `POST /api/v1/complaints/{complaintId}/triage`
- `GET /api/v1/complaints/{complaintId}/risk-assessments`
- `POST /api/v1/complaints/{complaintId}/risk-assessments/{assessmentId}/review`

AI recommendations must not directly bypass the approved workflow.

### Duplicate and related cases

- `GET /api/v1/complaints/{complaintId}/related`
- `POST /api/v1/complaints/{complaintId}/relationships`
- `POST /api/v1/relationships/{relationshipId}/review`

A duplicate relationship must retain evidence and review history.

### Investigations

- `GET /api/v1/complaints/{complaintId}/investigation`
- `POST /api/v1/complaints/{complaintId}/investigations`
- `PATCH /api/v1/investigations/{investigationId}`
- `POST /api/v1/investigations/{investigationId}/evidence`
- `POST /api/v1/investigations/{investigationId}/findings`
- `POST /api/v1/investigations/{investigationId}/close`

### CAPA

- `GET /api/v1/capas`
- `POST /api/v1/capas`
- `GET /api/v1/capas/{capaId}`
- `PATCH /api/v1/capas/{capaId}`
- `POST /api/v1/capas/{capaId}/actions`
- `POST /api/v1/capas/{capaId}/verification`
- `POST /api/v1/capas/{capaId}/approve`
- `POST /api/v1/capas/{capaId}/close`

### Audit and reporting

- `GET /api/v1/complaints/{complaintId}/history`
- `GET /api/v1/audit-events`
- `GET /api/v1/reports/complaints`
- `GET /api/v1/reports/capa`
- `POST /api/v1/exports`

### API requirements

- Authenticate and authorize every private operation.
- Validate IDs, fields, documents, and workflow transitions.
- Use structured error responses.
- Apply rate limits and upload-size restrictions.
- Prevent cross-organization data access.
- Use idempotency controls for retryable operations.
- Do not report success before the database operation has succeeded.
- Do not expose stack traces or secrets.
- Ensure that each consequential action is associated with an authenticated actor.
- Return current workflow status and appropriate review information.
- Keep AI output and final human decisions separate in the API contract.

---

## 16. Frontend and user experience specification

Build a polished, responsive quality-management workspace that helps reviewers process cases efficiently without obscuring important evidence.

### A. Complaint overview dashboard

Display:

- Total complaints by status.
- Complaints awaiting triage.
- High-priority items requiring review.
- Overdue investigations.
- Open CAPAs.
- Actions approaching their due dates.
- Complaints with incomplete information.
- Trends and categories based on defined metrics.

Every dashboard metric must come from reproducible queries and be scoped to the user's authorized organization.

Do not show fabricated production counts.

### B. Complaint intake

Provide a structured form supporting the configured fields.

Allow text entry and supported attachments.

Use clear validation messages and preserve the original description.

Make uncertain fields reviewable rather than forcing users to provide unsupported data.

### C. Complaint list

Provide search, filters, and sorting by:

- Status.
- Priority.
- Category.
- Date received.
- Product or batch.
- Assigned reviewer.
- Investigation status.
- CAPA status.
- Data completeness.

Use pagination for large datasets.

Make overdue and high-priority cases visible without relying exclusively on color.

### D. Complaint detail workspace

Show:

- Original complaint description.
- Structured complaint fields.
- Source documents.
- Extracted values and corrections.
- Category and risk review.
- Related complaint candidates.
- Current workflow state.
- Assigned owner.
- Investigation details.
- Root-cause findings.
- Linked CAPAs.
- Approval history.
- Audit timeline.

The original source should remain accessible alongside AI summaries and normalized fields.

### E. AI triage panel

Display AI-suggested fields, potential risk indicators, missing information, and related cases.

For every meaningful suggestion, show its evidence and review status.

Provide clear actions to accept, edit, reject, or defer a suggestion where permitted.

Never present an AI proposal as an approved decision by default.

### F. Investigation workspace

Include:

- Investigation plan.
- Assigned tasks and owners.
- Evidence list.
- Findings.
- Root-cause hypotheses.
- Reviewed conclusions.
- Outstanding questions.
- Approval or closure controls.

Keep facts, hypotheses, and approved findings visually distinct.

### G. CAPA workspace

Show:

- Linked complaints.
- Related investigations.
- Action descriptions.
- Responsible owners.
- Due dates.
- Approval status.
- Implementation evidence.
- Effectiveness criteria.
- Verification results.
- Current lifecycle state.

Make overdue actions discoverable.

### H. Audit timeline

Display material events in chronological order with actor, action, timestamp, and relevant change context.

Users must be able to see why a record changed status, who approved an action, and which evidence informed the decision.

### I. Administration and configuration

Provide restricted configuration for:

- Users and roles.
- Complaint categories.
- Risk rules.
- Escalation thresholds.
- Workflow states.
- Approval rules.
- Retention policy metadata.
- Integration statuses.
- AI feature availability.

Do not let unauthorized users change risk thresholds or workflow rules.

### General UX requirements

- Responsive layouts for desktop and mobile.
- Accessible keyboard navigation.
- Clear headings and status labels.
- Loading, empty, error, and partial-data states.
- Evidence links adjacent to the relevant claims.
- Clear separation between proposed and approved values.
- Confirmation for consequential actions.
- No nonfunctional workflow buttons.
- No misleading indicators of regulatory compliance.
- No hidden failure states for intake, extraction, investigation, or CAPA processing.

---

## 17. Security, privacy, and data retention

Complaint records may contain personal data, product information, confidential business details, and safety-related information.

### Authentication and authorization

Implement maintained authentication with server-side permission checks.

Use roles such as:

- Administrator.
- Complaint Reviewer.
- Investigator.
- Quality Approver.
- Read-only Auditor.

These are initial role concepts, not a universal mandatory permission scheme. Final permissions must be aligned with the organization's operating model.

Use least privilege. A reviewer should not automatically have permission to modify workflow configuration or approve their own consequential decisions if segregation of duties is required.

### Tenant isolation

If multiple organizations are supported:

- Scope complaints, attachments, investigations, CAPAs, and audit events by organization.
- Enforce ownership in the backend.
- Use database policies where appropriate.
- Test cross-tenant access.
- Ensure search, AI retrieval, exports, and notifications cannot leak records across organizations.

### Attachment security

- Validate uploaded content.
- Enforce file-size and type restrictions.
- Use private storage by default.
- Use short-lived authorized download links where appropriate.
- Scan files where the deployment requires it.
- Avoid public links to complaint documents.
- Apply retention and deletion policies.
- Prevent unsafe HTML or executable document content from being rendered as trusted application UI.

### Audit security

Protect audit history from ordinary edits and deletions.

Capture relevant actions and avoid placing unnecessary sensitive content into audit metadata.

Use integrity controls suitable for the risk and operating model.

### AI privacy

- Send only the information required for each AI task.
- Avoid sending unrelated customer information.
- Use authorized retrieval scoped to the current organization and user permissions.
- Document provider data handling and retention.
- Avoid indefinite retention of prompts and raw complaint content.
- Keep credentials and secrets out of prompts.
- Treat imported content as untrusted input.

### Retention and deletion

Define retention requirements by complaint class, applicable jurisdiction, and organizational policy.

Do not apply one universal deletion period to every complaint.

When retention obligations restrict deletion, document the applicable policy and behavior. The application must not claim that a record has been permanently deleted when retained copies still exist.

---

## 18. Testing and validation plan

Build deterministic tests that can run without a paid AI provider or production complaint database.

### Complaint intake tests

Test:

- Valid manual complaint.
- Missing required fields.
- Invalid dates.
- Unsupported attachments.
- Malformed imports.
- Duplicate source identifiers.
- Extraction failure.
- Conflicting extracted and manually entered values.
- Safe retry of intake operations.
- Preservation of original complaint evidence.

