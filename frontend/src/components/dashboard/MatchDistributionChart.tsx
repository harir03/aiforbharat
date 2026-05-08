"use client";
import React from "react";
import { MOCK_MATCH_DISTRIBUTION, MOCK_PIPELINE } from "@/lib/mockData";

export default function MatchDistributionChart() {
  const total = MOCK_PIPELINE.records_processed;

  return (
    <div
      className="rounded-xl bg-white p-5
        shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
        dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800"
    >
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
        Match Distribution — Last Pipeline Run
      </h3>
      <p className="text-[11px] text-gray-400 mb-5">
        {total} records processed across 4 departments
      </p>

      <div className="space-y-3">
        {MOCK_MATCH_DISTRIBUTION.map((item) => {
          const count = Math.round((item.value / 100) * total);
          return (
            <div key={item.label} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-gray-600 dark:text-gray-400">{item.label}</span>
                <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                  {item.value}%
                  <span className="ml-1.5 text-[11px] font-normal text-gray-400">({count})</span>
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${item.value}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
