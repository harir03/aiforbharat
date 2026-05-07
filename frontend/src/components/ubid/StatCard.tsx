"use client";
import React, { useEffect, useState, useRef } from "react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconBgClass?: string;
  subtitle?: string;
  /** Optional trend indicator: e.g. "+12%" */
  trend?: string;
  /** Whether the trend is positive (green) or negative (red) */
  trendUp?: boolean;
}

/**
 * Animated count-up hook for number values.
 * Creates a smooth animation from 0 to the target value.
 */
function useCountUp(target: number, duration = 800): number {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return current;
}

export default function StatCard({
  title,
  value,
  icon,
  iconBgClass = "bg-[#2E6D7A]",
  subtitle,
  trend,
  trendUp,
}: StatCardProps) {
  const numericValue = typeof value === "number" ? value : null;
  const animatedValue = useCountUp(numericValue ?? 0, 900);

  return (
    <div
      className="group relative overflow-hidden rounded-xl bg-white p-5
        shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
        transition-all duration-200 ease-out
        hover:shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.06)_0px_4px_12px,#fafafa_0px_0px_0px_1px_inset]
        hover:-translate-y-0.5
        dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800
        dark:hover:border-gray-700"
    >
      {/* Subtle gradient accent at top */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#2E6D7A]/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBgClass} text-white transition-transform duration-200 group-hover:scale-[1.05]`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3
              className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums"
              style={{ letterSpacing: "-0.96px" }}
            >
              {numericValue !== null
                ? animatedValue.toLocaleString()
                : value}
            </h3>
            {trend && (
              <span
                className={`inline-flex items-center text-xs font-medium ${
                  trendUp
                    ? "text-emerald-600"
                    : "text-red-500"
                }`}
              >
                <svg
                  className={`mr-0.5 h-3 w-3 ${trendUp ? "" : "rotate-180"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 15l7-7 7 7"
                  />
                </svg>
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
