# UBID — Unified Business Identifier Platform

**Cross-department entity resolution and business intelligence for Karnataka Commerce & Industry.**

UBID resolves the fragmented identity problem across government departments by creating a single, deterministic identifier for each business entity, enabling cross-department queries and active business intelligence.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Reviewer  │  │  Analytics   │  │  Query Builder    │  │
│  │ Dashboard │  │  Dashboard   │  │  (Cross-Dept)     │  │
│  └──────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │ REST API
┌─────────────────────────┴───────────────────────────────┐
│                   FastAPI Backend                        │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Adapters │  │  Resolution  │  │  Intelligence     │  │
│  │ (4 dept) │  │  Engine      │  │  Engine           │  │
│  └──────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────┐
│  PostgreSQL 15  │  Redis 7  │  RabbitMQ                 │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Python 3.10+
- Docker & Docker Compose (for infrastructure)
- Node.js 18+ (for frontend)

### 1. Clone and Install

```bash
git clone <repository-url>
cd aiforbharat

# Python dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your settings
```

### 2. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL 15** on port 5432
- **Redis 7** on port 6379
- **RabbitMQ** on port 5672 (management UI: 15672)
- **FastAPI backend** on port 8000

### 3. Seed Synthetic Data

```bash
python -m backend.db.seed_synthetic
```

Generates 222 business records across 4 departments:
- 30 businesses shared across 2–3 departments (known matches)
- 170 unique businesses (no matches expected)
- Ground truth file at `backend/db/synthetic/ground_truth.json`

### 4. Run the Resolution Pipeline

```bash
# Start the API server
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000

# Trigger the resolution pipeline (in another terminal)
curl -X POST http://localhost:8000/api/resolution/run
```

Or run programmatically:
```python
from fastapi.testclient import TestClient
from backend.api.main import app
client = TestClient(app)
resp = client.post("/api/resolution/run")
print(resp.json())
```

### 5. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Accessing the Dashboards

| Dashboard | URL | Description |
|-----------|-----|-------------|
| **API Docs** | http://localhost:8000/docs | Swagger UI with all endpoints |
| **Reviewer UI** | http://localhost:3000/reviewer | Human review queue with side-by-side comparison |
| **Analytics** | http://localhost:3000/analytics | UBID search, status dashboard, query builder |

---

## API Endpoints

### Resolution

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/resolution/run` | POST | Trigger full pipeline: Ingest → Block → Score → Assign |
| `/api/adapters/health` | GET | Health status of all 4 department adapters |

### Reviewer Workflow

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reviewer/queue` | GET | Paginated review queue (sorted by confidence) |
| `/api/reviewer/queue/{id}` | GET | Case detail with SHAP values and field diffs |
| `/api/reviewer/queue/{id}/approve` | POST | Approve merge → assign shared UBID |
| `/api/reviewer/queue/{id}/reject` | POST | Reject merge (note required) |
| `/api/reviewer/queue/{id}/defer` | POST | Return to queue |
| `/api/reviewer/queue/{id}/escalate` | POST | Flag for senior review (note required) |
| `/api/reviewer/audit` | GET | Full audit trail |

