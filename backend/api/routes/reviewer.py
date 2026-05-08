"""
Reviewer API routes — TECHNICAL_SPEC.md section 4.

Endpoints:
    GET  /api/reviewer/queue                   → paginated queue
    GET  /api/reviewer/queue/{case_id}         → full case detail with SHAP
    POST /api/reviewer/queue/{case_id}/approve → merge + log
    POST /api/reviewer/queue/{case_id}/reject  → keep separate + log
    POST /api/reviewer/queue/{case_id}/defer   → return to queue
    POST /api/reviewer/queue/{case_id}/escalate→ senior review
"""
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

from backend.adapters.base import CanonicalRecord
from backend.api.schemas import (
    ActionResponse,
    CaseDetail,
    FieldDiff,
    QueueItem,
    QueueResponse,
    RecordDetail,
    ReviewAction,
    ShapFeature,
)
from backend.resolution.normaliser import normalise_name, normalise_address
from backend.resolution.scorer import explain_pair
from backend.resolution.ubid_assigner import generate_ubid

load_dotenv()
logger = logging.getLogger("ubid.api.reviewer")

router = APIRouter(prefix="/api/reviewer", tags=["reviewer"])

QUEUE_AGE_ALERT_HOURS = float(os.getenv("QUEUE_AGE_ALERT_HOURS", "72"))

# -----------------------------------------------------------------------
# In-memory reviewer queue (production: PostgreSQL linkage_audit table)
# -----------------------------------------------------------------------
_reviewer_queue: list[dict] = []
_audit_log: list[dict] = []


def seed_reviewer_queue(
    cases: list[tuple[CanonicalRecord, CanonicalRecord, float, dict]],
) -> None:
    """Seed the reviewer queue from the resolution pipeline results."""
    _reviewer_queue.clear()
    for rec_a, rec_b, score, features in cases:
        case_id = uuid.uuid4().hex[:12]
        _reviewer_queue.append({
            "case_id": case_id,
            "record_a": rec_a,
            "record_b": rec_b,
            "confidence": score,
            "features": features,
            "created_at": datetime.now(timezone.utc),
            "status": "pending",
        })
    logger.info("Seeded reviewer queue with %d cases", len(_reviewer_queue))


def seed_audit_log(
    scored_pairs: list[tuple[CanonicalRecord, CanonicalRecord, float, dict]],
) -> None:
    """Seed the audit log with realistic demo entries for the Audit page.

    Takes auto-linked pairs and generates a mix of decisions to show
    how the audit trail looks in production use.
    """
    import random
    from datetime import timedelta

    _audit_log.clear()
    random.seed(42)

    decisions = [
        ("approved", "reviewer_01", "Records match — same PAN and address confirmed"),
        ("approved", "reviewer_02", "Name spelling differs but GSTIN root matches"),
        ("approved", "reviewer_01", "Cross-verified with physical inspection records"),
        ("rejected", "reviewer_02", "Different businesses despite similar names — separate PINs"),
        ("rejected", "reviewer_01", "Name overlap is coincidence — completely different industries"),
        ("approved", "reviewer_03", "Address confirmed via BESCOM electricity meter mapping"),
        ("escalated", "reviewer_02", "Complex multi-branch scenario — needs senior review"),
        ("approved", "reviewer_01", "Phone number and PAN both match across departments"),
        ("rejected", "reviewer_03", "One record is a subsidiary, not the parent business"),
        ("escalated", "reviewer_01", "Possible data entry error in source system"),
        ("approved", "reviewer_02", "Labour and Factory registrations confirmed same entity"),
        ("approved", "reviewer_03", "KSPCB clearance matches factory licence holder"),
        ("rejected", "reviewer_01", "Duplicate within same department — not cross-dept link"),
        ("approved", "reviewer_02", "Historical records confirm same business after name change"),
        ("approved", "reviewer_01", "All 4 departments verified — high confidence merge"),
    ]

    # Use real scored pairs if available, otherwise generate synthetic entries
    for i, (resolution, reviewer, note) in enumerate(decisions):
        now = datetime.now(timezone.utc)
        resolved_at = now - timedelta(hours=random.randint(1, 720))

        if i < len(scored_pairs):
            rec_a, rec_b, conf, features = scored_pairs[i]
            record_a_label = f"{rec_a.department}:{rec_a.local_id}"
            record_b_label = f"{rec_b.department}:{rec_b.local_id}"
        else:
            dept_pairs = [
                ("factories", "shop_est"), ("kspcb", "labour"),
                ("factories", "kspcb"), ("labour", "shop_est"),
            ]
            da, db = dept_pairs[i % len(dept_pairs)]
            record_a_label = f"{da}:{da[:2].upper()}{random.randint(100, 999)}"
            record_b_label = f"{db}:{db[:2].upper()}{random.randint(100, 999)}"
            conf = round(random.uniform(0.55, 0.95), 3)
            features = {
                "name_jaro_winkler": round(random.uniform(0.6, 0.99), 3),
                "name_token_sort_ratio": round(random.uniform(0.5, 0.95), 3),
                "pin_match": round(random.choice([0.0, 1.0]), 1),
                "pan_prefix_match": round(random.uniform(0.0, 1.0), 3),
                "address_token_set_ratio": round(random.uniform(0.3, 0.9), 3),
                "phone_match": round(random.choice([0.0, 1.0]), 1),
            }

        ubid = None
        if resolution == "approved":
            ubid = f"KA-PAN-{uuid.uuid4().hex[:8].upper()}"

        _audit_log.append({
            "id": uuid.uuid4().hex,
            "case_id": uuid.uuid4().hex[:12],
            "record_a": record_a_label,
            "record_b": record_b_label,
            "confidence": conf,
            "features": features,
            "resolution": resolution,
            "reviewer_id": reviewer,
            "reviewer_note": note,
            "resolved_at": resolved_at.isoformat(),
            "ubid": ubid,
        })

    # Sort by resolved_at descending (most recent first)
    _audit_log.sort(key=lambda x: x["resolved_at"], reverse=True)
    logger.info("Seeded audit log with %d demo entries", len(_audit_log))


