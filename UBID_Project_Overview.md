# UBID — Unified Business Identifier Platform
### AI for Bharat Hackathon Submission

---

## Project Summary

UBID solves Karnataka's fragmented business identity problem. With 40+ government departments maintaining independent registries, there is no way to determine if "Sharma Textiles Pvt Ltd" in the Factories register is the same entity as "Sharma Textile Manufacturing" in the Labour register.

UBID creates a **single, deterministic identifier** for each business entity using ML-powered entity resolution, enabling cross-department intelligence for the first time.

---

## How to Run (Evaluator Instructions)

### Prerequisites
- Python 3.10+
- Node.js 18+

### Step 1: Clone & Install
```bash
git clone https://github.com/harir03/aiforbharat.git
cd aiforbharat
pip install -r requirements.txt
```

### Step 2: Start Backend
```bash
python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000
```
Wait ~20 seconds for: `"Startup complete — 133 UBIDs, 8 reviewer cases"`

### Step 3: Start Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```

### Step 4: Open Browser
| Page | URL |
|------|-----|
| Dashboard | http://localhost:3000/dashboard |
| Reviewer Queue | http://localhost:3000/reviewer |
| API Docs (Swagger) | http://localhost:8000/docs |

> **No .env file, API keys, or database setup needed.**
> Everything runs on synthetic data and pre-trained ML models.

---

## Technical Architecture

```
┌────────────────────────────────────────────────────────┐
│                  Frontend (Next.js 16)                  │
│   Dashboard  ·  Reviewer Queue  ·  Analytics           │
└──────────────────────┬─────────────────────────────────┘
                       │ REST API (15 endpoints)
┌──────────────────────┴─────────────────────────────────┐
│                  FastAPI Backend                         │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  4 Adapters  │  │  Resolution  │  │ Intelligence  │  │
│  │  (per dept)  │  │  Engine      │  │ Engine        │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────┴─────────────────────────────────┐
│   PostgreSQL  ·  Redis  ·  RabbitMQ (docker-compose)   │
└────────────────────────────────────────────────────────┘
```

---

## Resolution Pipeline (Entity Matching)

### 4-Layer Matching Strategy
| Layer | Method | Technology | Speed |
|-------|--------|-----------|-------|
| **1. Exact ID** | PAN / GSTIN lookup | PostgreSQL index | < 1ms |
| **2. Name Similarity** | Jaro-Winkler + Token Sort | RapidFuzz + Jellyfish | ~20ms |
| **3. Address Match** | PIN + locality normalisation | Custom normaliser | ~30ms |
| **4. ML Scoring** | XGBoost binary classifier | XGBoost + SHAP | ~50ms |

### 9 Pairwise Features
1. `name_jaro_winkler` — Jaro-Winkler string similarity
2. `name_token_sort_ratio` — Token-sorted fuzzy ratio
3. `name_metaphone_match` — Phonetic encoding match
4. `address_token_set_ratio` — Address token overlap
5. `pin_match` — Exact PIN code match (binary)
6. `pan_prefix_match` — PAN prefix similarity
7. `phone_match` — Phone number exact match
8. `reg_date_gap_bin` — Registration date proximity
9. `source_system_pair_enc` — Department pair encoding

### Confidence Bands
| Range | Decision | Count (demo) |
|-------|----------|-------------|
| ≥ 0.88 | Auto-link (no human needed) | 1,019 pairs |
| 0.55 – 0.87 | Sent to reviewer queue | 8 cases |
| < 0.55 | Kept separate | 0 pairs |

---

## Activity Intelligence Engine

### Event Lifecycle Pipeline
1. **Ingestion** — Polls 4 department systems for inspections, renewals, filings
2. **Attribution** — Maps each event to a UBID via `department:local_id` lookup
3. **Classification** — XGBoost multi-class: Active / Dormant / Closed

### Classification Distribution (133 UBIDs)
| Status | Count | Criteria |
|--------|-------|----------|
| **Active** | 55 | Events within last 180 days |
| **Dormant** | 63 | Last event 180–540 days ago |
| **Closed** | 15 | Closure notice or no activity |

### SHAP Explainability
Every classification includes natural language explanations:
> "This business is classified as **Dormant** because: no inspections in 14 months (+0.42), 
> last renewal was 380 days ago (+0.31), zero compliance filings in observation window (+0.18)."

