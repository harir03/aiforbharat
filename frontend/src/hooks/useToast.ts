"use client";
import { useState, useCallback, useRef } from "react";

export type ToastVariant = "success" | "error" | "info" | "neutral";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

let _counter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `toast-${++_counter}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
      const timer = setTimeout(() => dismiss(id), 3000);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss]
  );

  return { toasts, toast, dismiss };
}
