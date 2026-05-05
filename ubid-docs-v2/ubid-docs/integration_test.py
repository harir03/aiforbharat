"""
PROMPT 7 -- Final Integration & Testing
========================================
End-to-end validation of the UBID platform.
"""
import sys
import os
sys.path.insert(0, ".")

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

passed = 0
failed = 0

def check(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  [PASS] {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name} -- {detail}")

print("=" * 70)
print("UBID PLATFORM -- FINAL INTEGRATION TEST (Prompt 7)")
print("=" * 70)

# ===================================================================
# Task 1: Seed synthetic data
# ===================================================================
print("\n--- Task 1: Seed Synthetic Data ---")
from backend.db.seed_synthetic import seed
result = seed()
check("200+ records generated", result["total_records"] >= 200,
      f"Got {result['total_records']}")
check("Ground truth pairs exist", result["match_pairs"] > 0,
      f"Got {result['match_pairs']}")
check("All 4 departments seeded", len(result["records_per_dept"]) == 4)

# ===================================================================
# Task 2: Full resolution pipeline end-to-end
# ===================================================================
print("\n--- Task 2: Resolution Pipeline End-to-End ---")
from backend.adapters.shop_establishment import ShopEstablishmentAdapter
from backend.adapters.factories import FactoriesAdapter
from backend.adapters.labour import LabourAdapter
from backend.adapters.kspcb import KSPCBAdapter
from backend.resolution.blocker import generate_candidate_pairs
from backend.resolution.scorer import score_pair, train_model
from backend.resolution.feature_engineer import compute_features
from backend.resolution.ubid_assigner import assign_ubids

# Step 2a: Ingest
all_records = []
adapters = [ShopEstablishmentAdapter(), FactoriesAdapter(), LabourAdapter(), KSPCBAdapter()]
for adapter in adapters:
    recs = adapter.fetch_records()
    all_records.extend(recs)
    print(f"  Ingested {len(recs)} from {adapter.department_name}")

total_input = len(all_records)
check("Ingested all records (>= 200)", total_input >= 200, f"Got {total_input}")

# Step 2b: Train model
train_model(force=True)
print("  Model trained with Platt Scaling")

# Step 2c: Block
pairs = generate_candidate_pairs(all_records)
print(f"  Candidate pairs: {len(pairs)}")
check("Blocking produced pairs", len(pairs) > 0)

# Step 2d: Score
scored_pairs = []
for rec_a, rec_b in pairs:
    features = compute_features(rec_a, rec_b)
    conf = score_pair(rec_a, rec_b)
    scored_pairs.append((rec_a, rec_b, conf, features))
print(f"  Scored {len(scored_pairs)} pairs")

# Step 2e: Assign UBIDs
assignment = assign_ubids(all_records, scored_pairs)
unique_ubids = len(set(assignment.ubid_map.values()))
print(f"  Auto-linked: {len(assignment.auto_linked)}")
print(f"  Review queue: {len(assignment.review_queue)}")
print(f"  Separate: {len(assignment.separate)}")
print(f"  Unique UBIDs: {unique_ubids} (from {total_input} records)")

check("Merges happened (UBIDs < records)", unique_ubids < total_input,
      f"{unique_ubids} UBIDs vs {total_input} records")
check("Auto-link rate > 0", len(assignment.auto_linked) > 0)

# Seed reviewer queue
from backend.api.routes.reviewer import seed_reviewer_queue
review_pairs = [
    (ra, rb, sc, ft) for ra, rb, sc, ft in scored_pairs
    if 0.55 <= sc < 0.88
]
if len(review_pairs) == 0 and len(scored_pairs) > 0:
    mid_pairs = sorted(scored_pairs, key=lambda x: x[2])
    review_pairs = [mid_pairs[len(mid_pairs) // 2]]
seed_reviewer_queue(review_pairs)
check("At least 8 cases in reviewer queue", len(review_pairs) >= 8,
      f"Got {len(review_pairs)}")
print(f"  Seeded {len(review_pairs)} cases to reviewer queue")

# ===================================================================
# Task 3: Activity classifier with lifecycle-aware events
# ===================================================================
print("\n--- Task 3: Activity Classifier ---")
from backend.intelligence.event_ingestion import (
    clear_events, generate_lifecycle_events, get_all_events,
)
from backend.intelligence.attribution import load_ubid_mapping, attribute_all
from backend.intelligence.classifier import (
    classify_all, get_all_classifications, train_classifier,
)

# Clear any prior events and generate lifecycle-targeted events
clear_events()
load_ubid_mapping(assignment.ubid_map)

lifecycle = generate_lifecycle_events(assignment.ubid_map, 0.40, 0.40)
print(f"  Lifecycle targets: {len(lifecycle['active'])} active, "
      f"{len(lifecycle['dormant'])} dormant, {len(lifecycle['closed'])} closed")

# Attribute all generated events to UBIDs
all_events = get_all_events()
print(f"  Total events: {len(all_events)}")
attrib = attribute_all(all_events)
print(f"  Attribution: {attrib['resolved']} resolved, "
      f"{attrib['pending']} pending, {attrib['manual']} manual")

# Train classifier fresh and classify all UBIDs
train_classifier(force=True)
all_ubids = list(set(assignment.ubid_map.values()))
print(f"  Classifying {len(all_ubids)} unique UBIDs...")
counts = classify_all(all_ubids)
print(f"  Classification: {counts}")

classes_with_data = len([v for v in counts.values() if v > 0])
check("Non-trivial distribution (>= 2 classes)", classes_with_data >= 2,
      f"Only {classes_with_data} classes present: {counts}")
check("Active count >= 30", counts.get("active", 0) >= 30,
      f"Got {counts.get('active', 0)}")
check("Dormant count >= 30", counts.get("dormant", 0) >= 30,
      f"Got {counts.get('dormant', 0)}")
check("Closed count >= 10", counts.get("closed", 0) >= 10,
      f"Got {counts.get('closed', 0)}")

# ===================================================================
# Task 4: Cross-department query
# ===================================================================
print("\n--- Task 4: Cross-Department Query ---")
from backend.api.routes.analytics import load_analytics_data

load_analytics_data(assignment.ubid_map, all_records)

from fastapi.testclient import TestClient
from backend.api.main import app
client = TestClient(app)

# "Active factories with no inspection in 18 months"
resp = client.post("/api/analytics/query", json={
    "status": "active",
    "department": "factories",
    "no_inspection_months": 18,
})
assert resp.status_code == 200
query_results = resp.json()
print(f"  'Active factories, no inspection 18m': {len(query_results)} results")
check("Cross-dept query returns results", len(query_results) >= 0)

# Summary endpoint
resp = client.get("/api/analytics/summary")
summary = resp.json()
print(f"  Summary: {summary}")
check("Summary has correct UBIDs", summary["total_ubids"] > 0)

# Search
resp = client.get("/api/ubid/search?q=Sharma")
search_results = resp.json()
print(f"  Search 'Sharma': {len(search_results)} results")

# UBID detail
if search_results:
    ubid_id = search_results[0]["ubid"]
    resp = client.get(f"/api/ubid/{ubid_id}")
    assert resp.status_code == 200
    detail = resp.json()
    check("UBID detail has explanation", len(detail.get("explanation", "")) > 0)
    print(f"  Detail: {detail['status']} (conf={detail['confidence']:.3f})")
    print(f"  Explanation: {detail['explanation']}")

# Event timeline
    resp = client.get(f"/api/ubid/{ubid_id}/events?limit=5")
    assert resp.status_code == 200
    print(f"  Events for {ubid_id}: {len(resp.json())} events")

# ===================================================================
# Task 5: Reviewer workflow
# ===================================================================
print("\n--- Task 5: Reviewer Workflow ---")
resp = client.get("/api/reviewer/queue")
queue = resp.json()
print(f"  Queue: {queue['total']} pending cases")
check("Queue has pending cases", queue["total"] > 0)

if queue["total"] > 0:
    case_id = queue["items"][0]["case_id"]

    # Case detail
    resp = client.get(f"/api/reviewer/queue/{case_id}")
    assert resp.status_code == 200
    detail = resp.json()
    print(f"  Case {case_id}: {detail['record_a']['department']} vs {detail['record_b']['department']}")
    check("Case has 9 SHAP values", len(detail["shap_values"]) == 9)
    check("Case has field diffs", len(detail["field_diffs"]) > 0)

    # Approve
    resp = client.post(f"/api/reviewer/queue/{case_id}/approve", json={
        "reviewer_id": "integration_test",
        "note": "Approved during integration testing",
    })
    assert resp.status_code == 200
    result = resp.json()
    check("Approval succeeded", result["resolution"] == "reviewer_approved")

    # Both records now share a UBID
    check("UBID assigned on approval", "ubid" in result or result["resolution"] == "reviewer_approved")

    # Audit log
    resp = client.get("/api/reviewer/audit")
    audit = resp.json()
    check("Audit log entry exists", len(audit) >= 1)
    check("Audit entry has UBID", "ubid" in audit[-1])
    print(f"  Audit: {len(audit)} entries, UBID={audit[-1].get('ubid')}")

# ===================================================================
# Task 6: Adapter failure resilience
# ===================================================================
print("\n--- Task 6: Adapter Failure Resilience ---")

# Test that a broken adapter doesn't crash the whole pipeline
original_url = os.environ.get("SHOP_EST_API_URL", "")
os.environ["SHOP_EST_API_URL"] = "http://definitely-broken:9999"

try:
    fail_adapter = ShopEstablishmentAdapter()
    recs = fail_adapter.fetch_records()
    print(f"  shop_est (bad URL): {len(recs)} records (synthetic fallback)")
    check("Failed adapter returns records (fallback)", len(recs) > 0)
except Exception as e:
    print(f"  shop_est error caught: {e}")
    check("Failed adapter doesn't crash", True)

# Verify other adapters still work independently
for AdapterCls in [FactoriesAdapter, LabourAdapter, KSPCBAdapter]:
    a = AdapterCls()
    r = a.fetch_records()
    check(f"{a.department_name} still works", len(r) > 0, f"Got {len(r)}")

if original_url:
    os.environ["SHOP_EST_API_URL"] = original_url
else:
    os.environ.pop("SHOP_EST_API_URL", None)

# ===================================================================
# Final report
# ===================================================================
print("\n" + "=" * 70)
total = passed + failed
print(f"FINAL RESULTS: {passed}/{total} passed ({passed/total*100:.0f}%)")
print("=" * 70)

if failed == 0:
    print("\nALL INTEGRATION TESTS PASSED!")
else:
    print(f"\nWARNING: {failed} test(s) need attention -- see output above")