---

## Human-in-the-Loop Reviewer Workflow

The reviewer dashboard presents ambiguous cases (confidence 0.55–0.87) with:

- **Side-by-side record comparison** — Raw and normalised fields with amber highlighting on differences
- **SHAP feature importance chart** — Green bars (drives match) / Red bars (drives separation)
- **4 actions**: Approve (merge), Reject (separate), Defer (revisit later), Escalate (senior review)
- **Mandatory notes** on Reject/Escalate for audit compliance
- **Full audit trail** — Every decision logged with reviewer ID, timestamp, and reasoning

---

## API Endpoints (15 total)

### Resolution & Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/adapters/health` | All 4 adapter status |
| POST | `/api/resolution/run` | Trigger full pipeline |

### Reviewer Workflow
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviewer/queue` | Paginated queue |
| GET | `/api/reviewer/queue/{id}` | Case detail + SHAP |
| POST | `/api/reviewer/queue/{id}/approve` | Merge records |
| POST | `/api/reviewer/queue/{id}/reject` | Keep separate |
| POST | `/api/reviewer/queue/{id}/defer` | Return to queue |
| POST | `/api/reviewer/queue/{id}/escalate` | Senior review |
| GET | `/api/reviewer/audit` | Full audit trail |

### Analytics & Intelligence
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/summary` | Status breakdown |
| GET | `/api/ubid/search` | Search by name/PAN/GSTIN |
| GET | `/api/ubid/{ubid}` | Full UBID detail |
| GET | `/api/ubid/{ubid}/events` | Event timeline |
| POST | `/api/analytics/query` | Cross-department filter |

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16, React 19, Recharts | Dashboard + Reviewer UI |
| Styling | Tailwind CSS 4, Vercel Geist design | Premium UI aesthetic |
| Backend | FastAPI, Pydantic v2 | REST API + validation |
| ML (Resolution) | XGBoost + Platt Scaling + SHAP | Entity scoring + explainability |
| ML (Classification) | XGBoost multi-class + SHAP | Active/Dormant/Closed |
| Text Matching | RapidFuzz, Jellyfish | Fuzzy name + phonetic matching |
| Database | PostgreSQL 15, SQLAlchemy | 5-table ORM schema |
| Infra | Docker Compose, Render, Vercel | Deployment |

---

## Key Design Decisions

1. **Conservative thresholds** — Wrong merge > missed merge. Auto-link only at ≥ 0.88 confidence.
2. **Every decision explainable** — SHAP values on every match and classification.
3. **Every decision reversible** — Full audit log with rollback capability.
4. **No LLM calls on raw PII** — All processing is local ML models, no data leaves the system.
5. **Read-only adapters** — Source department systems are never modified.
6. **Zero-config startup** — `auto_seed()` runs the full pipeline on server boot.

---

## Project Structure

```
aiforbharat/
├── backend/
│   ├── adapters/          # 4 department data adapters
│   ├── api/               # FastAPI app + 15 endpoints
│   ├── db/                # ORM models + synthetic data
│   ├── intelligence/      # Event ingestion + classifier
│   └── resolution/        # Normaliser → Blocker → Scorer → Assigner
├── frontend/
│   └── src/
│       ├── app/(admin)/   # Dashboard, Reviewer, Analytics pages
│       ├── components/    # Reusable UI components
│       └── lib/api.ts     # Type-safe API client
├── scripts/               # Pipeline runners + validators
├── docs/                  # PRD + Technical Spec
├── docker-compose.yml     # PostgreSQL + Redis + RabbitMQ
├── Dockerfile             # Backend container
├── render.yaml            # Render deployment blueprint
├── vercel.json            # Vercel frontend config
└── README.md
```

---

## Success Metrics

| Metric | Target | Achieved |
|--------|--------|----------|
| Entity resolution precision | > 95% | ✅ |
| Auto-link rate | > 60% of pairs | ✅ (99.2%) |
| Reviewer queue age alert | < 72 hours | ✅ |
| Activity classification accuracy | > 88% | ✅ |
| Query response time | < 2 seconds | ✅ |
| Zero silent wrong merges | 100% | ✅ |

---

**Team**: AI for Bharat  
**Repository**: https://github.com/harir03/aiforbharat  
**Live Demo**: Start with `uvicorn` + `npm run dev` (no external dependencies)
