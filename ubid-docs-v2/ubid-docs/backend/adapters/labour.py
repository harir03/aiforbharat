"""
Labour department adapter.

Field mapping (department-specific -> canonical):
    establishment_name   -> name_raw
    employer_name        -> (metadata)
    registered_address   -> address_raw
    area_pin             -> pin_code
    employer_pan         -> pan
    gst_reg_no           -> gstin
    mobile               -> phone
    email_address        -> email
    date_of_registration -> reg_date
    labour_id            -> local_id

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

logger = logging.getLogger("ubid.adapters.labour")

SYNTHETIC_DATA_PATH = (
    Path(__file__).resolve().parent.parent / "db" / "synthetic" / "labour.json"
)


class LabourAdapter(BaseAdapter):
    """Adapter for the Labour department system."""

    def __init__(self) -> None:
        self._base_url: str = os.getenv("LABOUR_API_URL", "")

    @property
    def department_name(self) -> str:
        return "labour"

    def fetch_records(self) -> list[CanonicalRecord]:
        """Fetch records from the Labour API, falling back to synthetic data."""
        if self._base_url:
            try:
                resp = httpx.get(f"{self._base_url}/records", timeout=10.0)
                resp.raise_for_status()
                return [self._map_to_canonical(r) for r in resp.json()]
            except httpx.HTTPError as exc:
                logger.error("Labour API call failed: %s", exc)

        try:
            return self._load_synthetic()
        except Exception as exc:
            logger.error("Labour adapter fetch failed: %s", exc)
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
                logger.warning("Skipping malformed Labour record %s: %s", row.get("labour_id"), exc)
        return records

    @staticmethod
    def _map_to_canonical(row: dict) -> CanonicalRecord:
        """Map Labour field names to canonical schema."""
        reg_date: Optional[date] = None
        if row.get("date_of_registration"):
            reg_date = datetime.strptime(row["date_of_registration"], "%Y-%m-%d").date()
        return CanonicalRecord(
            department="labour",
            local_id=str(row["labour_id"]),
            name_raw=row.get("establishment_name"),
            address_raw=row.get("registered_address"),
            pin_code=row.get("area_pin"),
            pan=row.get("employer_pan"),
            gstin=row.get("gst_reg_no"),
            phone=row.get("mobile"),
            email=row.get("email_address"),
            reg_date=reg_date,
        )
