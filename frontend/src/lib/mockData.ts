/**
 * Comprehensive mock data for the UBID Intelligence Platform.
 * Single source of truth — covers Dashboard, Reviewer, Analytics,
 * Audit, and Evolution pages. All data uses realistic Karnataka
 * business names, PIN codes, and department names.
 */

// ═══════════════════════════════════════════════════════════════════
//  TYPES (self-contained — no circular imports)
// ═══════════════════════════════════════════════════════════════════

export interface PipelineStatus {
  status: "idle" | "running";
  last_run: string;
  ubids_total: number;
  records_processed: number;
  duration_seconds: number;
}

export interface MatchDistribution {
  label: string;
  value: number;
  color: string;
}

export interface SimilarCase {
  id: string;
  record_a_name: string;
  record_b_name: string;
  decision: "approved" | "rejected";
  confidence: number;
  reviewer: string;
  age: string;
  reason: string;
}

export interface EvolutionVersion {
  version: string;
  trained_on: string;
  precision: number;
  recall: number;
  f1: number;
  trigger: string;
  status: "active" | "retired";
  deployed_at: string;
}

export interface ThresholdPoint {
  date: string;
  value: number;
}

export interface LearningEvent {
  id: string;
  timestamp: string;
  type: "rule" | "weight" | "threshold" | "retrain" | "feature";
  title: string;
  detail: string;
  icon: string;
}

// ═══════════════════════════════════════════════════════════════════
//  FEATURE 1 — Pipeline Control Card
// ═══════════════════════════════════════════════════════════════════

export const MOCK_PIPELINE: PipelineStatus = {
  status: "idle",
  last_run: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  ubids_total: 113,
  records_processed: 222,
  duration_seconds: 47,
};

export const MOCK_MATCH_DISTRIBUTION: MatchDistribution[] = [
  { label: "Auto Linked via PAN/GSTIN", value: 35, color: "#2E6D7A" },
  { label: "Auto Linked High Confidence", value: 30, color: "#059669" },
  { label: "Sent for Human Review", value: 25, color: "#D97706" },
  { label: "Kept Separate", value: 10, color: "#6B7280" },
];

// ═══════════════════════════════════════════════════════════════════
//  FEATURE 3 — Similar Past Cases
// ═══════════════════════════════════════════════════════════════════

export const MOCK_SIMILAR_CASES: SimilarCase[] = [
  {
    id: "past_001",
    record_a_name: "Sharma Textiles Pvt Ltd",
    record_b_name: "Sharma Tex Industries",
    decision: "approved",
    confidence: 0.79,
    reviewer: "reviewer_01",
    age: "2 days ago",
    reason: "Same PIN code + name similarity 0.81",
  },
  {
    id: "past_002",
    record_a_name: "Karnataka Steel Works",
    record_b_name: "KSW Steel Pvt Ltd",
    decision: "rejected",
    confidence: 0.61,
    reviewer: "reviewer_02",
    age: "5 days ago",
    reason: "Similar name but different address + no PAN",
  },
  {
    id: "past_003",
    record_a_name: "Patel Chemicals",
    record_b_name: "Patel Chem Industries Ltd",
    decision: "approved",
    confidence: 0.83,
    reviewer: "reviewer_01",
    age: "1 week ago",
    reason: "Phone match + PIN match",
  },
];

// ═══════════════════════════════════════════════════════════════════
//  FEATURE 4 — Expanded Reviewer Queue (12 cases)
// ═══════════════════════════════════════════════════════════════════

