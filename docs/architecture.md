# System Architecture: Sortwise Complaint Quality Intelligence Platform

## 1. High-Level System Architecture

Sortwise is built as a maintainable, auditable, modular monolith utilizing Next.js (App Router), React 18, TypeScript, and PostgreSQL with Prisma ORM.

```text
Complaint Sources
    ├── Clinical Email Intake / Raw Unstructured Narrative
    ├── Structured Manual Web Intake
    ├── CSV Batch Imports
    └── External Medical Device / Laboratory Portals
                  │
                  ▼
          Sanitization & Tamper Check
          (SHA-256 Cryptographic Hash & Prompt-Injection Defense)
                  │
                  ▼
       Original Record Preservation (Immutable)
                  │
                  ▼
      Extraction & Normalization Layer
      (Field Parsing, Confidence Scoring, Text Citations)
                  │
                  ▼
          Canonical Complaint Record
                  │
       ┌──────────┼──────────┐
       │          │          │
       ▼          ▼          ▼
   Risk Triage Duplicate  Evidence
     Engine    Detection  Ledger
       │          │          │
       └──────────┼──────────┘
                  │
                  ▼
       Human-Reviewed Quality Workflow
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
  Failure Investigation  Quality Escalation /
  (5 Whys / Fishbone 6M)  Regulatory Reportability
        │
        ▼
  Root-Cause Determination
  (Distinguish Hypotheses vs Verified Findings)
        │
        ▼
  Corrective & Preventive Action (CAPA)
  (Bidirectional Traceability)
        │
        ▼
  Effectiveness Verification & Closure
  (Electronic Signatures per 21 CFR Part 11)
        │
        ▼
  Durable Immutable Audit Trail & Metrics
```

---

## 2. Core Architectural Principles

1. **Preserve the Original Evidence**: The submitted complaint narrative and source documents are source records. They are never overwritten by AI summaries or normalized fields.
2. **Distinguish Facts from Hypotheses**: The system explicitly marks fields as:
   - Reported fact (by complainant)
   - Extracted value (with text citation)
   - Proposed hypothesis (in 5 Whys or Fishbone)
   - Verified finding (certified with objective evidence by an investigator)
   - Electronic approval (by Quality Approver)
3. **Segregation of Duties**:
   - Complaint Reviewers handle intake, triage, and duplicate reviews.
   - Investigators plan protocols, perform testing, and record hypotheses.
   - Quality Approvers formally approve investigation closures, CAPA plans, and complaint closures. Investigators cannot certify their own CAPAs.
4. **AI as Advisory Assistance**: AI models never silently close complaints, auto-reject cases, or promote hypotheses to findings. Missing information is treated as uncertainty, never as low risk.

