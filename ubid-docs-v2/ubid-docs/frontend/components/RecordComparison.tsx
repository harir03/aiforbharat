import React from 'react';

/**
 * RecordComparison — side-by-side record viewer with diff highlighting.
 * Left panel: Record A, Right panel: Record B
 * Fields that differ are highlighted in amber.
 */

const FIELD_LABELS = {
  name_raw: 'Business Name (Raw)',
  name_normalised: 'Business Name (Normalised)',
  address_raw: 'Address',
  pin_code: 'PIN Code',
  pan: 'PAN',
  gstin: 'GSTIN',
  phone: 'Phone',
  email: 'Email',
};

export default function RecordComparison({ recordA, recordB, fieldDiffs }) {
  if (!recordA || !recordB) return null;

  return (
    <div style={styles.container}>
      {/* Headers */}
      <div style={styles.headerRow}>
        <div style={{ ...styles.headerCell, ...styles.headerA }}>
          <span style={styles.deptBadge}>{recordA.department?.toUpperCase()}</span>
          <span style={styles.localId}>{recordA.local_id}</span>
        </div>
        <div style={styles.headerDivider}>VS</div>
        <div style={{ ...styles.headerCell, ...styles.headerB }}>
          <span style={styles.deptBadge}>{recordB.department?.toUpperCase()}</span>
          <span style={styles.localId}>{recordB.local_id}</span>
        </div>
      </div>

      {/* Field rows */}
      {fieldDiffs?.map((diff) => {
        const label = FIELD_LABELS[diff.field_name] || diff.field_name;
        const isDiff = !diff.matches;
        return (
          <div
            key={diff.field_name}
            style={{
              ...styles.fieldRow,
              ...(isDiff ? styles.fieldRowDiff : {}),
            }}
          >
            <div style={styles.fieldValue}>
              <div style={styles.fieldLabel}>{label}</div>
              <div style={styles.fieldText}>{diff.value_a || '—'}</div>
            </div>
            <div style={styles.fieldIndicator}>
              {isDiff ? (
                <span style={styles.diffIcon}>≠</span>
              ) : (
                <span style={styles.matchIcon}>✓</span>
              )}
            </div>
            <div style={styles.fieldValue}>
              <div style={styles.fieldLabel}>{label}</div>
              <div style={styles.fieldText}>{diff.value_b || '—'}</div>
            </div>
          </div>
        );
      })}
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
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  headerCell: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerA: {},
  headerB: { justifyContent: 'flex-end' },
  headerDivider: {
    padding: '4px 16px',
    fontSize: '12px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '2px',
  },
  deptBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1px',
    background: 'rgba(59,130,246,0.2)',
    color: '#93c5fd',
    border: '1px solid rgba(59,130,246,0.3)',
  },
  localId: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'monospace',
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'stretch',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.2s',
  },
  fieldRowDiff: {
    background: 'rgba(245,158,11,0.08)',
    borderLeft: '3px solid #f59e0b',
  },
  fieldValue: {
    flex: 1,
    padding: '12px 20px',
  },
  fieldIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    flexShrink: 0,
  },
  diffIcon: {
    color: '#f59e0b',
    fontSize: '18px',
    fontWeight: 700,
  },
  matchIcon: {
    color: '#34d399',
    fontSize: '16px',
    fontWeight: 700,
  },
  fieldLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600,
  },
  fieldText: {
    fontSize: '14px',
    color: '#e2e8f0',
    fontFamily: "'Inter', sans-serif",
  },
};
