"""Validate Prompt 5: Reviewer API endpoints."""
import sys
sys.path.insert(0, ".")

from fastapi.testclient import TestClient
from backend.api.main import app
from backend.api.routes.reviewer import seed_reviewer_queue
from backend.adapters.base import CanonicalRecord
from backend.resolution.feature_engineer import compute_features

client = TestClient(app)

# Seed test data
rec_a = CanonicalRecord(
    department="shop_est", local_id="SE001",
    name_raw="Sharma Textiles Pvt Ltd",
    address_raw="12 MG Road, Bangalore 560001",
    pin_code="560001", pan="AABCS0001A",
    phone="9876543210",
)
rec_b = CanonicalRecord(
    department="factories", local_id="FA001",
    name_raw="Sharma Textile Manufacturing",
    address_raw="12 MG Rd, Bengaluru",
    pin_code="560001", pan="AABCS0001A",
    phone="9876543210",
)
features = compute_features(rec_a, rec_b)
seed_reviewer_queue([(rec_a, rec_b, 0.72, features)])

# Test 1: GET /api/reviewer/queue
print("=== Test 1: GET queue ===")
resp = client.get("/api/reviewer/queue")
assert resp.status_code == 200
data = resp.json()
assert data["total"] == 1
case_id = data["items"][0]["case_id"]
print(f"  Queue has {data['total']} items, case_id={case_id}")

# Test 2: GET /api/reviewer/queue/{case_id}
print("\n=== Test 2: GET case detail ===")
resp = client.get(f"/api/reviewer/queue/{case_id}")
assert resp.status_code == 200
detail = resp.json()
assert detail["record_a"]["department"] == "shop_est"
assert detail["record_b"]["department"] == "factories"
assert detail["record_a"]["name_normalised"] == "SHARMA TEXTILES"
assert len(detail["field_diffs"]) > 0
assert len(detail["shap_values"]) == 9
print(f"  Record A: {detail['record_a']['name_normalised']}")
print(f"  Record B: {detail['record_b']['name_normalised']}")
print(f"  Confidence: {detail['confidence']}")
print(f"  SHAP values: {len(detail['shap_values'])} features")
print(f"  Field diffs: {sum(1 for d in detail['field_diffs'] if not d['matches'])} mismatches")

# Test 3: Reject without note should fail
print("\n=== Test 3: Reject without note ===")
resp = client.post(f"/api/reviewer/queue/{case_id}/reject", json={"reviewer_id": "test"})
assert resp.status_code == 422
print("  Correctly rejected (note required)")

# Test 4: Approve should succeed
print("\n=== Test 4: Approve ===")
resp = client.post(f"/api/reviewer/queue/{case_id}/approve",
                   json={"reviewer_id": "test", "note": "Looks correct"})
assert resp.status_code == 200
result = resp.json()
assert result["resolution"] == "reviewer_approved"
assert result["next_case_id"] is None  # Only one case
print(f"  Resolution: {result['resolution']}")
print(f"  Next case: {result['next_case_id']}")

# Test 5: Audit log
print("\n=== Test 5: Audit log ===")
resp = client.get("/api/reviewer/audit")
assert resp.status_code == 200
audit = resp.json()
assert len(audit) == 1
assert "ubid" in audit[0]
print(f"  Audit entries: {len(audit)}, UBID: {audit[0]['ubid']}")

# Test 6: 404 for unknown case
print("\n=== Test 6: Unknown case 404 ===")
resp = client.get("/api/reviewer/queue/nonexistent")
assert resp.status_code == 404
print("  Correctly returned 404")

print("\nAll Prompt 5 validations PASSED!")
