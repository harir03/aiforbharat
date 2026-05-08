"use client";
import React, { useState } from "react";
import { MOCK_SIMILAR_CASES } from "@/lib/mockData";

export default function SimilarCasesPanel() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div
      className="rounded-xl bg-white overflow-hidden
        shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
        dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white">Similar Past Cases</h3>
        </div>
      </div>

      {/* Cases */}
      <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
        {MOCK_SIMILAR_CASES.map((c) => (
          <div
            key={c.id}
            className="relative px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
            onMouseEnter={() => setHoveredId(c.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Names */}
            <div className="flex items-center gap-1.5 text-[12px] text-gray-700 dark:text-gray-300 mb-1.5">
              <span className="truncate max-w-[90px] font-medium">{c.record_a_name}</span>
              <span className="text-gray-400 text-[10px]">vs</span>
              <span className="truncate max-w-[90px] font-medium">{c.record_b_name}</span>
            </div>

            {/* Decision + confidence */}
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  c.decision === "approved"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                }`}
              >
                <span className={`h-1 w-1 rounded-full ${c.decision === "approved" ? "bg-emerald-500" : "bg-red-500"}`} />
                {c.decision === "approved" ? "Approved" : "Rejected"}
              </span>
              <span className="text-[11px] text-gray-400 tabular-nums">{Math.round(c.confidence * 100)}%</span>
            </div>

            {/* Metadata */}
            <p className="text-[11px] text-gray-400">{c.age} by {c.reviewer}</p>

            {/* Tooltip on hover */}
            {hoveredId === c.id && (
              <div className="absolute left-2 right-2 -top-1 -translate-y-full z-10 rounded-lg bg-gray-900 p-3 text-[11px] text-white shadow-lg">
                <p className="font-medium mb-0.5">Key matching reason:</p>
                <p className="text-gray-300">{c.reason}</p>
                <div className="absolute left-4 bottom-0 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
        <p className="text-[10px] text-gray-400 italic">
          These decisions influenced the current confidence score
        </p>
      </div>
    </div>
  );
}
