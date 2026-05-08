"use client";
import React from "react";

interface ClassificationCardProps {
  status: string;
  confidence: number;
  shapValues?: Record<string, number>;
}

function shapToEnglish(key: string, value: number): string {
  const labels: Record<string, string> = {
    days_since_last_event: "Days since last activity",
    event_count_24m: "Events in past 24 months",
    licence_renewal_days: "Licence renewal recency",
    inspection_days: "Last inspection recency",
    compliance_days: "Compliance filing recency",
    closure_notice: "Closure notice present",
    renewal_count: "Renewal count",
    filing_count: "Filing submissions",
    cross_dept_activity: "Cross-department activity",
  };
  const label = labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const sign = value >= 0 ? "+" : "";
  return `${label} (${sign}${value.toFixed(2)})`;
}

const STATUS_CONFIG: Record<string, { gradient: string; label: string }> = {
  active:  { gradient: "from-emerald-500 to-emerald-600", label: "Active" },
  dormant: { gradient: "from-amber-500 to-amber-600", label: "Dormant" },
  closed:  { gradient: "from-red-500 to-red-600", label: "Closed" },
};

export default function ClassificationCard({ status, confidence, shapValues }: ClassificationCardProps) {
  const config = STATUS_CONFIG[status.toLowerCase()] || STATUS_CONFIG.active;
  const pct = Math.round(confidence * 100);
  const entries = shapValues ? Object.entries(shapValues).sort(([, a], [, b]) => Math.abs(b) - Math.abs(a)) : [];

  return (
    <div className="rounded-xl bg-white p-6
      shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
      dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800">

      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
        Why is this business{" "}
        <span className={`bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
          {config.label}
        </span>?
      </h3>
      <p className="text-[11px] text-gray-400 mb-4">Classification explanation</p>

      {/* Confidence bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] font-medium text-gray-500">Confidence</span>
          <span className="text-[12px] font-semibold text-gray-900 dark:text-white tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-700 ease-out`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {confidence < 0.65 && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Low confidence — classification may be uncertain
          </div>
        )}
      </div>

      {/* SHAP bullets */}
      {entries.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-2">
            Contributing Factors
          </p>
          {entries.slice(0, 6).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${value >= 0 ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-[13px] text-gray-600 dark:text-gray-300">
                {shapToEnglish(key, value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
