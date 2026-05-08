"use client";
import React, { useState, useRef, useEffect } from "react";
import type { QueryPayload, QueryResult } from "@/lib/api";
import { runAnalyticsQuery } from "@/lib/api";
import StatusBadge from "@/components/ubid/StatusBadge";

interface NaturalLanguageQueryProps {
  onResults: (results: QueryResult[]) => void;
  onSelectUbid: (ubid: string) => void;
}

/* ── Pattern matching: natural language → structured query ─────────── */
function parseNaturalLanguage(input: string): QueryPayload {
  const lower = input.toLowerCase();
  const payload: QueryPayload = {};

  // Status detection
  if (/\bactive\b/.test(lower)) payload.status = "active";
  else if (/\bdormant\b/.test(lower)) payload.status = "dormant";
  else if (/\bclosed\b/.test(lower)) payload.status = "closed";

  // Department detection
  if (/\bfactor/i.test(lower)) payload.department = "factories";
  else if (/\bkspcb|pollution|environmental\b/i.test(lower)) payload.department = "kspcb";
  else if (/\blabou?r\b/i.test(lower)) payload.department = "labour";
  else if (/\bshop|establishment\b/i.test(lower)) payload.department = "shop_est";

  // PIN code detection
  const pinMatch = lower.match(/\b(pin\s*(?:code)?\s*)?(\d{6})\b/);
  if (pinMatch) payload.pin_code = pinMatch[2];

  // Time period detection
  const monthMatch = lower.match(/(\d+)\s*months?/);
  if (monthMatch) payload.no_inspection_months = parseInt(monthMatch[1]);
  else if (/\b18\s*months?\b/.test(lower)) payload.no_inspection_months = 18;
  else if (/\byear\b/.test(lower)) payload.no_inspection_months = 12;
  else if (/\b6\s*months?\b/.test(lower)) payload.no_inspection_months = 6;

  return payload;
}

/* ── Thinking steps animation ─────────────────────────────────────── */
interface ThinkingStep {
  label: string;
  detail: string;
  done: boolean;
}

function buildThinkingSteps(query: string, payload: QueryPayload): ThinkingStep[] {
  const steps: ThinkingStep[] = [
    { label: "Parsing query", detail: `Understanding: "${query}"`, done: false },
  ];
  if (payload.status) {
    steps.push({ label: "Filter: Status", detail: `Filtering by status = ${payload.status}`, done: false });
  }
  if (payload.department) {
    steps.push({ label: "Filter: Department", detail: `Searching in ${payload.department} records`, done: false });
  }
  if (payload.pin_code) {
    steps.push({ label: "Filter: Location", detail: `Narrowing to PIN code ${payload.pin_code}`, done: false });
  }
  if (payload.no_inspection_months) {
    steps.push({ label: "Filter: Activity", detail: `No inspection in ${payload.no_inspection_months} months`, done: false });
  }
  steps.push({ label: "Cross-department search", detail: "Querying all linked UBID records across departments", done: false });
  steps.push({ label: "Ranking results", detail: "Sorting by relevance and last activity", done: false });
  return steps;
}

const EXAMPLE_QUERIES = [
  "Show me all active factories in PIN 560058",
  "Which businesses are dormant with no inspection in 18 months?",
  "Find closed businesses in labour department",
  "Active businesses in KSPCB with PIN 560001",
];

