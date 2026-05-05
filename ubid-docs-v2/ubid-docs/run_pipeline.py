"""Full pipeline + review queue verification."""
import sys
sys.path.insert(0, ".")
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from backend.adapters.shop_establishment import ShopEstablishmentAdapter
from backend.adapters.factories import FactoriesAdapter
from backend.adapters.labour import LabourAdapter
from backend.adapters.kspcb import KSPCBAdapter
from backend.resolution.blocker import generate_candidate_pairs
from backend.resolution.scorer import score_pair, train_model
from backend.resolution.feature_engineer import compute_features
from backend.resolution.ubid_assigner import assign_ubids
from backend.api.routes.reviewer import seed_reviewer_queue

# Ingest
all_records = []
for Cls in [ShopEstablishmentAdapter, FactoriesAdapter, LabourAdapter, KSPCBAdapter]:
    a = Cls()
    r = a.fetch_records()
    all_records.extend(r)
    print(f"  {a.department_name}: {len(r)} records")

print(f"  Total: {len(all_records)} records\n")

# Score
train_model(force=True)
pairs = generate_candidate_pairs(all_records)
print(f"  Candidate pairs: {len(pairs)}")

scored_pairs = []
for rec_a, rec_b in pairs:
    features = compute_features(rec_a, rec_b)
    conf = score_pair(rec_a, rec_b)
    scored_pairs.append((rec_a, rec_b, conf, features))

# Assign
assignment = assign_ubids(all_records, scored_pairs)
unique_ubids = len(set(assignment.ubid_map.values()))
print(f"  Auto-linked: {len(assignment.auto_linked)}")
print(f"  Review queue: {len(assignment.review_queue)}")
print(f"  Separate: {len(assignment.separate)}")
print(f"  Unique UBIDs: {unique_ubids}")

# Seed reviewer queue
review_pairs = [
    (ra, rb, sc, ft) for ra, rb, sc, ft in scored_pairs
    if 0.55 <= sc < 0.88
]
seed_reviewer_queue(review_pairs)
print(f"\n  Reviewer queue seeded: {len(review_pairs)} cases")

# Show sample of review queue cases
from fastapi.testclient import TestClient
from backend.api.main import app
client = TestClient(app)

resp = client.get("/api/reviewer/queue")
queue = resp.json()
print(f"  Queue API: {queue['total']} pending cases")
print(f"\n  Top 10 cases:")
for item in queue["items"][:10]:
    print(f"    {item['case_id']}: {item['department_a']}:{item['name_a']}"
          f" vs {item['department_b']}:{item['name_b']}"
          f" (conf={item['confidence']:.3f})")

target_met = queue["total"] >= 8
print(f"\n  TARGET >= 8 in reviewer queue: {'PASS' if target_met else 'FAIL'}"
      f" ({queue['total']} cases)")
