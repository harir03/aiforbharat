"use client";

import React, { useEffect, useState, useCallback } from "react";
import QueueStatusBar from "@/components/reviewer/QueueStatusBar";
import RecordComparison from "@/components/reviewer/RecordComparison";
import ShapChart from "@/components/reviewer/ShapChart";
import ActionBar from "@/components/reviewer/ActionBar";
import ReviewerSkeleton from "@/components/reviewer/ReviewerSkeleton";
import SimilarCasesPanel from "@/components/reviewer/SimilarCasesPanel";
import { useToastCtx } from "@/context/ToastContext";
import {
  fetchReviewerQueue,
  fetchReviewCase,
  submitReviewAction,
} from "@/lib/api";
import type {
  QueueResponse,
  QueueItem,
  ReviewCase,
  ReviewAction,
} from "@/lib/api";

export default function ReviewerPage() {
  // ─── State ──────────────────────────────────────────────────────
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [activeCase, setActiveCase] = useState<ReviewCase | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isLoadingCase, setIsLoadingCase] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToastCtx();

  // ─── Fetch queue ────────────────────────────────────────────────
  const loadQueue = useCallback(async () => {
    setIsLoadingQueue(true);
    setError(null);
    try {
      const data = await fetchReviewerQueue(1, 20);
      const staleCount = data.stale_count ?? data.items?.filter((i: { age_hours: number }) => i.age_hours > 72).length ?? 0;
      setQueue({ ...data, stale_count: staleCount, has_stale: staleCount > 0 });
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
      return null;
    } finally {
      setIsLoadingQueue(false);
    }
  }, []);

  // ─── Fetch case detail ──────────────────────────────────────────
  const loadCase = useCallback(async (caseId: string) => {
    setActiveCaseId(caseId);
    setIsLoadingCase(true);
    setError(null);
    try {
      const data = await fetchReviewCase(caseId);
      setActiveCase(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load case");
      setActiveCase(null);
    } finally {
      setIsLoadingCase(false);
    }
  }, []);

  // ─── Mount: load queue → load first case ────────────────────────
  useEffect(() => {
    (async () => {
      const data = await loadQueue();
      if (data && data.items.length > 0) {
        await loadCase(data.items[0].case_id);
      }
    })();
  }, [loadQueue, loadCase]);

  // ─── Handle reviewer action ─────────────────────────────────────
  const handleAction = useCallback(
    async (action: ReviewAction, reason?: string) => {
      if (!activeCase) return;

      setIsSubmitting(true);
      setError(null);
      try {
        await submitReviewAction(activeCase.case_id, { action, reason });

        const messages: Record<string, [string, "success" | "error" | "neutral"]> = {
          approve: [`Case approved — UBID assigned`, "success"],
          reject: ["Case rejected and logged", "error"],
          defer: ["Case returned to queue", "neutral"],
          escalate: ["Case escalated to senior reviewer", "neutral"],
        };
        const [msg, variant] = messages[action] || ["Action completed", "neutral"];
        toast(msg, variant);

        // Re-fetch queue and load next case
        const updatedQueue = await loadQueue();
        if (updatedQueue && updatedQueue.items.length > 0) {
          await loadCase(updatedQueue.items[0].case_id);
        } else {
          setActiveCase(null);
          setActiveCaseId(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeCase, loadQueue, loadCase, toast]
  );

  // ─── Loading state ──────────────────────────────────────────────
  const isLoading = isLoadingQueue;
  const isQueueEmpty = queue !== null && queue.total === 0 && !isLoading;

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold text-gray-900 dark:text-white"
          style={{ letterSpacing: "-0.96px" }}
        >
          Reviewer Queue
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review and resolve potential UBID merge candidates
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:bg-red-900/20 dark:text-red-300">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && <ReviewerSkeleton />}

      {/* Empty state */}
      {isQueueEmpty && (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white py-20
          shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
          dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white" style={{ letterSpacing: "-0.32px" }}>
            All cases reviewed
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            The reviewer queue is empty. New cases will appear as they are detected.
          </p>
        </div>
      )}

      {/* Main reviewer content */}
      {!isLoading && queue && queue.items.length > 0 && (
        <div className="space-y-6">
          {/* Queue status bar */}
          <QueueStatusBar total={queue.total} hasStale={queue.has_stale} staleCount={queue.stale_count} />

          {/* ── Clickable Case List ────────────────────────────────── */}
          <div className="rounded-xl bg-white overflow-hidden
            shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
            dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Select a case to review
              </p>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800/50 max-h-[240px] overflow-y-auto">
              {queue.items.map((item: QueueItem) => {
                const isActive = activeCaseId === item.case_id;
                const isStale = item.age_hours > 72;
                return (
                  <button
                    key={item.case_id}
                    onClick={() => loadCase(item.case_id)}
                    className={`flex w-full items-center gap-4 px-5 py-3 text-left transition-all duration-150
                      ${isActive
                        ? "bg-[#2E6D7A]/5 border-l-[3px] border-l-[#2E6D7A] dark:bg-[#2E6D7A]/10"
                        : "border-l-[3px] border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      }`}
                  >
                    {/* Confidence circle */}
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                      <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="2.5" className="dark:stroke-gray-700" />
                        <circle
                          cx="18" cy="18" r="15.5" fill="none"
                          stroke={item.confidence >= 0.8 ? "#059669" : item.confidence >= 0.6 ? "#d97706" : "#ef4444"}
                          strokeWidth="2.5"
                          strokeDasharray={`${item.confidence * 97.4} 97.4`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-[10px] font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                        {Math.round(item.confidence * 100)}
                      </span>
                    </div>

                    {/* Case info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.name_a}
                        </p>
                        <span className="text-gray-300 dark:text-gray-600">↔</span>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.name_b}
                        </p>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400">
                        <span className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 font-medium text-gray-500 dark:text-gray-400">
                          {item.department_a}
                        </span>
                        <span>vs</span>
                        <span className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 font-medium text-gray-500 dark:text-gray-400">
                          {item.department_b}
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className={isStale ? "text-red-500 font-medium" : ""}>
                          {item.age_hours < 1
                            ? "just now"
                            : item.age_hours < 24
                              ? `${Math.round(item.age_hours)}h ago`
                              : `${Math.round(item.age_hours / 24)}d ago`}
                        </span>
                        {isStale && (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            STALE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Active indicator */}
                    {isActive && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2E6D7A] text-white shrink-0">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Case Detail ────────────────────────────────────────── */}
          {isLoadingCase && <ReviewerSkeleton />}

          {!isLoadingCase && activeCase && (
            <>
              {/* Three-column layout: comparison / SHAP / similar cases */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[9fr_7fr_4fr]">
                <RecordComparison
                  recordA={activeCase.record_a}
                  recordB={activeCase.record_b}
                  confidence={activeCase.confidence}
                />
                <ShapChart
                  features={activeCase.shap_values}
                  explanation={activeCase.explanation}
                />
                <SimilarCasesPanel />
              </div>

              {/* Action buttons */}
              <ActionBar
                onAction={handleAction}
                isSubmitting={isSubmitting}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