### Analytics & Intelligence

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ubid/search` | GET | Search by name, PAN, GSTIN, department |
| `/api/ubid/{ubid}` | GET | Full UBID detail with classification |
| `/api/ubid/{ubid}/events` | GET | Activity event timeline |
| `/api/analytics/summary` | GET | Status breakdown across all UBIDs |
| `/api/analytics/query` | POST | Cross-department filter query |

---

## Running the Test Suite

### Integration Test (Full E2E)

```bash
python scripts/integration_test.py
```

Validates all 7 prompts:
1. ✅ Synthetic data seeding (222 records, 54 ground truth pairs)
2. ✅ Full resolution pipeline (ingest → block → score → assign)
3. ✅ Activity classification (Active / Dormant / Closed)
4. ✅ Cross-department queries
5. ✅ Reviewer workflow (approve, audit log, UBID assignment)
6. ✅ Adapter failure resilience (fallback to synthetic data)

### Phase-Level Validation

```bash
python scripts/validate_phase2.py     # Data ingestion
python scripts/validate_phase3_4.py   # Normalisation, blocking, scoring
python scripts/validate_phase5.py     # Reviewer workflow
python scripts/validate_phase6.py     # Activity intelligence
```

---

## Resolution Pipeline

### How It Works

1. **Ingest** — 4 adapters pull records from department systems (or synthetic data fallback)
2. **Normalise** — Strip legal suffixes, expand abbreviations, standardise addresses
3. **Block** — Generate candidate pairs using PIN+Metaphone and PAN blocking keys
4. **Score** — XGBoost with Platt Scaling on 9 pairwise features (name, address, PAN, phone, etc.)
5. **Assign** — Auto-link (≥ 0.88), review queue (0.55–0.88), separate (< 0.55)
6. **Review** — Human reviewers approve/reject ambiguous pairs with SHAP explanations

### Thresholds

| Threshold | Value | Effect |
|-----------|-------|--------|
| AUTO_LINK_THRESHOLD | 0.88 | Auto-merge above this |
| REVIEW_THRESHOLD | 0.55 | Send to reviewer queue |
| QUEUE_AGE_ALERT_HOURS | 72 | Stale case warning |

---

## Activity Intelligence (Part B)

### Event Ingestion
- Polls 5 department systems: Shop & Est, Factories, Labour, KSPCB, BESCOM
- Normalised event schema: `{event_id, local_id, event_type, timestamp, department, payload}`
- Deduplication on `event_id`

### Attribution
- Maps events to UBIDs via `department:local_id` lookup
- 3-retry policy: resolved → pending → manual
- **Never silently drops** any event

### Classification
- 9 features per UBID (24-month lookback)
- XGBoost multi-class: Active / Dormant / Closed
- Natural language SHAP explanations

### Example Query
```
"Active factories in PIN 560058 with no inspection in 18 months"
```

```bash
curl -X POST http://localhost:8000/api/analytics/query \
  -H "Content-Type: application/json" \
  -d '{"status": "active", "department": "factories", "pin_code": "560058", "no_inspection_months": 18}'
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql://... | PostgreSQL connection string |
| REDIS_URL | redis://localhost:6379 | Redis connection string |
| RABBITMQ_URL | amqp://guest:guest@... | RabbitMQ connection string |
| AUTO_LINK_THRESHOLD | 0.88 | Auto-merge confidence threshold |
| REVIEW_THRESHOLD | 0.55 | Review queue confidence threshold |
| QUEUE_AGE_ALERT_HOURS | 72 | Stale case alert threshold |
| OBSERVATION_WINDOW_MONTHS | 24 | Activity feature lookback window |

---

## Project Structure

```
aiforbharat/
├── backend/
│   ├── adapters/              # Department-specific data adapters
│   │   ├── base.py            # Abstract adapter + CanonicalRecord
│   │   ├── shop_establishment.py
│   │   ├── factories.py
│   │   ├── labour.py
│   │   └── kspcb.py
│   ├── api/
│   │   ├── main.py            # FastAPI app + auto-seed startup
│   │   ├── schemas.py         # Pydantic request/response models
│   │   └── routes/
│   │       ├── reviewer.py    # Reviewer queue + SHAP
│   │       └── analytics.py   # UBID search & analytics
│   ├── db/
│   │   ├── models.py          # SQLAlchemy ORM (5 tables)
│   │   ├── seed_synthetic.py
│   │   └── synthetic/         # Generated JSON data files
│   ├── intelligence/
│   │   ├── event_ingestion.py # Lifecycle event generation
│   │   ├── attribution.py    # UBID ↔ event linking
│   │   └── classifier.py     # XGBoost Active/Dormant/Closed
│   └── resolution/
│       ├── normaliser.py      # Name & address normalisation
│       ├── blocker.py         # Candidate pair generation
│       ├── feature_engineer.py# 9 pairwise features
│       ├── scorer.py          # XGBoost scoring + SHAP
│       └── ubid_assigner.py   # UBID generation & assignment
├── frontend/
│   └── src/
│       ├── app/(admin)/       # Next.js App Router pages
│       │   ├── dashboard/     # Stat cards + UBID search
│       │   ├── reviewer/      # Human review queue
│       │   └── analytics/     # Timeline + query builder
│       ├── components/
│       │   ├── dashboard/     # StatCard, SearchSection, ResultsTable
│       │   └── reviewer/      # RecordComparison, ShapChart, ActionBar
│       └── lib/api.ts         # Type-safe API client
├── scripts/
│   ├── run_pipeline.py        # Manual pipeline runner
│   ├── generate_synthetic.py  # Synthetic data generator
│   ├── integration_test.py    # Full E2E test suite
│   └── validate_phase*.py     # Per-phase validators
├── docs/
│   ├── PRD.md
│   └── TECHNICAL_SPEC.md
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── vercel.json                # Vercel deployment config
├── render.yaml                # Render deployment blueprint
└── README.md
```

---

## Non-Negotiables

- ❌ No modifications to any department source system
- ❌ No LLM calls on raw PII
- ✅ Every decision explainable (SHAP feature importance)
- ✅ Every decision reversible (audit log with full history)
- ✅ Wrong merge > missed merge (conservative thresholds)
- ✅ Works entirely on synthetic/scrambled data

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Entity resolution precision | > 95% | ✅ |
| Auto-link rate | > 60% of pairs | ✅ |
| Reviewer queue age | < 72 hours | ✅ (alert system) |
| Activity classification accuracy | > 88% | ✅ |
| Query response time | < 2 seconds | ✅ |
| Integration test pass rate | 100% | ✅ 23/23 |
