"use client";
import React, { useState } from "react";
import {
  MOCK_EVOLUTION_VERSIONS,
  MOCK_THRESHOLD_HISTORY,
  MOCK_LEARNING_EVENTS,
} from "@/lib/mockData";

/* ─── Sparkline (pure CSS, no Recharts) ──────────────────────────────── */
function ThresholdChart() {
  const pts = MOCK_THRESHOLD_HISTORY;
  const min = 0.80;
  const max = 0.92;
  const w = 100;
  const h = 40;
  const points = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((p.value - min) / (max - min)) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="relative">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-gray-400 tabular-nums w-8">
        <span>{max}</span>
        <span>{((max + min) / 2).toFixed(2)}</span>
        <span>{min}</span>
      </div>
      {/* Chart */}
      <div className="ml-10">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1={h * 0.5} x2={w} y2={h * 0.5} stroke="#e5e7eb" strokeWidth="0.3" />
          {/* Area fill */}
          <polygon
            points={`0,${h} ${points} ${w},${h}`}
            fill="url(#teal-grad)"
            opacity="0.15"
          />
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#2E6D7A"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Dots */}
          {pts.map((p, i) => {
            const x = (i / (pts.length - 1)) * w;
            const y = h - ((p.value - min) / (max - min)) * h;
            return <circle key={i} cx={x} cy={y} r="0.8" fill="#2E6D7A" />;
          })}
          <defs>
            <linearGradient id="teal-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2E6D7A" />
              <stop offset="100%" stopColor="#2E6D7A" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        {/* X-axis labels */}
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>{pts[0].date}</span>
          <span>{pts[Math.floor(pts.length / 2)].date}</span>
          <span>{pts[pts.length - 1].date}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function EvolutionPage() {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white" style={{ letterSpacing: "-0.4px" }}>
          Self-Evolution Log
        </h1>
        <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
          Track how the resolution model learns from reviewer decisions and improves over time
        </p>
      </div>

      {/* ── SECTION 1: Model Version History ─────────────────────────── */}
      <div
        className="rounded-xl bg-white overflow-hidden
          shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
          dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800"
      >
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Model Version History</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Precision has improved from {(MOCK_EVOLUTION_VERSIONS.at(-1)!.precision * 100).toFixed(1)}% to{" "}
            {(MOCK_EVOLUTION_VERSIONS[0].precision * 100).toFixed(1)}% across {MOCK_EVOLUTION_VERSIONS.length} versions
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {["Version", "Trained On", "Precision", "Recall", "F1 Score", "Trigger", "Status", "Deployed"].map(
                  (h) => (
                    <th key={h} className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {MOCK_EVOLUTION_VERSIONS.map((v) => (
                <tr
                  key={v.version}
                  className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white">{v.version}</td>
                  <td className="px-5 py-3 text-[12px] text-gray-500 tabular-nums">{v.trained_on}</td>
                  <td className="px-5 py-3 text-[12px] font-mono text-emerald-600 tabular-nums">{(v.precision * 100).toFixed(1)}%</td>
                  <td className="px-5 py-3 text-[12px] font-mono text-gray-600 tabular-nums">{(v.recall * 100).toFixed(1)}%</td>
                  <td className="px-5 py-3 text-[12px] font-mono text-gray-600 tabular-nums">{(v.f1 * 100).toFixed(1)}%</td>
                  <td className="px-5 py-3 text-[12px] text-gray-500">{v.trigger}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        v.status === "active"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${v.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                      {v.status === "active" ? "Active" : "Retired"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-gray-500 tabular-nums whitespace-nowrap">
                    {new Date(v.deployed_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION 2: Threshold History ──────────────────────────────── */}
      <div
        className="rounded-xl bg-white p-5
          shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
          dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800"
      >
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Auto-Link Threshold Over Time</h2>
        <p className="text-[11px] text-gray-400 mb-4">
          Threshold adjusts based on reviewer approval rates — currently at{" "}
          <strong className="text-[#2E6D7A]">{MOCK_THRESHOLD_HISTORY.at(-1)?.value}</strong>
        </p>
        <ThresholdChart />
      </div>

      {/* ── SECTION 3: Learning Events Feed ──────────────────────────── */}
      <div
        className="rounded-xl bg-white overflow-hidden
          shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
          dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800"
      >
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Learning Events</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">What the system learned from reviewer decisions</p>
        </div>

        <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
          {MOCK_LEARNING_EVENTS.map((ev) => (
            <div key={ev.id} className="flex gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-[16px]">
                {ev.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900 dark:text-white">{ev.title}</p>
                <p className="text-[12px] text-gray-500 mt-0.5">{ev.detail}</p>
              </div>
              <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">
                {new Date(ev.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
