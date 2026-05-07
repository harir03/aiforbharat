"""
Seed synthetic data -- 200 businesses across 4 departments with known ground truth.

Each adapter expects department-specific field names:
  shop_est:   shop_id, business_name, shop_address, pin, pan_number, gst_number, contact_phone, contact_email, registration_date
  factories:  factory_id, factory_name, factory_address, pincode, pan_no, gstin_no, phone_no, email_id, licence_date
  labour:     labour_id, establishment_name, registered_address, area_pin, employer_pan, gst_reg_no, mobile, email_address, date_of_registration
  kspcb:      kspcb_id, industry_name, site_address, site_pincode, company_pan, gstin, contact_no, email, consent_date

Ground truth:
- 30 businesses exist in EXACTLY 2+ departments (known matches with shared PAN)
- 170 businesses exist in only 1 department (no matches expected)
"""
import json
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(42)

DEPARTMENTS = ["shop_est", "factories", "labour", "kspcb"]
OUTPUT_DIR = Path(__file__).resolve().parent / "synthetic"

# Field mapping per department
FIELD_MAP = {
    "shop_est": {
        "id_key": "shop_id",
        "name_key": "business_name",
        "address_key": "shop_address",
        "pin_key": "pin",
        "pan_key": "pan_number",
        "gstin_key": "gst_number",
        "phone_key": "contact_phone",
        "email_key": "contact_email",
        "date_key": "registration_date",
        "filename": "shop_establishment.json",
    },
    "factories": {
        "id_key": "factory_id",
        "name_key": "factory_name",
        "address_key": "factory_address",
        "pin_key": "pincode",
        "pan_key": "pan_no",
        "gstin_key": "gstin_no",
        "phone_key": "phone_no",
        "email_key": "email_id",
        "date_key": "licence_date",
        "filename": "factories.json",
    },
    "labour": {
        "id_key": "labour_id",
        "name_key": "establishment_name",
        "address_key": "registered_address",
        "pin_key": "area_pin",
        "pan_key": "employer_pan",
        "gstin_key": "gst_reg_no",
        "phone_key": "mobile",
        "email_key": "email_address",
        "date_key": "date_of_registration",
        "filename": "labour.json",
    },
    "kspcb": {
        "id_key": "kspcb_id",
        "name_key": "industry_name",
        "address_key": "site_address",
        "pin_key": "site_pincode",
        "pan_key": "company_pan",
        "gstin_key": "gstin",
        "phone_key": "contact_no",
        "email_key": "email",
        "date_key": "consent_date",
        "filename": "kspcb.json",
    },
}

# Karnataka business names pool
NAMES = [
    "Sharma Textiles", "Bangalore Manufacturing", "Karnataka Engineering",
    "Mysore Silks", "Deccan Electronics", "South India Traders",
    "Hubli Steel Works", "Mangalore Spice Co", "Belgaum Auto Parts",
    "Shimoga Wood Industries", "Nandi Pharma", "Cauvery Garments",
    "Hassan Coffee", "Mandya Sugar", "Davangere Cotton",
    "Tumkur Plastics", "Bidar Cement", "Gulbarga Minerals",
    "Raichur Agro", "Bellary Iron Works", "Udupi Fish Exports",
    "Dharwad Engineering", "Chitradurga Granite", "Kolar Gold Fields",
    "Chikmagalur Estates", "Hospet Power", "Gadag Textiles",
    "Koppal Mining", "Yadgir Farms", "Bagalkot Sugar Mills",
    "Haveri Oil Works", "Karwar Shipping", "Sirsi Spices",
    "Bhadravati Steel", "Dandeli Paper", "Ranebennur Cotton",
    "Gokak Falls Power", "Nipani Tobacco", "Athani Sugar",
    "Mudhol Ceramics",
]

NAME_VARIANTS = {
    "Sharma Textiles": ["Sharma Textile Mfg", "Sharmas Textiles Pvt Ltd"],
    "Bangalore Manufacturing": ["Bangalore Mfg Works", "Bengaluru Manufacturing"],
    "Karnataka Engineering": ["Karnataka Engg Services", "KA Engineering Works"],
    "Mysore Silks": ["Mysore Silk Factory", "Mysuru Silks LLP"],
    "Deccan Electronics": ["Deccan Electronics Pvt Ltd", "Deccan Electronic Parts"],
    "South India Traders": ["South India Trading Co", "S India Traders"],
    "Hubli Steel Works": ["Hubballi Steel", "Hubli Steel Wks"],
    "Mangalore Spice Co": ["Mangaluru Spice", "Mangalore Spices"],
    "Belgaum Auto Parts": ["Belagavi Auto", "Belgaum Auto Pvt Ltd"],
    "Shimoga Wood Industries": ["Shivamogga Wood", "Shimoga Timber"],
}

