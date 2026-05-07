# PROMPTS_SPEC.md — AI Prompts for UBID Platform
**Use these exact prompts inside Antigravity, in order.**

---

## How to Use This File

Each section below is a prompt to paste into Antigravity at the right stage.
**Do NOT skip steps.** Each step produces artifacts the next step reads from.
After each prompt, review the output. If it looks wrong, say "redo this step" before moving on.

---

## PROMPT 1 — Project Initialisation

> Paste this first, before any code is written.

```
You are a senior full-stack engineer building the UBID (Unified Business Identifier) platform for Karnataka Commerce & Industry. 

Read the following files before doing anything else:
- docs/PRD.md — what we are building and why
- docs/TECHNICAL_SPEC.md — exact tech stack, schema, folder structure
- docs/RULES.md — rules you must follow at all times

Your first task is ONLY to set up the project scaffolding. Do NOT write business logic yet.

Tasks:
1. Create the folder structure exactly as defined in TECHNICAL_SPEC.md section 2
2. Create docker-compose.yml with PostgreSQL 15, Redis 7, RabbitMQ, and the FastAPI backend
3. Create requirements.txt with: fastapi, uvicorn, sqlalchemy, alembic, pydantic, psycopg2-binary, redis, pika, rapidfuzz, xgboost, shap, numpy, pandas, scikit-learn, python-dotenv
4. Create a .env file with the environment variables from TECHNICAL_SPEC.md section 6 (use placeholder values)
5. Create backend/db/models.py with ALL five SQLAlchemy models from TECHNICAL_SPEC.md section 3
6. Create backend/api/main.py as a minimal FastAPI app that connects to PostgreSQL on startup

Stop after scaffolding. Wait for my approval before writing any business logic.
```

---

## PROMPT 2 — Adapters (Data Ingestion Layer)

```
Now build the Data Ingestion Layer (Layer 1).

Read: docs/TECHNICAL_SPEC.md section 2 (structure) and docs/PRD.md Feature A1.

Tasks:
1. Create backend/adapters/base.py with an abstract Adapter class:
   - Abstract method: fetch_records() → list[CanonicalRecord]
   - Abstract method: health_check() → bool
   - All adapters must be READ-ONLY. No write methods.

2. Create four adapter implementations (shop_establishment.py, factories.py, labour.py, kspcb.py):
   - Each one simulates fetching from a mock API endpoint (use httpx with a configurable BASE_URL from env)
   - Each converts raw response fields into the canonical CanonicalRecord schema
   - Include realistic field mapping differences (each system uses different field names — e.g., Factories uses "factory_name" while Shop Est uses "business_name")
   - Include error handling: if the API is down, log the failure and return empty list. Do NOT crash.

3. Create a synthetic data JSON file for each adapter (under backend/db/synthetic/) with 50 sample records each, covering:
   - Records that clearly match across departments (same PAN, same business)
   - Records that are ambiguous (similar names, same PIN, no PAN)
   - Records that are clearly different businesses
   - Some records with missing PAN/GSTIN fields

4. Add a /api/adapters/health endpoint that returns the health status of all four adapters.
```

---

## PROMPT 3 — Normalisation & Blocking

```
Build the Record Normalisation and Blocking pipeline.

Read: docs/PRD.md Features A2 and A3. Read docs/TECHNICAL_SPEC.md section 5 (algorithms).

Tasks:
1. Create backend/resolution/normaliser.py:
   - normalise_name(raw: str) → str
     • Strip legal suffixes: ["pvt ltd", "private limited", "llp", "(p) ltd", "co.", "limited", "ltd"]
     • Expand abbreviations dict: {"mfg": "manufacturing", "engg": "engineering", "bros": "brothers", "intl": "international"}
     • Uppercase, strip punctuation, collapse whitespace
   - normalise_address(raw: str) → str
     • Extract PIN code separately
     • Expand: {"rd": "road", "nagar": "nagar", "mkt": "market"}
     • Strip floor/unit numbers
   - Both functions must be pure (no side effects, deterministic output)

2. Create backend/resolution/blocker.py:
   - get_blocking_keys(record) → list[str] — exact implementation from TECHNICAL_SPEC.md section 5
   - Use the jellyfish library for Metaphone encoding (add to requirements.txt)
   - generate_candidate_pairs(records: list) → list[tuple] 
     • Build Redis index of blocking keys
     • Return all pairs sharing at least one blocking key
     • Exclude same-record pairs and already-linked pairs

3. Write unit tests for both modules in backend/tests/:
   - Test normalise_name("Sharma Textiles Pvt Ltd") == "SHARMA TEXTILES"
   - Test normalise_name("SHARMA TEX. (P) LTD") == "SHARMA TEX"
   - Test that two records with same PAN always produce a shared blocking key
```

---

## PROMPT 4 — Scoring & UBID Assignment

