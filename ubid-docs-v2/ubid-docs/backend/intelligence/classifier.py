"""
Activity classifier — XGBoost multi-class (Active / Dormant / Closed).

PRD Features B3 + B4.
9 features per UBID over 24-month lookback.
SHAP explanation per classification.
"""
import logging
import os
import pickle
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from backend.intelligence.event_ingestion import ActivityEvent, get_events_for_ubid

logger = logging.getLogger("ubid.intelligence.classifier")

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
CLASSIFIER_PATH = MODEL_DIR / "activity_classifier.pkl"

OBSERVATION_WINDOW_MONTHS = int(os.getenv("OBSERVATION_WINDOW_MONTHS", "24"))

# Feature names — PRD Feature B3
ACTIVITY_FEATURES = [
    "days_since_last_event",
    "event_count_6m",
    "event_count_12m",
    "renewal_present",
    "closure_present",
    "consumption_slope",
    "compliance_gap_days",
    "active_departments",
    "inspection_count_12m",
]

# Class labels
CLASS_LABELS = ["active", "dormant", "closed"]


@dataclass
class ClassificationResult:
    """Result of a UBID classification."""

    ubid: str
    status: str  # active | dormant | closed
    confidence: float
    prob_active: float
    prob_dormant: float
    prob_closed: float
    shap_values: dict[str, float] = field(default_factory=dict)
    explanation: str = ""


# -----------------------------------------------------------------------
# Feature engineering — PRD Feature B3
# -----------------------------------------------------------------------
def engineer_features(
    ubid: str,
    events: Optional[list[ActivityEvent]] = None,
) -> dict[str, float]:
    """Compute 9 activity features for a UBID over 24-month lookback.

    Features per PRD Feature B3:
    1. Days since last event
    2. Event count (last 6 months)
    3. Event count (last 12 months)
    4. Renewal present (Y/N → 1/0)
    5. Closure notice present (Y/N → 1/0)
    6. Consumption slope (kwh trend)
    7. Compliance gap (days since last KSPCB filing)
    8. Number of active departments
    9. Inspection count (last 12 months)
    """
    if events is None:
        events = get_events_for_ubid(ubid)

    now = datetime.now(timezone.utc)
    cutoff_6m = now - timedelta(days=180)
    cutoff_12m = now - timedelta(days=365)

    if not events:
        # No events = unknown status; use dormant-looking defaults
        return {
            "days_since_last_event": 730.0,
            "event_count_6m": 0.0,
            "event_count_12m": 0.0,
            "renewal_present": 0.0,
            "closure_present": 0.0,
            "consumption_slope": 0.0,
            "compliance_gap_days": 999.0,
            "active_departments": 0.0,
            "inspection_count_12m": 0.0,
        }

    # 1. Days since last event
    latest = max(e.event_ts for e in events)
    days_since = (now - latest).total_seconds() / 86400

    # 2-3. Event counts
    count_6m = sum(1 for e in events if e.event_ts >= cutoff_6m)
    count_12m = sum(1 for e in events if e.event_ts >= cutoff_12m)

    # 4. Renewal present
    renewal = 1.0 if any(e.event_type == "renewal" for e in events) else 0.0

    # 5. Closure present
    closure = 1.0 if any(e.event_type == "closure" for e in events) else 0.0

    # 6. Consumption slope (simple: latest vs earliest kwh)
    consumption_events = [
        e for e in events
        if e.event_type == "consumption" and "reading_kwh" in e.payload
    ]
    if len(consumption_events) >= 2:
        consumption_events.sort(key=lambda e: e.event_ts)
        first_kwh = consumption_events[0].payload["reading_kwh"]
        last_kwh = consumption_events[-1].payload["reading_kwh"]
        days_span = max((consumption_events[-1].event_ts - consumption_events[0].event_ts).days, 1)
        slope = (last_kwh - first_kwh) / days_span
    else:
        slope = 0.0

    # 7. Compliance gap (days since last KSPCB compliance)
    compliance_events = [e for e in events if e.event_type == "compliance"]
    if compliance_events:
        latest_comp = max(e.event_ts for e in compliance_events)
        comp_gap = (now - latest_comp).total_seconds() / 86400
    else:
        comp_gap = 999.0  # No compliance on record

    # 8. Active departments
    active_depts = len({e.department for e in events if e.event_ts >= cutoff_12m})

    # 9. Inspection count (12m)
    insp_12m = sum(
        1 for e in events
        if e.event_type == "inspection" and e.event_ts >= cutoff_12m
    )

    return {
        "days_since_last_event": round(days_since, 1),
        "event_count_6m": float(count_6m),
        "event_count_12m": float(count_12m),
        "renewal_present": renewal,
        "closure_present": closure,
        "consumption_slope": round(slope, 4),
        "compliance_gap_days": round(comp_gap, 1),
        "active_departments": float(active_depts),
        "inspection_count_12m": float(insp_12m),
    }


