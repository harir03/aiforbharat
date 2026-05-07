"""
Event ingestion -- poll department systems for activity events.

PRD Feature B1: Consume inspections, renewals, compliance filings, consumption readings.
All events normalised to: { event_id, local_id, event_type, timestamp, department, payload }
Deduplicate on event_id before inserting.
"""
import logging
import random
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger("ubid.intelligence.events")


@dataclass
class ActivityEvent:
    """Normalised activity event from any department."""

    event_id: str
    local_id: str
    department: str
    event_type: str  # inspection | renewal | compliance | consumption | closure
    event_ts: datetime
    payload: dict = field(default_factory=dict)
    ubid: Optional[str] = None
    attribution: str = "pending"  # resolved | pending | manual


# In-memory event store (production: PostgreSQL activity_events table)
_event_store: dict[str, ActivityEvent] = {}
_seen_ids: set[str] = set()


def _insert_event(event: ActivityEvent) -> bool:
    """Insert with dedup on event_id (INSERT ... ON CONFLICT DO NOTHING)."""
    if event.event_id in _seen_ids:
        return False
    _seen_ids.add(event.event_id)
    _event_store[event.event_id] = event
    return True


def get_all_events() -> list[ActivityEvent]:
    """Return all stored events."""
    return list(_event_store.values())


def get_events_for_ubid(ubid: str) -> list[ActivityEvent]:
    """Return events attributed to a specific UBID, sorted by timestamp."""
    events = [e for e in _event_store.values() if e.ubid == ubid]
    return sorted(events, key=lambda e: e.event_ts, reverse=True)


def clear_events() -> None:
    """Clear the event store (for re-seeding between test runs)."""
    _event_store.clear()
    _seen_ids.clear()


def poll_department_events(department: str) -> list[ActivityEvent]:
    """Simulate polling a department system for activity events.

    Generates realistic synthetic events per department type:
    - factories/labour -> inspections
    - shop_est -> renewals
    - kspcb -> compliance filings
    - bescom -> consumption readings
    """
    random.seed(hash(department) + 42)
    now = datetime.now(timezone.utc)
    events: list[ActivityEvent] = []

    # Generate events for local_ids matching our synthetic data pattern
    dept_prefix = {
        "shop_est": "SE", "factories": "FA",
        "labour": "LB", "kspcb": "KS", "bescom": "BS",
    }.get(department, "XX")

    event_types = {
        "shop_est": ["renewal", "renewal", "closure"],
        "factories": ["inspection", "inspection", "inspection", "closure"],
        "labour": ["inspection", "inspection", "compliance"],
        "kspcb": ["compliance", "compliance", "compliance", "closure"],
        "bescom": ["consumption", "consumption", "consumption"],
    }.get(department, ["inspection"])

    # Generate 30-80 events spanning 24 months
    n_events = random.randint(30, 80)
    for _ in range(n_events):
        local_id = f"{dept_prefix}{random.randint(1, 50):03d}"
        event_type = random.choice(event_types)
        days_ago = random.randint(0, 730)  # 0 to 24 months
        event_ts = now - timedelta(days=days_ago, hours=random.randint(0, 23))

        payload = _generate_payload(department, event_type, event_ts)

        event = ActivityEvent(
            event_id=f"{department}-{uuid.uuid4().hex[:10]}",
            local_id=local_id,
            department=department,
            event_type=event_type,
            event_ts=event_ts,
            payload=payload,
        )
        events.append(event)

    # Deduplicate and store
    inserted = 0
    for event in events:
        if _insert_event(event):
            inserted += 1

    logger.info(
        "Polled %s: %d events generated, %d new (deduplicated)",
        department, len(events), inserted,
    )
    return events


