# Risk-Based Triage & Regulatory Scoring

## 1. Regulatory 5-Factor Risk Matrix

Sortwise evaluates incoming complaint narratives using five key criteria aligned with FDA 21 CFR 803 (Medical Device Reporting), 21 CFR 820 QMSR, and ISO 14971:

1. **Fatal Outcome or Permanent Harm (RF-001)**: Weight: 10. Mentions death, cardiac arrest, irreversible injury.
2. **Acute Severe Injury or Hospitalization (RF-002)**: Weight: 9. Mentions clinical intervention, ICU admission, sepsis, anaphylaxis.
3. **Sterility Compromise or Particulate Contamination (RF-003)**: Weight: 8. Mentions seal channel breach, torn sterile pouch, foreign particulate in injectable vial.
4. **Active Therapy Malfunction / Diagnostic Error (RF-004)**: Weight: 7. In-service stop during narcotic infusion, false diagnostic reading, ventilator failure.
5. **Batch/Lot Recurrence Pattern (RF-005)**: Weight: 6. Multiple complaints associated with the same lot/batch within 90 days.

---

## 2. Priority & SLA Thresholds

- **CRITICAL** (Score ≥ 18 or RF-001): Immediate 24-hour review required. Flagged as `isSafetyCritical = true` and `isReportable = true`.
- **HIGH** (Score ≥ 12 or RF-002/RF-003): 48-hour review deadline. Flagged as `isSafetyCritical = true`.
- **MEDIUM** (Score ≥ 6 or RF-004/RF-005): 72-hour review deadline.
- **LOW** (Score < 6): 120-hour review deadline.

---

## 3. Treatment of Missing Information & Human Overrides

- **Uncertainty Principle**: Absence of explicit harm language does NOT equate to low risk. If a severe symptom is reported but the lot or patient outcome is unconfirmed, the case is flagged with detected missing information and held at elevated risk until verified.
- **Human Overrides**: Reviewers can override suggested priorities, but the system enforces a mandatory written rationale that is permanently recorded in the audit event ledger (`RISK_OVERRIDDEN`).

