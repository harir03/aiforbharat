"use client";
import React from "react";
import type { Toast as ToastType, ToastVariant } from "@/hooks/useToast";

const VARIANT: Record<ToastVariant, { bg: string; icon: string }> = {
  success: { bg: "bg-emerald-600", icon: "✓" },
  error:   { bg: "bg-red-600",     icon: "✗" },
  info:    { bg: "bg-[#2E6D7A]",   icon: "ℹ" },
  neutral: { bg: "bg-gray-700",    icon: "—" },
};

interface Props {
  toasts: ToastType[];
  dismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, dismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const v = VARIANT[t.variant];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-white text-sm font-medium shadow-lg
              ${v.bg} animate-in slide-in-from-right duration-300`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[12px] font-bold">
              {v.icon}
            </span>
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-2 text-white/60 hover:text-white transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
