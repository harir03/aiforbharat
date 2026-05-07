"""Generate synthetic data with exactly 30 PANs shared across >=2 departments."""
import json
import random
from pathlib import Path

random.seed(42)
OUT = Path("backend/db/synthetic")
OUT.mkdir(parents=True, exist_ok=True)

# 30 shared PANs: 10 across all 4 depts, 10 across 3, 10 across 2
SHARED_PANS = [f"AABCS{i:04d}A" for i in range(1, 31)]
NAMES = [
    "Sharma Textiles", "Bangalore Manufacturing Works", "Karnataka Engineering",
    "Mysore Silks", "Deccan Electronics", "South India Traders", "Hubli Steel Works",
    "Mangalore Spice Co", "Belgaum Auto Parts", "Shimoga Wood Industries",
    "Nandi Pharma", "Cauvery Garments", "Hassan Coffee Estate", "Mandya Sugar Mills",
    "Davangere Cotton Mills", "Tumkur Oil Extractions", "Bellary Iron Supplies",
    "Raichur Agro Products", "Gulbarga Cement Traders", "Chitradurga Granite",
    "Kolar Gold Jewellers", "Chikmagalur Tea", "Dharwad Sweets", "Bidar Leather",
    "Whitefield IT Services", "Electronic City Computers", "Peenya Industrial",
    "Vijayanagar Textiles", "Majestic Travels", "Hampi Handicrafts",
]
PINS = ["560001","560011","560034","560038","560058","570001","575001","577201","580020","590001",
        "571201","571401","572101","573201","577002","577501","583101","583201","584101","585101",
        "560064","560066","560100","560003","560010","560070","560076","560078","560080","585401"]
SUFFIXES = {"shop_est": ["Pvt Ltd","(P) Ltd","LLP","Ltd",""],
            "factories": ["Manufacturing","Factory","Unit","Processing","Works"],
            "labour": ["Enterprises","Works","Industries","Co","Establishment"],
            "kspcb": ["Pvt Ltd","Industries","Corp","Works","Ltd"]}

def gstin(pan): return f"29{pan}1Z{random.randint(1,9)}"

def make_shared(dept, idx, pan, name, pin):
    """Create a record for a shared-PAN business with dept-specific field names."""
    suf = random.choice(SUFFIXES[dept])
    dname = f"{name} {suf}".strip()
    has_gst = random.random() > 0.3
    phone = f"98765{random.randint(10000,99999)}"
    year = random.randint(2015, 2021)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    reg = f"{year}-{month:02d}-{day:02d}"
    addr_var = random.choice(["", " Area", " Road", " Layout"])
    addr = f"{random.randint(1,200)} {name.split()[0]}{addr_var}, Karnataka"

    if dept == "shop_est":
        return {"shop_id": f"SE{idx:03d}", "business_name": dname, "owner_name": f"Owner {idx}",
                "shop_address": addr, "pin": pin, "pan_number": pan,
                "gst_number": gstin(pan) if has_gst else None,
                "contact_phone": phone, "contact_email": f"se{idx}@mail.com", "registration_date": reg}
    elif dept == "factories":
        return {"factory_id": f"FA{idx:03d}", "factory_name": dname, "proprietor": f"Prop {idx}",
                "factory_address": addr, "district": "Karnataka", "pincode": pin, "pan_no": pan,
                "gstin_no": gstin(pan) if has_gst else None,
                "phone_no": phone, "email_id": f"fa{idx}@mail.com", "licence_date": reg}
    elif dept == "labour":
        return {"labour_id": f"LB{idx:03d}", "establishment_name": dname, "employer_name": f"Emp {idx}",
                "registered_address": f"{addr} {pin}", "area_pin": pin, "employer_pan": pan,
                "gst_reg_no": gstin(pan) if has_gst else None,
                "mobile": phone, "email_address": f"lb{idx}@mail.com", "date_of_registration": reg}
    else:  # kspcb
        return {"kspcb_id": f"KS{idx:03d}", "industry_name": dname, "promoter": f"Prom {idx}",
                "site_address": addr, "site_pincode": pin, "company_pan": pan,
                "gstin": gstin(pan) if has_gst else None,
                "contact_no": phone, "email": f"ks{idx}@mail.com", "consent_date": reg}

def make_ambiguous(dept, idx, name, pin):
    """Ambiguous: similar name, same PIN, NO PAN/GSTIN."""
    suf = random.choice(SUFFIXES[dept])
    dname = f"{name} {suf}".strip()
    phone = f"98700{random.randint(10000,99999)}"
    reg = f"{random.randint(2016,2021)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
    addr = f"{random.randint(1,200)} Near {name.split()[0]}, Karnataka"
    if dept == "shop_est":
        return {"shop_id": f"SE{idx:03d}", "business_name": dname, "owner_name": f"Owner {idx}",
                "shop_address": addr, "pin": pin, "pan_number": None, "gst_number": None,
                "contact_phone": phone, "contact_email": None, "registration_date": reg}
    elif dept == "factories":
        return {"factory_id": f"FA{idx:03d}", "factory_name": dname, "proprietor": f"Prop {idx}",
                "factory_address": addr, "district": "Karnataka", "pincode": pin, "pan_no": None,
                "gstin_no": None, "phone_no": phone, "email_id": None, "licence_date": reg}
    elif dept == "labour":
        return {"labour_id": f"LB{idx:03d}", "establishment_name": dname, "employer_name": f"Emp {idx}",
                "registered_address": f"{addr} {pin}", "area_pin": pin, "employer_pan": None,
                "gst_reg_no": None, "mobile": phone, "email_address": None, "date_of_registration": reg}
    else:
        return {"kspcb_id": f"KS{idx:03d}", "industry_name": dname, "promoter": f"Prom {idx}",
                "site_address": addr, "site_pincode": pin, "company_pan": None,
                "gstin": None, "contact_no": phone, "email": None, "consent_date": reg}

