"use client";

import React, { useEffect, useState, useCallback } from "react";
import StatCard from "@/components/ubid/StatCard";
import SearchSection from "@/components/ubid/SearchSection";
import ResultsTable from "@/components/ubid/ResultsTable";
import { fetchSummary, searchUBIDs } from "@/lib/api";
import type { SummaryResponse, SearchResult } from "@/lib/api";

/** SVG icon components for stat cards */
const DatabaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const PauseCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="10" x2="10" y1="15" y2="9" />
    <line x1="14" x2="14" y1="15" y2="9" />
  </svg>
);

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default function DashboardPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Fetch summary on mount
  useEffect(() => {
    fetchSummary()
      .then(setSummary)
      .catch((err) => {
        setSummaryError(err.message || "Failed to load summary");
      });
  }, []);

  // Handle search
  const handleSearch = useCallback(async (query: string, pin?: string) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const data = await searchUBIDs(query, pin);
      setResults(data);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Derive review queue count — comes from summary or separate endpoint
  const reviewQueueCount = summary
    ? (summary.status_breakdown.unclassified ?? 0)
    : 0;

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold text-gray-900 dark:text-white"
          style={{ letterSpacing: "-0.96px" }}
        >
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of UBID registrations and business activity
        </p>
      </div>

      {/* Stat Cards Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total UBIDs"
          value={summary?.total_ubids ?? 0}
          icon={<DatabaseIcon />}
          iconBgClass="bg-[#1E4D58]"
          subtitle="All registered businesses"
        />
        <StatCard
          title="Active Businesses"
          value={summary?.status_breakdown.active ?? 0}
          icon={<CheckCircleIcon />}
          iconBgClass="bg-emerald-600"
          subtitle="Currently operating"
        />
        <StatCard
          title="Dormant Businesses"
          value={summary?.status_breakdown.dormant ?? 0}
          icon={<PauseCircleIcon />}
          iconBgClass="bg-amber-500"
          subtitle="No recent activity"
        />
        <StatCard
          title="Pending Review"
          value={reviewQueueCount}
          icon={<ClockIcon />}
          iconBgClass="bg-gray-500"
          subtitle="Awaiting classification"
        />
      </div>

      {/* Error banner for summary */}
      {summaryError && (
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:bg-red-900/20 dark:text-red-300">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>Unable to load summary: {summaryError}</span>
        </div>
      )}

      {/* Search Section */}
      <div className="mb-6">
        <SearchSection onSearch={handleSearch} isLoading={isSearching} />
      </div>

      {/* Search error */}
      {searchError && (
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:bg-amber-900/20 dark:text-amber-300">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
          </svg>
          <span>{searchError}</span>
        </div>
      )}

      {/* Results Table */}
      <ResultsTable results={results} isLoading={isSearching} />
    </>
  );
}
