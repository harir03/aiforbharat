"use client";
import React from "react";

type StatusVariant = "active" | "dormant" | "closed" | "pending";

const variantStyles: Record<
  StatusVariant,
  { bg: string; text: string; label: string; dot: string }
> = {
  active: {
    bg: "bg-[#D1FAE5]",
    text: "text-[#065F46]",
    label: "Active",
    dot: "bg-emerald-500",
  },
  dormant: {
    bg: "bg-[#FEF3C7]",
    text: "text-[#92400E]",
    label: "Dormant",
    dot: "bg-amber-500",
  },
  closed: {
    bg: "bg-[#FEE2E2]",
    text: "text-[#991B1B]",
    label: "Closed",
    dot: "bg-red-500",
  },
  pending: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: "Pending",
    dot: "bg-gray-400",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const key = status.toLowerCase() as StatusVariant;
  const style = variantStyles[key] || variantStyles.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${style.bg} ${style.text} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot} ${
          key === "active" ? "animate-pulse" : ""
        }`}
      />
      {style.label}
    </span>
  );
}
