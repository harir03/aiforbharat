"use client";
import React, { useState, useEffect, useCallback } from "react";
import { fetchAuditLog, type AuditEntry } from "@/lib/api";

/* ─── Decision badge ─────────────────────────────────────────────────── */
const DECISION_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  approved:  { bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected:  { bg: "bg-red-50",      text: "text-red-700",     dot: "bg-red-500" },
  escalated: { bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-500" },
  deferred:  { bg: "bg-gray-100",    text: "text-gray-600",    dot: "bg-gray-400" },
  auto:      { bg: "bg-blue-50",     text: "text-blue-700",    dot: "bg-blue-500" },
};

function DecisionBadge({ decision }: { decision: string }) {
  const key = decision.toLowerCase();
  const style = DECISION_STYLES[key] || DECISION_STYLES.auto;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${style.bg} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {decision.charAt(0).toUpperCase() + decision.slice(1)}
    </span>
  );
}

/* ─── Time formatter ──────────────────────────────────────────────────── */
function formatTimestamp(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

/* ─── CSV export ──────────────────────────────────────────────────────── */
function downloadCSV(entries: AuditEntry[]) {
  const headers = ["Timestamp", "UBID", "Record A", "Record B", "Decision", "Confidence", "Reviewer", "Note"];
  const rows = entries.map((e) => [
    e.resolved_at,
    e.ubid || "—",
    e.record_a,
    e.record_b,
    e.resolution,
    (e.confidence * 100).toFixed(1) + "%",
    e.reviewer_id,
    `"${(e.reviewer_note || "").replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ubid_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Skeleton ────────────────────────────────────────────────────────── */
function AuditSkeleton() {
  const pulse = "animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800";
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`${pulse} h-14 rounded-xl`} />
      ))}
    </div>
  );
}

/* ─── Expandable SHAP row ─────────────────────────────────────────────── */
function ShapExpansion({ features }: { features: Record<string, number> }) {
  const entries = Object.entries(features).sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));
  if (entries.length === 0) {
    return (
      <div className="px-6 py-4 text-[12px] text-gray-400 italic">
        No feature values recorded for this decision.
      </div>
    );
  }
  return (
    <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/30">
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-3">
        SHAP Feature Importances
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`font-mono text-[12px] min-w-[50px] text-right ${value >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {value >= 0 ? "+" : ""}{value.toFixed(3)}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${value >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(Math.abs(value) * 200, 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-500 min-w-[120px]">
              {key.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  AUDIT LOG PAGE                                                       */
/* ═══════════════════════════════════════════════════════════════════════ */
export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const perPage = 20;

  /* ── Fetch audit data ──────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLog();
      setEntries(data);
    } catch (err) {
      console.error("Failed to load audit log:", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Filter + paginate ─────────────────────────────────────────────── */
  const filtered = filter === "all"
    ? entries
    : entries.filter((e) => e.resolution.toLowerCase() === filter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  /* ── Filter counts ─────────────────────────────────────────────────── */
  const counts = {
    all: entries.length,
    approved: entries.filter((e) => e.resolution.toLowerCase() === "approved").length,
    rejected: entries.filter((e) => e.resolution.toLowerCase() === "rejected").length,
    escalated: entries.filter((e) => e.resolution.toLowerCase() === "escalated").length,
    auto: entries.filter((e) => !["approved", "rejected", "escalated", "deferred"].includes(e.resolution.toLowerCase())).length,
  };

  const selectClass = `rounded-lg border-0 bg-white py-2 px-3 text-sm text-gray-700
    shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
    focus:shadow-[rgba(46,109,122,0.4)_0px_0px_0px_2px] focus:outline-none
    dark:bg-gray-900 dark:text-white dark:shadow-none dark:border dark:border-gray-700
    appearance-none cursor-pointer`;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white" style={{ letterSpacing: "-0.4px" }}>
            Audit Log
          </h1>
          <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
            Complete decision trail — every match, rejection, and escalation is recorded
          </p>
        </div>
        <button
          onClick={() => downloadCSV(filtered)}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-700
            shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
            transition-all duration-200
            hover:shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.06)_0px_4px_12px]
            hover:-translate-y-0.5
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0
            dark:bg-gray-900 dark:text-gray-300 dark:border dark:border-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          Download CSV
        </button>
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {(["all", "approved", "rejected", "escalated", "auto"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(0); }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-medium transition-all duration-150 ${
              filter === f
                ? "bg-[#2E6D7A] text-white shadow-[rgba(46,109,122,0.3)_0px_1px_2px]"
                : "bg-white text-gray-600 shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px] hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:border dark:border-gray-700"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
              filter === f ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-800"
            }`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      {loading ? (
        <AuditSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center
          shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px]
          dark:bg-gray-900 dark:border dark:border-gray-800">
          <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-400">No audit entries found</p>
        </div>
      ) : (
        <div className="rounded-xl bg-white overflow-hidden
          shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
          dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800">

          {/* Table header */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-8" />
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Timestamp</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">UBID</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Record A</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Record B</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Decision</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Confidence</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Reviewer</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Note</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((entry) => {
                  const isExpanded = expandedRow === entry.id;
                  return (
                    <React.Fragment key={entry.id}>
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                        className={`border-b border-gray-50 dark:border-gray-800/50 cursor-pointer transition-colors
                          ${isExpanded ? "bg-gray-50/50 dark:bg-gray-800/30" : "hover:bg-gray-50 dark:hover:bg-gray-800/30"}`}
                      >
                        {/* Expand chevron */}
                        <td className="px-3 py-3">
                          <svg
                            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </td>
                        <td className="px-5 py-3 text-[12px] text-gray-500 tabular-nums whitespace-nowrap">
                          {formatTimestamp(entry.resolved_at)}
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-[12px] font-medium text-[#2E6D7A]">
                            {entry.ubid || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[140px] truncate">
                          {entry.record_a}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[140px] truncate">
                          {entry.record_b}
                        </td>
                        <td className="px-5 py-3">
                          <DecisionBadge decision={entry.resolution} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#2E6D7A] transition-all duration-500"
                                style={{ width: `${Math.round(entry.confidence * 100)}%` }}
                              />
                            </div>
                            <span className="text-[12px] text-gray-500 tabular-nums">
                              {Math.round(entry.confidence * 100)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[12px] text-gray-500">
                          {entry.reviewer_id || "system"}
                        </td>
                        <td className="px-5 py-3 text-[12px] text-gray-500 max-w-[160px] truncate">
                          {entry.reviewer_note || "—"}
                        </td>
                      </tr>
                      {/* Expanded SHAP row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9}>
                            <ShapExpansion features={entry.features || {}} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[11px] text-gray-400">
                Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} of {filtered.length} entries
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  className="rounded-lg px-2 py-1.5 text-[12px] text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ← First
                </button>
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                  if (p >= totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        p === page
                          ? "bg-[#2E6D7A] text-white"
                          : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      {p + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg px-2 py-1.5 text-[12px] text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Last →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
