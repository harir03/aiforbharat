"use client";
import React, { createContext, useContext } from "react";
import { useToast, type ToastVariant } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/Toast";

interface ToastCtx {
  toast: (message: string, variant?: ToastVariant) => string;
}

const Ctx = createContext<ToastCtx>({ toast: () => "" });

export const useToastCtx = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, toast, dismiss } = useToast();
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </Ctx.Provider>
  );
}
