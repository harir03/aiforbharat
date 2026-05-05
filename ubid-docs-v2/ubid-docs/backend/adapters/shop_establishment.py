"""
Shop Establishment department adapter.

Field mapping (department-specific -> canonical):
    business_name     -> name_raw
    owner_name        -> (metadata)
    shop_address      -> address_raw
    pin               -> pin_code
    pan_number        -> pan
    gst_number        -> gstin
    contact_phone     -> phone
    contact_email     -> email
    registration_date -> reg_date
    shop_id           -> local_id

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

logger = logging.getLogger("ubid.adapters.shop_est")

SYNTHETIC_DATA_PATH = (
    Path(__file__).resolve().parent.parent / "db" / "synthetic" / "shop_establishment.json"
)


class ShopEstablishmentAdapter(BaseAdapter):
    """Adapter for the Shop & Establishment department system."""

    def __init__(self) -> None:
        self._base_url: str = os.getenv("SHOP_EST_API_URL", "")

    @property
    def department_name(self) -> str:
        return "shop_est"

    def fetch_records(self) -> list[CanonicalRecord]:
        """Fetch records from the Shop Establishment API, falling back to synthetic data."""
        if self._base_url:
            try:
                resp = httpx.get(f"{self._base_url}/records", timeout=10.0)
                resp.raise_for_status()
                return [self._map_to_canonical(r) for r in resp.json()]
            except httpx.HTTPError as exc:
                logger.error("Shop Est API call failed: %s", exc)

        try:
            return self._load_synthetic()
        except Exception as exc:
            logger.error("Shop Est adapter fetch failed: %s", exc)
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
                logger.warning("Skipping malformed Shop Est record %s: %s", row.get("shop_id"), exc)
        return records

    @staticmethod
    def _map_to_canonical(row: dict) -> CanonicalRecord:
        """Map Shop Establishment field names to canonical schema."""
        reg_date: Optional[date] = None
        if row.get("registration_date"):
            reg_date = datetime.strptime(row["registration_date"], "%Y-%m-%d").date()
        return CanonicalRecord(
            department="shop_est",
            local_id=str(row["shop_id"]),
            name_raw=row.get("business_name"),
            address_raw=row.get("shop_address"),
            pin_code=row.get("pin"),
            pan=row.get("pan_number"),
            gstin=row.get("gst_number"),
            phone=row.get("contact_phone"),
            email=row.get("contact_email"),
            reg_date=reg_date,
        )