def _record_to_detail(rec: CanonicalRecord) -> RecordDetail:
    """Convert a CanonicalRecord into a RecordDetail with normalised values."""
    return RecordDetail(
        department=rec.department,
        local_id=rec.local_id,
        name_raw=rec.name_raw,
        name_normalised=normalise_name(rec.name_raw),
        address_raw=rec.address_raw,
        address=rec.address_raw,       # Fix 5: alias for address_raw
        pin_code=rec.pin_code,
        pan=rec.pan,
        gstin=rec.gstin,
        phone=rec.phone,
        email=rec.email,
        reg_date=rec.reg_date,
    )


def _compute_field_diffs(a: RecordDetail, b: RecordDetail) -> list[FieldDiff]:
    """Compare two RecordDetail objects and flag differing fields."""
    compare_fields = [
        "name_raw", "name_normalised", "address_raw",
        "pin_code", "pan", "gstin", "phone", "email",
    ]
    diffs: list[FieldDiff] = []
    for field in compare_fields:
        va = getattr(a, field)
        vb = getattr(b, field)
        diffs.append(FieldDiff(
            field_name=field,
            value_a=str(va) if va else None,
            value_b=str(vb) if vb else None,
            matches=(va == vb),
        ))
    return diffs


def _find_case(case_id: str) -> Optional[dict]:
    """Find a case in the queue by ID."""
    for case in _reviewer_queue:
        if case["case_id"] == case_id:
            return case
    return None


def _next_pending_case(exclude_id: str = "") -> Optional[str]:
    """Return the case_id of the next pending case, or None."""
    pending = [
        c for c in _reviewer_queue
        if c["status"] == "pending" and c["case_id"] != exclude_id
    ]
    if not pending:
        return None
    # Ordered by confidence descending (PRD: highest first)
    pending.sort(key=lambda c: c["confidence"], reverse=True)
    return pending[0]["case_id"]


# -----------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------
@router.get("/queue", response_model=QueueResponse)
def get_queue(page: int = 1, page_size: int = 20) -> QueueResponse:
    """Paginated reviewer queue, ordered by confidence descending."""
    pending = [c for c in _reviewer_queue if c["status"] == "pending"]
    pending.sort(key=lambda c: c["confidence"], reverse=True)

    total = len(pending)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = pending[start:end]

    now = datetime.now(timezone.utc)
    has_stale = False
    stale_count = 0                        # Fix 6

    items: list[QueueItem] = []
    for case in page_items:
        age = (now - case["created_at"]).total_seconds() / 3600
        if age > QUEUE_AGE_ALERT_HOURS:
            has_stale = True
            stale_count += 1               # Fix 6
        items.append(QueueItem(
            case_id=case["case_id"],
            name_a=case["record_a"].name_raw,
            name_b=case["record_b"].name_raw,
            department_a=case["record_a"].department,
            department_b=case["record_b"].department,
            confidence=case["confidence"],
            created_at=case["created_at"],
            age_hours=round(age, 1),
        ))

    return QueueResponse(
        items=items, total=total,
        has_stale=has_stale, stale_count=stale_count,
    )


