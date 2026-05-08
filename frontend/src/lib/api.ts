const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * When true, API calls that fail will transparently return mock data
 * so the UI is always populated. Set NEXT_PUBLIC_USE_MOCK=false to
 * force live-only mode.
 */
const USE_MOCK_FALLBACK =
  process.env.NEXT_PUBLIC_USE_MOCK !== "false";

// ─── Summary ─────────────────────────────────────────────────────────

export interface SummaryResponse {
  total_ubids: number;
  total_records: number;
  status_breakdown: {
    active: number;
    dormant: number;
    closed: number;
    unclassified: number;
  };
}

// ─── Reviewer Queue ──────────────────────────────────────────────────

export interface QueueResponse {
  items: QueueItem[];
  total: number;
  has_stale: boolean;
  stale_count?: number;
}

export interface QueueItem {
  case_id: string;
  name_a: string;
  name_b: string;
  department_a: string;
  department_b: string;
  confidence: number;
  created_at: string;
  age_hours: number;
}

// ─── Reviewer Case Detail ────────────────────────────────────────────

export interface RecordFields {
  name_raw: string;
  name_normalised: string;
  address: string;
  pin: string;
  pan: string;
  gstin: string;
  phone: string;
  department: string;
}

export interface ShapFeature {
  feature: string;
  value: number;
}

export interface ReviewCase {
  case_id: string;
  confidence: number;
  record_a: RecordFields;
  record_b: RecordFields;
  shap_values: ShapFeature[];
  explanation: string;
  age_hours: number;
  created_at: string;
}

export type ReviewAction = "approve" | "reject" | "defer" | "escalate";

export interface ReviewActionPayload {
  action: ReviewAction;
  reason?: string;
}

export interface ReviewActionResponse {
  success: boolean;
  message: string;
  next_case_id?: string;
}

// ─── Search ──────────────────────────────────────────────────────────

export interface SearchResult {
  ubid: string;
  name: string;
  departments: string[];
  status: string;
  confidence: number;
  explanation: string;
}

// ─── Analytics ───────────────────────────────────────────────────────

export interface UbidDetail {
  ubid: string;
  anchor_type: string;
  status: string;
  confidence: number;
  departments: string[];
  linked_records: Record<string, unknown>[];
  classification?: {
    status: string;
    confidence: number;
    shap_values: Record<string, number>;
  };
}

export interface ActivityEvent {
  event_id: string;
  department: string;
  event_type: string;
  event_ts: string;
  local_id: string;
  payload: Record<string, unknown>;
}

export interface QueryPayload {
  status?: string;
  department?: string;
  pin_code?: string;
  no_inspection_months?: number;
}

export interface QueryResult {
  ubid: string;
  name: string;
  department: string;
  pin_code: string;
  status: string;
  last_event_days: number;
}

// ─── Audit ───────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  case_id: string;
  record_a: string;
  record_b: string;
  confidence: number;
  features: Record<string, number>;
  resolution: string;
  reviewer_id: string;
  reviewer_note: string;
  resolved_at: string;
  ubid?: string;
}

// ─── API Fetch Utility ───────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// ─── Lazy-loaded mock data ──────────────────────────────────────────

let _mockModule: typeof import("./mock-data") | null = null;

async function getMock() {
  if (!_mockModule) {
    _mockModule = await import("./mock-data");
  }
  return _mockModule;
}

/**
 * Try the live API first; on any failure, fall back to mock data.
 * Mock resolver receives the lazy-loaded mock module.
 */
