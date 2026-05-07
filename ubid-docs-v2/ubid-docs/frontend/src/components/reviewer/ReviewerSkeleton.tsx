"use client";
import React from "react";

/**
 * Full-page skeleton matching the reviewer 60/40 layout.
 * Shown while case data is loading.
 */
export default function ReviewerSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Queue status bar skeleton */}
      <div
        className="flex items-center justify-between rounded-xl bg-white p-4
          shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px]
          dark:bg-gray-900 dark:border dark:border-gray-800"
      >
        <div className="h-8 w-48 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-8 w-64 rounded-lg bg-gray-100 dark:bg-gray-800" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        {/* LEFT — Record comparison skeleton */}
        <div
          className="rounded-xl bg-white
            shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px]
            dark:bg-gray-900 dark:border dark:border-gray-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
            <div className="h-5 w-40 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-6 w-36 rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800">
            <div className="px-5 py-2.5 bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="px-5 py-2.5 bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>

          {/* 8 field rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100 dark:divide-gray-800 dark:border-gray-800"
            >
              <div className="px-5 py-3 space-y-1.5">
                <div className="h-2.5 w-20 rounded bg-gray-100 dark:bg-gray-800" />
                <div
                  className="h-4 rounded bg-gray-100 dark:bg-gray-800"
                  style={{ width: `${55 + (i % 3) * 15}%` }}
                />
              </div>
              <div className="px-5 py-3 space-y-1.5">
                <div className="h-2.5 w-20 rounded bg-gray-100 dark:bg-gray-800" />
                <div
                  className="h-4 rounded bg-gray-100 dark:bg-gray-800"
                  style={{ width: `${50 + (i % 4) * 12}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT — SHAP chart skeleton */}
        <div
          className="rounded-xl bg-white
            shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px]
            dark:bg-gray-900 dark:border dark:border-gray-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
            <div className="h-5 w-36 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="flex gap-3">
              <div className="h-4 w-14 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-4 w-18 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>

          {/* 9 horizontal bar skeletons */}
          <div className="space-y-3 px-5 py-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3.5 w-24 shrink-0 rounded bg-gray-100 dark:bg-gray-800" />
                <div
                  className="h-5 rounded bg-gray-100 dark:bg-gray-800"
                  style={{ width: `${30 + (i % 5) * 14}%` }}
                />
              </div>
            ))}
          </div>

          {/* Explanation skeleton */}
          <div className="border-t border-gray-100 px-5 py-4 space-y-2 dark:border-gray-800">
            <div className="h-2.5 w-20 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-full rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </div>

      {/* Action bar skeleton */}
      <div
        className="flex gap-3 rounded-xl bg-white p-5
          shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px]
          dark:bg-gray-900 dark:border dark:border-gray-800"
      >
        <div className="h-10 w-36 rounded-lg bg-emerald-100 dark:bg-emerald-900/30" />
        <div className="h-10 w-24 rounded-lg bg-red-100 dark:bg-red-900/30" />
        <div className="h-10 w-24 rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="h-10 w-28 rounded-lg bg-orange-100 dark:bg-orange-900/30" />
      </div>
    </div>
  );
}
