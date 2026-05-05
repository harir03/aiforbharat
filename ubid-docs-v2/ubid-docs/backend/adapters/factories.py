"""
Factories department adapter.

Field mapping (department-specific -> canonical):
    factory_name    -> name_raw
    proprietor      -> (metadata)
    factory_address -> address_raw  (district appended)
    pincode         -> pin_code
    pan_no          -> pan
    gstin_no        -> gstin
    phone_no        -> phone
    email_id        -> email
    licence_date    -> reg_date
    factory_id      -> local_id

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

logger = logging.getLogger("ubid.adapters.factories")

SYNTHETIC_DATA_PATH = (
    Path(__file__).resolve().parent.parent / "db" / "synthetic" / "factories.json"
)


class FactoriesAdapter(BaseAdapter):
    """Adapter for the Factories & Boilers department system."""

    def __init__(self) -> None:
        self._base_url: str = os.getenv("FACTORIES_API_URL", "")

    @property
    def department_name(self) -> str:
        return "factories"

    def fetch_records(self) -> list[CanonicalRecord]:
        """Fetch records from the Factories API, falling back to synthetic data."""
        if self._base_url:
            try:
                resp = httpx.get(f"{self._base_url}/records", timeout=10.0)
                resp.raise_for_status()
                return [self._map_to_canonical(r) for r in resp.json()]
            except httpx.HTTPError as exc:
                logger.error("Factories API call failed: %s", exc)

        try:
            return self._load_synthetic()
        except Exception as exc:
            logger.error("Factories adapter fetch failed: %s", exc)
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
                logger.warning("Skipping malformed Factories record %s: %s", row.get("factory_id"), exc)
        return records

    @staticmethod
    def _map_to_canonical(row: dict) -> CanonicalRecord:
        """Map Factories field names to canonical schema."""
        reg_date: Optional[date] = None
        if row.get("licence_date"):
            reg_date = datetime.strptime(row["licence_date"], "%Y-%m-%d").date()
        address_parts = [row.get("factory_address", "")]
        if row.get("district"):
            address_parts.append(row["district"])
        address_raw = ", ".join(p for p in address_parts if p)
        return CanonicalRecord(
            department="factories",
            local_id=str(row["factory_id"]),
            name_raw=row.get("factory_name"),
            address_raw=address_raw or None,
            pin_code=row.get("pincode"),
            pan=row.get("pan_no"),
            gstin=row.get("gstin_no"),
            phone=row.get("phone_no"),
            email=row.get("email_id"),
            reg_date=reg_date,
        )