def make_unique(dept, idx):
    """Clearly unique business, own PAN not shared."""
    dept_code = {"shop_est": "S", "factories": "F", "labour": "L", "kspcb": "K"}[dept]
    pan = f"ZZZ{dept_code}Z{idx:04d}"
    name = f"Unique Business {dept.upper()} {idx}"
    pin = random.choice(PINS)
    phone = f"99999{random.randint(10000,99999)}"
    reg = f"{random.randint(2015,2021)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
    addr = f"{random.randint(1,200)} Unique St, Karnataka"
    has_gst = random.random() > 0.5
    has_pan = random.random() > 0.2  # ~20% missing PAN
    p = pan if has_pan else None
    g = gstin(pan) if (has_gst and has_pan) else None
    if dept == "shop_est":
        return {"shop_id": f"SE{idx:03d}", "business_name": name, "owner_name": f"Owner {idx}",
                "shop_address": addr, "pin": pin, "pan_number": p, "gst_number": g,
                "contact_phone": phone, "contact_email": f"u{idx}@mail.com", "registration_date": reg}
    elif dept == "factories":
        return {"factory_id": f"FA{idx:03d}", "factory_name": name, "proprietor": f"Prop {idx}",
                "factory_address": addr, "district": "Karnataka", "pincode": pin, "pan_no": p,
                "gstin_no": g, "phone_no": phone, "email_id": f"u{idx}@mail.com", "licence_date": reg}
    elif dept == "labour":
        return {"labour_id": f"LB{idx:03d}", "establishment_name": name, "employer_name": f"Emp {idx}",
                "registered_address": f"{addr} {pin}", "area_pin": pin, "employer_pan": p,
                "gst_reg_no": g, "mobile": phone, "email_address": f"u{idx}@mail.com", "date_of_registration": reg}
    else:
        return {"kspcb_id": f"KS{idx:03d}", "industry_name": name, "promoter": f"Prom {idx}",
                "site_address": addr, "site_pincode": pin, "company_pan": p,
                "gstin": g, "contact_no": phone, "email": f"u{idx}@mail.com", "consent_date": reg}

# Distribution: PANs 0-9 in all 4 depts, 10-19 in 3 depts, 20-29 in 2 depts
DEPT_KEYS = ["shop_est", "factories", "labour", "kspcb"]
DEPT_FILES = {"shop_est": "shop_establishment.json", "factories": "factories.json",
              "labour": "labour.json", "kspcb": "kspcb.json"}

dept_records = {d: [] for d in DEPT_KEYS}

for i in range(10):  # PANs 0-9: all 4 depts
    for d in DEPT_KEYS:
        dept_records[d].append(make_shared(d, len(dept_records[d])+1, SHARED_PANS[i], NAMES[i], PINS[i]))

for i in range(10, 20):  # PANs 10-19: 3 depts each
    depts = DEPT_KEYS[:3] if i % 2 == 0 else DEPT_KEYS[1:]
    for d in depts:
        dept_records[d].append(make_shared(d, len(dept_records[d])+1, SHARED_PANS[i], NAMES[i], PINS[i]))

for i in range(20, 30):  # PANs 20-29: 2 depts each
    d1, d2 = DEPT_KEYS[i % 4], DEPT_KEYS[(i+1) % 4]
    for d in [d1, d2]:
        dept_records[d].append(make_shared(d, len(dept_records[d])+1, SHARED_PANS[i], NAMES[i], PINS[i]))

# Add 5 ambiguous records per dept
for d in DEPT_KEYS:
    for j in range(5):
        name = random.choice(NAMES[:10])  # reuse names from shared set
        pin = PINS[j]
        dept_records[d].append(make_ambiguous(d, len(dept_records[d])+1, name, pin))

# Fill to 50 with unique records
for d in DEPT_KEYS:
    while len(dept_records[d]) < 50:
        dept_records[d].append(make_unique(d, len(dept_records[d])+1))

# Write files
for d, fname in DEPT_FILES.items():
    with open(OUT / fname, "w", encoding="utf-8") as fh:
        json.dump(dept_records[d], fh, indent=2, ensure_ascii=False)
    print(f"{fname}: {len(dept_records[d])} records")

# Verify exactly 30 shared PANs
pan_keys = {"shop_est": "pan_number", "factories": "pan_no", "labour": "employer_pan", "kspcb": "company_pan"}
dept_pan_sets = {}
for d, fname in DEPT_FILES.items():
    with open(OUT / fname, "r") as fh:
        recs = json.load(fh)
    dept_pan_sets[d] = {r[pan_keys[d]] for r in recs if r.get(pan_keys[d])}

all_pans = set()
for s in dept_pan_sets.values():
    all_pans |= s
shared = [p for p in all_pans if sum(1 for d in dept_pan_sets if p in dept_pan_sets[d]) >= 2]
print(f"\nShared PANs across >=2 depts: {len(shared)}")
assert len(shared) == 30, f"Expected 30, got {len(shared)}"
print("Validation PASSED!")
