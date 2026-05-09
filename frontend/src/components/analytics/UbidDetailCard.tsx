"use client";
import React from "react";
import StatusBadge from "@/components/ubid/StatusBadge";
import type { UbidDetail } from "@/lib/api";

interface UbidDetailCardProps {
  detail: UbidDetail;
}

const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
  factories:  { bg: "bg-blue-100",   text: "text-blue-700" },
  kspcb:      { bg: "bg-emerald-100", text: "text-emerald-700" },
  labour:     { bg: "bg-orange-100", text: "text-orange-700" },
  shop_est:   { bg: "bg-purple-100", text: "text-purple-700" },
};

const ANCHOR_LABELS: Record<string, { label: string; color: string }> = {
  PAN:   { label: "PAN-Anchored",   color: "bg-[#D4EEF2] text-[#1E4D58]" },
  GSTIN: { label: "GSTIN-Anchored", color: "bg-blue-100 text-blue-700" },
  INT:   { label: "Internal ID",    color: "bg-gray-100 text-gray-600" },
};

export default function UbidDetailCard({ detail }: UbidDetailCardProps) {
  const anchor = ANCHOR_LABELS[detail.anchor_type] || ANCHOR_LABELS.INT;
  const departments = Array.isArray(detail.departments) ? detail.departments : [];
  const confidence = typeof detail.confidence === "number" ? detail.confidence : 0;
  const linkedRecords = Array.isArray(detail.linked_records) ? detail.linked_records : [];

  return (
    <div className="rounded-xl bg-white p-6
      shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
      dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800">

      {/* Header: UBID + badges */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-1">
            Unified Business Identifier
          </p>
          <h2 className="font-mono text-2xl font-bold text-[#2E6D7A] tracking-wide">
            {detail.ubid}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${anchor.color}`}>
            {anchor.label}
          </span>
          <StatusBadge status={detail.status} />
        </div>
      </div>

      {/* Linked departments */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-2">
          Linked Departments
        </p>
        <div className="flex flex-wrap gap-2">
          {departments.map((dept) => {
            const color = DEPT_COLORS[dept] || { bg: "bg-gray-100", text: "text-gray-600" };
            return (
              <span
                key={dept}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ${color.bg} ${color.text}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                {String(dept).replace("_", " & ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
            );
          })}
          {departments.length === 0 && (
            <span className="text-[12px] text-gray-400 italic">No departments linked</span>
          )}
        </div>
      </div>

      {/* Confidence + record count */}
      <div className="mt-5 flex gap-6 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div>
          <p className="text-[11px] text-gray-400">Confidence</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
            {(confidence * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400">Linked Records</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
            {linkedRecords.length}
          </p>
        </div>
      </div>
    </div>
  );
}
