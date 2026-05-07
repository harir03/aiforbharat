"""
Abstract base adapter and canonical record schema.

All adapters are READ-ONLY. No write methods are permitted.
See: docs/PRD.md Feature A1, docs/RULES.md §2.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date
from typing import Optional


@dataclass
class CanonicalRecord:
    """Canonical schema that all department records are normalised into.

    Source: docs/PRD.md Feature A1
    Fields: department, local_id, name_raw, address_raw, pin_code,
            pan, gstin, phone, email, reg_date
    """

    department: str
    local_id: str
    name_raw: Optional[str] = None
    address_raw: Optional[str] = None
    pin_code: Optional[str] = None
    pan: Optional[str] = None
    gstin: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    reg_date: Optional[date] = None


class BaseAdapter(ABC):
    """Abstract interface that every department adapter must implement.

    Contract:
        - fetch_records() pulls data and returns canonical records.
        - health_check() reports whether the upstream source is reachable.
        - Adapters are strictly READ-ONLY.  No write / mutate methods.
    """

    @property
    @abstractmethod
    def department_name(self) -> str:
        """Short key for this department (e.g. 'shop_est', 'factories')."""
        ...

    @abstractmethod
    def fetch_records(self) -> list[CanonicalRecord]:
        """Fetch all master-data records from the department source.

        Returns an empty list (never crashes) if the source is unavailable.
        """
        ...

    @abstractmethod
    def health_check(self) -> bool:
        """Return True if the upstream data source is reachable."""
        ...
