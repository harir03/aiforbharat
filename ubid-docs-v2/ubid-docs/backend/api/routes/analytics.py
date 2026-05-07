"""
Analytics API routes — TECHNICAL_SPEC.md section 4.

Endpoints:
    POST /api/analytics/query     → freeform filter query
    GET  /api/analytics/summary   → total UBIDs, status breakdown
    GET  /api/ubid/search         → search by name, PAN, GSTIN, dept ID
    GET  /api/ubid/{ubid}         → full record + linked depts + status
    GET  /api/ubid/{ubid}/events  → activity timeline
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from backend.intelligence.classifier import (
    ClassificationResult,
    get_all_classifications,
    get_classification,
)
from backend.intelligence.event_ingestion import ActivityEvent, get_events_for_ubid
from backend.resolution.ubid_assigner import AssignmentResult

logger = logging.getLogger("ubid.api.analytics")

router = APIRouter(tags=["analytics"])

# In-memory stores (populated by running the pipeline)
_ubid_registry: dict[str, dict] = {}  # UBID → metadata
_record_index: dict[str, dict] = {}   # "dept:local_id" → record detail
_ubid_map: dict[str, str] = {}        # "dept:local_id" → UBID


def load_analytics_data(ubid_map: dict[str, str], records: list) -> None:
    """Load data from the resolution pipeline for analytics queries."""
    _ubid_map.clear()
    _ubid_map.update(ubid_map)

    _record_index.clear()
    for rec in records:
        key = f"{rec.department}:{rec.local_id}"
        _record_index[key] = {
            "department": rec.department,
            "local_id": rec.local_id,
            "name_raw": rec.name_raw,
            "address_raw": rec.address_raw,
            "pin_code": rec.pin_code,
            "pan": rec.pan,
            "gstin": rec.gstin,
            "phone": rec.phone,
            "email": rec.email,
        }

    # Build UBID registry
    _ubid_registry.clear()
    for record_key, ubid in ubid_map.items():
        if ubid not in _ubid_registry:
            rec = _record_index.get(record_key, {})
            _ubid_registry[ubid] = {
                "ubid": ubid,
                "anchor_type": "PAN" if ubid.startswith("KA-PAN") else
                               "GST" if ubid.startswith("KA-GST") else "INT",
                "linked_records": [],
            }
        _ubid_registry[ubid]["linked_records"].append(record_key)

    logger.info("Loaded %d UBIDs with %d records for analytics", len(_ubid_registry), len(records))


# -----------------------------------------------------------------------
# UBID Lookup endpoints
# -----------------------------------------------------------------------
@router.get("/api/ubid/search")
def search_ubid(
    q: Optional[str] = Query(None, description="Name or ID search"),
    pan: Optional[str] = Query(None),
    gstin: Optional[str] = Query(None),
    pin: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
) -> list[dict]:
    """Search UBIDs by name+PIN, PAN, GSTIN, or department ID."""
    results: list[dict] = []

    for record_key, ubid in _ubid_map.items():
        rec = _record_index.get(record_key, {})

        # Filter by PAN
        if pan and rec.get("pan") != pan:
            continue
        # Filter by GSTIN
        if gstin and rec.get("gstin") != gstin:
            continue
        # Filter by PIN
        if pin and rec.get("pin_code") != pin:
            continue
        # Filter by department
        if department and rec.get("department") != department:
            continue
        # Filter by name (substring search)
        if q and q.lower() not in (rec.get("name_raw") or "").lower():
            continue

        classification = get_classification(ubid)
        results.append({
            "ubid": ubid,
            "anchor_type": _ubid_registry.get(ubid, {}).get("anchor_type", "INT"),
            "name": rec.get("name_raw"),
            "pin_code": rec.get("pin_code"),
            "status": classification.status if classification else "unclassified",
            "confidence": classification.confidence if classification else 0.0,
        })

    # Deduplicate by UBID and collect all departments (Fix 1)
    seen: dict[str, dict] = {}
    for r in results:
        uid = r["ubid"]
        if uid not in seen:
            # Collect ALL departments for this UBID
            registry = _ubid_registry.get(uid, {})
            all_depts: set[str] = set()
            for rk in registry.get("linked_records", []):
                rd = _record_index.get(rk, {})
                if rd.get("department"):
                    all_depts.add(rd["department"])
            r["departments"] = sorted(all_depts) if all_depts else []
            seen[uid] = r

    return list(seen.values())[:50]  # Cap at 50 results


@router.get("/api/ubid/{ubid}")
def get_ubid_detail(ubid: str) -> dict:
    """Full UBID detail: linked records, status, classification."""
    registry = _ubid_registry.get(ubid)
    if not registry:
        raise HTTPException(status_code=404, detail=f"UBID {ubid} not found")

    linked = []
    for record_key in registry["linked_records"]:
        rec = _record_index.get(record_key, {})
        linked.append(rec)

    classification = get_classification(ubid)

    return {
        "ubid": ubid,
        "anchor_type": registry["anchor_type"],
        "linked_records": linked,
        "status": classification.status if classification else "unclassified",
        "confidence": classification.confidence if classification else 0.0,
        "prob_active": classification.prob_active if classification else 0.0,
        "prob_dormant": classification.prob_dormant if classification else 0.0,
        "prob_closed": classification.prob_closed if classification else 0.0,
        "explanation": classification.explanation if classification else "",
        "shap_values": classification.shap_values if classification else {},
    }


@router.get("/api/ubid/{ubid}/events")
def get_ubid_events(ubid: str, limit: int = 12) -> list[dict]:
    """Activity timeline for a UBID — last N events."""
    events = get_events_for_ubid(ubid)
    return [
        {
            "event_id": e.event_id,
            "department": e.department,
            "event_type": e.event_type,
            "event_ts": e.event_ts.isoformat(),
            "payload": e.payload,
            "attribution": e.attribution,
        }
        for e in events[:limit]
    ]


# -----------------------------------------------------------------------
# Analytics endpoints
# -----------------------------------------------------------------------
@router.get("/api/analytics/summary")
def analytics_summary() -> dict:
    """Total UBIDs, status breakdown, attribution stats."""
    classifications = get_all_classifications()

    status_counts = {"active": 0, "dormant": 0, "closed": 0, "unclassified": 0}
    for ubid in _ubid_registry:
        cls = classifications.get(ubid)
        if cls:
            status_counts[cls.status] += 1
        else:
            status_counts["unclassified"] += 1

    return {
        "total_ubids": len(_ubid_registry),
        "total_records": len(_record_index),
        "status_breakdown": status_counts,
    }


@router.post("/api/analytics/query")
def analytics_query(filters: dict) -> list[dict]:
    """Freeform filter query for cross-department analytics.

    Supported filters:
    - status: "active" | "dormant" | "closed"
    - department: department name
    - pin_code: 6-digit PIN
    - no_inspection_months: int (e.g., 18 for "no inspection in 18 months")
    """
    from datetime import datetime, timedelta, timezone

    status_filter = filters.get("status")
    dept_filter = filters.get("department")
    pin_filter = filters.get("pin_code")
    no_insp_months = filters.get("no_inspection_months")

    classifications = get_all_classifications()
    results: list[dict] = []

    for ubid, registry in _ubid_registry.items():
        cls = classifications.get(ubid)

        # Status filter
        if status_filter and (not cls or cls.status != status_filter):
            continue

        # Check linked records for department and PIN filters
        matched_records = []
        for record_key in registry["linked_records"]:
            rec = _record_index.get(record_key, {})
            if dept_filter and rec.get("department") != dept_filter:
                continue
            if pin_filter and rec.get("pin_code") != pin_filter:
                continue
            matched_records.append(rec)

        if (dept_filter or pin_filter) and not matched_records:
            continue

        # No-inspection filter
        if no_insp_months:
            cutoff = datetime.now(timezone.utc) - timedelta(days=no_insp_months * 30)
            events = get_events_for_ubid(ubid)
            recent_inspections = [
                e for e in events
                if e.event_type == "inspection" and e.event_ts >= cutoff
            ]
            if recent_inspections:
                continue

        first_rec = _record_index.get(registry["linked_records"][0], {}) if registry["linked_records"] else {}
        results.append({
            "ubid": ubid,
            "name": first_rec.get("name_raw"),
            "department": first_rec.get("department"),
            "pin_code": first_rec.get("pin_code"),
            "status": cls.status if cls else "unclassified",
            "confidence": cls.confidence if cls else 0.0,
            "linked_departments": len(registry["linked_records"]),
        })

    return results[:100]
