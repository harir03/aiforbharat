"use client";
import React, { useState } from "react";
import type { ReviewAction } from "@/lib/api";

interface ActionBarProps {
  onAction: (action: ReviewAction, reason?: string) => void;
  isSubmitting: boolean;
}

const ACTIONS: {
  action: ReviewAction;
  label: string;
  icon: React.ReactNode;
  className: string;
  needsReason: boolean;
}[] = [
  {
    action: "approve",
    label: "Approve Merge",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 12 2 2 4-4" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
    className:
      "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 active:bg-emerald-800",
    needsReason: false,
  },
  {
    action: "reject",
    label: "Reject",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
      </svg>
    ),
    className:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800",
    needsReason: true,
  },
  {
    action: "defer",
    label: "Defer",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    className:
      "bg-gray-500 text-white hover:bg-gray-600 focus:ring-gray-400 active:bg-gray-700",
    needsReason: false,
  },
  {
    action: "escalate",
    label: "Escalate",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    className:
      "bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-400 active:bg-orange-700",
    needsReason: true,
  },
];

export default function ActionBar({ onAction, isSubmitting }: ActionBarProps) {
  const [activeAction, setActiveAction] = useState<ReviewAction | null>(null);
  const [reason, setReason] = useState("");

  const handleClick = (action: ReviewAction, needsReason: boolean) => {
    if (needsReason) {
      // Toggle the reason input for this action
      if (activeAction === action) {
        setActiveAction(null);
        setReason("");
      } else {
        setActiveAction(action);
        setReason("");
      }
    } else {
      onAction(action);
    }
  };

  const handleSubmitWithReason = () => {
    if (!activeAction || !reason.trim()) return;
    onAction(activeAction, reason.trim());
    setActiveAction(null);
    setReason("");
  };

  return (
    <div
      className="rounded-xl bg-white
        shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
        dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800"
    >
      {/* Action buttons row */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        {ACTIONS.map(({ action, label, icon, className, needsReason }) => (
          <button
            key={action}
            onClick={() => handleClick(action, needsReason)}
            disabled={isSubmitting}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
              shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px]
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-offset-2
              active:scale-[0.97]
              disabled:cursor-not-allowed disabled:opacity-50
              dark:focus:ring-offset-gray-900
              ${className}
              ${activeAction === action ? "ring-2 ring-offset-2" : ""}`}
          >
            {isSubmitting && activeAction === action ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              icon
            )}
            {label}
          </button>
        ))}
      </div>

      {/* Reason input (shown for Reject and Escalate) */}
      {activeAction && (
        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <label
            htmlFor="review-reason"
            className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300"
          >
            Reason for{" "}
            <span className="capitalize">{activeAction}</span>{" "}
            <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            <input
              id="review-reason"
              type="text"
              placeholder={`Enter reason for ${activeAction}...`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitWithReason();
              }}
              autoFocus
              className="h-11 flex-1 rounded-lg bg-gray-50 px-4 text-sm text-gray-900
                shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] outline-none
                transition-shadow duration-150
                placeholder:text-gray-400
                focus:bg-white focus:shadow-[0px_0px_0px_2px_#2E6D7A]
                dark:bg-gray-800 dark:text-white
                dark:shadow-[rgba(255,255,255,0.06)_0px_0px_0px_1px]
                dark:placeholder:text-gray-500
                dark:focus:bg-gray-800 dark:focus:shadow-[0px_0px_0px_2px_#2E6D7A]"
            />
            <button
              onClick={handleSubmitWithReason}
              disabled={!reason.trim() || isSubmitting}
              className="h-11 rounded-lg bg-[#1E4D58] px-5 text-sm font-medium text-white
                shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px]
                transition-all duration-150
                hover:bg-[#2E6D7A]
                focus:outline-none focus:ring-2 focus:ring-[#2E6D7A] focus:ring-offset-2
                active:scale-[0.98]
                disabled:cursor-not-allowed disabled:opacity-50
                dark:focus:ring-offset-gray-900"
            >
              Confirm
            </button>
            <button
              onClick={() => {
                setActiveAction(null);
                setReason("");
              }}
              className="h-11 rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600
                transition-all duration-150
                hover:bg-gray-200
                dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
