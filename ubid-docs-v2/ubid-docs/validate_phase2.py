"""Phase 2 validation: adapters, synthetic data, and cross-dept PAN matches."""
import json
import sys
from pathlib import Path

sys.path.insert(0, ".")

# 1. Validate synthetic data counts
synthetic_dir = Path("backend/db/synthetic")
for fname in ["shop_establishment.json", "factories.json", "labour.json", "kspcb.json"]:
    with open(synthetic_dir / fname, "r", encoding="utf-8") as fh:
        records = json.load(fh)
    print(f"{fname}: {len(records)} records")
    assert len(records) == 50, f"Expected 50, got {len(records)}"

# 2. Verify exactly 30 shared PANs
pan_keys = {"shop_establishment.json": "pan_number", "factories.json": "pan_no",
            "labour.json": "employer_pan", "kspcb.json": "company_pan"}
dept_pan_sets = {}
for fname, pk in pan_keys.items():
    with open(synthetic_dir / fname, "r") as fh:
        recs = json.load(fh)
    dept_pan_sets[fname] = {r[pk] for r in recs if r.get(pk)}

all_pans = set()
for s in dept_pan_sets.values():
    all_pans |= s
shared = [p for p in all_pans if sum(1 for d in dept_pan_sets if p in dept_pan_sets[d]) >= 2]
print(f"\nShared PANs across >=2 depts: {len(shared)}")
assert len(shared) == 30, f"Expected exactly 30, got {len(shared)}"

# 3. Validate adapter imports and loading
from backend.adapters.base import BaseAdapter, CanonicalRecord
from backend.adapters.shop_establishment import ShopEstablishmentAdapter
from backend.adapters.factories import FactoriesAdapter
from backend.adapters.labour import LabourAdapter
from backend.adapters.kspcb import KSPCBAdapter

for Cls in [ShopEstablishmentAdapter, FactoriesAdapter, LabourAdapter, KSPCBAdapter]:
    adapter = Cls()
    records = adapter.fetch_records()
    healthy = adapter.health_check()
    print(f"{adapter.department_name}: {len(records)} records, healthy={healthy}")
    assert len(records) == 50
    assert healthy is True
    for r in records:
        assert isinstance(r, CanonicalRecord)

# 4. Verify BaseAdapter is abstract
try:
    BaseAdapter()
    sys.exit(1)
except TypeError:
    print("BaseAdapter is properly abstract [OK]")

# 5. Verify httpx is importable
import httpx
print(f"httpx version: {httpx.__version__} [OK]")

print("\nAll Phase 2 validations PASSED!")
