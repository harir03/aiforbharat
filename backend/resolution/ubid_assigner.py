"""
UBID assignment logic — thresholds from env, UBID generation per TECHNICAL_SPEC.

PRD Feature A5 + TECHNICAL_SPEC.md section 5 (UBID Generation).
"""
import hashlib
import logging
import os
import uuid
from dataclasses import dataclass, field
from typing import Optional

from dotenv import load_dotenv

from backend.adapters.base import CanonicalRecord

load_dotenv()
logger = logging.getLogger("ubid.resolution.ubid_assigner")

# Thresholds from env — RULES.md: never hardcode
AUTO_LINK_THRESHOLD = float(os.getenv("AUTO_LINK_THRESHOLD", "0.88"))
REVIEW_THRESHOLD = float(os.getenv("REVIEW_THRESHOLD", "0.55"))


@dataclass
class AssignmentResult:
    """Result of the UBID assignment process."""

    auto_linked: list[dict] = field(default_factory=list)
    review_queue: list[dict] = field(default_factory=list)
    separate: list[dict] = field(default_factory=list)
    ubid_map: dict[str, str] = field(default_factory=dict)  # record_key → UBID


def generate_ubid(pan: Optional[str] = None, gstin: Optional[str] = None) -> str:
    """Generate a UBID — exact implementation from TECHNICAL_SPEC.md section 5.

    Format: KA-PAN-XXXXXXXX / KA-GST-XXXXXXXX / KA-INT-XXXXXXXX
    """
    if pan:
        hash_val = hashlib.sha256(pan.encode()).hexdigest()[:8].upper()
        return f"KA-PAN-{hash_val}"
    elif gstin:
        pan_portion = gstin[2:12]
        hash_val = hashlib.sha256(pan_portion.encode()).hexdigest()[:8].upper()
        return f"KA-GST-{hash_val}"
    else:
        return f"KA-INT-{uuid.uuid4().hex[:8].upper()}"


def assign_ubids(
    records: list[CanonicalRecord],
    pairs_with_scores: list[tuple[CanonicalRecord, CanonicalRecord, float, dict]],
) -> AssignmentResult:
    """Assign UBIDs based on pair scores and thresholds.

    Args:
        records: All canonical records.
        pairs_with_scores: List of (rec_a, rec_b, score, features) tuples.

    Returns:
        AssignmentResult with auto_linked, review_queue, separate buckets.
    """
    result = AssignmentResult()
    linked_records: set[str] = set()

    # Process pairs by score descending
    sorted_pairs = sorted(pairs_with_scores, key=lambda x: x[2], reverse=True)

    for rec_a, rec_b, score, features in sorted_pairs:
        key_a = f"{rec_a.department}:{rec_a.local_id}"
        key_b = f"{rec_b.department}:{rec_b.local_id}"

        if score >= AUTO_LINK_THRESHOLD:
            # Auto-link: assign shared UBID
            ubid = generate_ubid(pan=rec_a.pan or rec_b.pan, gstin=rec_a.gstin or rec_b.gstin)
            result.auto_linked.append({
                "record_a": key_a,
                "record_b": key_b,
                "score": score,
                "ubid": ubid,
                "features": features,
            })
            result.ubid_map[key_a] = ubid
            result.ubid_map[key_b] = ubid
            linked_records.add(key_a)
            linked_records.add(key_b)
            logger.info("Auto-linked %s <-> %s (score=%.3f) -> %s", key_a, key_b, score, ubid)

        elif score >= REVIEW_THRESHOLD:
            # Review queue
            result.review_queue.append({
                "record_a": key_a,
                "record_b": key_b,
                "score": score,
                "features": features,
            })
            logger.info("Queued for review %s <-> %s (score=%.3f)", key_a, key_b, score)

        else:
            # Separate
            result.separate.append({
                "record_a": key_a,
                "record_b": key_b,
                "score": score,
            })

    # Assign independent UBIDs to unlinked records
    for rec in records:
        key = f"{rec.department}:{rec.local_id}"
        if key not in result.ubid_map:
            ubid = generate_ubid(pan=rec.pan, gstin=rec.gstin)
            result.ubid_map[key] = ubid

    logger.info(
        "Assignment complete: %d auto-linked, %d review, %d separate, %d total UBIDs",
        len(result.auto_linked), len(result.review_queue),
        len(result.separate), len(set(result.ubid_map.values())),
    )
    return result
