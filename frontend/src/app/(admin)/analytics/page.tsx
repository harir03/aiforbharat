"use client";
import React, { useState, useCallback, useEffect, Component, type ErrorInfo, type ReactNode } from "react";

/* ─── ErrorBoundary ─────────────────────────────────────────────────── */
interface EBState { hasError: boolean; error: string }
class DetailErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: "" };
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err.message || "Unknown error" };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DetailErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-6 text-center border border-red-200 dark:border-red-800">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            Failed to render UBID detail
          </p>
          <p className="mt-1 text-[12px] text-red-500 dark:text-red-400">
            {this.state.error}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: "" })}
            className="mt-3 rounded-lg bg-red-100 px-3 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-200 transition-colors dark:bg-red-800/50 dark:text-red-300"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import UbidSearchBar from "@/components/analytics/UbidSearchBar";
import UbidDetailCard from "@/components/analytics/UbidDetailCard";
import EventTimeline from "@/components/analytics/EventTimeline";
import ClassificationCard from "@/components/analytics/ClassificationCard";
import QueryBuilder from "@/components/analytics/QueryBuilder";
import QueryResultsTable from "@/components/analytics/QueryResultsTable";
import NaturalLanguageQuery from "@/components/analytics/NaturalLanguageQuery";
import LiveAIThinking from "@/components/analytics/LiveAIThinking";
import {
  fetchUbidDetail,
  fetchUbidEvents,
  runAnalyticsQuery,
  type UbidDetail,
  type ActivityEvent,
  type QueryPayload,
  type QueryResult,
} from "@/lib/api";

/* ─── Skeleton ──────────────────────────────────────────────────────── */
function AnalyticsSkeleton() {
  const pulse = "animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800";
  return (
    <div className="space-y-6">
      <div className={`${pulse} h-12 w-full rounded-xl`} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className={`${pulse} h-44 rounded-xl`} />
          <div className={`${pulse} h-52 rounded-xl`} />
        </div>
        <div className="space-y-4">
          <div className={`${pulse} h-80 rounded-xl`} />
        </div>
      </div>
      <div className={`${pulse} h-40 rounded-xl`} />
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [selectedUbid, setSelectedUbid] = useState<string | null>(null);
  const [detail, setDetail] = useState<UbidDetail | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [aiTrigger, setAiTrigger] = useState<string | null>(null);

  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);

  /* ── Load UBID Detail ─────────────────────────────────────────────── */
  const loadUbid = useCallback(async (ubid: string) => {
    setSelectedUbid(ubid);
    setLoadingDetail(true);
    setAiTrigger(`load-${ubid}-${Date.now()}`);
    try {
      const [d, e] = await Promise.all([
        fetchUbidDetail(ubid),
        fetchUbidEvents(ubid),
      ]);
      setDetail(d);
      setEvents(e);
    } catch (err) {
      console.error("Failed to load UBID detail:", err);
      setDetail(null);
      setEvents([]);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  /* ── Run Query ─────────────────────────────────────────────────────── */
  const handleQuery = useCallback(async (payload: QueryPayload) => {
    setQueryLoading(true);
    try {
      const res = await runAnalyticsQuery(payload);
      setQueryResults(res);
    } catch (err) {
      console.error("Query failed:", err);
      setQueryResults([]);
    } finally {
      setQueryLoading(false);
    }
  }, []);

  /* ── Handle NLQ results ────────────────────────────────────────────── */
  const handleNLQResults = useCallback((results: QueryResult[]) => {
    setQueryResults(results);
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ── Page header ────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white" style={{ letterSpacing: "-0.4px" }}>
          Analytics & Intelligence
        </h1>
        <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
          Ask questions in plain English, explore timelines, and query across departments
        </p>
      </div>

      {/* ── SECTION 0: Natural Language Query ──────────────────────── */}
      <NaturalLanguageQuery onResults={handleNLQResults} onSelectUbid={loadUbid} />

      {/* ── Divider ────────────────────────────────────────────────── */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gray-50 px-4 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:bg-gray-950">
            or search directly
          </span>
        </div>
      </div>

      {/* ── SECTION 1: Direct Search bar ───────────────────────────── */}
      <UbidSearchBar onSelect={loadUbid} />

      {/* ── Live AI Thinking panel ─────────────────────────────────── */}
      {aiTrigger && (
        <LiveAIThinking
          trigger={aiTrigger}
          mode="classification"
          shapValues={detail?.classification?.shap_values}
          confidence={detail?.classification?.confidence || detail?.confidence}
          status={detail?.classification?.status || detail?.status}
        />
      )}

      {/* ── SECTION 2+3: UBID Detail + Timeline + Classification ─── */}
      {loadingDetail && <AnalyticsSkeleton />}

      {!loadingDetail && detail && (
        <DetailErrorBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Detail + Classification */}
            <div className="lg:col-span-2 space-y-6">
              <UbidDetailCard detail={detail} />
              <ClassificationCard
                status={detail.classification?.status || detail.status || "active"}
                confidence={detail.classification?.confidence ?? detail.confidence ?? 0}
                shapValues={detail.classification?.shap_values}
              />
            </div>
            {/* Right: Timeline */}
            <div>
              <EventTimeline events={events} />
            </div>
          </div>
        </DetailErrorBoundary>
      )}

      {!loadingDetail && !detail && selectedUbid && (
        <div className="rounded-xl bg-white p-8 text-center
          shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px]
          dark:bg-gray-900 dark:border dark:border-gray-800">
          <p className="text-sm text-gray-500">No UBID found for &ldquo;{selectedUbid}&rdquo;</p>
        </div>
      )}

      {/* ── Divider ────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 dark:border-gray-800" />

      {/* ── SECTION 4: Query Builder (advanced) ────────────────────── */}
      <details className="group">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">
            <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Advanced Query Builder
            <span className="text-[11px] text-gray-400">(structured filters)</span>
          </div>
        </summary>
        <div className="mt-4 space-y-4">
          <QueryBuilder onQuery={handleQuery} loading={queryLoading} />
        </div>
      </details>

      <QueryResultsTable results={queryResults} onSelectUbid={loadUbid} />
    </div>
  );
}
