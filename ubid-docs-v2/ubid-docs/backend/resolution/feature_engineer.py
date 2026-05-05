"""
Feature engineering for candidate pairs — exactly 9 features.

TECHNICAL_SPEC.md section 5: Feature Vector.
Uses rapidfuzz for all string similarity metrics.
"""
import logging
from datetime import date
from typing import Optional

import jellyfish
from rapidfuzz import fuzz

from backend.adapters.base import CanonicalRecord
from backend.resolution.normaliser import normalise_name, normalise_address

logger = logging.getLogger("ubid.resolution.features")

# Exact feature list from TECHNICAL_SPEC.md
FEATURE_NAMES: list[str] = [
    "name_jaro_winkler",
    "name_token_sort_ratio",
    "name_metaphone_match",
    "address_token_set_ratio",
    "pin_match",
    "pan_prefix_match",
    "phone_match",
    "reg_date_gap_bin",
    "source_system_pair_enc",
]

# Categorical encoding for department pair combinations
_DEPT_PAIR_ENCODING: dict[tuple[str, str], int] = {
    ("factories", "kspcb"): 1,
    ("factories", "labour"): 2,
    ("factories", "shop_est"): 3,
    ("kspcb", "labour"): 4,
    ("kspcb", "shop_est"): 5,
    ("labour", "shop_est"): 6,
}


def _date_gap_bin(d1: Optional[date], d2: Optional[date]) -> int:
    """Bin the absolute day gap between two dates into 0-4.

    0 = both missing or same day
    1 = 1-30 days
    2 = 31-180 days
    3 = 181-365 days
    4 = >365 days
    """
    if d1 is None or d2 is None:
        return 0
    gap = abs((d1 - d2).days)
    if gap == 0:
        return 0
    if gap <= 30:
        return 1
    if gap <= 180:
        return 2
    if gap <= 365:
        return 3
    return 4


def _dept_pair_enc(dept_a: str, dept_b: str) -> int:
    """Deterministic categorical encoding for department pair."""
    key = tuple(sorted([dept_a, dept_b]))
    return _DEPT_PAIR_ENCODING.get(key, 0)  # type: ignore[arg-type]


def compute_features(record_a: CanonicalRecord, record_b: CanonicalRecord) -> dict:
    """Compute the 9-feature vector for a candidate pair.

    All values are float or int — no strings in the feature vector.
    Returns dict keyed by FEATURE_NAMES.
    """
    name_a = normalise_name(record_a.name_raw)
    name_b = normalise_name(record_b.name_raw)
    addr_a = normalise_address(record_a.address_raw)
    addr_b = normalise_address(record_b.address_raw)

    # 1. name_jaro_winkler (float 0-1)
    if name_a and name_b:
        name_jw = jellyfish.jaro_winkler_similarity(name_a, name_b)
    else:
        name_jw = 0.0

    # 2. name_token_sort_ratio (float 0-1)
    if name_a and name_b:
        name_tsr = fuzz.token_sort_ratio(name_a, name_b) / 100.0
    else:
        name_tsr = 0.0

    # 3. name_metaphone_match (bool 0/1)
    if name_a and name_b:
        mph_a = jellyfish.metaphone(name_a)
        mph_b = jellyfish.metaphone(name_b)
        name_mph = 1 if mph_a == mph_b else 0
    else:
        name_mph = 0

    # 4. address_token_set_ratio (float 0-1)
    if addr_a and addr_b:
        addr_tsr = fuzz.token_set_ratio(addr_a, addr_b) / 100.0
    else:
        addr_tsr = 0.0

    # 5. pin_match (bool 0/1)
    pin_match = 1 if (record_a.pin_code and record_b.pin_code
                      and record_a.pin_code == record_b.pin_code) else 0

    # 6. pan_prefix_match (bool 0/1 — first 5 chars)
    if record_a.pan and record_b.pan:
        pan_pfx = 1 if record_a.pan[:5] == record_b.pan[:5] else 0
    else:
        pan_pfx = 0

    # 7. phone_match (bool 0/1)
    if record_a.phone and record_b.phone:
        pa = record_a.phone.replace(" ", "").replace("-", "")[-10:]
        pb = record_b.phone.replace(" ", "").replace("-", "")[-10:]
        phone_m = 1 if pa == pb else 0
    else:
        phone_m = 0

    # 8. reg_date_gap_bin (int 0-4)
    date_bin = _date_gap_bin(record_a.reg_date, record_b.reg_date)

    # 9. source_system_pair_enc (int)
    pair_enc = _dept_pair_enc(record_a.department, record_b.department)

    return {
        "name_jaro_winkler": round(name_jw, 6),
        "name_token_sort_ratio": round(name_tsr, 6),
        "name_metaphone_match": name_mph,
        "address_token_set_ratio": round(addr_tsr, 6),
        "pin_match": pin_match,
        "pan_prefix_match": pan_pfx,
        "phone_match": phone_m,
        "reg_date_gap_bin": date_bin,
        "source_system_pair_enc": pair_enc,
    }
