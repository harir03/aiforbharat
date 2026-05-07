"use client";
import React from "react";

interface QueueStatusBarProps {
  total: number;
  hasStale: boolean;
  staleCount?: number;
}

export default function QueueStatusBar({
  total,
  hasStale,
  staleCount = 0,
}: QueueStatusBarProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl bg-white p-4
        shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
        dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800
        sm:flex-row sm:items-center sm:justify-between"
    >
      {/* Queue count pill */}
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#D4EEF2] px-3.5 py-1.5 text-[13px] font-semibold text-[#1E4D58] dark:bg-brand-500/20 dark:text-brand-300">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          </svg>
          <span className="tabular-nums">{total}</span>
          {total === 1 ? " case" : " cases"} in queue
        </span>

        <span className="text-sm text-gray-500 dark:text-gray-400">
          Reviewer Queue
        </span>
      </div>

      {/* Stale warning banner — shown only when hasStale is true */}
      {hasStale && staleCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-[rgba(0,0,0,0.04)_0px_0px_0px_1px] dark:bg-red-900/20 dark:text-red-300">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <span className="tabular-nums">{staleCount}</span>
          {staleCount === 1 ? " case has" : " cases have"} been waiting over 72
          hours
        </div>
      )}
    </div>
  );
}
