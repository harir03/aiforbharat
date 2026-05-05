# PRD — Unified Business Identifier (UBID) Platform
**Karnataka Commerce & Industry Hackathon 2025 | Theme 1**
**Version:** 1.0 | **Status:** Final | **Team:** Team Aria

---

## 1. Problem Statement (Plain English)

Karnataka has 40+ government department systems (Shop Establishment, Factories, Labour, KSPCB, BESCOM, etc.). Each one was built independently with no shared ID for businesses. The same real business — say "Sharma Textiles" — exists as a completely different record in each system with no way to connect them.

**This means Karnataka's government literally cannot answer:**
- How many unique businesses are actually operating?
- Which factories had no safety inspection in the last 18 months?
- Is this specific business active, dormant, or closed?

We are building a platform that fixes this by:
1. **Part A:** Linking all records of the same real business across systems and giving it one Unique Business Identifier (UBID)
2. **Part B:** Reading activity events from all departments and classifying each business as Active, Dormant, or Closed

**Hard constraint: We cannot touch or modify any existing department system. Read-only only.**

---

## 2. Users

| User | What They Do | What They Need |
|------|-------------|----------------|
| Karnataka C&I Officer | Runs analytics queries across all businesses | Dashboard to search by UBID, run cross-department queries |
| Human Reviewer | Reviews ambiguous business matches | Side-by-side record UI with AI-explained confidence scores |
| System Admin | Manages adapters and model retraining | Config interface for adapter health and retraining triggers |

---

## 3. Core Features

### Part A — Entity Resolution & UBID Assignment

#### Feature A1: Data Ingestion (Adapters)
- Pull master data from 4 department systems (Shop Est, Factories, Labour, KSPCB) via their existing APIs
- Convert all records into one canonical schema: `{ department, local_id, name_raw, address_raw, pin_code, pan, gstin, phone, email, reg_date }`
- Read-only. Zero writes back to any source system.
- New department = new adapter. Nothing else changes.

#### Feature A2: Record Normalisation
- Strip legal suffixes (Pvt Ltd, LLP, etc.) from business names
- Expand abbreviations (Mfg → Manufacturing)
- Standardise PIN codes as a structured field
- Apply Metaphone phonetic encoding for name comparison

#### Feature A3: Blocking (Candidate Pair Generation)
- Block 1: Exact PAN match → instant auto-link
- Block 2: Exact GSTIN match → instant auto-link  
- Block 3: Same PIN + phonetically similar name → candidate pair
- Block 4: Same PIN + first 8 chars of normalised name → candidate pair
- Block 5: Same phone number → candidate pair

#### Feature A4: Scoring (XGBoost Classifier)
- 9 features per candidate pair (name similarity, address similarity, PIN match, PAN prefix, phone, reg date proximity, source system pair)
- Output: confidence score 0.0 to 1.0
- Calibrated using Platt Scaling so score = true posterior probability

#### Feature A5: UBID Assignment
- Score > 0.88 → Auto-link, merge, assign UBID
- Score 0.55–0.88 → Route to human Reviewer Queue
- Score < 0.55 → Keep as separate UBIDs
- UBID format: `KA-PAN-XXXXXXXX` / `KA-GST-XXXXXXXX` / `KA-INT-XXXXXXXX`

#### Feature A6: Human Reviewer Workflow
- Queue of ambiguous cases, ordered by confidence (highest first)
- Reviewer sees both records side by side with field differences highlighted
- SHAP chart shows which features drove the score
- Actions: Approve Merge / Reject / Defer / Escalate
- Every decision stored as labelled training data

#### Feature A7: Model Feedback Loop
- Reviewer decisions accumulate as labelled pairs
- Model retrains weekly OR when 500+ new decisions since last retrain
- New model evaluated on held-out test set before promotion
- If precision/recall drops >2%, old model retained

---

### Part B — Active Business Intelligence

#### Feature B1: Event Ingestion
- Consume activity events from department systems (inspections, renewals, compliance filings, BESCOM consumption)
- Support: webhooks (preferred), polling, snapshot comparison
- All events normalised to: `{ event_id, local_id, event_type, timestamp, department, payload }`

#### Feature B2: Event-to-UBID Attribution
- Map local_id in each event to its UBID
- If no UBID yet → hold in Pending queue, attribute retroactively when UBID assigned
- If irresolvable → surface for human review. Never silently drop.

#### Feature B3: Activity Feature Engineering
- Features per UBID over 24-month lookback:
  - Days since last event
  - Event count by type (last 6 and 12 months)
  - Renewal present (Y/N)
  - Closure notice present (Y/N)
  - BESCOM consumption slope
  - KSPCB compliance gap
  - Number of active departments

#### Feature B4: Classification (XGBoost Multi-class)
- Output: Active / Dormant / Closed
- SHAP explanation per classification (which events drove verdict)
- Low-confidence classifications flagged for human review
- Every classification auditable and reversible

---

### Feature C: Analytics Dashboard
- UBID lookup by: department ID, PAN, GSTIN, name+PIN
- Returns: UBID, all linked records, confidence breakdown, current status, event timeline
- Query interface for cross-department questions
- Example: "Active factories in PIN 560058 with no inspection in 18 months"

---

## 4. Non-Negotiables

- ❌ No modifications to any source department system
- ❌ No hosted LLM calls on raw PII
- ✅ Every decision explainable (SHAP)
- ✅ Every decision reversible (audit log)
- ✅ Wrong merge > missed merge (conservative thresholds)
- ✅ Works on scrambled/synthetic data

---

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| Entity resolution precision | > 95% on test set |
| Auto-link rate | > 60% of pairs (rest to review) |
| Reviewer queue age | < 72 hours for any case |
| Activity classification accuracy | > 88% on held-out set |
| Query response time | < 2 seconds for dashboard lookups |

---

## 6. Out of Scope (for Hackathon)

- Real-time streaming (batch nightly is fine)
- Mobile app
- Multi-state extension
- Direct writes to any department system (forever out of scope)
