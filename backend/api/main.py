"""
UBID Platform — FastAPI Application Entry Point
Minimal app with PostgreSQL connectivity check on startup.
"""
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

load_dotenv()

# ---------------------------------------------------------------------------
# Logging — RULES.md §3: No print() statements, use logging module
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("ubid.api")

# ---------------------------------------------------------------------------
# Database engine — RULES.md §3: thresholds from env, parameterised queries
# ---------------------------------------------------------------------------
DATABASE_URL: str = os.getenv("DATABASE_URL", "")

if DATABASE_URL.startswith("postgresql://"):
    engine_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
else:
    engine_url = DATABASE_URL

engine = create_engine(engine_url, pool_pre_ping=True) if engine_url else None
SessionLocal = sessionmaker(bind=engine) if engine else None

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="UBID Platform API",
    description="Unified Business Identifier for Karnataka Commerce & Industry",
    version="0.1.0",
)

# CORS for frontend dev server
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from backend.api.routes.reviewer import router as reviewer_router
from backend.api.routes.analytics import router as analytics_router
app.include_router(reviewer_router)
app.include_router(analytics_router)


@app.on_event("startup")
def startup_db_check() -> None:
    """Verify PostgreSQL is reachable on app startup."""
    if engine is None:
        logger.warning("DATABASE_URL is not configured — skipping DB check.")
        return
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("PostgreSQL connection verified.")
    except SQLAlchemyError as exc:
        logger.error("PostgreSQL connection FAILED: %s", exc)


@app.on_event("startup")
def auto_seed() -> None:
    """Auto-seed all data stores on startup for dev/demo.

    Runs the full pipeline so all APIs return real data
    with zero manual steps after docker-compose up.
    """
    from backend.adapters.shop_establishment import ShopEstablishmentAdapter
    from backend.adapters.factories import FactoriesAdapter
    from backend.adapters.labour import LabourAdapter
    from backend.adapters.kspcb import KSPCBAdapter
    from backend.resolution.blocker import generate_candidate_pairs
    from backend.resolution.scorer import score_pair, train_model
    from backend.resolution.feature_engineer import compute_features
    from backend.resolution.ubid_assigner import assign_ubids
    from backend.api.routes.reviewer import seed_reviewer_queue, seed_audit_log
    from backend.api.routes.analytics import load_analytics_data
    from backend.intelligence.classifier import classify_all
    from backend.intelligence.event_ingestion import (
        generate_lifecycle_events, get_all_events,
    )
    from backend.intelligence.attribution import load_ubid_mapping, attribute_all

    # Step 1: Ingest from all adapters
    all_records = []
    for Cls in [ShopEstablishmentAdapter, FactoriesAdapter, LabourAdapter, KSPCBAdapter]:
        adapter = Cls()
        records = adapter.fetch_records()
        all_records.extend(records)
        logger.info("Ingested %d records from %s", len(records), adapter.department_name)

    # Step 2: Train model (loads from disk if exists) and run resolution
    train_model()
    pairs = generate_candidate_pairs(all_records)
    logger.info("Generated %d candidate pairs", len(pairs))

    scored_pairs = []
    for rec_a, rec_b in pairs:
        features = compute_features(rec_a, rec_b)
        conf = score_pair(rec_a, rec_b)
        scored_pairs.append((rec_a, rec_b, conf, features))

    result = assign_ubids(all_records, scored_pairs)
    unique_ubids = list(set(result.ubid_map.values()))

    # Step 3: Load analytics data stores
    load_analytics_data(result.ubid_map, all_records)

    # Step 4: Generate lifecycle events (40% active, 40% dormant, 20% closed)
    generate_lifecycle_events(
        result.ubid_map,
        target_active_pct=0.40,
        target_dormant_pct=0.40,
    )

    # Step 5: Attribute events to UBIDs
    load_ubid_mapping(result.ubid_map)
    all_events = get_all_events()
    attribute_all(all_events)
    logger.info("Attributed %d events to UBIDs", len(all_events))

    # Step 6: Classify all UBIDs (Active/Dormant/Closed)
    classify_all(unique_ubids)

    # Step 7: Seed reviewer queue with review-band pairs (0.55 ≤ score < 0.88)
    review_pairs = [
        (a, b, s, f) for a, b, s, f in scored_pairs if 0.55 <= s < 0.88
    ]
    seed_reviewer_queue(review_pairs)

    # Step 8: Seed audit log with demo decisions (auto-linked pairs as base)
    auto_linked_pairs = [
        (a, b, s, f) for a, b, s, f in scored_pairs if s >= 0.88
    ]
    seed_audit_log(auto_linked_pairs)

    logger.info(
        "Startup complete — %d UBIDs, %d reviewer cases",
        len(unique_ubids), len(review_pairs),
    )


