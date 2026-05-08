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
    address: Optional[str] = None          # Fix 5: alias for address_raw
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


class ShapFeature(BaseModel):
    """Single SHAP feature importance value."""

    feature: str
    value: float


class CaseDetail(BaseModel):
    """Full case detail for reviewer queue."""

    case_id: str
    record_a: RecordDetail
    record_b: RecordDetail
    confidence: float
    shap_values: list[ShapFeature] = Field(default_factory=list)  # Fix 2
    features: dict[str, float] = Field(default_factory=dict)
    field_diffs: list[FieldDiff] = Field(default_factory=list)
    explanation: str = ""                   # Added for frontend
    age_hours: float = 0.0                  # Added for frontend
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
    has_stale: bool = False
    stale_count: int = 0                    # Fix 6


class ReviewAction(BaseModel):
    """Payload for approve/reject/defer/escalate actions."""

    reviewer_id: str = "reviewer_01"        # Fix 3: default reviewer
    note: Optional[str] = None
    reason: Optional[str] = None            # Fix 3: accept both


class ActionResponse(BaseModel):
    """Response after a reviewer action."""

    success: bool = True                    # Fix 4
    message: str = ""                       # Fix 4
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