export default function NaturalLanguageQuery({ onResults, onSelectUbid }: NaturalLanguageQueryProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [thinking, setThinking] = useState<ThinkingStep[]>([]);
  const [showThinking, setShowThinking] = useState(false);
  const [history, setHistory] = useState<{ query: string; count: number }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Animated thinking steps ─────────────────────────────────────── */
  const animateThinking = async (steps: ThinkingStep[]) => {
    setShowThinking(true);
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
      setThinking((prev) => prev.map((s, idx) => (idx === i ? { ...s, done: true } : s)));
    }
  };

  /* ── Handle query submission ─────────────────────────────────────── */
  const handleSubmit = async (input?: string) => {
    const q = input || query;
    if (!q.trim()) return;

    setLoading(true);
    setResults([]);
    const payload = parseNaturalLanguage(q);
    const steps = buildThinkingSteps(q, payload);
    setThinking(steps);

    // Start animated thinking
    const thinkingPromise = animateThinking(steps);

    try {
      const [data] = await Promise.all([runAnalyticsQuery(payload), thinkingPromise]);
      setResults(data);
      onResults(data);
      setHistory((prev) => [{ query: q, count: data.length }, ...prev].slice(0, 5));
    } catch (err) {
      console.error("Query failed:", err);
      setResults([]);
    } finally {
      setLoading(false);
      // Keep thinking visible for a moment
      setTimeout(() => setShowThinking(false), 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gradient-to-br from-[#1E4D58] to-[#2E6D7A] p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Ask in Plain English</h3>
            <p className="text-[11px] text-white/60">
              Query across all departments using natural language
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="relative mt-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='e.g. "Show me all dormant factories in PIN 560058"'
            className="w-full rounded-xl border-0 bg-white/10 backdrop-blur-sm py-3.5 pl-4 pr-24 text-sm text-white
              placeholder-white/40
              focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30
              transition-all duration-200"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !query.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-white px-4 py-2 text-[12px] font-semibold text-[#1E4D58]
              hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#1E4D58] border-t-transparent" />
                Thinking...
              </div>
            ) : (
              "Ask →"
            )}
          </button>
        </div>

        {/* Example queries */}
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((eq) => (
            <button
              key={eq}
              onClick={() => { setQuery(eq); handleSubmit(eq); }}
              className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/70
                hover:bg-white/20 hover:text-white transition-colors"
            >
              {eq}
            </button>
          ))}
        </div>
      </div>

      {/* ── Live AI Thinking Panel ──────────────────────────────────── */}
      {showThinking && (
        <div className="rounded-xl bg-gray-900 p-5 text-white overflow-hidden
          animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              AI Reasoning — Live
            </span>
          </div>
          <div className="space-y-2 font-mono text-[13px]">
            {thinking.map((step, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 transition-all duration-300 ${
                  step.done ? "opacity-100" : "opacity-30"
                }`}
              >
                <span className="mt-0.5 flex-shrink-0">
                  {step.done ? (
                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-gray-400" />
                  )}
                </span>
                <div>
                  <span className="text-gray-300">{step.label}</span>
                  <span className="text-gray-500 ml-2">— {step.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Results summary ─────────────────────────────────────────── */}
      {!loading && results.length > 0 && (
        <div className="rounded-xl bg-white overflow-hidden
          shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
          dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
              Found <strong className="text-[#2E6D7A]">{results.length}</strong> businesses
            </span>
            <span className="text-[11px] text-gray-400">Click any row to view details</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {results.slice(0, 10).map((r, i) => (
              <button
                key={`${r.ubid}-${i}`}
                onClick={() => onSelectUbid(r.ubid)}
                className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors
                  hover:bg-gray-50 dark:hover:bg-gray-800
                  border-b border-gray-50 dark:border-gray-800/50 last:border-0"
              >
                <span className="font-mono text-[12px] font-medium text-[#2E6D7A] min-w-[140px]">
                  {r.ubid}
                </span>
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                  {r.name}
                </span>
                <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-[10px] font-medium text-gray-500">
                  {r.department?.replace("_", " & ") || "—"}
                </span>
                <StatusBadge status={r.status} />
              </button>
            ))}
          </div>
          {results.length > 10 && (
            <div className="px-5 py-2 text-center text-[11px] text-gray-400 border-t border-gray-100 dark:border-gray-800">
              + {results.length - 10} more results
            </div>
          )}
        </div>
      )}

      {/* ── Query history ───────────────────────────────────────────── */}
      {history.length > 0 && !showThinking && results.length === 0 && (
        <div className="rounded-xl bg-white p-4
          shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
          dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-2">Recent Queries</p>
          <div className="space-y-1">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setQuery(h.query); handleSubmit(h.query); }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-gray-600 dark:text-gray-400 truncate">{h.query}</span>
                <span className="text-[11px] text-gray-400 ml-2 flex-shrink-0">{h.count} results</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
