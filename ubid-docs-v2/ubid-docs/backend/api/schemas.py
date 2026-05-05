"""
Pydantic schemas for API request/response models.
"""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


# -----------------------------------------------------------------------
# Reviewer Queue schemas
# -----------------------------------------------------------------------
class RecordDetail(BaseModel):
    """Raw and normalised fields of a canonical record."""

    department: str
    local_id: str
    name_raw: Optional[str] = None
    name_normalised: Optional[str] = None
    address_raw: Optional[str] = None
    pin_code: Optional[str] = None
    pan: Optional[str] = None
    gstin: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    reg_date: Optional[date] = None


class FieldDiff(BaseModel):
    """Single field difference between two records."""

    field_name: str
    value_a: Optional[str] = None
    value_b: Optional[str] = None
    matches: bool = False


class CaseDetail(BaseModel):
    """Full case detail for reviewer queue."""

    case_id: str
    record_a: RecordDetail
    record_b: RecordDetail
    confidence: float
    shap_values: dict[str, float] = Field(default_factory=dict)
    features: dict[str, float] = Field(default_factory=dict)
    field_diffs: list[FieldDiff] = Field(default_factory=list)
    created_at: Optional[datetime] = None


class QueueItem(BaseModel):
    """Summary item for the reviewer queue list."""

    case_id: str
    name_a: Optional[str] = None
    name_b: Optional[str] = None
    department_a: str
    department_b: str
    confidence: float
    created_at: Optional[datetime] = None
    age_hours: float = 0.0


class QueueResponse(BaseModel):
    """Paginated queue response."""

    items: list[QueueItem]
    total: int
    has_stale: bool = False  # True if any case > 72 hours old


class ReviewAction(BaseModel):
    """Payload for approve/reject/defer/escalate actions."""

    reviewer_id: str = "anonymous"
    note: Optional[str] = None


class ActionResponse(BaseModel):
    """Response after a reviewer action."""

    status: str
    case_id: str
    resolution: str
    next_case_id: Optional[str] = None


# -----------------------------------------------------------------------
# Resolution pipeline schemas
# -----------------------------------------------------------------------
class ResolutionResult(BaseModel):
    """Result from running the resolution pipeline."""

    total_records: int
    candidate_pairs: int
    auto_linked: int
    review_queue: int
    separate: int
    unique_ubids: int
