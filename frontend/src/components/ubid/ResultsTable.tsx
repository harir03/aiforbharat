"use client";
import React from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import type { SearchResult } from "@/lib/api";

interface ResultsTableProps {
  results: SearchResult[] | null;
  isLoading: boolean;
}

const deptColors: Record<string, { bg: string; text: string; dot: string }> = {
  shop_est: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  factories: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  labour: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  kspcb: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
};

function DepartmentBadge({ dept }: { dept: string }) {
  const style = deptColors[dept] || { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" };
  const label = dept.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.bg} ${style.text} dark:bg-opacity-20`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4"><div className="h-4 w-24 rounded-md bg-gray-100 dark:bg-gray-800" /></td>
      <td className="px-5 py-4"><div className="h-4 w-32 rounded-md bg-gray-100 dark:bg-gray-800" /></td>
      <td className="px-5 py-4"><div className="flex gap-1"><div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-gray-800" /><div className="h-5 w-14 rounded-full bg-gray-100 dark:bg-gray-800" /></div></td>
      <td className="px-5 py-4"><div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-gray-800" /></td>
      <td className="px-5 py-4"><div className="h-3 w-20 rounded-full bg-gray-100 dark:bg-gray-800" /></td>
      <td className="px-5 py-4"><div className="h-4 w-12 rounded-md bg-gray-100 dark:bg-gray-800" /></td>
    </tr>
  );
}

export default function ResultsTable({ results, isLoading }: ResultsTableProps) {
  if (results === null && !isLoading) return null;

  return (
    <div
      className="overflow-hidden rounded-xl bg-white
        shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
        dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800"
    >
      {/* Table header bar */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <h3
          className="text-sm font-semibold text-gray-900 dark:text-white"
          style={{ letterSpacing: "-0.16px" }}
        >
          Search Results
        </h3>
        {results && results.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {results.length} {results.length === 1 ? "result" : "results"}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-white/[0.02]">
              <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                UBID
              </th>
              <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Business Name
              </th>
              <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Departments
              </th>
              <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Confidence
              </th>
              <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : results && results.length > 0 ? (
              results.map((item) => (
                <tr
                  key={item.ubid}
                  className="group transition-colors duration-100 hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
                >
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-[13px] font-medium text-[#1E4D58] dark:text-brand-300">
                    {item.ubid}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">
                    {item.name}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.departments.map((dept) => (
                        <DepartmentBadge key={dept} dept={dept} />
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-[#2E6D7A] transition-all duration-500 ease-out"
                          style={{ width: `${Math.round(item.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-medium text-gray-500 tabular-nums dark:text-gray-400">
                        {(item.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/analytics?ubid=${item.ubid}`}
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-[#2E6D7A] transition-all duration-150 hover:text-[#1E4D58] group-hover:gap-1.5 dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      View
                      <svg
                        className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <svg
                        className="h-6 w-6 text-gray-400 dark:text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        No results found
                      </p>
                      <p className="mt-0.5 text-[13px] text-gray-400 dark:text-gray-500">
                        Try a different search term or PIN code
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
