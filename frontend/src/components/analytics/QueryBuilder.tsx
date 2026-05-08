"use client";
import React, { useState } from "react";
import type { QueryPayload } from "@/lib/api";

interface QueryBuilderProps {
  onQuery: (payload: QueryPayload) => void;
  loading: boolean;
}

export default function QueryBuilder({ onQuery, loading }: QueryBuilderProps) {
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [daysSince, setDaysSince] = useState("");

  const handleRun = () => {
    const payload: QueryPayload = {};
    if (status) payload.status = status;
    if (department) payload.department = department;
    if (pinCode) payload.pin_code = pinCode;
    if (daysSince) payload.no_inspection_months = Math.round(parseInt(daysSince) / 30);
    onQuery(payload);
  };

  const selectClass = `w-full rounded-xl border-0 bg-white py-2.5 px-3 text-sm text-gray-900
    shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
    transition-shadow duration-200
    focus:shadow-[rgba(46,109,122,0.4)_0px_0px_0px_2px,rgba(0,0,0,0.04)_0px_2px_2px]
    focus:outline-none appearance-none cursor-pointer
    dark:bg-gray-900 dark:text-white dark:shadow-none dark:border dark:border-gray-700`;

  return (
    <div className="rounded-xl bg-white p-6
      shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px_inset]
      dark:bg-gray-900 dark:shadow-none dark:border dark:border-gray-800">

      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
        Cross-Department Query Builder
      </h3>
      <p className="text-[11px] text-gray-400 mb-5">
        Filter businesses across all departments by status, location, and activity
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Status */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-400">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="dormant">Dormant</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        {/* Department */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-400">Department</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className={selectClass}>
            <option value="">All Departments</option>
            <option value="shop_est">Shop & Establishment</option>
            <option value="factories">Factories</option>
            <option value="labour">Labour</option>
            <option value="kspcb">KSPCB</option>
          </select>
        </div>
        {/* PIN Code */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-400">PIN Code</label>
          <input
            type="text"
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value)}
            placeholder="e.g. 560058"
            maxLength={6}
            className={selectClass}
          />
        </div>
        {/* Days Since Last Event */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-400">Days Since Last Event</label>
          <select value={daysSince} onChange={(e) => setDaysSince(e.target.value)} className={selectClass}>
            <option value="">Any</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">1 year</option>
            <option value="540">18 months</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleRun}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-[#2E6D7A] px-5 py-2.5 text-sm font-medium text-white
          shadow-[rgba(46,109,122,0.3)_0px_1px_2px]
          transition-all duration-200
          hover:bg-[#1E4D58] hover:shadow-[rgba(46,109,122,0.4)_0px_4px_12px]
          focus:outline-none focus:ring-2 focus:ring-[#2E6D7A]/50 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Running...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Run Query
          </>
        )}
      </button>
    </div>
  );
}