@router.get("/queue/{case_id}", response_model=CaseDetail)
def get_case_detail(case_id: str) -> CaseDetail:
    """Full case detail with SHAP values and field diffs."""
    case = _find_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    rec_a: CanonicalRecord = case["record_a"]
    rec_b: CanonicalRecord = case["record_b"]

    detail_a = _record_to_detail(rec_a)
    detail_b = _record_to_detail(rec_b)
    diffs = _compute_field_diffs(detail_a, detail_b)

    # SHAP / feature importance
    shap_dict = explain_pair(rec_a, rec_b)

    # Fix 2: transform dict → list[ShapFeature]
    shap_list = [
        ShapFeature(feature=k, value=round(v, 6))
        for k, v in shap_dict.items()
    ]

    # Build explanation from top SHAP features
    sorted_feats = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
    top_3 = sorted_feats[:3]
    parts = [
        f"{name.replace('_', ' ')} ({'+' if v > 0 else ''}{v:.3f})"
        for name, v in top_3
    ]
    explanation = f"Top signals: {', '.join(parts)}"

    # Age hours
    now = datetime.now(timezone.utc)
    age_hours = (now - case["created_at"]).total_seconds() / 3600

    return CaseDetail(
        case_id=case["case_id"],
        record_a=detail_a,
        record_b=detail_b,
        confidence=case["confidence"],
        shap_values=shap_list,
        features=case["features"],
        field_diffs=diffs,
        explanation=explanation,
        age_hours=round(age_hours, 1),
        created_at=case["created_at"],
    )


def _resolve_case(case_id: str, resolution: str, action: ReviewAction) -> ActionResponse:
    """Shared logic for approve/reject/defer/escalate."""
    case = _find_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    if case["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Case already resolved: {case['status']}")

    # Fix 3: accept both "reason" and "note"
    resolved_note = action.reason or action.note

    # Reject and Escalate require a note (PRD Feature A6)
    if resolution in ("rejected", "escalated") and not resolved_note:
        raise HTTPException(status_code=422, detail=f"Note is required for {resolution}")

    case["status"] = resolution

    # Write to linkage audit log
    audit_entry = {
        "id": uuid.uuid4().hex,
        "case_id": case_id,
        "record_a": f"{case['record_a'].department}:{case['record_a'].local_id}",
        "record_b": f"{case['record_b'].department}:{case['record_b'].local_id}",
        "confidence": case["confidence"],
        "features": case["features"],
        "resolution": resolution,
        "reviewer_id": action.reviewer_id,
        "reviewer_note": resolved_note,
        "resolved_at": datetime.now(timezone.utc).isoformat(),
    }

    # For approvals, generate a shared UBID
    if resolution == "reviewer_approved":
        rec_a: CanonicalRecord = case["record_a"]
        rec_b: CanonicalRecord = case["record_b"]
        ubid = generate_ubid(pan=rec_a.pan or rec_b.pan, gstin=rec_a.gstin or rec_b.gstin)
        audit_entry["ubid"] = ubid

    _audit_log.append(audit_entry)
    logger.info("Case %s resolved as %s by %s", case_id, resolution, action.reviewer_id)

    # Find next case
    next_id = _next_pending_case(exclude_id=case_id)

    # Fix 4: add success + message
    return ActionResponse(
        success=True,
        message=f"Case {case_id} {resolution} successfully",
        status="ok",
        case_id=case_id,
        resolution=resolution,
        next_case_id=next_id,
    )


@router.post("/queue/{case_id}/approve", response_model=ActionResponse)
def approve_case(case_id: str, action: ReviewAction = ReviewAction()) -> ActionResponse:
    """Approve merge — write to audit, assign shared UBID."""
    return _resolve_case(case_id, "reviewer_approved", action)


@router.post("/queue/{case_id}/reject", response_model=ActionResponse)
def reject_case(case_id: str, action: ReviewAction = ReviewAction()) -> ActionResponse:
    """Reject — keep separate, log decision."""
    return _resolve_case(case_id, "rejected", action)


@router.post("/queue/{case_id}/defer", response_model=ActionResponse)
def defer_case(case_id: str, action: ReviewAction = ReviewAction()) -> ActionResponse:
    """Defer — return to queue for later review."""
    case = _find_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    # Keep status as pending, just log the deferral
    logger.info("Case %s deferred by %s", case_id, action.reviewer_id)
    next_id = _next_pending_case(exclude_id=case_id)
    return ActionResponse(
        success=True,
        message=f"Case {case_id} deferred successfully",
        status="ok",
        case_id=case_id,
        resolution="deferred",
        next_case_id=next_id,
    )


@router.post("/queue/{case_id}/escalate", response_model=ActionResponse)
def escalate_case(case_id: str, action: ReviewAction = ReviewAction()) -> ActionResponse:
    """Escalate — route to senior review with mandatory note."""
    return _resolve_case(case_id, "escalated", action)


@router.get("/audit")
def get_audit_log() -> list[dict]:
    """Return the full audit trail of reviewer decisions."""
    return _audit_log
