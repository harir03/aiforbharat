"use client";
import React, { useState, useEffect } from "react";

interface ThinkingStep {
  label: string;
  detail: string;
  icon: "search" | "match" | "score" | "classify" | "done";
  duration: number; // ms to show before completing
}

interface LiveAIThinkingProps {
  /** Trigger a new animation sequence */
  trigger: string | null;
  /** What kind of analysis */
  mode: "resolution" | "classification";
  /** Final values to display */
  shapValues?: Record<string, number>;
  confidence?: number;
  status?: string;
}

const RESOLUTION_STEPS: ThinkingStep[] = [
  { label: "Loading records", detail: "Fetching linked records from all departments", icon: "search", duration: 400 },
  { label: "Name normalisation", detail: "Stripping legal suffixes, expanding abbreviations", icon: "match", duration: 350 },
  { label: "Blocking", detail: "Generating candidate pairs via PIN + Metaphone keys", icon: "match", duration: 300 },
  { label: "Feature extraction", detail: "Computing 9 pairwise similarity features", icon: "score", duration: 500 },
  { label: "XGBoost scoring", detail: "Running binary classifier with Platt scaling", icon: "score", duration: 400 },
  { label: "SHAP analysis", detail: "Computing feature importance explanations", icon: "classify", duration: 450 },
  { label: "Decision ready", detail: "Match decision with full explainability", icon: "done", duration: 200 },
];

const CLASSIFICATION_STEPS: ThinkingStep[] = [
  { label: "Collecting events", detail: "Pulling activity events from 24-month window", icon: "search", duration: 400 },
  { label: "Feature engineering", detail: "Computing 9 temporal features per UBID", icon: "match", duration: 350 },
  { label: "Running classifier", detail: "XGBoost multi-class: Active / Dormant / Closed", icon: "score", duration: 500 },
  { label: "SHAP explanation", detail: "Generating natural language reasoning", icon: "classify", duration: 400 },
  { label: "Classification complete", detail: "Result with confidence and explanation", icon: "done", duration: 200 },
];

const ICONS: Record<string, React.ReactNode> = {
  search: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  match: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
    </svg>
  ),
  score: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  classify: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  done: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
};

export default function LiveAIThinking({ trigger, mode, shapValues, confidence, status }: LiveAIThinkingProps) {
  const [activeStep, setActiveStep] = useState(-1);
  const [isVisible, setIsVisible] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const steps = mode === "resolution" ? RESOLUTION_STEPS : CLASSIFICATION_STEPS;

  useEffect(() => {
    if (!trigger) return;
    setIsVisible(true);
    setIsComplete(false);
    setActiveStep(-1);

    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < steps.length; i++) {
        if (cancelled) return;
        setActiveStep(i);
        await new Promise((r) => setTimeout(r, steps[i].duration));
      }
      if (!cancelled) setIsComplete(true);
    };
    run();
    return () => { cancelled = true; };
  }, [trigger, steps]);

  if (!isVisible) return null;

  const shapEntries = shapValues
    ? Object.entries(shapValues).sort(([, a], [, b]) => Math.abs(b) - Math.abs(a)).slice(0, 5)
    : [];

  return (
    <div className="rounded-xl bg-[#0D1117] border border-gray-800 overflow-hidden transition-all duration-500">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161B22] border-b border-gray-800">
        <div className={`h-2 w-2 rounded-full ${isComplete ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-400">
          {isComplete ? "✓ Analysis Complete" : "AI Processing — Live"}
        </span>
        <div className="ml-auto">
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-1 font-mono text-[13px]">
        {steps.map((step, i) => {
          const isDone = i < activeStep || isComplete;
          const isCurrent = i === activeStep && !isComplete;
          const isPending = i > activeStep && !isComplete;

          return (
            <div
              key={i}
              className={`flex items-center gap-3 py-1.5 px-2 rounded-md transition-all duration-300 ${
                isCurrent ? "bg-[#1C2333]" : ""
              } ${isPending ? "opacity-25" : "opacity-100"}`}
            >
              <span className={`flex-shrink-0 ${isDone ? "text-emerald-400" : isCurrent ? "text-amber-400" : "text-gray-600"}`}>
                {isDone ? ICONS.done : isCurrent ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                ) : (
                  ICONS[step.icon]
                )}
              </span>
              <span className={isDone ? "text-gray-300" : isCurrent ? "text-white" : "text-gray-600"}>
                {step.label}
              </span>
              <span className="text-gray-600 text-[11px] ml-auto hidden sm:inline">
                {step.detail}
              </span>
            </div>
          );
        })}
      </div>

      {/* Results (shown after completion) */}
      {isComplete && (shapEntries.length > 0 || confidence != null) && (
        <div className="border-t border-gray-800 p-4 animate-in fade-in duration-500">
          {/* Confidence */}
          {confidence != null && (
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-mono text-gray-500">CONFIDENCE</span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000"
                  style={{ width: `${Math.round(confidence * 100)}%` }}
                />
              </div>
              <span className="text-[13px] font-mono font-bold text-emerald-400">
                {Math.round(confidence * 100)}%
              </span>
              {status && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                  status === "dormant" ? "bg-amber-500/20 text-amber-400" :
                  "bg-red-500/20 text-red-400"
                }`}>
                  {status}
                </span>
              )}
            </div>
          )}

          {/* SHAP values */}
          {shapEntries.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-gray-500">CONTRIBUTING FACTORS</span>
              {shapEntries.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`text-[13px] font-mono ${value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {value >= 0 ? "+" : ""}{value.toFixed(3)}
                  </span>
                  <div className="flex-1 h-1 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${value >= 0 ? "bg-emerald-500/60" : "bg-red-500/60"}`}
                      style={{ width: `${Math.min(Math.abs(value) * 200, 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 font-mono min-w-[140px] text-right">
                    {key.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
