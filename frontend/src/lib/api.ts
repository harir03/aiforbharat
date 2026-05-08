const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

// ─── Summary ─────────────────────────────────────────────────────────

export async function fetchSummary(): Promise<SummaryResponse> {
  return apiFetch<SummaryResponse>("/api/analytics/summary");
}

// ─── Reviewer ────────────────────────────────────────────────────────

export async function fetchReviewerQueue(
  page = 1,
  pageSize = 20
): Promise<QueueResponse> {
  return apiFetch<QueueResponse>(
    `/api/reviewer/queue?page=${page}&page_size=${pageSize}`
  );
}

export async function fetchReviewCase(caseId: string): Promise<ReviewCase> {
  return apiFetch<ReviewCase>(`/api/reviewer/queue/${caseId}`);
}

export async function submitReviewAction(
  caseId: string,
  payload: ReviewActionPayload
): Promise<ReviewActionResponse> {
  return apiFetch<ReviewActionResponse>(`/api/reviewer/queue/${caseId}/${payload.action}`, {
    method: "POST",
    body: JSON.stringify({ reason: payload.reason }),
  });
}

// ─── Search ──────────────────────────────────────────────────────────

export async function searchUBIDs(
  query: string,
  pin?: string
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query });
  if (pin) params.set("pin", pin);
  return apiFetch<SearchResult[]>(`/api/ubid/search?${params.toString()}`);
}

// ─── Analytics: UBID Detail ──────────────────────────────────────────

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

export async function fetchUbidDetail(ubid: string): Promise<UbidDetail> {
  return apiFetch<UbidDetail>(`/api/ubid/${ubid}`);
}

export async function fetchUbidEvents(ubid: string): Promise<ActivityEvent[]> {
  return apiFetch<ActivityEvent[]>(`/api/ubid/${ubid}/events`);
}

export async function runAnalyticsQuery(payload: QueryPayload): Promise<QueryResult[]> {
  return apiFetch<QueryResult[]>("/api/analytics/query", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

export async function fetchAuditLog(): Promise<AuditEntry[]> {
  return apiFetch<AuditEntry[]>("/api/reviewer/audit");
}
