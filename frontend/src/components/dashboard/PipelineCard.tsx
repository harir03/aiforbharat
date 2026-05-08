"use client";
import React, { useState, useCallback } from "react";
import { useToastCtx } from "@/context/ToastContext";
import { MOCK_PIPELINE } from "@/lib/mockData";

interface Props {
  onPipelineComplete?: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} minutes ago`;
  const h = Math.floor(m / 60);
  return `${h} hour${h > 1 ? "s" : ""} ago`;
}

export default function PipelineCard({ onPipelineComplete }: Props) {
  const [status, setStatus] = useState<"idle" | "running">("idle");
  const [progress, setProgress] = useState(0);
  const [lastRun, setLastRun] = useState(MOCK_PIPELINE.last_run);
  const { toast } = useToastCtx();

  const handleRun = useCallback(async () => {
    setStatus("running");
    setProgress(0);

    // Animate progress bar over 3s
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 150));
      setProgress(Math.round((i / steps) * 100));
    }

    setStatus("idle");
    setProgress(0);
    setLastRun(new Date().toISOString());
    toast(`Pipeline complete — ${MOCK_PIPELINE.ubids_total} UBIDs assigned`, "success");
    onPipelineComplete?.();
  }, [toast, onPipelineComplete]);

  return (
    <div
      className="rounded-xl bg-white p-5
        shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
        dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Resolution Pipeline</h3>
            <p className="text-[11px] text-gray-400">Entity resolution &amp; UBID assignment</p>
          </div>
        </div>

        {/* Status pill */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            status === "running"
              ? "bg-[#2E6D7A]/10 text-[#2E6D7A]"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {status === "running" && <span className="h-1.5 w-1.5 rounded-full bg-[#2E6D7A] animate-pulse" />}
          {status === "running" ? "Running" : "Idle"}
        </span>
      </div>

      {/* Progress bar (visible when running) */}
      {status === "running" && (
        <div className="mb-4 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2E6D7A] to-[#059669] transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-gray-500 dark:text-gray-400 mb-4">
        <span>Last run: <strong className="text-gray-700 dark:text-gray-300">{timeAgo(lastRun)}</strong></span>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span><strong className="text-gray-700 dark:text-gray-300">{MOCK_PIPELINE.ubids_total}</strong> UBIDs assigned</span>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span><strong className="text-gray-700 dark:text-gray-300">{MOCK_PIPELINE.records_processed}</strong> records processed</span>
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={status === "running"}
        className="inline-flex items-center gap-2 rounded-xl bg-[#2E6D7A] px-5 py-2.5 text-sm font-medium text-white
          shadow-[rgba(46,109,122,0.3)_0px_1px_2px]
          hover:bg-[#245A65] transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "running" ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Running...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
            </svg>
            Run Pipeline
          </>
        )}
      </button>
    </div>
  );
}