# -----------------------------------------------------------------------
# Synthetic training data for the classifier
# -----------------------------------------------------------------------
def _generate_training_data(n: int = 300) -> tuple:
    """Generate synthetic feature vectors with labels for training."""
    random.seed(42)
    np.random.seed(42)

    X_list: list[list[float]] = []
    y_list: list[int] = []

    for _ in range(n):
        label = random.choices([0, 1, 2], weights=[0.5, 0.3, 0.2])[0]

        if label == 0:  # Active
            feats = [
                random.uniform(1, 60),       # days since last
                random.randint(3, 15),        # count 6m
                random.randint(6, 30),        # count 12m
                1.0,                          # renewal present
                0.0,                          # no closure
                random.uniform(0, 50),        # consumption slope
                random.uniform(10, 120),      # compliance gap
                random.randint(2, 4),         # active depts
                random.randint(1, 8),         # inspections
            ]
        elif label == 1:  # Dormant
            feats = [
                random.uniform(180, 500),     # long time since last
                random.randint(0, 2),         # few events 6m
                random.randint(1, 5),         # few events 12m
                random.choice([0.0, 1.0]),    # maybe renewal
                0.0,                          # no closure
                random.uniform(-20, 5),       # declining consumption
                random.uniform(200, 600),     # big compliance gap
                random.randint(0, 2),         # few active depts
                random.randint(0, 1),         # few inspections
            ]
        else:  # Closed
            feats = [
                random.uniform(300, 730),     # very long time
                0,                            # no events 6m
                random.randint(0, 2),         # almost none 12m
                0.0,                          # no renewal
                1.0,                          # closure present
                random.uniform(-50, -5),      # declining consumption
                random.uniform(400, 999),     # huge compliance gap
                random.randint(0, 1),         # 0-1 depts
                0,                            # no inspections
            ]

        # Add noise
        feats = [f + random.gauss(0, abs(f) * 0.1 + 0.5) for f in feats]
        feats = [max(0, f) if i not in (5,) else f for i, f in enumerate(feats)]
        X_list.append(feats)
        y_list.append(label)

    return np.array(X_list), np.array(y_list)


# -----------------------------------------------------------------------
# Model training
# -----------------------------------------------------------------------
def train_classifier(force: bool = False) -> CalibratedClassifierCV:
    """Train XGBoost multi-class classifier with Platt Scaling."""
    if CLASSIFIER_PATH.exists() and not force:
        logger.info("Classifier exists at %s — loading", CLASSIFIER_PATH)
        return _load_classifier()

    logger.info("Training activity classifier on 300 synthetic samples...")
    X, y = _generate_training_data(300)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y,
    )

    xgb = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=42,
        eval_metric="mlogloss",
        num_class=3,
    )

    calibrated = CalibratedClassifierCV(xgb, method="sigmoid", cv=5)
    calibrated.fit(X_train, y_train)

    accuracy = calibrated.score(X_test, y_test)
    logger.info("Classifier accuracy on test set: %.3f", accuracy)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with open(CLASSIFIER_PATH, "wb") as fh:
        pickle.dump(calibrated, fh)
    logger.info("Saved classifier to %s", CLASSIFIER_PATH)

    return calibrated


