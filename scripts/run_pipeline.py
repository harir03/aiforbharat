"""Run pipeline + report reviewer queue count."""
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

all_records = []
for Cls in [ShopEstablishmentAdapter, FactoriesAdapter, LabourAdapter, KSPCBAdapter]:
    a = Cls()
    r = a.fetch_records()
    all_records.extend(r)
    print(f"  {a.department_name}: {len(r)} records")
print(f"  Total: {len(all_records)}")

train_model(force=True)
pairs = generate_candidate_pairs(all_records)
print(f"  Candidate pairs: {len(pairs)}")

scored_pairs = []
auto = review = sep = 0
for rec_a, rec_b in pairs:
    features = compute_features(rec_a, rec_b)
    conf = score_pair(rec_a, rec_b)
    scored_pairs.append((rec_a, rec_b, conf, features))
    if conf >= 0.88:
        auto += 1
    elif conf >= 0.55:
        review += 1
    else:
        sep += 1

print(f"\n  Auto-linked: {auto}")
print(f"  Review queue: {review}")
print(f"  Separate: {sep}")

# Seed reviewer queue with review-band pairs
review_pairs = [(a, b, s, f) for a, b, s, f in scored_pairs if 0.55 <= s < 0.88]
seed_reviewer_queue(review_pairs)

from fastapi.testclient import TestClient
from backend.api.main import app
client = TestClient(app)

resp = client.get("/api/reviewer/queue?page_size=50")
queue = resp.json()
print(f"\n  === REVIEWER QUEUE COUNT: {queue['total']} ===")
print(f"\n  Top cases:")
for item in queue["items"][:15]:
    print(f"    {item['case_id']}: {item['department_a']}:{item['name_a']}"
          f" vs {item['department_b']}:{item['name_b']}"
          f" (conf={item['confidence']:.3f})")
