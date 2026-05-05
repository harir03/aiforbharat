# IMPLEMENTATION_PLAN.md — UBID Platform
**Team Aria | 4-Week Build Plan**

---

## How to Use This With Antigravity

Each phase maps to one PROMPT in PROMPTS_SPEC.md.
Use Planning Mode in Antigravity for every phase. Never jump ahead.

```
Phase → Use Prompt → Review Output → Approve → Next Phase
```

---

## Phase 0 — Setup (Day 1) → PROMPT 1

**Goal:** Project scaffolding only. Zero business logic.

Tasks:
- [ ] Folder structure created exactly as per TECHNICAL_SPEC.md
- [ ] docker-compose.yml with PostgreSQL, Redis, RabbitMQ, FastAPI
- [ ] requirements.txt complete
- [ ] .env with all env variables
- [ ] All 5 SQLAlchemy models created (canonical_records, ubid_registry, linkage_audit, activity_events, classifications)
- [ ] FastAPI app boots and connects to DB without error

**Done when:** `docker-compose up -d` works and `GET /health` returns 200.

---

## Phase 1 — Data Ingestion (Day 2) → PROMPT 2

**Goal:** Read-only adapters that pull data from mock department APIs.

Tasks:
- [ ] Abstract Adapter base class
- [ ] 4 adapter implementations (shop_est, factories, labour, kspcb)
- [ ] Each adapter maps different source field names to canonical schema
- [ ] Synthetic data JSON (50 records per department, 200 total)
- [ ] Adapter health endpoint working
- [ ] Error handling: one adapter failing does not affect others

**Done when:** All 4 adapters return data, synthetic records are in DB.

---

## Phase 2 — Entity Resolution Engine (Days 3–5) → PROMPTS 3 + 4

**Goal:** The blocking, scoring, and UBID assignment pipeline working end-to-end.

Sub-phase 2a — Normalisation & Blocking (Day 3):
- [ ] normalise_name() handles legal suffixes, abbreviations, casing
- [ ] normalise_address() extracts PIN, handles common abbreviations
- [ ] get_blocking_keys() generates correct keys for all 5 block types
- [ ] generate_candidate_pairs() uses Redis index, returns deduplicated pairs
- [ ] Unit tests passing

Sub-phase 2b — Scoring & Assignment (Days 4–5):
- [ ] All 9 features computed correctly
- [ ] XGBoost model trained on synthetic labelled pairs
- [ ] Platt Scaling calibration applied
- [ ] SHAP values computed per pair
- [ ] Thresholds applied: 0.88 → auto-link, 0.55–0.88 → review, <0.55 → separate
- [ ] UBIDs generated with correct format (KA-PAN/GST/INT-XXXXXXXX)
- [ ] POST /api/resolution/run works end-to-end

**Done when:** Running resolution pipeline on 200 synthetic records produces fewer UBIDs than input records, and review queue has cases in it.

---

## Phase 3 — Reviewer Workflow (Days 6–7) → PROMPT 5

**Goal:** Human reviewer can review ambiguous cases with full evidence.

Backend:
- [ ] All reviewer queue endpoints working
- [ ] Case detail returns side-by-side records with diff highlighting
- [ ] SHAP feature importance included in response
- [ ] Approve → linkage_audit row created, records share UBID
- [ ] Reject → records get separate UBIDs, audit row created
- [ ] Queue age alert logic working

Frontend:
- [ ] Reviewer page at /reviewer
- [ ] Left/right record panels with diff highlighting in amber
- [ ] SHAP bar chart renders correctly
- [ ] All 4 action buttons work
- [ ] Auto-advances to next case after action
- [ ] Queue count and age warning visible

**Done when:** Reviewer can approve and reject cases and the DB state updates correctly.

---

## Phase 4 — Activity Intelligence (Days 8–10) → PROMPT 6

**Goal:** Part B complete — events ingested, attributed, businesses classified.

- [ ] Event ingestion simulates all event types (inspection, renewal, compliance, consumption, closure)
- [ ] Deduplication on event_id working
- [ ] Attribution: resolved events linked to UBID, pending events held and attributed retroactively
- [ ] No event silently dropped — irresolvable events surface for human review
- [ ] All 9 activity features computed per UBID
- [ ] XGBoost multi-class classifier trained and producing Active/Dormant/Closed
- [ ] SHAP explanation text generated per classification
- [ ] Analytics dashboard at /analytics with UBID search
- [ ] Event timeline renders correctly
- [ ] Cross-department query builder works (test: active factories with no inspection in 18 months)

**Done when:** Analytics dashboard returns meaningful results and the key query produces results.

---

## Phase 5 — Integration & Demo Prep (Days 11–12) → PROMPT 7

**Goal:** Everything wired together. Ready for hackathon demo.

- [ ] Full pipeline runs on 200 synthetic records without errors
- [ ] Reviewer workflow tested end-to-end (approve, reject, defer, escalate)
- [ ] Failure mode tested (one adapter down = others still work)
- [ ] All SHAP explanations rendering in UI
- [ ] README.md complete with setup instructions
- [ ] Demo script written (exact sequence to show in presentation)
- [ ] docker-compose up -d → single command to start everything

---

## Demo Script (For Hackathon Presentation)

**Step 1:** Open dashboard → search "Sharma Textiles" → show multiple records across departments collapsed into one UBID

**Step 2:** Open reviewer queue → show ambiguous case → show SHAP bar chart → click Approve → show UBID assigned

**Step 3:** Open analytics → run query: "Active factories in PIN 560058 with no inspection in 18 months" → show results with evidence

**Step 4:** Click a UBID → show event timeline → show Active classification with SHAP explanation text

**Step 5:** Click audit trail → show every decision logged, reversible, explainable

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| XGBoost training takes too long | Pre-train model offline, commit .pkl file to repo |
| Synthetic data doesn't produce enough matches | Manually ensure 30% of records share PAN across departments |
| Reviewer UI too complex for demo | Build minimal version first (approve/reject only), add SHAP chart last |
| Docker setup fails on demo machine | Have a fallback of pre-started cloud instance |