async function fetchWithMock<T>(
  path: string,
  mockResolver: (m: typeof import("./mock-data")) => T,
  options?: RequestInit,
): Promise<T> {
  if (!USE_MOCK_FALLBACK) {
    return apiFetch<T>(path, options);
  }
  try {
    return await apiFetch<T>(path, options);
  } catch {
    console.warn(`[UBID] API unreachable for ${path} — using demo data`);
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
    const m = await getMock();
    return mockResolver(m);
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  PUBLIC API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

// ─── Summary ─────────────────────────────────────────────────────────

export async function fetchSummary(): Promise<SummaryResponse> {
  return fetchWithMock("/api/analytics/summary", (m) => m.MOCK_SUMMARY);
}

// ─── Reviewer ────────────────────────────────────────────────────────

export async function fetchReviewerQueue(
  page = 1,
  pageSize = 20
): Promise<QueueResponse> {
  return fetchWithMock(
    `/api/reviewer/queue?page=${page}&page_size=${pageSize}`,
    (m) => m.MOCK_QUEUE,
  );
}

export async function fetchReviewCase(caseId: string): Promise<ReviewCase> {
  return fetchWithMock(
    `/api/reviewer/queue/${caseId}`,
    (m) => {
      const found = m.MOCK_REVIEW_CASES[caseId];
      if (found) return found;
      const keys = Object.keys(m.MOCK_REVIEW_CASES);
      return m.MOCK_REVIEW_CASES[keys[0]];
    },
  );
}

export async function submitReviewAction(
  caseId: string,
  payload: ReviewActionPayload
): Promise<ReviewActionResponse> {
  return fetchWithMock(
    `/api/reviewer/queue/${caseId}/${payload.action}`,
    (m) => ({
      success: true,
      message: `[Demo] Case ${caseId} ${payload.action}d successfully`,
      next_case_id: m.MOCK_QUEUE.items[1]?.case_id,
    }),
    {
      method: "POST",
      body: JSON.stringify({ reason: payload.reason }),
    },
  );
}

// ─── Search ──────────────────────────────────────────────────────────

export async function searchUBIDs(
  query: string,
  pin?: string
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query });
  if (pin) params.set("pin", pin);
  return fetchWithMock(
    `/api/ubid/search?${params.toString()}`,
    (m) => {
      const lower = query.toLowerCase();
      return m.MOCK_SEARCH_RESULTS.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.ubid.toLowerCase().includes(lower) ||
          r.departments.some((d) => d.toLowerCase().includes(lower)) ||
          lower.length < 3,
      );
    },
  );
}

// ─── Analytics: UBID Detail ──────────────────────────────────────────

export async function fetchUbidDetail(ubid: string): Promise<UbidDetail> {
  return fetchWithMock(
    `/api/ubid/${ubid}`,
    (m) => {
      const found = m.MOCK_UBID_DETAIL[ubid];
      if (found) return found;
      const keys = Object.keys(m.MOCK_UBID_DETAIL);
      return m.MOCK_UBID_DETAIL[keys[0]];
    },
  );
}

export async function fetchUbidEvents(ubid: string): Promise<ActivityEvent[]> {
  return fetchWithMock(
    `/api/ubid/${ubid}/events`,
    (m) => m.MOCK_EVENTS[ubid] || m.MOCK_EVENTS["UBID-KA-2024-00142"],
  );
}

export async function runAnalyticsQuery(
  payload: QueryPayload
): Promise<QueryResult[]> {
  return fetchWithMock(
    "/api/analytics/query",
    (m) => {
      let results = [...m.MOCK_QUERY_RESULTS];
      if (payload.status) {
        results = results.filter((r) => r.status === payload.status);
      }
      if (payload.department) {
        results = results.filter((r) => r.department === payload.department);
      }
      if (payload.pin_code) {
        results = results.filter((r) => r.pin_code === payload.pin_code);
      }
      if (payload.no_inspection_months) {
        const dayThreshold = payload.no_inspection_months * 30;
        results = results.filter((r) => r.last_event_days >= dayThreshold);
      }
      return results;
    },
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

// ─── Audit ───────────────────────────────────────────────────────────

export async function fetchAuditLog(): Promise<AuditEntry[]> {
  return fetchWithMock("/api/reviewer/audit", (m) => m.MOCK_AUDIT_ENTRIES);
}
