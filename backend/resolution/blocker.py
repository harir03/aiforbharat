"""
Blocking — candidate pair generation via blocking keys.

PRD Feature A3 + TECHNICAL_SPEC.md section 5 (exact algorithm).
Uses jellyfish for Double Metaphone encoding.
"""
import logging
from collections import defaultdict
from typing import Optional

import jellyfish

from backend.adapters.base import CanonicalRecord
from backend.resolution.normaliser import normalise_name

logger = logging.getLogger("ubid.resolution.blocker")


def get_blocking_keys(record: CanonicalRecord) -> list[str]:
    """Generate blocking keys for a canonical record.

    Exact implementation from TECHNICAL_SPEC.md section 5.
    """
    keys: list[str] = []

    # Block 1: Exact PAN match
    if record.pan:
        keys.append(f"PAN:{record.pan}")

    # Block 2: Exact GSTIN match (PAN portion = chars 2:12)
    if record.gstin:
        keys.append(f"GST:{record.gstin[:10]}")

    # Block 3+4: PIN + phonetic/prefix of normalised name
    name_normalised = normalise_name(record.name_raw)
    if record.pin_code and name_normalised:
        metaphone_code: str = jellyfish.metaphone(name_normalised)[:6]
        keys.append(f"PIN:{record.pin_code}:MPH:{metaphone_code}")
        keys.append(f"PIN:{record.pin_code}:PFX:{name_normalised[:8]}")

    # Block 5: Phone number (last 10 digits)
    if record.phone:
        phone_clean = record.phone.replace(" ", "").replace("-", "")
        keys.append(f"PHN:{phone_clean[-10:]}")

    return keys


def generate_candidate_pairs(
    records: list[CanonicalRecord],
    linked_pairs: Optional[set[tuple[str, str]]] = None,
) -> list[tuple[CanonicalRecord, CanonicalRecord]]:
    """Build an in-memory blocking index and return candidate pairs.

    Pairs sharing at least one blocking key are candidates.
    Excludes same-record pairs and already-linked pairs.

    Args:
        records: List of canonical records from all departments.
        linked_pairs: Set of (dept:local_id, dept:local_id) tuples
                      already linked — these are skipped.

    Returns:
        De-duplicated list of (record_a, record_b) tuples.
    """
    if linked_pairs is None:
        linked_pairs = set()

    # Build blocking index: key → list of records
    block_index: dict[str, list[CanonicalRecord]] = defaultdict(list)
    for record in records:
        for bk in get_blocking_keys(record):
            block_index[bk].append(record)

    # Collect unique candidate pairs
    seen: set[tuple[str, str]] = set()
    pairs: list[tuple[CanonicalRecord, CanonicalRecord]] = []

    for _key, bucket in block_index.items():
        for i in range(len(bucket)):
            for j in range(i + 1, len(bucket)):
                ra, rb = bucket[i], bucket[j]

                # Deterministic ordering for dedup
                id_a = f"{ra.department}:{ra.local_id}"
                id_b = f"{rb.department}:{rb.local_id}"
                if id_a > id_b:
                    id_a, id_b = id_b, id_a
                    ra, rb = rb, ra

                # Skip same-record or already-linked
                if id_a == id_b:
                    continue
                pair_key = (id_a, id_b)
                if pair_key in seen or pair_key in linked_pairs:
                    continue

                seen.add(pair_key)
                pairs.append((ra, rb))

    logger.info(
        "Blocking produced %d candidate pairs from %d records (%d blocking keys)",
        len(pairs),
        len(records),
        len(block_index),
    )
    return pairs
