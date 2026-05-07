# TECHNICAL_SPEC.md — UBID Platform
**Team Aria | Karnataka Hackathon 2025**

---

## 1. Stack (Lock These In — Do NOT Deviate)

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend API | FastAPI (Python 3.11) | Async I/O, native Pydantic, ML-friendly |
| Entity Resolution | RapidFuzz + XGBoost + SHAP | Fastest fuzzy match (Rust core), best tabular ML, native explainability |
| Database | PostgreSQL 15 | ACID compliance for audit log, JSON columns, full-text search |
| Cache / Blocking Index | Redis 7 | O(1) blocking key lookup, pub/sub for real-time queue |
| Message Queue | RabbitMQ | Durable queues with dead-letter support for failed event attribution |
| Frontend | React 18 + Next.js 14 + Tailwind CSS | SSR for dashboard, React Query for reviewer state |
| Charts | Recharts | SHAP waterfall charts |
| Orchestration | Apache Airflow | DAG scheduling for nightly ingestion + retraining |
| Containerisation | Docker + Docker Compose | Single-command local setup |

---

## 2. Project Structure

```
ubid-platform/
├── backend/
│   ├── adapters/              # One file per department system
│   │   ├── base.py            # Abstract Adapter interface
│   │   ├── shop_establishment.py
│   │   ├── factories.py
│   │   ├── labour.py
│   │   └── kspcb.py
│   ├── resolution/
│   │   ├── normaliser.py      # Name + address normalisation
│   │   ├── blocker.py         # Blocking key generation
│   │   ├── feature_engineer.py # 9 feature columns
│   │   ├── scorer.py          # XGBoost model wrapper
│   │   └── ubid_assigner.py   # Threshold logic + UBID generation
│   ├── intelligence/
│   │   ├── event_ingestion.py
│   │   ├── attribution.py     # event local_id → UBID mapping
│   │   ├── feature_store.py   # Nightly feature computation
│   │   └── classifier.py      # XGBoost multi-class + SHAP
│   ├── api/
│   │   ├── main.py            # FastAPI app entry
│   │   ├── routes/
│   │   │   ├── ubid.py        # Lookup, search endpoints
│   │   │   ├── reviewer.py    # Queue, approve/reject endpoints
│   │   │   └── analytics.py   # Cross-department query endpoints
│   │   └── schemas.py         # Pydantic models
│   ├── db/
│   │   ├── models.py          # SQLAlchemy ORM models
│   │   ├── migrations/        # Alembic migrations
│   │   └── seed_synthetic.py  # Synthetic data seeder
│   └── airflow_dags/
│       ├── nightly_ingestion.py
│       ├── feature_engineering.py
│       └── model_retraining.py
├── frontend/
│   ├── pages/
│   │   ├── index.tsx          # Dashboard / UBID search
│   │   ├── reviewer.tsx       # Reviewer queue
│   │   └── analytics.tsx      # Query interface
│   └── components/
│       ├── ShapChart.tsx
│       ├── RecordComparison.tsx
│       └── EventTimeline.tsx
├── docker-compose.yml
├── .agent/                    # Antigravity agent config
│   ├── agents.md
│   ├── workflows/
│   └── skills/
└── docs/
    ├── PRD.md
    ├── TECHNICAL_SPEC.md
    ├── PROMPTS_SPEC.md
    ├── IMPLEMENTATION_PLAN.md
    └── RULES.md
```

---

## 3. Database Schema

### Table: `canonical_records`
```sql
CREATE TABLE canonical_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department    VARCHAR(50) NOT NULL,   -- 'shop_est' | 'factories' | 'labour' | 'kspcb'
  local_id      VARCHAR(100) NOT NULL,
  name_raw      TEXT,
  name_normalised TEXT,
  address_raw   TEXT,
  pin_code      CHAR(6),
  pan           CHAR(10),
  gstin         VARCHAR(15),
  phone         VARCHAR(15),
  reg_date      DATE,
  ubid          VARCHAR(30),           -- NULL until linked
  ingest_ts     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department, local_id)
);
```

### Table: `ubid_registry`
```sql
CREATE TABLE ubid_registry (
  ubid          VARCHAR(30) PRIMARY KEY,
  anchor_type   VARCHAR(10),           -- 'PAN' | 'GSTIN' | 'INT'
  anchor_value  VARCHAR(20),           -- PAN or GSTIN value if anchored
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  status        VARCHAR(20) DEFAULT 'active'  -- 'active' | 'dormant' | 'closed' | 'pending'
);
```