```
Build the XGBoost scoring engine and UBID assignment logic.

Read: docs/PRD.md Features A4 and A5. Read docs/TECHNICAL_SPEC.md sections 4 and 5.

Tasks:
1. Create backend/resolution/feature_engineer.py:
   - compute_features(record_a, record_b) → dict with exactly the 9 features from TECHNICAL_SPEC.md
   - Use rapidfuzz for all string similarity metrics
   - All features must be float or int (no strings in the feature vector)

2. Create backend/resolution/scorer.py:
   - Train an XGBoost binary classifier on synthetic labelled pairs (generate 200+ synthetic pairs with ground truth labels)
   - Apply Platt Scaling calibration using sklearn CalibratedClassifierCV
   - score_pair(record_a, record_b) → float (calibrated probability 0.0-1.0)
   - explain_pair(record_a, record_b) → dict of SHAP feature importances
   - Save trained model to backend/models/resolution_model.pkl

3. Create backend/resolution/ubid_assigner.py:
   - assign_ubid(records: list[CanonicalRecord], pairs_with_scores: list) → AssignmentResult
   - Apply thresholds: AUTO_LINK_THRESHOLD=0.88, REVIEW_THRESHOLD=0.55 from env
   - For auto-links: call generate_ubid() and write to ubid_registry
   - For review cases: write to a reviewer_queue table
   - For separate cases: generate independent UBIDs for each record
   - generate_ubid() → exact implementation from TECHNICAL_SPEC.md section 5

4. Expose a POST /api/resolution/run endpoint that triggers the full pipeline on demand.
```

---

## PROMPT 5 — Reviewer Workflow (Backend + Frontend)

```
Build the Human Reviewer Workflow — both backend API and React frontend.

Read: docs/PRD.md Feature A6.

Backend tasks:
1. Create all reviewer API endpoints from TECHNICAL_SPEC.md section 4
2. The GET /reviewer/queue/{case_id} endpoint must return:
   - Both records side by side with raw AND normalised field values
   - Confidence score
   - SHAP feature importance dict (from explain_pair)
   - Which fields differ between the two records (highlight these)
3. POST approve/reject must: write to linkage_audit, update canonical_records.ubid, publish to RabbitMQ for downstream processing

Frontend tasks:
1. Create frontend/pages/reviewer.tsx:
   - Left panel: Record A fields
   - Right panel: Record B fields  
   - Fields that differ highlighted in amber
   - Bottom panel: SHAP bar chart (use Recharts horizontal bar chart)
   - Four action buttons: Approve Merge (green), Reject (red), Defer (gray), Escalate (orange)
   - Optional free-text note field (required for Reject and Escalate)
2. Show queue count in header. Show queue age warning if any case > 72 hours old.
3. After an action, automatically load the next case in queue.
```

---

## PROMPT 6 — Activity Intelligence (Part B)

```
Build the Activity Intelligence engine (Part B of the problem statement).

Read: docs/PRD.md Features B1 through B4.

Tasks:
1. Create backend/intelligence/event_ingestion.py:
   - poll_department_events(department: str) → list[ActivityEvent]
   - Simulate events: inspections (factories, labour), renewals (shop_est), compliance filings (kspcb), consumption readings (bescom)
   - Deduplicate on event_id before inserting (INSERT ... ON CONFLICT DO NOTHING)

2. Create backend/intelligence/attribution.py:
   - attribute_event(event: ActivityEvent) → attributed event with ubid filled in
   - If local_id has a UBID mapping: attribute immediately
   - If no UBID yet: insert with attribution='pending', add to pending queue
   - If irresolvable after 3 retries: insert with attribution='manual', surface for human review — NEVER silently drop

3. Create backend/intelligence/classifier.py:
   - engineer_features(ubid: str) → feature dict (9 features from PRD Feature B3)
   - classify(ubid: str) → ClassificationResult with status + probabilities + SHAP values
   - Train XGBoost multi-class model on synthetic event histories
   - classify_all() → bulk reclassify all UBIDs (called nightly by Airflow)

4. Create frontend/pages/analytics.tsx:
   - UBID search bar (by name+PIN, PAN, GSTIN, or department ID)
   - Result card: UBID, anchor type, status badge (Active=green, Dormant=amber, Closed=red)
   - Event timeline (vertical, last 12 events, grouped by department)
   - SHAP explanation text: "Classified as Active because: licence renewal 45 days ago (+0.28), KSPCB compliance 60 days ago (+0.19)..."
   - Query builder for cross-department filters
```

---

## PROMPT 7 — Final Integration & Testing

```
Run final integration, seed realistic synthetic data, and verify all success criteria.

Tasks:
1. Run backend/db/seed_synthetic.py to populate 200 businesses across 4 departments with known ground truth
2. Run the full resolution pipeline end-to-end:
   - Ingest → Normalise → Block → Score → Assign UBIDs
   - Verify: total UBIDs < total input records (merges happened)
   - Verify: at least one case in reviewer queue
3. Run the activity classifier on all UBIDs. Verify Active/Dormant/Closed distribution is non-trivial.
4. Test the query: "active factories with no inspection in the last 18 months" — must return results.
5. Test reviewer workflow: approve one case, verify the two records now share a UBID, verify linkage_audit row exists.
6. Test failure mode: mark one adapter as returning an error — verify other adapters still ingest successfully.
7. Create a README.md with:
   - docker-compose up -d to start everything
   - How to trigger the resolution pipeline
   - How to access the dashboard and reviewer UI
   - How to run the test suite
```
