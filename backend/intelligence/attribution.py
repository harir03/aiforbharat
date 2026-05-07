"""
Event-to-UBID attribution — map local_id in events to their UBID.

PRD Feature B2:
- If local_id has UBID → attribute immediately (attribution='resolved')
- If no UBID yet → hold in pending queue (attribution='pending')
- If irresolvable after 3 retries → set attribution='manual', surface for review
- NEVER silently drop any event
"""
import logging
from typing import Optional

from backend.intelligence.event_ingestion import ActivityEvent

logger = logging.getLogger("ubid.intelligence.attribution")

# In-memory UBID mapping and retry tracking
_ubid_map: dict[str, str] = {}  # "dept:local_id" → UBID
_pending_queue: list[ActivityEvent] = []
_retry_counts: dict[str, int] = {}  # event_id → retry count
_manual_queue: list[ActivityEvent] = []

MAX_RETRIES = 3


def load_ubid_mapping(ubid_map: dict[str, str]) -> None:
    """Load the UBID mapping from the resolution pipeline.

    Args:
        ubid_map: dict of "department:local_id" → UBID string
    """
    _ubid_map.clear()
    _ubid_map.update(ubid_map)
    logger.info("Loaded %d UBID mappings for attribution", len(_ubid_map))


def attribute_event(event: ActivityEvent) -> ActivityEvent:
    """Attribute an event to its UBID.

    Rules (PRD B2):
        1. If local_id has a UBID mapping → resolve immediately
        2. If no UBID yet → mark pending, add to pending queue
        3. If irresolvable after 3 retries → mark manual, surface for review
        NEVER silently drop.
    """
    lookup_key = f"{event.department}:{event.local_id}"
    ubid = _ubid_map.get(lookup_key)

    if ubid:
        event.ubid = ubid
        event.attribution = "resolved"
        logger.debug("Attributed %s -> %s", event.event_id, ubid)
        return event

    # No UBID — check retry count
    retries = _retry_counts.get(event.event_id, 0)

    if retries >= MAX_RETRIES:
        # Irresolvable -> surface for manual review, NEVER drop
        event.attribution = "manual"
        if event not in _manual_queue:
            _manual_queue.append(event)
        logger.warning(
            "Event %s irresolvable after %d retries -> manual queue",
            event.event_id, retries,
        )
        return event

    # Pending — hold for later attribution
    event.attribution = "pending"
    _retry_counts[event.event_id] = retries + 1
    if event not in _pending_queue:
        _pending_queue.append(event)
    logger.debug(
        "Event %s pending (retry %d/%d)",
        event.event_id, retries + 1, MAX_RETRIES,
    )
    return event


def attribute_all(events: list[ActivityEvent]) -> dict:
    """Attribute a batch of events. Returns summary counts."""
    resolved = 0
    pending = 0
    manual = 0

    for event in events:
        result = attribute_event(event)
        if result.attribution == "resolved":
            resolved += 1
        elif result.attribution == "pending":
            pending += 1
        elif result.attribution == "manual":
            manual += 1

    logger.info(
        "Attribution: %d resolved, %d pending, %d manual",
        resolved, pending, manual,
    )
    return {"resolved": resolved, "pending": pending, "manual": manual}


def retry_pending() -> dict:
    """Retry attribution for pending events (called after new UBID mappings)."""
    if not _pending_queue:
        return {"resolved": 0, "pending": 0, "manual": 0}

    events_to_retry = list(_pending_queue)
    _pending_queue.clear()

    result = attribute_all(events_to_retry)
    logger.info("Retry pending: %s", result)
    return result


def get_pending_count() -> int:
    """Return count of pending events."""
    return len(_pending_queue)


def get_manual_queue() -> list[ActivityEvent]:
    """Return events requiring manual attribution review."""
    return list(_manual_queue)