### Table: `linkage_audit`
```sql
CREATE TABLE linkage_audit (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_a_id   UUID REFERENCES canonical_records(id),
  record_b_id   UUID REFERENCES canonical_records(id),
  confidence    FLOAT NOT NULL,
  features      JSONB NOT NULL,        -- All 9 feature values
  shap_values   JSONB,                 -- SHAP feature importances
  resolution    VARCHAR(20),           -- 'auto_link' | 'reviewer_approved' | 'rejected' | 'separate'
  reviewer_id   VARCHAR(100),
  reviewer_note TEXT,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `activity_events`
```sql
CREATE TABLE activity_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      VARCHAR(100) UNIQUE NOT NULL,  -- deduplicate on this
  ubid          VARCHAR(30) REFERENCES ubid_registry(ubid),
  local_id      VARCHAR(100),
  department    VARCHAR(50),
  event_type    VARCHAR(50),           -- 'inspection' | 'renewal' | 'compliance' | 'consumption' | 'closure'
  event_ts      TIMESTAMPTZ NOT NULL,
  payload       JSONB,
  attribution   VARCHAR(20) DEFAULT 'resolved',  -- 'resolved' | 'pending' | 'manual'
  ingest_ts     TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `classifications`
```sql
CREATE TABLE classifications (
  ubid          VARCHAR(30) PRIMARY KEY REFERENCES ubid_registry(ubid),
  status        VARCHAR(20) NOT NULL,  -- 'active' | 'dormant' | 'closed'
  confidence    FLOAT NOT NULL,
  prob_active   FLOAT,
  prob_dormant  FLOAT,
  prob_closed   FLOAT,
  shap_values   JSONB,
  is_stale      BOOLEAN DEFAULT FALSE,
  classified_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. API Endpoints

### UBID Lookup
```
GET  /api/ubid/search?q={name}&pin={pin_code}
GET  /api/ubid/{ubid}                          → full record + linked depts + status
GET  /api/ubid/{ubid}/events                   → activity timeline
GET  /api/ubid/{ubid}/audit                    → full linkage audit trail
```

### Reviewer Queue
```
GET  /api/reviewer/queue                        → paginated queue, ordered by confidence desc
GET  /api/reviewer/queue/{case_id}              → full case detail with SHAP
POST /api/reviewer/queue/{case_id}/approve      → merge + log decision
POST /api/reviewer/queue/{case_id}/reject       → keep separate + log decision
POST /api/reviewer/queue/{case_id}/defer        → return to queue
POST /api/reviewer/queue/{case_id}/escalate     → senior review + mandatory note
```

### Analytics
```
POST /api/analytics/query                       → freeform filter query
GET  /api/analytics/summary                     → total UBIDs, status breakdown
```

---

## 5. Key Algorithms

### Blocking Key Generation (blocker.py)
```python
def get_blocking_keys(record: CanonicalRecord) -> list[str]:
    keys = []
    if record.pan:
        keys.append(f"PAN:{record.pan}")
    if record.gstin:
        keys.append(f"GST:{record.gstin[:10]}")  # PAN portion of GSTIN
    if record.pin_code and record.name_normalised:
        metaphone = doublemetaphone(record.name_normalised)[0][:6]
        keys.append(f"PIN:{record.pin_code}:MPH:{metaphone}")
        keys.append(f"PIN:{record.pin_code}:PFX:{record.name_normalised[:8]}")
    if record.phone:
        keys.append(f"PHN:{record.phone[-10:]}")
    return keys
```

### Feature Vector (feature_engineer.py)
```python
FEATURES = [
    "name_jaro_winkler",        # float 0-1
    "name_token_sort_ratio",    # float 0-1
    "name_metaphone_match",     # bool 0/1
    "address_token_set_ratio",  # float 0-1
    "pin_match",                # bool 0/1
    "pan_prefix_match",         # bool 0/1 (first 5 chars)
    "phone_match",              # bool 0/1
    "reg_date_gap_bin",         # int 0-4 (binned days delta)
    "source_system_pair_enc",   # int (categorical encoding)
]
```

### UBID Generation (ubid_assigner.py)
```python
def generate_ubid(pan=None, gstin=None) -> str:
    if pan:
        hash_val = hashlib.sha256(pan.encode()).hexdigest()[:8].upper()
        return f"KA-PAN-{hash_val}"
    elif gstin:
        pan_portion = gstin[2:12]
        hash_val = hashlib.sha256(pan_portion.encode()).hexdigest()[:8].upper()
        return f"KA-GST-{hash_val}"
    else:
        return f"KA-INT-{uuid.uuid4().hex[:8].upper()}"
```

---

## 6. Environment Variables

```env
DATABASE_URL=postgresql://ubid:password@localhost:5432/ubid_db
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
MODEL_RETRAIN_THRESHOLD=500
AUTO_LINK_THRESHOLD=0.88
REVIEW_THRESHOLD=0.55
OBSERVATION_WINDOW_MONTHS=24
QUEUE_AGE_ALERT_HOURS=72
```

---

## 7. What NOT To Do

- ❌ Do NOT write to any department system API
- ❌ Do NOT call any external hosted LLM (OpenAI, Gemini, etc.) on raw record data
- ❌ Do NOT auto-merge records with confidence below 0.88
- ❌ Do NOT silently drop any event that cannot be attributed
- ❌ Do NOT use localStorage for any sensitive data
- ❌ Do NOT skip the Platt Scaling calibration step on the XGBoost model