@app.get("/", tags=["health"])
def health_check() -> dict:
    """Root health-check endpoint."""
    return {"status": "ok", "service": "UBID Platform API", "version": "0.1.0"}


@app.get("/api/adapters/health", tags=["adapters"])
def adapters_health() -> dict:
    """Return health status of all four department adapters."""
    from backend.adapters.shop_establishment import ShopEstablishmentAdapter
    from backend.adapters.factories import FactoriesAdapter
    from backend.adapters.labour import LabourAdapter
    from backend.adapters.kspcb import KSPCBAdapter

    adapters = [
        ShopEstablishmentAdapter(),
        FactoriesAdapter(),
        LabourAdapter(),
        KSPCBAdapter(),
    ]

    statuses: dict[str, bool] = {}
    for adapter in adapters:
        try:
            statuses[adapter.department_name] = adapter.health_check()
        except Exception as exc:
            logger.error("Health check failed for %s: %s", adapter.department_name, exc)
            statuses[adapter.department_name] = False

    return {"adapters": statuses}


@app.post("/api/resolution/run", tags=["resolution"])
def run_resolution_pipeline() -> dict:
    """Trigger the full resolution pipeline: ingest → block → score → assign."""
    from backend.adapters.shop_establishment import ShopEstablishmentAdapter
    from backend.adapters.factories import FactoriesAdapter
    from backend.adapters.labour import LabourAdapter
    from backend.adapters.kspcb import KSPCBAdapter
    from backend.resolution.blocker import generate_candidate_pairs
    from backend.resolution.scorer import score_pair, explain_pair, train_model
    from backend.resolution.feature_engineer import compute_features
    from backend.resolution.ubid_assigner import assign_ubids

    # Step 1: Ingest from all adapters
    all_records = []
    for Cls in [ShopEstablishmentAdapter, FactoriesAdapter, LabourAdapter, KSPCBAdapter]:
        adapter = Cls()
        records = adapter.fetch_records()
        all_records.extend(records)
        logger.info("Ingested %d records from %s", len(records), adapter.department_name)

    # Step 2: Ensure model is trained
    train_model()

    # Step 3: Generate candidate pairs via blocking
    pairs = generate_candidate_pairs(all_records)

    # Step 4: Score all pairs
    scored_pairs = []
    for rec_a, rec_b in pairs:
        features = compute_features(rec_a, rec_b)
        conf = score_pair(rec_a, rec_b)
        scored_pairs.append((rec_a, rec_b, conf, features))

    # Step 5: Assign UBIDs
    result = assign_ubids(all_records, scored_pairs)

    # Step 6: Seed reviewer queue with review-band pairs
    from backend.api.routes.reviewer import seed_reviewer_queue
    review_pairs = [
        (ra, rb, sc, ft) for ra, rb, sc, ft in scored_pairs
        if 0.55 <= sc < 0.88
    ]
    seed_reviewer_queue(review_pairs)

    return {
        "total_records": len(all_records),
        "candidate_pairs": len(pairs),
        "auto_linked": len(result.auto_linked),
        "review_queue": len(result.review_queue),
        "separate": len(result.separate),
        "unique_ubids": len(set(result.ubid_map.values())),
    }
