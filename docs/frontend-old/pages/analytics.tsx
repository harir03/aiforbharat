import React, { useState, useCallback } from 'react';
import EventTimeline from '../components/EventTimeline';

/**
 * Analytics Page — Part B: Activity Intelligence Dashboard
 *
 * - UBID search bar (name+PIN, PAN, GSTIN, dept ID)
 * - Result card with status badge (Active=green, Dormant=amber, Closed=red)
 * - Event timeline (vertical, last 12 events)
 * - SHAP explanation text
 * - Query builder for cross-department filters
 */

const API_BASE = 'http://localhost:8000';

const STATUS_STYLES = {
  active: { bg: 'rgba(34,197,94,0.15)', color: '#34d399', border: 'rgba(34,197,94,0.3)', label: 'Active' },
  dormant: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)', label: 'Dormant' },
  closed: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)', label: 'Closed' },
  unclassified: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)', label: 'Unclassified' },
};

export default function AnalyticsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('name');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUbid, setSelectedUbid] = useState(null);
  const [ubidDetail, setUbidDetail] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Query builder state
  const [queryFilters, setQueryFilters] = useState({
    status: '',
    department: '',
    pin_code: '',
    no_inspection_months: '',
  });
  const [queryResults, setQueryResults] = useState([]);

  // Search UBIDs
  const doSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchType === 'name') params.set('q', searchQuery);
      else if (searchType === 'pan') params.set('pan', searchQuery);
      else if (searchType === 'gstin') params.set('gstin', searchQuery);
      else if (searchType === 'department') params.set('department', searchQuery);

      const res = await fetch(`${API_BASE}/api/ubid/search?${params}`);
      const data = await res.json();
      setSearchResults(data);
      setSelectedUbid(null);
      setUbidDetail(null);
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchType]);

  // Fetch UBID detail
  const selectUbid = useCallback(async (ubid) => {
    setSelectedUbid(ubid);
    setLoading(true);
    try {
      const [detailRes, eventsRes] = await Promise.all([
        fetch(`${API_BASE}/api/ubid/${ubid}`),
        fetch(`${API_BASE}/api/ubid/${ubid}/events?limit=12`),
      ]);
      const detail = await detailRes.json();
      const evts = await eventsRes.json();
      setUbidDetail(detail);
      setEvents(evts);
    } catch (err) {
      setError('Failed to load UBID details');
    } finally {
      setLoading(false);
    }
  }, []);

  // Run query builder
  const runQuery = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (queryFilters.status) filters.status = queryFilters.status;
      if (queryFilters.department) filters.department = queryFilters.department;
      if (queryFilters.pin_code) filters.pin_code = queryFilters.pin_code;
      if (queryFilters.no_inspection_months) {
        filters.no_inspection_months = parseInt(queryFilters.no_inspection_months);
      }

      const res = await fetch(`${API_BASE}/api/analytics/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });
      const data = await res.json();
      setQueryResults(data);
    } catch (err) {
      setError('Query failed');
    } finally {
      setLoading(false);
    }
  }, [queryFilters]);

  const statusStyle = (status) => STATUS_STYLES[status] || STATUS_STYLES.unclassified;

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>UBID</h1>
          <span style={styles.subtitle}>Activity Intelligence</span>
        </div>
      </header>

      <div style={styles.content}>
        {/* Search Panel */}
        <section style={styles.searchSection}>
          <h2 style={styles.sectionTitle}>🔍 UBID Lookup</h2>
          <div style={styles.searchRow}>
            <select
              style={styles.searchSelect}
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
            >
              <option value="name">Name</option>
              <option value="pan">PAN</option>
              <option value="gstin">GSTIN</option>
              <option value="department">Department ID</option>
            </select>
            <input
              style={styles.searchInput}
              type="text"
              placeholder={`Search by ${searchType}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            />
            <button style={styles.searchBtn} onClick={doSearch} disabled={loading}>
              Search
            </button>
          </div>

          {error && <div style={styles.errorMsg}>{error}</div>}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div style={styles.resultsList}>
              {searchResults.map((r) => {
                const st = statusStyle(r.status);
                return (
                  <button
                    key={r.ubid}
                    style={{
                      ...styles.resultCard,
                      ...(selectedUbid === r.ubid ? styles.resultCardActive : {}),
                    }}
                    onClick={() => selectUbid(r.ubid)}
                  >
                    <div style={styles.resultTop}>
                      <span style={styles.ubidCode}>{r.ubid}</span>
                      <span style={{ ...styles.statusBadge, background: st.bg, color: st.color, borderColor: st.border }}>
                        {st.label}
                      </span>
                    </div>
                    <div style={styles.resultMeta}>
                      <span>{r.name || '—'}</span>
                      <span style={styles.resultDept}>{r.department}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Detail view */}
        {ubidDetail && (
          <section style={styles.detailSection}>
            <div style={styles.detailHeader}>
              <div>
                <h2 style={styles.ubidTitle}>{ubidDetail.ubid}</h2>
                <span style={styles.anchorBadge}>Anchor: {ubidDetail.anchor_type}</span>
              </div>
              <div style={{
                ...styles.statusBadgeLg,
                background: statusStyle(ubidDetail.status).bg,
                color: statusStyle(ubidDetail.status).color,
                borderColor: statusStyle(ubidDetail.status).border,
              }}>
                {statusStyle(ubidDetail.status).label}
                <span style={styles.confText}>{(ubidDetail.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* SHAP Explanation */}
            {ubidDetail.explanation && (
              <div style={styles.explanationBox}>
                <strong>🧠 AI Explanation:</strong> {ubidDetail.explanation}
              </div>
            )}

            {/* Probability bars */}
            <div style={styles.probBars}>
              {[
                { label: 'Active', prob: ubidDetail.prob_active, color: '#34d399' },
                { label: 'Dormant', prob: ubidDetail.prob_dormant, color: '#fbbf24' },
                { label: 'Closed', prob: ubidDetail.prob_closed, color: '#f87171' },
              ].map((p) => (
                <div key={p.label} style={styles.probRow}>
                  <span style={styles.probLabel}>{p.label}</span>
                  <div style={styles.probTrack}>
                    <div style={{
                      ...styles.probFill,
                      width: `${p.prob * 100}%`,
                      background: p.color,
                    }} />
                  </div>
                  <span style={styles.probPct}>{(p.prob * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>

            {/* Linked records */}
            <div style={styles.linkedSection}>
              <h3 style={styles.subTitle}>Linked Records ({ubidDetail.linked_records?.length || 0})</h3>
              {ubidDetail.linked_records?.map((rec, i) => (
                <div key={i} style={styles.linkedCard}>
                  <span style={styles.deptBadge}>{rec.department?.toUpperCase()}</span>
                  <span style={styles.linkedName}>{rec.name_raw || '—'}</span>
                  <span style={styles.linkedId}>{rec.local_id}</span>
                </div>
              ))}
            </div>

            {/* Event Timeline */}
            <div style={{ marginTop: '20px' }}>
              <EventTimeline events={events} />
            </div>
          </section>
        )}

        {/* Query Builder */}
        <section style={styles.querySection}>
          <h2 style={styles.sectionTitle}>📊 Cross-Department Query</h2>
          <p style={styles.queryHint}>
            Example: "Active factories with no inspection in 18 months"
          </p>
          <div style={styles.queryGrid}>
            <div style={styles.queryField}>
              <label style={styles.queryLabel}>Status</label>
              <select
                style={styles.querySelect}
                value={queryFilters.status}
                onChange={(e) => setQueryFilters({ ...queryFilters, status: e.target.value })}
              >
                <option value="">Any</option>
                <option value="active">Active</option>
                <option value="dormant">Dormant</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div style={styles.queryField}>
              <label style={styles.queryLabel}>Department</label>
              <select
                style={styles.querySelect}
                value={queryFilters.department}
                onChange={(e) => setQueryFilters({ ...queryFilters, department: e.target.value })}
              >
                <option value="">Any</option>
                <option value="shop_est">Shop & Establishment</option>
                <option value="factories">Factories</option>
                <option value="labour">Labour</option>
                <option value="kspcb">KSPCB</option>
              </select>
            </div>
            <div style={styles.queryField}>
              <label style={styles.queryLabel}>PIN Code</label>
              <input
                style={styles.queryInput}
                type="text"
                placeholder="e.g. 560058"
                value={queryFilters.pin_code}
                onChange={(e) => setQueryFilters({ ...queryFilters, pin_code: e.target.value })}
              />
            </div>
            <div style={styles.queryField}>
              <label style={styles.queryLabel}>No inspection in (months)</label>
              <input
                style={styles.queryInput}
                type="number"
                placeholder="e.g. 18"
                value={queryFilters.no_inspection_months}
                onChange={(e) => setQueryFilters({ ...queryFilters, no_inspection_months: e.target.value })}
              />
            </div>
          </div>
          <button style={styles.queryBtn} onClick={runQuery} disabled={loading}>
            Run Query
          </button>

          {/* Query results */}
          {queryResults.length > 0 && (
            <div style={styles.queryResults}>
              <h3 style={styles.subTitle}>{queryResults.length} results</h3>
              <div style={styles.queryTable}>
                <div style={styles.tableHeader}>
                  <span style={styles.colUbid}>UBID</span>
                  <span style={styles.colName}>Name</span>
                  <span style={styles.colDept}>Dept</span>
                  <span style={styles.colStatus}>Status</span>
                  <span style={styles.colConf}>Conf</span>
                </div>
                {queryResults.map((r) => {
                  const st = statusStyle(r.status);
                  return (
                    <div key={r.ubid} style={styles.tableRow}>
                      <span style={{ ...styles.colUbid, fontFamily: 'monospace', fontSize: '12px' }}>{r.ubid}</span>
                      <span style={styles.colName}>{r.name || '—'}</span>
                      <span style={styles.colDept}>{r.department}</span>
                      <span style={{
                        ...styles.colStatus,
                        ...styles.statusBadgeSm,
                        background: st.bg, color: st.color,
                      }}>
                        {st.label}
                      </span>
                      <span style={styles.colConf}>{(r.confidence * 100).toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    color: '#e2e8f0',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    background: 'rgba(15,23,42,0.8)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  logo: {
    fontSize: '24px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  subtitle: { fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 },
  content: { padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' },
  sectionTitle: { fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' },
  searchSection: {
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(15,23,42,0.6)',
    backdropFilter: 'blur(12px)',
    marginBottom: '24px',
  },
  searchRow: { display: 'flex', gap: '8px', marginBottom: '16px' },
  searchSelect: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
  },
  searchInput: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
  },
  searchBtn: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '13px',
  },
  errorMsg: {
    padding: '10px 16px',
    borderRadius: '8px',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171',
    fontSize: '13px',
    marginBottom: '12px',
  },
  resultsList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  resultCard: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#e2e8f0',
    transition: 'all 0.15s',
    fontFamily: "'Inter', sans-serif",
  },
  resultCardActive: { borderColor: 'rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.08)' },
  resultTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  ubidCode: { fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#93c5fd' },
  statusBadge: {
    padding: '3px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 700,
    border: '1px solid',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  resultMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.5)' },
  resultDept: { fontSize: '11px', color: 'rgba(255,255,255,0.3)' },
  detailSection: {
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(15,23,42,0.6)',
    backdropFilter: 'blur(12px)',
    marginBottom: '24px',
  },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  ubidTitle: { fontSize: '22px', fontWeight: 800, color: '#93c5fd', fontFamily: 'monospace', margin: '0 0 6px' },
  anchorBadge: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 },
  statusBadgeLg: {
    padding: '8px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 700,
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  confText: { fontSize: '12px', opacity: 0.7 },
  explanationBox: {
    padding: '16px 20px',
    borderRadius: '10px',
    background: 'rgba(139,92,246,0.08)',
    border: '1px solid rgba(139,92,246,0.2)',
    fontSize: '13px',
    lineHeight: 1.6,
    color: '#c4b5fd',
    marginBottom: '20px',
  },
  probBars: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' },
  probRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  probLabel: { width: '80px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textAlign: 'right' },
  probTrack: { flex: 1, height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  probFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s ease-out' },
  probPct: { width: '50px', fontSize: '12px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', textAlign: 'right' },
  linkedSection: { marginBottom: '20px' },
  subTitle: { fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '12px' },
  linkedCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    marginBottom: '4px',
    fontSize: '13px',
  },
  deptBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 700,
    background: 'rgba(59,130,246,0.2)',
    color: '#93c5fd',
    letterSpacing: '0.5px',
  },
  linkedName: { flex: 1, color: '#e2e8f0' },
  linkedId: { fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.3)' },
  querySection: {
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(15,23,42,0.6)',
    backdropFilter: 'blur(12px)',
    marginBottom: '24px',
  },
  queryHint: { fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px', fontStyle: 'italic' },
  queryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' },
  queryField: { display: 'flex', flexDirection: 'column', gap: '4px' },
  queryLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  querySelect: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
  },
  queryInput: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
  },
  queryBtn: {
    padding: '10px 28px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #059669, #10b981)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '13px',
    marginBottom: '16px',
  },
  queryResults: { marginTop: '12px' },
  queryTable: { display: 'flex', flexDirection: 'column', gap: '0' },
  tableHeader: {
    display: 'flex',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '6px 6px 0 0',
    fontSize: '11px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableRow: {
    display: 'flex',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    fontSize: '12px',
    color: '#e2e8f0',
    alignItems: 'center',
  },
  colUbid: { width: '180px', flexShrink: 0 },
  colName: { flex: 1 },
  colDept: { width: '100px', flexShrink: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' },
  colStatus: { width: '90px', flexShrink: 0 },
  colConf: { width: '50px', flexShrink: 0, textAlign: 'right', fontFamily: 'monospace' },
  statusBadgeSm: { padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 },
};