def generate_lifecycle_events(
    ubid_map: dict[str, str],
    target_active_pct: float = 0.40,
    target_dormant_pct: float = 0.40,
) -> dict[str, list[str]]:
    """Generate lifecycle-aware events for each UBID.

    Args:
        ubid_map: dict of "department:local_id" -> UBID
        target_active_pct: fraction of UBIDs to make Active (events <6mo)
        target_dormant_pct: fraction to make Dormant (events 6-18mo)
        remaining fraction becomes Closed (closure notice or >18mo silence)

    Returns:
        dict mapping lifecycle category -> list of UBIDs assigned to it
    """
    random.seed(99)
    now = datetime.now(timezone.utc)

    # Group local_ids by UBID
    ubid_to_keys: dict[str, list[str]] = {}
    for key, ubid in ubid_map.items():
        ubid_to_keys.setdefault(ubid, []).append(key)

    all_ubids = list(ubid_to_keys.keys())
    random.shuffle(all_ubids)

    n_total = len(all_ubids)
    n_active = int(n_total * target_active_pct)
    n_dormant = int(n_total * target_dormant_pct)

    active_ubids = all_ubids[:n_active]
    dormant_ubids = all_ubids[n_active:n_active + n_dormant]
    closed_ubids = all_ubids[n_active + n_dormant:]

    lifecycle_map = {
        "active": active_ubids,
        "dormant": dormant_ubids,
        "closed": closed_ubids,
    }

    dept_event_types = {
        "shop_est": ["renewal", "renewal", "inspection"],
        "factories": ["inspection", "inspection", "compliance"],
        "labour": ["inspection", "compliance"],
        "kspcb": ["compliance", "compliance"],
    }

    generated = 0

    # --- Active UBIDs: multiple recent events within 0-160 days ---
    for ubid in active_ubids:
        keys = ubid_to_keys[ubid]
        n_events = random.randint(4, 10)
        for _ in range(n_events):
            key = random.choice(keys)
            dept, local_id = key.split(":", 1)
            days_ago = random.randint(0, 160)
            event_ts = now - timedelta(days=days_ago, hours=random.randint(0, 23))
            etype = random.choice(dept_event_types.get(dept, ["inspection"]))
            payload = _generate_payload(dept, etype, event_ts)

            evt = ActivityEvent(
                event_id=f"life-{uuid.uuid4().hex[:10]}",
                local_id=local_id,
                department=dept,
                event_type=etype,
                event_ts=event_ts,
                payload=payload,
            )
            _insert_event(evt)
            generated += 1

        # Also add a compliance event within 60 days (low compliance gap)
        key = random.choice(keys)
        dept, local_id = key.split(":", 1)
        comp_ts = now - timedelta(days=random.randint(5, 60))
        comp_evt = ActivityEvent(
            event_id=f"life-{uuid.uuid4().hex[:10]}",
            local_id=local_id,
            department=dept,
            event_type="compliance",
            event_ts=comp_ts,
            payload=_generate_payload(dept, "compliance", comp_ts),
        )
        _insert_event(comp_evt)
        generated += 1

    # --- Dormant UBIDs: events only 200-500 days ago, none recent ---
    for ubid in dormant_ubids:
        keys = ubid_to_keys[ubid]
        n_events = random.randint(1, 4)
        for _ in range(n_events):
            key = random.choice(keys)
            dept, local_id = key.split(":", 1)
            days_ago = random.randint(200, 500)
            event_ts = now - timedelta(days=days_ago, hours=random.randint(0, 23))
            etype = random.choice(dept_event_types.get(dept, ["inspection"]))
            payload = _generate_payload(dept, etype, event_ts)

            evt = ActivityEvent(
                event_id=f"life-{uuid.uuid4().hex[:10]}",
                local_id=local_id,
                department=dept,
                event_type=etype,
                event_ts=event_ts,
                payload=payload,
            )
            _insert_event(evt)
            generated += 1

    # --- Closed UBIDs: closure notice or very old events (>540 days) ---
    for ubid in closed_ubids:
        keys = ubid_to_keys[ubid]
        key = random.choice(keys)
        dept, local_id = key.split(":", 1)

        # 70% get an explicit closure notice
        if random.random() < 0.70:
            close_days = random.randint(100, 600)
            close_ts = now - timedelta(days=close_days)
            close_evt = ActivityEvent(
                event_id=f"life-{uuid.uuid4().hex[:10]}",
                local_id=local_id,
                department=dept,
                event_type="closure",
                event_ts=close_ts,
                payload=_generate_payload(dept, "closure", close_ts),
            )
            _insert_event(close_evt)
            generated += 1

        # Also add 0-1 very old events
        if random.random() < 0.5:
            old_ts = now - timedelta(days=random.randint(550, 730))
            old_evt = ActivityEvent(
                event_id=f"life-{uuid.uuid4().hex[:10]}",
                local_id=local_id,
                department=dept,
                event_type=random.choice(["inspection", "compliance"]),
                event_ts=old_ts,
                payload=_generate_payload(dept, "inspection", old_ts),
            )
            _insert_event(old_evt)
            generated += 1

    logger.info(
        "Generated %d lifecycle events: %d active, %d dormant, %d closed UBIDs",
        generated, len(active_ubids), len(dormant_ubids), len(closed_ubids),
    )
    return lifecycle_map


def _generate_payload(department: str, event_type: str, ts: datetime) -> dict:
    """Generate realistic event payload per type."""
    if event_type == "inspection":
        return {
            "inspector_id": f"INS-{random.randint(100, 999)}",
            "result": random.choice(["pass", "pass", "pass", "minor_violation", "major_violation"]),
            "next_due": (ts + timedelta(days=random.choice([90, 180, 365]))).isoformat(),
        }
    elif event_type == "renewal":
        validity_years = random.choice([1, 2, 3, 5])
        return {
            "licence_type": random.choice(["trade", "establishment", "signage"]),
            "validity_years": validity_years,
            "expiry_date": (ts + timedelta(days=365 * validity_years)).isoformat(),
        }
    elif event_type == "compliance":
        return {
            "report_type": random.choice(["air_quality", "water_quality", "hazardous_waste", "noise"]),
            "status": random.choice(["compliant", "compliant", "non_compliant", "pending"]),
        }
    elif event_type == "consumption":
        return {
            "reading_kwh": round(random.uniform(100, 50000), 1),
            "meter_id": f"MTR-{random.randint(10000, 99999)}",
            "billing_period": ts.strftime("%Y-%m"),
        }
    elif event_type == "closure":
        return {
            "reason": random.choice(["voluntary", "non_compliance", "merged", "bankrupt"]),
            "effective_date": ts.isoformat(),
        }
    return {}
