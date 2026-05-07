"use client";
import React from "react";
import type { RecordFields } from "@/lib/api";

interface RecordComparisonProps {
  recordA: RecordFields;
  recordB: RecordFields;
  confidence: number;
}

/** Field labels and their keys in RecordFields */
const FIELD_CONFIG: { key: keyof RecordFields; label: string }[] = [
  { key: "name_raw", label: "Name (Raw)" },
  { key: "name_normalised", label: "Name (Normalised)" },
  { key: "address", label: "Address" },
  { key: "pin", label: "PIN Code" },
  { key: "pan", label: "PAN" },
  { key: "gstin", label: "GSTIN" },
  { key: "phone", label: "Phone" },
  { key: "department", label: "Department" },
];

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  let colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (pct < 70) colorClass = "bg-red-50 text-red-700 border-red-200";
  else if (pct < 85) colorClass = "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tabular-nums ${colorClass}`}
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      {pct}% match confidence
    </span>
  );
}

export default function RecordComparison({
  recordA,
  recordB,
  confidence,
}: RecordComparisonProps) {
  return (
    <div
      className="rounded-xl bg-white
        shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
        dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
        <h3
          className="text-sm font-semibold text-gray-900 dark:text-white"
          style={{ letterSpacing: "-0.16px" }}
        >
          Record Comparison
        </h3>
        <ConfidenceBadge value={confidence} />
      </div>

      {/* Two-column comparison */}
      <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800">
        {/* Column headers */}
        <div className="px-5 py-2.5 bg-gray-50/50 dark:bg-white/[0.02]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Record A
          </span>
        </div>
        <div className="px-5 py-2.5 bg-gray-50/50 dark:bg-white/[0.02]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Record B
          </span>
        </div>
      </div>

      {/* Field rows */}
      {FIELD_CONFIG.map(({ key, label }) => {
        const valA = recordA[key] || "—";
        const valB = recordB[key] || "—";
        const differs = valA !== valB;

        return (
          <div
            key={key}
            className={`grid grid-cols-2 divide-x border-t ${
              differs
                ? "divide-amber-200 border-amber-200 bg-amber-50/60 dark:divide-amber-800/30 dark:border-amber-800/30 dark:bg-amber-900/10"
                : "divide-gray-100 border-gray-100 dark:divide-gray-800 dark:border-gray-800"
            }`}
          >
            <div className="px-5 py-3">
              <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {label}
              </p>
              <p
                className={`text-sm ${
                  differs
                    ? "font-medium text-amber-900 dark:text-amber-200"
                    : "text-gray-700 dark:text-gray-300"
                } ${key === "pan" || key === "gstin" || key === "pin" ? "font-mono" : ""}`}
              >
                {valA}
              </p>
            </div>
            <div className="px-5 py-3">
              <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {label}
              </p>
              <p
                className={`text-sm ${
                  differs
                    ? "font-medium text-amber-900 dark:text-amber-200"
                    : "text-gray-700 dark:text-gray-300"
                } ${key === "pan" || key === "gstin" || key === "pin" ? "font-mono" : ""}`}
              >
                {valB}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
