"""
KSPCB (Karnataka State Pollution Control Board) adapter.

Field mapping (department-specific -> canonical):
    industry_name -> name_raw
    promoter      -> (metadata)
    site_address  -> address_raw
    site_pincode  -> pin_code
    company_pan   -> pan
    gstin         -> gstin
    contact_no    -> phone
    email         -> email
    consent_date  -> reg_date
    kspcb_id      -> local_id

READ-ONLY adapter. No write methods.
"""
import json
import logging
import os
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import httpx

from backend.adapters.base import BaseAdapter, CanonicalRecord

logger = logging.getLogger("ubid.adapters.kspcb")

SYNTHETIC_DATA_PATH = (
    Path(__file__).resolve().parent.parent / "db" / "synthetic" / "kspcb.json"
)


class KSPCBAdapter(BaseAdapter):
    """Adapter for the KSPCB department system."""

    def __init__(self) -> None:
        self._base_url: str = os.getenv("KSPCB_API_URL", "")

    @property
    def department_name(self) -> str:
        return "kspcb"

    def fetch_records(self) -> list[CanonicalRecord]:
        """Fetch records from the KSPCB API, falling back to synthetic data."""
        if self._base_url:
            try:
                resp = httpx.get(f"{self._base_url}/records", timeout=10.0)
                resp.raise_for_status()
                return [self._map_to_canonical(r) for r in resp.json()]
            except httpx.HTTPError as exc:
                logger.error("KSPCB API call failed: %s", exc)

        try:
            return self._load_synthetic()
        except Exception as exc:
            logger.error("KSPCB adapter fetch failed: %s", exc)
            return []

    def health_check(self) -> bool:
        """Check if the upstream source is reachable."""
        if self._base_url:
            try:
                resp = httpx.get(f"{self._base_url}/health", timeout=5.0)
                return resp.status_code == 200
            except httpx.HTTPError:
                return False
        return SYNTHETIC_DATA_PATH.exists()

    def _load_synthetic(self) -> list[CanonicalRecord]:
        """Load records from the local synthetic JSON file."""
        if not SYNTHETIC_DATA_PATH.exists():
            logger.warning("Synthetic data not found at %s", SYNTHETIC_DATA_PATH)
            return []
        with open(SYNTHETIC_DATA_PATH, "r", encoding="utf-8") as fh:
            raw_records: list[dict] = json.load(fh)
        records: list[CanonicalRecord] = []
        for row in raw_records:
            try:
                records.append(self._map_to_canonical(row))
            except Exception as exc:
                logger.warning("Skipping malformed KSPCB record %s: %s", row.get("kspcb_id"), exc)
        return records

    @staticmethod
    def _map_to_canonical(row: dict) -> CanonicalRecord:
        """Map KSPCB field names to canonical schema."""
        reg_date: Optional[date] = None
        if row.get("consent_date"):
            reg_date = datetime.strptime(row["consent_date"], "%Y-%m-%d").date()
        return CanonicalRecord(
            department="kspcb",
            local_id=str(row["kspcb_id"]),
            name_raw=row.get("industry_name"),
            address_raw=row.get("site_address"),
            pin_code=row.get("site_pincode"),
            pan=row.get("company_pan"),
            gstin=row.get("gstin"),
            phone=row.get("contact_no"),
            email=row.get("email"),
            reg_date=reg_date,
        )