def _load_classifier() -> CalibratedClassifierCV:
    """Load the trained classifier from disk."""
    with open(CLASSIFIER_PATH, "rb") as fh:
        return pickle.load(fh)


# -----------------------------------------------------------------------
# Classification
# -----------------------------------------------------------------------
def classify(
    ubid: str,
    events: Optional[list[ActivityEvent]] = None,
) -> ClassificationResult:
    """Classify a UBID as Active/Dormant/Closed.

    Returns ClassificationResult with probabilities and SHAP-like explanation.
    """
    model = _load_classifier()
    feats = engineer_features(ubid, events)
    X = np.array([[feats[f] for f in ACTIVITY_FEATURES]])

    probs = model.predict_proba(X)[0]
    pred_idx = int(np.argmax(probs))
    status = CLASS_LABELS[pred_idx]
    confidence = float(probs[pred_idx])

    # Feature importance explanation
    base_xgb = model.calibrated_classifiers_[0].estimator
    importances = base_xgb.feature_importances_
    feature_vals = np.array([feats[f] for f in ACTIVITY_FEATURES])
    weighted = importances * np.abs(feature_vals)
    shap_dict = {name: float(round(val, 6)) for name, val in zip(ACTIVITY_FEATURES, weighted)}

    # Natural language explanation
    explanation = _build_explanation(status, feats, shap_dict)

    return ClassificationResult(
        ubid=ubid,
        status=status,
        confidence=round(confidence, 4),
        prob_active=round(float(probs[0]), 4),
        prob_dormant=round(float(probs[1]), 4),
        prob_closed=round(float(probs[2]), 4),
        shap_values=shap_dict,
        explanation=explanation,
    )


def _build_explanation(status: str, feats: dict, shap_dict: dict) -> str:
    """Build human-readable SHAP explanation text."""
    # Sort features by importance
    sorted_feats = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
    top_3 = sorted_feats[:3]

    feature_descriptions = {
        "days_since_last_event": f"last event {int(feats.get('days_since_last_event', 0))} days ago",
        "event_count_6m": f"{int(feats.get('event_count_6m', 0))} events in last 6 months",
        "event_count_12m": f"{int(feats.get('event_count_12m', 0))} events in last 12 months",
        "renewal_present": "licence renewal on record" if feats.get("renewal_present") else "no renewal on record",
        "closure_present": "closure notice filed" if feats.get("closure_present") else "no closure notice",
        "consumption_slope": f"consumption trend {feats.get('consumption_slope', 0):+.1f} kWh/day",
        "compliance_gap_days": f"compliance gap {int(feats.get('compliance_gap_days', 0))} days",
        "active_departments": f"{int(feats.get('active_departments', 0))} active departments",
        "inspection_count_12m": f"{int(feats.get('inspection_count_12m', 0))} inspections in 12 months",
    }

    reasons = []
    for feat_name, importance in top_3:
        desc = feature_descriptions.get(feat_name, feat_name)
        sign = "+" if importance >= 0 else ""
        reasons.append(f"{desc} ({sign}{importance:.2f})")

    return f"Classified as {status.title()} because: {', '.join(reasons)}"


# -----------------------------------------------------------------------
# Bulk classification
# -----------------------------------------------------------------------
# In-memory classification store
_classifications: dict[str, ClassificationResult] = {}


def classify_all(ubid_list: list[str]) -> dict:
    """Bulk classify all UBIDs (called nightly by Airflow)."""
    train_classifier()  # Ensure model exists

    counts = {"active": 0, "dormant": 0, "closed": 0}
    for ubid in ubid_list:
        result = classify(ubid)
        _classifications[ubid] = result
        counts[result.status] += 1

    logger.info("Classified %d UBIDs: %s", len(ubid_list), counts)
    return counts


def get_classification(ubid: str) -> Optional[ClassificationResult]:
    """Get cached classification for a UBID."""
    return _classifications.get(ubid)


def get_all_classifications() -> dict[str, ClassificationResult]:
    """Return all cached classifications."""
    return dict(_classifications)