export const MOCK_QUEUE_12 = [
  { case_id: "case_001", confidence: 0.91, name_a: "Sharma Textiles Pvt Ltd", name_b: "Sharma Tex Industries", department_a: "Factories Department", department_b: "KSPCB", age_hours: 1, created_at: "2024-12-15T23:00:00Z" },
  { case_id: "case_002", confidence: 0.57, name_a: "Karnataka Beverages Ltd", name_b: "Karnataka Bev. Private Limited", department_a: "Shop & Establishment", department_b: "Labour Department", age_hours: 78, created_at: "2024-12-12T18:00:00Z" },
  { case_id: "case_003", confidence: 0.73, name_a: "Patel Chemicals", name_b: "Patel Chem Industries", department_a: "Factories Department", department_b: "KSPCB", age_hours: 3, created_at: "2024-12-15T21:00:00Z" },
  { case_id: "case_004", confidence: 0.88, name_a: "Mysore Silk Exports", name_b: "Mysore Silk Export House", department_a: "Shop & Establishment", department_b: "Factories Department", age_hours: 12, created_at: "2024-12-15T12:00:00Z" },
  { case_id: "case_005", confidence: 0.62, name_a: "Bengaluru Auto Parts", name_b: "Blr Auto Parts Pvt Ltd", department_a: "Labour Department", department_b: "KSPCB", age_hours: 96, created_at: "2024-12-11T23:00:00Z" },
  { case_id: "case_006", confidence: 0.44, name_a: "Sri Venkateshwara Mills", name_b: "S.V. Mills and Weaving", department_a: "Factories Department", department_b: "Shop & Establishment", age_hours: 24, created_at: "2024-12-15T00:00:00Z" },
  { case_id: "case_007", confidence: 0.79, name_a: "Hubli Steel Corporation", name_b: "Hubli Steel Corp Ltd", department_a: "Factories Department", department_b: "Labour Department", age_hours: 6, created_at: "2024-12-15T18:00:00Z" },
  { case_id: "case_008", confidence: 0.55, name_a: "Dharwad Food Products", name_b: "Dharwad Foods Pvt Ltd", department_a: "Shop & Establishment", department_b: "KSPCB", age_hours: 48, created_at: "2024-12-13T23:00:00Z" },
  { case_id: "case_009", confidence: 0.84, name_a: "Mangalore Port Logistics", name_b: "Mangalore Logistics Ltd", department_a: "Labour Department", department_b: "Factories Department", age_hours: 2, created_at: "2024-12-15T22:00:00Z" },
  { case_id: "case_010", confidence: 0.67, name_a: "Belgaum Cement Works", name_b: "Belgaum Cement Pvt Ltd", department_a: "KSPCB", department_b: "Factories Department", age_hours: 120, created_at: "2024-12-10T23:00:00Z" },
  { case_id: "case_011", confidence: 0.93, name_a: "Udupi Coconut Products", name_b: "Udupi Coconut Pvt Ltd", department_a: "Shop & Establishment", department_b: "Labour Department", age_hours: 0.5, created_at: "2024-12-15T23:30:00Z" },
  { case_id: "case_012", confidence: 0.71, name_a: "Kolar Gold Refineries", name_b: "KGR Metals Ltd", department_a: "Factories Department", department_b: "KSPCB", age_hours: 36, created_at: "2024-12-14T12:00:00Z" },
];

