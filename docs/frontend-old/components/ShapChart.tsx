import React from 'react';

/**
 * ShapChart — horizontal bar chart showing SHAP feature importances.
 * Uses pure CSS (no Recharts dependency needed for this minimal version).
 * Can be swapped for Recharts BarChart when the full Next.js build is set up.
 */

const FEATURE_LABELS = {
  name_jaro_winkler: 'Name Similarity (JW)',
  name_token_sort_ratio: 'Name Token Sort',
  name_metaphone_match: 'Name Phonetic Match',
  address_token_set_ratio: 'Address Similarity',
  pin_match: 'PIN Code Match',
  pan_prefix_match: 'PAN Prefix Match',
  phone_match: 'Phone Match',
  reg_date_gap_bin: 'Registration Date Gap',
  source_system_pair_enc: 'Department Pair',
};

export default function ShapChart({ shapValues, confidence }) {
  if (!shapValues || Object.keys(shapValues).length === 0) return null;

  // Sort by absolute value descending
  const entries = Object.entries(shapValues)
    .map(([key, val]) => ({
      key,
      label: FEATURE_LABELS[key] || key,
      value: val,
      absValue: Math.abs(val),
    }))
    .sort((a, b) => b.absValue - a.absValue);

  const maxAbs = Math.max(...entries.map((e) => e.absValue), 0.01);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Feature Importance</h3>
        <div style={styles.confidenceBadge}>
          Score: <strong>{(confidence * 100).toFixed(1)}%</strong>
        </div>
      </div>

      <div style={styles.chartArea}>
        {entries.map((entry) => {
          const pct = (entry.absValue / maxAbs) * 100;
          const isPositive = entry.value >= 0;
          return (
            <div key={entry.key} style={styles.barRow}>
              <div style={styles.barLabel}>{entry.label}</div>
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    width: `${Math.max(pct, 2)}%`,
                    background: isPositive
                      ? 'linear-gradient(90deg, #34d399, #10b981)'
                      : 'linear-gradient(90deg, #f87171, #ef4444)',
                  }}
                />
              </div>
              <div style={styles.barValue}>
                {entry.value >= 0 ? '+' : ''}
                {entry.value.toFixed(4)}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.legend}>
        <span style={{ ...styles.legendItem, color: '#34d399' }}>● Increases match</span>
        <span style={{ ...styles.legendItem, color: '#f87171' }}>● Decreases match</span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(15,23,42,0.6)',
    backdropFilter: 'blur(12px)',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#e2e8f0',
    margin: 0,
  },
  confidenceBadge: {
    padding: '6px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#c4b5fd',
    background: 'rgba(139,92,246,0.15)',
    border: '1px solid rgba(139,92,246,0.3)',
  },
  chartArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  barLabel: {
    width: '180px',
    flexShrink: 0,
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: '20px',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease-out',
  },
  barValue: {
    width: '72px',
    flexShrink: 0,
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace',
    textAlign: 'right',
  },
  legend: {
    display: 'flex',
    gap: '20px',
    marginTop: '16px',
    justifyContent: 'center',
  },
  legendItem: {
    fontSize: '11px',
    fontWeight: 600,
  },
};