PINS = [
    "560001", "560011", "560034", "560043", "560058",
    "570001", "570002", "575001", "580020", "580030",
]

CITIES = [
    "Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum",
    "Shimoga", "Tumkur", "Davangere", "Bellary", "Gulbarga",
]


def _gen_pan() -> str:
    prefix = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=5))
    digits = f"{random.randint(1000, 9999)}"
    suffix = random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    return f"{prefix}{digits}{suffix}"


def _gen_address(pin: str) -> str:
    templates = [
        f"{random.randint(1,500)} MG Road, {random.choice(CITIES)} {pin}",
        f"Plot {random.randint(1,200)}, Industrial Area, {random.choice(CITIES)} {pin}",
        f"No. {random.randint(1,300)}, KIADB Layout, {random.choice(CITIES)} {pin}",
        f"{random.randint(1,100)} Market Road, {random.choice(CITIES)} {pin}",
    ]
    return random.choice(templates)


def _gen_phone() -> str:
    return f"9{random.randint(100000000, 999999999)}"


def _gen_reg_date() -> str:
    days_ago = random.randint(365, 365 * 10)
    return (date.today() - timedelta(days=days_ago)).isoformat()


def _build_record(dept: str, local_id: str, name: str, address: str,
                  pin: str, pan: str, phone: str, reg_date: str) -> dict:
    """Build a record with department-specific field names."""
    fm = FIELD_MAP[dept]
    return {
        fm["id_key"]: local_id,
        fm["name_key"]: name,
        fm["address_key"]: address,
        fm["pin_key"]: pin,
        fm["pan_key"]: pan,
        fm["phone_key"]: phone,
        fm["date_key"]: reg_date,
    }

def generate_hard_pairs(
    records_per_dept: dict[str, list],
    ground_truth_pairs: list[dict],
) -> dict:
    """Create 10 ambiguous cross-department pairs (20 records total).

    Design constraints — each pair:
    - Same PIN code
    - Similar but not identical business name
      (e.g. "Patel Chemicals Pvt Ltd" vs "Patel Chem Industries")
    - NO PAN field on either record
    - Different phone numbers
    - Expected XGBoost score: 0.55-0.88 (review queue)

    The scorer's post-hoc dampening rule ensures that pairs with high
    name similarity but no PAN/phone confirmation land in the review
    band instead of auto-linking.

    Returns:
        dict with 'count' (int) and 'pairs' (list of pair metadata)
    """
    HARD_PAIRS: list[tuple[str, str, str, str]] = [
        # (name_A, dept_A, name_B, dept_B)
        ("Patel Chemicals Pvt Ltd", "factories", "Patel Chem Industries", "kspcb"),
        ("Rao Agro Exports", "shop_est", "Rao Agricultural Export", "labour"),
        ("Reddy Steels Bangalore", "factories", "Reddy Steel Works", "shop_est"),
        ("Kumar Packaging", "labour", "Kumar Pack Solutions", "kspcb"),
        ("Nagaraj Motors", "shop_est", "Nagaraj Automobile Works", "factories"),
        ("Gowda Rice Industries", "kspcb", "Gowda Rice Processing", "labour"),
        ("Shetty Fisheries", "shop_est", "Shetty Marine Products", "kspcb"),
        ("Joshi Precision Tools", "factories", "Joshi Precision Engg", "labour"),
        ("Hegde Spice Traders", "shop_est", "Hegde Spice Export Co", "factories"),
        ("Acharya Textiles Mill", "labour", "Acharya Textile Mfg", "kspcb"),
    ]

    pair_meta: list[dict] = []

    for idx, (name_a, dept_a, name_b, dept_b) in enumerate(HARD_PAIRS):
        pin = PINS[idx % len(PINS)]
        city = CITIES[idx % len(CITIES)]
        reg_date = _gen_reg_date()

        local_id_a = f"{dept_a[:2].upper()}{(idx + 500):03d}"
        local_id_b = f"{dept_b[:2].upper()}{(idx + 500):03d}"

        addr_a = f"{random.randint(10, 200)} Industrial Area, {city} {pin}"
        addr_b = f"{random.randint(10, 200)} Industrial Estate, {city} {pin}"

        # NO PAN on either record — forces dampening in scorer
        rec_a = _build_record(
            dept_a, local_id_a, name_a, addr_a, pin, "", _gen_phone(), reg_date,
        )
        rec_b = _build_record(
            dept_b, local_id_b, name_b, addr_b, pin, "", _gen_phone(), reg_date,
        )

        records_per_dept[dept_a].append(rec_a)
        records_per_dept[dept_b].append(rec_b)

        pair_info = {
            "business": name_a,
            "record_a": {"dept": dept_a, "local_id": local_id_a},
            "record_b": {"dept": dept_b, "local_id": local_id_b},
            "expected": "review",
            "design": "hard_pair_no_pan",
        }
        ground_truth_pairs.append(pair_info)
        pair_meta.append(pair_info)

    return {"count": len(HARD_PAIRS), "pairs": pair_meta}


