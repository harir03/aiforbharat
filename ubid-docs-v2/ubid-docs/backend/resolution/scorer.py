"""
XGBoost scoring engine with Platt Scaling calibration.

PRD Feature A4 + TECHNICAL_SPEC.md section 5.
Trains on synthetic labelled pairs, saves model to backend/models/.
"""
import hashlib
import json
import logging
import pickle
import random
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import numpy as np

from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from backend.adapters.base import CanonicalRecord
from backend.resolution.feature_engineer import FEATURE_NAMES, compute_features

logger = logging.getLogger("ubid.resolution.scorer")

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODEL_DIR / "resolution_model.pkl"


# -----------------------------------------------------------------------
# Synthetic training data generation
# -----------------------------------------------------------------------
def _random_record(dept: str, lid: str, name: str, pan: Optional[str] = None,
                   pin: str = "560001", phone: Optional[str] = None) -> CanonicalRecord:
    """Helper to build a CanonicalRecord for training."""
    return CanonicalRecord(
        department=dept, local_id=lid, name_raw=name,
        address_raw=f"{random.randint(1,200)} Street, Karnataka {pin}",
        pin_code=pin, pan=pan, phone=phone,
        reg_date=date(2018, 1, 1) + timedelta(days=random.randint(0, 1000)),
    )


def _generate_training_pairs(n_positive: int = 150, n_negative: int = 150) -> tuple:
    """Generate synthetic labelled pairs for model training.

    Positive pairs: same business across departments (shared PAN, similar name).
    Negative pairs: different businesses (different PAN, different name).
    Returns (features_array, labels_array).
    """
    random.seed(42)
    np.random.seed(42)

    biz_names = [
        "Sharma Textiles", "Bangalore Manufacturing", "Karnataka Engineering",
        "Mysore Silks", "Deccan Electronics", "South India Traders",
        "Hubli Steel Works", "Mangalore Spice", "Belgaum Auto Parts",
        "Shimoga Wood Industries", "Nandi Pharma", "Cauvery Garments",
        "Hassan Coffee", "Mandya Sugar", "Davangere Cotton",
    ]
    name_variants = {
        "Sharma Textiles": ["Sharma Textile Mfg", "Sharma Textiles Pvt Ltd", "Sharmas Textiles"],
        "Bangalore Manufacturing": ["Bangalore Mfg Works", "Bengaluru Manufacturing", "BLR Mfg"],
        "Karnataka Engineering": ["Karnataka Engg Services", "Karnataka Engg Svcs", "KA Engineering"],
        "Mysore Silks": ["Mysore Silk Factory", "Mysuru Silks LLP", "Mysore Silks (P) Ltd"],
        "Deccan Electronics": ["Deccan Electronics Pvt Ltd", "Deccan Electronic Parts", "Deccan Elec"],
    }
    depts = ["shop_est", "factories", "labour", "kspcb"]
    pins = ["560001", "560011", "560034", "570001", "575001", "580020", "590001"]

    features_list: list[list[float]] = []
    labels: list[int] = []

    # Positive pairs: same business, different departments
    for _ in range(n_positive):
        base_name = random.choice(biz_names)
        variants = name_variants.get(base_name, [base_name + " Ltd", base_name + " Unit"])
        pan = f"AABCS{random.randint(1000,9999)}A"
        pin = random.choice(pins)
        phone = f"98765{random.randint(10000,99999)}"
        d1, d2 = random.sample(depts, 2)

        rec_a = _random_record(d1, f"{d1[:2].upper()}{random.randint(1,999):03d}",
                               random.choice([base_name] + variants), pan, pin, phone)
        rec_b = _random_record(d2, f"{d2[:2].upper()}{random.randint(1,999):03d}",
                               random.choice([base_name] + variants), pan, pin, phone)
        feats = compute_features(rec_a, rec_b)
        features_list.append([feats[f] for f in FEATURE_NAMES])
        labels.append(1)

    # Negative pairs: different businesses
    for _ in range(n_negative):
        n1, n2 = random.sample(biz_names, 2)
        d1, d2 = random.sample(depts, 2)
        pin1, pin2 = random.sample(pins, 2)

        rec_a = _random_record(d1, f"{d1[:2].upper()}{random.randint(1,999):03d}",
                               n1, f"AAAA{random.randint(1000,9999)}X", pin1,
                               f"99999{random.randint(10000,99999)}")
        rec_b = _random_record(d2, f"{d2[:2].upper()}{random.randint(1,999):03d}",
                               n2, f"BBBB{random.randint(1000,9999)}Y", pin2,
                               f"88888{random.randint(10000,99999)}")
        feats = compute_features(rec_a, rec_b)
        features_list.append([feats[f] for f in FEATURE_NAMES])
        labels.append(0)

    return np.array(features_list), np.array(labels)


