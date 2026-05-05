"""End-to-end validation: Prompt 3 + Prompt 4 pipeline."""
import sys
sys.path.insert(0, ".")

print("=== Step 1: Normaliser ===")
from backend.resolution.normaliser import normalise_name, normalise_address
assert normalise_name("Sharma Textiles Pvt Ltd") == "SHARMA TEXTILES"
assert normalise_name("SHARMA TEX. (P) LTD") == "SHARMA TEX"
print("  normalise_name: PASSED")

print("\n=== Step 2: Blocker ===")
from backend.adapters.base import CanonicalRecord
from backend.resolution.blocker import get_blocking_keys, generate_candidate_pairs

# Load all records from adapters
from backend.adapters.shop_establishment import ShopEstablishmentAdapter
from backend.adapters.factories import FactoriesAdapter
from backend.adapters.labour import LabourAdapter
from backend.adapters.kspcb import KSPCBAdapter

all_records = []
for Cls in [ShopEstablishmentAdapter, FactoriesAdapter, LabourAdapter, KSPCBAdapter]:
    a = Cls()
    recs = a.fetch_records()
    all_records.extend(recs)
    print(f"  {a.department_name}: {len(recs)} records")

pairs = generate_candidate_pairs(all_records)
print(f"  Candidate pairs: {len(pairs)}")
assert len(pairs) > 0, "No candidate pairs generated!"

print("\n=== Step 3: Feature Engineering ===")
from backend.resolution.feature_engineer import compute_features, FEATURE_NAMES
feats = compute_features(pairs[0][0], pairs[0][1])
assert len(feats) == 9, f"Expected 9 features, got {len(feats)}"
for fn in FEATURE_NAMES:
    assert fn in feats, f"Missing feature: {fn}"
print(f"  9 features computed: {list(feats.keys())}")

print("\n=== Step 4: Scorer (train + score) ===")
from backend.resolution.scorer import train_model, score_pair, explain_pair
model = train_model(force=True)
score = score_pair(pairs[0][0], pairs[0][1])
print(f"  Score for first pair: {score:.4f}")
assert 0.0 <= score <= 1.0

shap_vals = explain_pair(pairs[0][0], pairs[0][1])
print(f"  SHAP features: {len(shap_vals)} values")
assert len(shap_vals) == 9

print("\n=== Step 5: UBID Assignment ===")
from backend.resolution.ubid_assigner import assign_ubids, generate_ubid

# Test UBID format
assert generate_ubid(pan="AABCS1234A").startswith("KA-PAN-")
assert generate_ubid(gstin="29AABCS1234A1Z5").startswith("KA-GST-")
assert generate_ubid().startswith("KA-INT-")
print("  UBID format: PASSED")

# Score a small batch
scored = []
for ra, rb in pairs[:20]:
    f = compute_features(ra, rb)
    s = score_pair(ra, rb)
    scored.append((ra, rb, s, f))

result = assign_ubids(all_records, scored)
print(f"  Auto-linked: {len(result.auto_linked)}")
print(f"  Review queue: {len(result.review_queue)}")
print(f"  Separate: {len(result.separate)}")
print(f"  Unique UBIDs: {len(set(result.ubid_map.values()))}")

print("\nAll Prompt 3 + 4 validations PASSED!")