def seed() -> dict:
    """Generate 200+ synthetic business records across 4 departments."""
    records_per_dept: dict[str, list] = {d: [] for d in DEPARTMENTS}
    ground_truth_pairs: list[dict] = []

    # --- Phase 1: 30 businesses in 2+ departments (known matches) ---
    shared_names = NAMES[:30]
    for i, name in enumerate(shared_names):
        pan = _gen_pan()
        pin = random.choice(PINS)
        phone = _gen_phone()
        address = _gen_address(pin)
        reg_date = _gen_reg_date()

        n_depts = random.choice([2, 2, 2, 3])
        depts = random.sample(DEPARTMENTS, n_depts)

        dept_records = []
        for dept in depts:
            variants = NAME_VARIANTS.get(name, [name + " Ltd", name + " Unit"])
            dept_name = random.choice([name] + variants)

            dept_address = address if random.random() > 0.4 else _gen_address(pin)
            dept_phone = phone if random.random() > 0.2 else _gen_phone()

            local_id = f"{dept[:2].upper()}{(i * 4 + DEPARTMENTS.index(dept) + 1):03d}"

            record = _build_record(
                dept, local_id, dept_name, dept_address, pin, pan, dept_phone, reg_date,
            )
            records_per_dept[dept].append(record)
            dept_records.append({"dept": dept, "local_id": local_id})

        for j in range(len(dept_records)):
            for k in range(j + 1, len(dept_records)):
                ground_truth_pairs.append({
                    "business": name,
                    "pan": pan,
                    "record_a": dept_records[j],
                    "record_b": dept_records[k],
                    "expected": "match",
                })

    # --- Phase 2: 170 unique businesses (one department each) ---
    extra_names = NAMES[30:] + [f"Business_{i}" for i in range(140)]
    for i, name in enumerate(extra_names[:170]):
        dept = DEPARTMENTS[i % 4]
        pan = _gen_pan()
        pin = random.choice(PINS)
        local_id = f"{dept[:2].upper()}{(i + 200):03d}"

        record = _build_record(
            dept, local_id, name, _gen_address(pin), pin, pan, _gen_phone(), _gen_reg_date(),
        )
        records_per_dept[dept].append(record)

    # --- Phase 3: Hard ambiguous pairs via generate_hard_pairs() ---
    hard_result = generate_hard_pairs(records_per_dept, ground_truth_pairs)
    print(f"  hard pairs: {hard_result['count']} ambiguous pairs (no PAN, similar names)")

    # --- Write JSON files ---
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for dept, records in records_per_dept.items():
        filepath = OUTPUT_DIR / FIELD_MAP[dept]["filename"]
        with open(filepath, "w", encoding="utf-8") as fh:
            json.dump(records, fh, indent=2)
        print(f"  {dept}: {len(records)} records -> {filepath.name}")

    # Write ground truth
    truth_path = OUTPUT_DIR / "ground_truth.json"
    with open(truth_path, "w", encoding="utf-8") as fh:
        json.dump({
            "total_businesses": 210,
            "shared_businesses": 30,
            "unique_businesses": 170,
            "hard_ambiguous_pairs": hard_result["count"],
            "match_pairs": ground_truth_pairs,
            "total_match_pairs": len(ground_truth_pairs),
        }, fh, indent=2)
    print(f"  ground_truth: {len(ground_truth_pairs)} pairs "
          f"({hard_result['count']} hard)")

    total_records = sum(len(r) for r in records_per_dept.values())
    print(f"\n  TOTAL: {total_records} records across 4 departments")

    return {
        "records_per_dept": {d: len(r) for d, r in records_per_dept.items()},
        "total_records": total_records,
        "match_pairs": len(ground_truth_pairs),
    }


if __name__ == "__main__":
    print("Seeding synthetic data...")
    result = seed()
    print(f"\nDone: {result}")
