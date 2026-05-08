"use client";
import React from "react";
import type { ActivityEvent } from "@/lib/api";

interface EventTimelineProps {
  events: ActivityEvent[];
}

const DEPT_DOT_COLORS: Record<string, string> = {
  factories:  "bg-blue-500",
  kspcb:      "bg-emerald-500",
  labour:     "bg-orange-500",
  shop_est:   "bg-purple-500",
  bescom:     "bg-yellow-500",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatEventType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function EventTimeline({ events }: EventTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6
        shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
        dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Activity Timeline</h3>
        <div className="flex flex-col items-center justify-center py-8">
          <svg className="h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-400">No events found</p>
        </div>
      </div>
    );
  }

  const sorted = [...events].sort(
    (a, b) => new Date(b.event_ts).getTime() - new Date(a.event_ts).getTime()
  ).slice(0, 12);

  return (
    <div className="rounded-xl bg-white p-6
      shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
      dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        Activity Timeline
        <span className="ml-2 text-[11px] font-normal text-gray-400">
          Last {sorted.length} events
        </span>
      </h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700" />

        <div className="space-y-0">
          {sorted.map((evt, i) => {
            const dotColor = DEPT_DOT_COLORS[evt.department] || "bg-gray-400";
            return (
              <div key={evt.event_id || i} className="group relative flex gap-4 py-2.5">
                {/* Dot */}
                <div className="relative z-10 flex-shrink-0">
                  <span className={`block h-[18px] w-[18px] rounded-full border-2 border-white dark:border-gray-900 ${dotColor}
                    transition-transform duration-150 group-hover:scale-125`} />
                </div>
                {/* Content */}
                <div className="min-w-0 flex-1 -mt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {evt.department.replace("_", " & ")}
                    </span>
                    <span className="text-[10px] text-gray-300 dark:text-gray-600">•</span>
                    <span className="text-[11px] text-gray-400 tabular-nums">
                      {formatDate(evt.event_ts)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                    {formatEventType(evt.event_type)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
