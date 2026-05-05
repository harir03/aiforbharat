import React, { useState, useEffect, useCallback } from 'react';
import RecordComparison from '../components/RecordComparison';
import ShapChart from '../components/ShapChart';

/**
 * Reviewer Page — Human Reviewer Workflow (PRD Feature A6)
 *
 * - Queue list with count & stale warning
 * - Side-by-side record comparison with diff highlighting
 * - SHAP bar chart
 * - Action buttons: Approve (green), Reject (red), Defer (gray), Escalate (orange)
 * - Note field (required for Reject/Escalate)
 * - Auto-loads next case after action
 */

const API_BASE = 'http://localhost:8000';

export default function ReviewerPage() {
  const [queue, setQueue] = useState([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [hasStale, setHasStale] = useState(false);
  const [currentCase, setCurrentCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch queue
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reviewer/queue`);
      const data = await res.json();
      setQueue(data.items || []);
      setQueueTotal(data.total || 0);
      setHasStale(data.has_stale || false);
    } catch (err) {
      setError('Failed to load queue');
    }
  }, []);

  // Fetch case detail
  const fetchCase = useCallback(async (caseId) => {
    if (!caseId) {
      setCurrentCase(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/reviewer/queue/${caseId}`);
      if (!res.ok) throw new Error('Case not found');
      const data = await res.json();
      setCurrentCase(data);
    } catch (err) {
      setError(`Failed to load case: ${err.message}`);
      setCurrentCase(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchQueue().then(() => setLoading(false));
  }, [fetchQueue]);

  // Auto-load first case when queue loads
  useEffect(() => {
    if (queue.length > 0 && !currentCase) {
      fetchCase(queue[0].case_id);
    }
  }, [queue, currentCase, fetchCase]);

  // Perform action
  const doAction = async (action) => {
    if (!currentCase) return;

    // Validate note requirement
    if ((action === 'reject' || action === 'escalate') && !note.trim()) {
      setError(`Note is required for ${action}`);
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(
        `${API_BASE}/api/reviewer/queue/${currentCase.case_id}/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewer_id: 'reviewer_1', note: note || null }),
        }
      );
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Action failed');
      }
      const data = await res.json();

      setSuccessMsg(
        `Case ${currentCase.case_id} → ${data.resolution.toUpperCase()}`
      );
      setNote('');

      // Refresh queue and load next case
      await fetchQueue();
      if (data.next_case_id) {
        fetchCase(data.next_case_id);
      } else {
        setCurrentCase(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>UBID</h1>
          <span style={styles.subtitle}>Reviewer Queue</span>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.queueBadge}>
            <span style={styles.queueCount}>{queueTotal}</span>
            <span style={styles.queueLabel}>pending</span>
          </div>
          {hasStale && (
            <div style={styles.staleBadge}>
              ⚠ Cases older than 72h
            </div>
          )}
        </div>
      </header>

      <div style={styles.content}>
        {/* Sidebar: Queue list */}
        <aside style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>Queue</h3>
          {queue.length === 0 && (
            <div style={styles.emptyState}>No pending cases</div>
          )}
          {queue.map((item) => (
            <button
              key={item.case_id}
              style={{
                ...styles.queueItem,
                ...(currentCase?.case_id === item.case_id ? styles.queueItemActive : {}),
              }}
              onClick={() => fetchCase(item.case_id)}
            >
              <div style={styles.queueItemNames}>
                <span>{item.name_a?.substring(0, 20) || '—'}</span>
                <span style={styles.queueVs}>vs</span>
                <span>{item.name_b?.substring(0, 20) || '—'}</span>
              </div>
              <div style={styles.queueItemMeta}>
                <span
                  style={{
                    ...styles.confBadge,
                    background: item.confidence > 0.75 ? 'rgba(34,197,94,0.15)' :
                      item.confidence > 0.6 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                    color: item.confidence > 0.75 ? '#34d399' :
                      item.confidence > 0.6 ? '#fbbf24' : '#f87171',
                  }}
                >
                  {(item.confidence * 100).toFixed(0)}%
                </span>
                {item.age_hours > 72 && (
                  <span style={styles.staleIcon}>⏰</span>
                )}
              </div>
            </button>
          ))}
        </aside>

        {/* Main area */}
        <main style={styles.main}>
          {/* Messages */}
          {error && <div style={styles.errorMsg}>{error}</div>}
          {successMsg && <div style={styles.successMsg}>{successMsg}</div>}

          {loading && <div style={styles.loading}>Loading...</div>}

          {!loading && !currentCase && queue.length === 0 && (
            <div style={styles.emptyMain}>
              <div style={styles.emptyIcon}>✓</div>
              <h2 style={styles.emptyTitle}>Queue Clear</h2>
              <p style={styles.emptyText}>No cases pending review. Run the resolution pipeline to generate new cases.</p>
            </div>
          )}

          {currentCase && (
            <>
              {/* Record comparison */}
              <RecordComparison
                recordA={currentCase.record_a}
                recordB={currentCase.record_b}
                fieldDiffs={currentCase.field_diffs}
              />

              {/* SHAP chart */}
              <div style={{ marginTop: '20px' }}>
                <ShapChart
                  shapValues={currentCase.shap_values}
                  confidence={currentCase.confidence}
                />
              </div>

              {/* Action panel */}
              <div style={styles.actionPanel}>
                <textarea
                  style={styles.noteInput}
                  placeholder="Add a note (required for Reject & Escalate)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
                <div style={styles.actionButtons}>
                  <button
                    style={{ ...styles.actionBtn, ...styles.approveBtn }}
                    onClick={() => doAction('approve')}
                    disabled={actionLoading}
                  >
                    ✓ Approve Merge
                  </button>
                  <button
                    style={{ ...styles.actionBtn, ...styles.rejectBtn }}
                    onClick={() => doAction('reject')}
                    disabled={actionLoading}
                  >
                    ✕ Reject
                  </button>
                  <button
                    style={{ ...styles.actionBtn, ...styles.deferBtn }}
                    onClick={() => doAction('defer')}
                    disabled={actionLoading}
                  >
                    ⏳ Defer
                  </button>
                  <button
                    style={{ ...styles.actionBtn, ...styles.escalateBtn }}
                    onClick={() => doAction('escalate')}
                    disabled={actionLoading}
                  >
                    ⚡ Escalate
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
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
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  logo: {
    fontSize: '24px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  subtitle: { fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 },
  queueBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '8px',
    background: 'rgba(59,130,246,0.15)',
    border: '1px solid rgba(59,130,246,0.3)',
  },
  queueCount: { fontSize: '18px', fontWeight: 700, color: '#93c5fd' },
  queueLabel: { fontSize: '12px', color: 'rgba(255,255,255,0.5)' },
  staleBadge: {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    background: 'rgba(245,158,11,0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(245,158,11,0.3)',
  },
  content: {
    display: 'flex',
    gap: '0',
    minHeight: 'calc(100vh - 65px)',
  },
  sidebar: {
    width: '280px',
    flexShrink: 0,
    borderRight: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(15,23,42,0.4)',
    padding: '16px',
    overflowY: 'auto',
  },
  sidebarTitle: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '12px',
    fontWeight: 700,
  },
  emptyState: {
    padding: '20px',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '13px',
  },
  queueItem: {
    width: '100%',
    padding: '12px',
    marginBottom: '6px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#e2e8f0',
    transition: 'all 0.15s',
    fontFamily: "'Inter', sans-serif",
  },
  queueItemActive: {
    background: 'rgba(59,130,246,0.12)',
    borderColor: 'rgba(59,130,246,0.3)',
  },
  queueItemNames: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '12px',
    lineHeight: 1.4,
  },
  queueVs: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  queueItemMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
  },
  confBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'monospace',
  },
  staleIcon: { fontSize: '14px' },
  main: {
    flex: 1,
    padding: '24px 32px',
    overflowY: 'auto',
  },
  loading: {
    padding: '60px',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '16px',
  },
  emptyMain: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '120px',
  },
  emptyIcon: {
    fontSize: '48px',
    color: '#34d399',
    marginBottom: '16px',
    background: 'rgba(34,197,94,0.1)',
    borderRadius: '50%',
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#e2e8f0',
    margin: '0 0 8px',
  },
  emptyText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    maxWidth: '400px',
    textAlign: 'center',
  },
  errorMsg: {
    padding: '10px 16px',
    borderRadius: '8px',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171',
    fontSize: '13px',
    marginBottom: '16px',
  },
  successMsg: {
    padding: '10px 16px',
    borderRadius: '8px',
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.3)',
    color: '#34d399',
    fontSize: '13px',
    marginBottom: '16px',
  },
  actionPanel: {
    marginTop: '20px',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(15,23,42,0.6)',
    backdropFilter: 'blur(12px)',
  },
  noteInput: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    resize: 'vertical',
    outline: 'none',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  actionBtn: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '0.3px',
  },
  approveBtn: {
    background: 'linear-gradient(135deg, #059669, #10b981)',
    color: '#fff',
  },
  rejectBtn: {
    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
    color: '#fff',
  },
  deferBtn: {
    background: 'rgba(255,255,255,0.08)',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.12)',
  },
  escalateBtn: {
    background: 'linear-gradient(135deg, #d97706, #f59e0b)',
    color: '#fff',
  },
};