/** Generate a full ReviewCase for any case_id from the queue */
export function getMockCaseDetail(caseId: string) {
  const queueItem = MOCK_QUEUE_12.find((q) => q.case_id === caseId) || MOCK_QUEUE_12[0];
  return {
    case_id: queueItem.case_id,
    confidence: queueItem.confidence,
    record_a: {
      name_raw: queueItem.name_a,
      name_normalised: queueItem.name_a.toLowerCase().replace(/pvt|ltd|private|limited/gi, "").trim(),
      address: "No. 42, Industrial Area, Peenya, Bangalore",
      pin: "560058",
      pan: "AABCS" + Math.floor(1000 + Math.random() * 9000) + "L",
      gstin: "29AABCS" + Math.floor(1000 + Math.random() * 9000) + "L1ZA",
      phone: "080-2345" + Math.floor(1000 + Math.random() * 9000),
      department: queueItem.department_a,
    },
    record_b: {
      name_raw: queueItem.name_b,
      name_normalised: queueItem.name_b.toLowerCase().replace(/pvt|ltd|private|limited/gi, "").trim(),
      address: "Plot 15, Bommasandra Industrial Area, Bengaluru",
      pin: "560058",
      pan: "AABCS" + Math.floor(1000 + Math.random() * 9000) + "L",
      gstin: "29AABCS" + Math.floor(1000 + Math.random() * 9000) + "L1ZA",
      phone: "080-2987" + Math.floor(1000 + Math.random() * 9000),
      department: queueItem.department_b,
    },
    shap_values: [
      { feature: "name_jaro_winkler", value: 0.38 + Math.random() * 0.12 },
      { feature: "pan_exact_match", value: queueItem.confidence > 0.8 ? 0.30 : -0.05 },
      { feature: "gstin_match", value: queueItem.confidence > 0.7 ? 0.25 : -0.08 },
      { feature: "pin_match", value: 0.15 },
      { feature: "address_cosine", value: 0.08 + Math.random() * 0.10 },
      { feature: "phone_prefix_match", value: 0.04 + Math.random() * 0.08 },
      { feature: "metaphone_match", value: 0.03 + Math.random() * 0.06 },
    ],
    explanation: `Match confidence ${(queueItem.confidence * 100).toFixed(0)}% between "${queueItem.name_a}" (${queueItem.department_a}) and "${queueItem.name_b}" (${queueItem.department_b}). ${queueItem.confidence > 0.8 ? "Strong identifier match supports merge." : "Moderate similarity — manual review recommended."}`,
    age_hours: queueItem.age_hours,
    created_at: queueItem.created_at,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  FEATURE 5 — Expanded Analytics (43 query results)
// ═══════════════════════════════════════════════════════════════════

export const MOCK_ANALYTICS_SUMMARY = {
  total_ubids: 113,
  total_records: 222,
  status_breakdown: { active: 48, dormant: 45, closed: 12, unclassified: 8 },
  review_queue_count: 12,
  departments_covered: 4,
  last_pipeline_run: "12 minutes ago",
};

export const MOCK_UBID_SEARCH_RESULTS = [
  { ubid: "UBID-KA-2024-00142", name: "ABC Textiles Pvt Ltd", departments: ["factories", "labour", "kspcb"], status: "active", confidence: 0.94, anchor_type: "PAN", explanation: "PAN + normalised name across 3 depts" },
  { ubid: "UBID-KA-2024-00287", name: "Bangalore Steel Works", departments: ["factories", "kspcb"], status: "active", confidence: 0.91, anchor_type: "GSTIN", explanation: "GSTIN and address proximity" },
  { ubid: "UBID-KA-2024-00531", name: "Sri Lakshmi Enterprises", departments: ["shop_est", "labour"], status: "dormant", confidence: 0.87, anchor_type: "INT", explanation: "Name + phone match, no PAN/GSTIN" },
  { ubid: "UBID-KA-2024-00098", name: "Karnataka Chemicals & Fertilizers", departments: ["factories", "kspcb", "labour", "bescom"], status: "active", confidence: 0.96, anchor_type: "PAN", explanation: "Exact PAN+GSTIN across 4 depts" },
  { ubid: "UBID-KA-2024-00763", name: "Mysore Silk Palace", departments: ["shop_est"], status: "active", confidence: 0.82, anchor_type: "GSTIN", explanation: "Single dept, GSTIN confirmed" },
  { ubid: "UBID-KA-2024-00415", name: "Hubli Engineering Corp", departments: ["factories", "labour"], status: "closed", confidence: 0.89, anchor_type: "PAN", explanation: "PAN match, closure confirmed" },
  { ubid: "UBID-KA-2024-00312", name: "Peenya Precision Tools", departments: ["factories", "kspcb"], status: "active", confidence: 0.85, anchor_type: "INT", explanation: "Address + phone, no federal ID" },
  { ubid: "UBID-KA-2024-00189", name: "Belgaum Auto Components", departments: ["factories"], status: "dormant", confidence: 0.78, anchor_type: "GSTIN", explanation: "GSTIN match, no activity 10 months" },
];

const KA_BUSINESSES: Array<{ n: string; d: string; p: string; s: string; a: string }> = [
  { n: "Peenya Precision Tools", d: "factories", p: "560058", s: "active", a: "PAN" },
  { n: "ABC Textiles Pvt Ltd", d: "factories", p: "560058", s: "active", a: "PAN" },
  { n: "Bangalore Steel Works", d: "factories", p: "560058", s: "active", a: "GSTIN" },
  { n: "Karnataka Chemicals", d: "factories", p: "560058", s: "active", a: "PAN" },
  { n: "Wipro Infrastructure Eng", d: "factories", p: "560058", s: "active", a: "PAN" },
  { n: "Sri Lakshmi Enterprises", d: "shop_est", p: "560001", s: "dormant", a: "INT" },
  { n: "Bangalore Clothing Co", d: "shop_est", p: "560001", s: "dormant", a: "INT" },
  { n: "Rajajinagar Hardware", d: "shop_est", p: "560001", s: "active", a: "GSTIN" },
  { n: "MG Road Electronics Hub", d: "shop_est", p: "560001", s: "active", a: "INT" },
  { n: "Jayanagar Furniture Works", d: "shop_est", p: "560001", s: "dormant", a: "INT" },
  { n: "Mysore Silk Exports", d: "factories", p: "572101", s: "active", a: "PAN" },
  { n: "Chamundi Agro Industries", d: "factories", p: "572101", s: "active", a: "GSTIN" },
  { n: "Mysore Sandal Soap Unit", d: "factories", p: "572101", s: "active", a: "PAN" },
  { n: "Heritage Craft Exports", d: "shop_est", p: "572101", s: "dormant", a: "INT" },
  { n: "Nanjangud Sugar Works", d: "factories", p: "572101", s: "closed", a: "PAN" },
  { n: "Hubli Steel Corporation", d: "factories", p: "580001", s: "active", a: "GSTIN" },
  { n: "Dharwad Food Products", d: "shop_est", p: "580001", s: "dormant", a: "INT" },
  { n: "Hubli Engineering Corp", d: "factories", p: "580001", s: "closed", a: "PAN" },
  { n: "Unkal Lake Industries", d: "factories", p: "580001", s: "active", a: "PAN" },
  { n: "Vidyanagar Auto Parts", d: "labour", p: "580001", s: "dormant", a: "INT" },
  { n: "Mangalore Port Logistics", d: "labour", p: "575001", s: "active", a: "PAN" },
  { n: "Mangalore Cashew Co", d: "factories", p: "575001", s: "active", a: "GSTIN" },
  { n: "Surathkal Chemical Works", d: "factories", p: "575001", s: "dormant", a: "INT" },
  { n: "Kadri Tile Factory", d: "factories", p: "575001", s: "active", a: "PAN" },
  { n: "Bejai Trading Company", d: "shop_est", p: "575001", s: "closed", a: "INT" },
  { n: "Belgaum Cement Works", d: "kspcb", p: "590001", s: "active", a: "PAN" },
  { n: "Belgaum Auto Components", d: "factories", p: "590001", s: "dormant", a: "GSTIN" },
  { n: "Gokak Textiles Pvt Ltd", d: "factories", p: "590001", s: "active", a: "PAN" },
  { n: "Khanapur Plywood Mills", d: "factories", p: "590001", s: "closed", a: "INT" },
  { n: "Udupi Coconut Products", d: "shop_est", p: "576101", s: "active", a: "GSTIN" },
  { n: "Manipal Pharma Research", d: "factories", p: "576101", s: "active", a: "PAN" },
  { n: "Kundapura Fish Exports", d: "shop_est", p: "576101", s: "dormant", a: "INT" },
  { n: "Kolar Gold Refineries", d: "factories", p: "563101", s: "closed", a: "PAN" },
  { n: "KGF Mining Services", d: "labour", p: "563101", s: "closed", a: "INT" },
  { n: "Shimoga Steel Rolling Mills", d: "factories", p: "577201", s: "active", a: "PAN" },
  { n: "Bhadravathi Iron Works", d: "factories", p: "577201", s: "dormant", a: "GSTIN" },
  { n: "Davangere Cotton Mills", d: "factories", p: "577001", s: "dormant", a: "INT" },
  { n: "Harihara Polyfibers Ltd", d: "factories", p: "577001", s: "active", a: "PAN" },
  { n: "Raichur Thermal Power", d: "factories", p: "584101", s: "active", a: "PAN" },
  { n: "Sindhanur Cotton Ginning", d: "factories", p: "584101", s: "dormant", a: "INT" },
  { n: "HAL Aerospace Division", d: "factories", p: "560017", s: "active", a: "PAN" },
  { n: "BEL Jalahalli Unit", d: "factories", p: "560013", s: "active", a: "PAN" },
  { n: "BEML Bangalore Complex", d: "factories", p: "560075", s: "active", a: "PAN" },
];

export const MOCK_QUERY_RESULTS_43 = KA_BUSINESSES.map((b, i) => ({
  ubid: `UBID-KA-2024-${String(i + 1).padStart(5, "0")}`,
  name: b.n,
  department: b.d,
  pin_code: b.p,
  status: b.s,
  anchor_type: b.a,
  last_event_days: b.s === "active" ? Math.floor(Math.random() * 90) + 1 : b.s === "dormant" ? Math.floor(Math.random() * 400) + 180 : Math.floor(Math.random() * 300) + 500,
}));

// ═══════════════════════════════════════════════════════════════════
//  FEATURE 6 — Evolution Page
// ═══════════════════════════════════════════════════════════════════

export const MOCK_EVOLUTION_VERSIONS: EvolutionVersion[] = [
  { version: "v1.4", trained_on: "2024-12-14", precision: 0.912, recall: 0.887, f1: 0.899, trigger: "500 reviewer decisions", status: "active", deployed_at: "2024-12-14T18:00:00Z" },
  { version: "v1.3", trained_on: "2024-11-28", precision: 0.893, recall: 0.871, f1: 0.882, trigger: "Weekly schedule", status: "retired", deployed_at: "2024-11-28T10:00:00Z" },
  { version: "v1.2", trained_on: "2024-11-14", precision: 0.881, recall: 0.859, f1: 0.870, trigger: "500 reviewer decisions", status: "retired", deployed_at: "2024-11-14T14:30:00Z" },
  { version: "v1.1", trained_on: "2024-10-30", precision: 0.869, recall: 0.842, f1: 0.855, trigger: "Manual", status: "retired", deployed_at: "2024-10-30T09:00:00Z" },
  { version: "v1.0", trained_on: "2024-10-15", precision: 0.841, recall: 0.818, f1: 0.829, trigger: "Initial deployment", status: "retired", deployed_at: "2024-10-15T12:00:00Z" },
];

export const MOCK_THRESHOLD_HISTORY: ThresholdPoint[] = (() => {
  const pts: ThresholdPoint[] = [];
  const base = new Date("2024-10-15");
  const values = [0.85, 0.85, 0.84, 0.83, 0.82, 0.82, 0.83, 0.84, 0.85, 0.86, 0.87, 0.88, 0.88, 0.88, 0.88, 0.88, 0.88, 0.88];
  for (let i = 0; i < values.length; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i * 3.5);
    pts.push({ date: d.toISOString().slice(0, 10), value: values[i] });
  }
  return pts;
})();

export const MOCK_LEARNING_EVENTS: LearningEvent[] = [
  { id: "LE-01", timestamp: "2024-12-14T18:00:00Z", type: "retrain", icon: "🧠", title: "Model retrained: v1.3 → v1.4", detail: "Precision +1.9%, 612 new training examples from reviewer decisions" },
  { id: "LE-02", timestamp: "2024-12-13T14:30:00Z", type: "threshold", icon: "📊", title: "Threshold raised: 0.85 → 0.88", detail: "Reviewers approved 96% of auto-link candidates, raising confidence bar" },
  { id: "LE-03", timestamp: "2024-12-12T09:15:00Z", type: "rule", icon: "📝", title: "Rule added: 'Pvt Ltd' suffix variant for 'P Ltd'", detail: "Triggered by 8 rejected mismatches where only the suffix differed" },
  { id: "LE-04", timestamp: "2024-12-11T16:00:00Z", type: "weight", icon: "⚖️", title: "Weight increased: PIN code match signal +4%", detail: "Consistently reliable across 340 reviewer decisions in last 30 days" },
  { id: "LE-05", timestamp: "2024-12-10T11:00:00Z", type: "rule", icon: "📝", title: "Abbreviation pattern: 'S.V.' → 'Sri Venkateshwara'", detail: "Added to normalisation dictionary after 5 confirmed matches" },
  { id: "LE-06", timestamp: "2024-12-09T13:45:00Z", type: "feature", icon: "🔬", title: "New feature: cross-department registration count", detail: "Businesses registered in 3+ departments show 87% match probability" },
  { id: "LE-07", timestamp: "2024-12-08T10:30:00Z", type: "weight", icon: "⚖️", title: "Weight decreased: phone prefix match -2%", detail: "High false-positive rate in Bangalore (shared exchange codes)" },
  { id: "LE-08", timestamp: "2024-12-07T15:00:00Z", type: "threshold", icon: "📊", title: "Threshold adjusted: 0.84 → 0.85", detail: "Marginal increase after reviewing edge cases in 0.82-0.86 band" },
  { id: "LE-09", timestamp: "2024-12-06T09:00:00Z", type: "retrain", icon: "🧠", title: "Model retrained: v1.2 → v1.3", detail: "Recall +1.2%, incorporated 480 new examples from November decisions" },
  { id: "LE-10", timestamp: "2024-12-05T14:00:00Z", type: "rule", icon: "📝", title: "Rule added: GSTIN state code '29' = Karnataka", detail: "Auto-flag records with non-29 GSTIN as potential cross-state entity" },
];

// ═══════════════════════════════════════════════════════════════════
//  FEATURE 8 — Anchor-Pending Stats
// ═══════════════════════════════════════════════════════════════════

export const MOCK_ANCHOR_PENDING_COUNT = 23;

/** Search results with anchor_type for the anchor-pending feature */
export const MOCK_SEARCH_WITH_ANCHORS = MOCK_UBID_SEARCH_RESULTS;