# -----------------------------------------------------------------------
# Model training
# -----------------------------------------------------------------------
def train_model(force: bool = False) -> CalibratedClassifierCV:
    """Train XGBoost + Platt Scaling on synthetic pairs. Saves to disk.

    TECHNICAL_SPEC: Do NOT skip the Platt Scaling calibration step.
    """
    if MODEL_PATH.exists() and not force:
        logger.info("Model already exists at %s — loading", MODEL_PATH)
        return load_model()

    logger.info("Generating 300 synthetic training pairs...")
    X, y = _generate_training_pairs(150, 150)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y,
    )

    # Base XGBoost classifier
    xgb = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=42,
        eval_metric="logloss",
    )

    # Platt Scaling calibration via 5-fold CV (MANDATORY per TECHNICAL_SPEC §7)
    calibrated = CalibratedClassifierCV(xgb, method="sigmoid", cv=5)
    calibrated.fit(X_train, y_train)

    # Save model
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with open(MODEL_PATH, "wb") as fh:
        pickle.dump(calibrated, fh)
    logger.info("Trained and saved calibrated model to %s", MODEL_PATH)

    return calibrated


def load_model() -> CalibratedClassifierCV:
    """Load the trained calibrated model from disk."""
    with open(MODEL_PATH, "rb") as fh:
        return pickle.load(fh)


# -----------------------------------------------------------------------
# Scoring functions
# -----------------------------------------------------------------------
def score_pair(record_a: CanonicalRecord, record_b: CanonicalRecord) -> float:
    """Score a candidate pair. Returns calibrated probability 0.0-1.0.

    Post-hoc business rule: if neither PAN nor phone confirms the match,
    the raw score is dampened to force human review. Rationale: name
    similarity alone should NEVER auto-link without identifier confirmation.
    """
    model = load_model()
    feats = compute_features(record_a, record_b)
    X = np.array([[feats[f] for f in FEATURE_NAMES]])
    prob = float(model.predict_proba(X)[0][1])

    # Confirmation check: PAN match or phone match
    has_pan_confirm = feats.get("pan_prefix_match", 0) == 1
    has_phone_confirm = feats.get("phone_match", 0) == 1

    if not has_pan_confirm and not has_phone_confirm and prob > 0.55:
        # Dampen: high name similarity without identifier confirmation
        # Maps ~0.96 -> ~0.67, ensuring review queue landing
        prob = 0.55 + (prob - 0.55) * 0.30
        logger.debug(
            "Score dampened (no PAN/phone confirm): %.3f for %s vs %s",
            prob, record_a.local_id, record_b.local_id,
        )

    return float(round(prob, 6))


def explain_pair(record_a: CanonicalRecord, record_b: CanonicalRecord) -> dict:
    """Return SHAP feature importances for a candidate pair.

    Falls back to XGBoost native feature importance if SHAP has
    compatibility issues with the installed NumPy version.
    """
    model = load_model()
    feats = compute_features(record_a, record_b)
    X = np.array([[feats[f] for f in FEATURE_NAMES]])

    # Get the base XGBoost estimator from the calibrated wrapper
    if hasattr(model, "calibrated_classifiers_"):
        base_xgb = model.calibrated_classifiers_[0].estimator
    else:
        base_xgb = model.estimator

    try:
        import shap
        explainer = shap.TreeExplainer(base_xgb)
        shap_values = explainer.shap_values(X)
        return {name: float(round(val, 6)) for name, val in zip(FEATURE_NAMES, shap_values[0])}
    except (ImportError, AttributeError, Exception) as exc:
        logger.warning("SHAP unavailable (%s), using XGBoost feature importance", exc)
        importances = base_xgb.feature_importances_
        # Scale by actual feature values for per-instance explanation
        feature_vals = np.array([feats[f] for f in FEATURE_NAMES])
        weighted = importances * feature_vals
        return {name: float(round(val, 6)) for name, val in zip(FEATURE_NAMES, weighted)}

