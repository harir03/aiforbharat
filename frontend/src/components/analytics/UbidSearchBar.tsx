"use client";
import React, { useState, useCallback } from "react";
import { searchUBIDs, type SearchResult } from "@/lib/api";

interface UbidSearchBarProps {
  onSelect: (ubid: string) => void;
}

export default function UbidSearchBar({ onSelect }: UbidSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); setIsOpen(false); return; }
    setLoading(true);
    try {
      const data = await searchUBIDs(q);
      setResults(data);
      setIsOpen(data.length > 0);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const handleSelect = (ubid: string) => {
    setIsOpen(false);
    setQuery(ubid);
    onSelect(ubid);
  };

  const statusColor: Record<string, string> = {
    active: "bg-emerald-500", dormant: "bg-amber-500", closed: "bg-red-500",
  };

  return (
    <div className="relative w-full">
      <label className="mb-1.5 block text-[13px] font-medium text-gray-500 dark:text-gray-400">
        Search by UBID, PAN, GSTIN, or business name
      </label>
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="e.g. KA-PAN-01635952, Sharma Textiles, ABCDE1234F"
          className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-4 text-sm text-gray-900
            shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
            transition-shadow duration-200
            focus:shadow-[rgba(46,109,122,0.4)_0px_0px_0px_2px,rgba(0,0,0,0.04)_0px_2px_2px]
            focus:outline-none
            dark:bg-gray-900 dark:text-white dark:shadow-none dark:border dark:border-gray-700
            dark:focus:border-[#2E6D7A]"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2E6D7A] border-t-transparent" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl bg-white
          shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.12)_0px_8px_24px]
          dark:bg-gray-900 dark:border dark:border-gray-700">
          {results.map((r) => (
            <button
              key={r.ubid}
              onClick={() => handleSelect(r.ubid)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors
                hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <span className={`h-2 w-2 rounded-full ${statusColor[r.status] || "bg-gray-400"}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{r.name || r.ubid}</p>
                <p className="text-[11px] text-gray-500 font-mono">{r.ubid}</p>
              </div>
              <div className="flex gap-1">
                {r.departments?.map((d) => (
                  <span key={d} className="rounded-full bg-[#D4EEF2] px-2 py-0.5 text-[10px] font-medium text-[#1E4D58]">
                    {d}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
