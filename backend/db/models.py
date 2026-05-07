"""
UBID Platform — SQLAlchemy ORM Models
All five tables from TECHNICAL_SPEC.md section 3.
"""
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    Float,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


class CanonicalRecord(Base):
    """One record from one department system, normalised into canonical schema."""

    __tablename__ = "canonical_records"
    __table_args__ = (
        UniqueConstraint("department", "local_id", name="uq_dept_local_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    department = Column(String(50), nullable=False)
    local_id = Column(String(100), nullable=False)
    name_raw = Column(Text)
    name_normalised = Column(Text)
    address_raw = Column(Text)
    pin_code = Column(String(6))
    pan = Column(String(10))
    gstin = Column(String(15))
    phone = Column(String(15))
    reg_date = Column(Date)
    ubid = Column(String(30), index=True)
    ingest_ts = Column(TIMESTAMP(timezone=True), server_default=func.now())


class UbidRegistry(Base):
    """Master registry of assigned UBIDs."""

    __tablename__ = "ubid_registry"

    ubid = Column(String(30), primary_key=True)
    anchor_type = Column(String(10))          # 'PAN' | 'GSTIN' | 'INT'
    anchor_value = Column(String(20))         # PAN or GSTIN value if anchored
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    status = Column(String(20), server_default="active")  # active | dormant | closed | pending

    # Relationships
    events = relationship("ActivityEvent", back_populates="ubid_record")
    classification = relationship("Classification", back_populates="ubid_record", uselist=False)


class LinkageAudit(Base):
    """Audit log for every linkage decision — auto or human-reviewed."""

    __tablename__ = "linkage_audit"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_a_id = Column(UUID(as_uuid=True), ForeignKey("canonical_records.id"))
    record_b_id = Column(UUID(as_uuid=True), ForeignKey("canonical_records.id"))
    confidence = Column(Float, nullable=False)
    features = Column(JSONB, nullable=False)   # All 9 feature values
    shap_values = Column(JSONB)                # SHAP feature importances
    resolution = Column(String(20))            # auto_link | reviewer_approved | rejected | separate
    reviewer_id = Column(String(100))
    reviewer_note = Column(Text)
    resolved_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    record_a = relationship("CanonicalRecord", foreign_keys=[record_a_id])
    record_b = relationship("CanonicalRecord", foreign_keys=[record_b_id])


class ActivityEvent(Base):
    """Normalised activity event attributed to a UBID."""

    __tablename__ = "activity_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(String(100), unique=True, nullable=False)  # deduplication key
    ubid = Column(String(30), ForeignKey("ubid_registry.ubid"))
    local_id = Column(String(100))
    department = Column(String(50))
    event_type = Column(String(50))            # inspection | renewal | compliance | consumption | closure
    event_ts = Column(TIMESTAMP(timezone=True), nullable=False)
    payload = Column(JSONB)
    attribution = Column(String(20), server_default="resolved")  # resolved | pending | manual
    ingest_ts = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    ubid_record = relationship("UbidRegistry", back_populates="events")


class Classification(Base):
    """Active / Dormant / Closed classification per UBID."""

    __tablename__ = "classifications"

    ubid = Column(
        String(30),
        ForeignKey("ubid_registry.ubid"),
        primary_key=True,
    )
    status = Column(String(20), nullable=False)  # active | dormant | closed
    confidence = Column(Float, nullable=False)
    prob_active = Column(Float)
    prob_dormant = Column(Float)
    prob_closed = Column(Float)
    shap_values = Column(JSONB)
    is_stale = Column(Boolean, server_default="false")
    classified_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    ubid_record = relationship("UbidRegistry", back_populates="classification")
