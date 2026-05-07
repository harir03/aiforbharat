"use client";
import React, { useState } from "react";

interface SearchSectionProps {
  onSearch: (query: string, pin?: string) => void;
  isLoading?: boolean;
}

export default function SearchSection({ onSearch, isLoading = false }: SearchSectionProps) {
  const [query, setQuery] = useState("");
  const [pin, setPin] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim(), pin.trim() || undefined);
  };

  return (
    <div
      className="rounded-xl bg-white p-6
        shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
        dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800"
    >
      <div className="mb-5">
        <h2
          className="text-lg font-semibold text-gray-900 dark:text-white"
          style={{ letterSpacing: "-0.32px" }}
        >
          Search Businesses
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Search by business name, PAN, or GSTIN across all departments
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="ubid-search-name"
            className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300"
          >
            Business Name / Identifier
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              id="ubid-search-name"
              type="text"
              placeholder="e.g. Sharma Textiles, ABCDE1234F, 27AAPFU0939F1ZV"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-lg bg-gray-50 pl-10 pr-4 text-sm text-gray-900
                shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] outline-none
                transition-shadow duration-150
                placeholder:text-gray-400
                focus:bg-white focus:shadow-[0px_0px_0px_2px_#2E6D7A]
                dark:bg-gray-800 dark:text-white
                dark:shadow-[rgba(255,255,255,0.06)_0px_0px_0px_1px]
                dark:placeholder:text-gray-500
                dark:focus:bg-gray-800 dark:focus:shadow-[0px_0px_0px_2px_#2E6D7A]"
            />
          </div>
        </div>

        <div className="w-full sm:w-36">
          <label
            htmlFor="ubid-search-pin"
            className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300"
          >
            PIN Code
          </label>
          <input
            id="ubid-search-pin"
            type="text"
            placeholder="560001"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="h-11 w-full rounded-lg bg-gray-50 px-4 text-sm text-gray-900 tabular-nums
              shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] outline-none
              transition-shadow duration-150
              placeholder:text-gray-400
              focus:bg-white focus:shadow-[0px_0px_0px_2px_#2E6D7A]
              dark:bg-gray-800 dark:text-white
              dark:shadow-[rgba(255,255,255,0.06)_0px_0px_0px_1px]
              dark:placeholder:text-gray-500
              dark:focus:bg-gray-800 dark:focus:shadow-[0px_0px_0px_2px_#2E6D7A]"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="h-11 rounded-lg bg-[#1E4D58] px-6 text-sm font-medium text-white
            shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px]
            transition-all duration-150
            hover:bg-[#2E6D7A]
            focus:outline-none focus:ring-2 focus:ring-[#2E6D7A] focus:ring-offset-2
            active:scale-[0.98]
            disabled:cursor-not-allowed disabled:opacity-50
            dark:focus:ring-offset-gray-900"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Searching…
            </span>
          ) : (
            "Search"
          )}
        </button>
      </form>
    </div>
  );
}
