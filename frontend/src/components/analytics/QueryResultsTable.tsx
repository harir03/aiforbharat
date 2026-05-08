"use client";
import React, { useState } from "react";
import StatusBadge from "@/components/ubid/StatusBadge";
import type { QueryResult } from "@/lib/api";

interface QueryResultsTableProps {
  results: QueryResult[];
  onSelectUbid: (ubid: string) => void;
}

export default function QueryResultsTable({ results, onSelectUbid }: QueryResultsTableProps) {
  const [page, setPage] = useState(0);
  const perPage = 10;
  const totalPages = Math.ceil(results.length / perPage);
  const paged = results.slice(page * perPage, (page + 1) * perPage);

  if (results.length === 0) return null;

  return (
    <div className="rounded-xl bg-white overflow-hidden
      shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
      dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800">

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Query Results
          </h3>
          <span className="rounded-full bg-[#D4EEF2] px-3 py-1 text-[11px] font-semibold text-[#1E4D58]">
            {results.length} businesses found
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">UBID</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Business Name</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Department</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">PIN</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Last Event</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r, i) => (
              <tr
                key={`${r.ubid}-${i}`}
                onClick={() => onSelectUbid(r.ubid)}
                className="border-b border-gray-50 dark:border-gray-800/50 cursor-pointer
                  transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-6 py-3.5">
                  <span className="font-mono text-[12px] font-medium text-[#2E6D7A]">{r.ubid}</span>
                </td>
                <td className="px-6 py-3.5 text-sm text-gray-700 dark:text-gray-300">{r.name}</td>
                <td className="px-6 py-3.5">
                  <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-400">
                    {r.department?.replace("_", " & ") || "—"}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-sm text-gray-500 tabular-nums">{r.pin_code || "—"}</td>
                <td className="px-6 py-3.5">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-6 py-3.5 text-sm text-gray-500 tabular-nums">
                  {r.last_event_days != null ? `${r.last_event_days}d ago` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[11px] text-gray-400">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-gray-500
                hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed
                transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-gray-500
                hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed
                transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
