"use client";
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { ShapFeature } from "@/lib/api";

interface ShapChartProps {
  features: ShapFeature[];
  explanation: string;
}

/**
 * Horizontal SHAP bar chart.
 * Green bars = drives match (positive SHAP), Red bars = drives separation (negative SHAP)
 */
export default function ShapChart({ features, explanation }: ShapChartProps) {
  // Sort by absolute value descending so most impactful features are at the top
  const sorted = [...features].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

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
          Feature Impact (SHAP)
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Match</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Separation</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-5 py-4">
        <ResponsiveContainer width="100%" height={Math.max(sorted.length * 36, 160)}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.06)"
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#98a2b3" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="feature"
              type="category"
              width={110}
              tick={{ fontSize: 12, fill: "#475467", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "none",
                boxShadow:
                  "rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.06) 0px 4px 12px",
                borderRadius: "8px",
                fontSize: "13px",
                padding: "8px 12px",
              }}
              formatter={(value) => {
                const v = Number(value);
                return [
                  v > 0
                    ? `+${v.toFixed(3)} (drives match)`
                    : `${v.toFixed(3)} (drives separation)`,
                  "SHAP",
                ];
              }}
              cursor={{ fill: "rgba(0,0,0,0.02)" }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
              {sorted.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.value >= 0 ? "#059669" : "#DC2626"}
                  opacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Explanation */}
      <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Explanation
        </h4>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {explanation}
        </p>
      </div>
    </div>
  );
}
