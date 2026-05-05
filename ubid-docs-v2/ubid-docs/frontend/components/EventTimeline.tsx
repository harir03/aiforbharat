import React from 'react';

/**
 * EventTimeline — displays activity events for a UBID in chronological order.
 * Used on the analytics page to show inspection/renewal/compliance history.
 */

const EVENT_COLORS = {
  inspection: '#60a5fa',
  renewal: '#34d399',
  compliance: '#a78bfa',
  consumption: '#fbbf24',
  closure: '#f87171',
  default: '#94a3b8',
};

const EVENT_ICONS = {
  inspection: '🔍',
  renewal: '🔄',
  compliance: '📋',
  consumption: '⚡',
  closure: '🔒',
  default: '📌',
};

export default function EventTimeline({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={styles.emptyIcon}>📭</span>
        <span>No activity events recorded</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Activity Timeline</h3>
      <div style={styles.timeline}>
        {events.map((event, idx) => {
          const color = EVENT_COLORS[event.event_type] || EVENT_COLORS.default;
          const icon = EVENT_ICONS[event.event_type] || EVENT_ICONS.default;
          return (
            <div key={event.event_id || idx} style={styles.item}>
              <div style={styles.line}>
                <div
                  style={{
                    ...styles.dot,
                    background: color,
                    boxShadow: `0 0 8px ${color}60`,
                  }}
                />
                {idx < events.length - 1 && <div style={styles.connector} />}
              </div>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.icon}>{icon}</span>
                  <span style={{ ...styles.typeBadge, background: `${color}20`, color }}>
                    {event.event_type}
                  </span>
                  <span style={styles.dept}>{event.department}</span>
                </div>
                <div style={styles.timestamp}>
                  {new Date(event.event_ts).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                {event.payload && (
                  <div style={styles.payload}>
                    {typeof event.payload === 'string'
                      ? event.payload
                      : JSON.stringify(event.payload, null, 2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: {
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(15,23,42,0.6)',
    backdropFilter: 'blur(12px)',
    padding: '20px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#e2e8f0',
    margin: '0 0 20px',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
  },
  item: {
    display: 'flex',
    gap: '16px',
    minHeight: '60px',
  },
  line: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '20px',
    flexShrink: 0,
  },
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: '6px',
  },
  connector: {
    width: '2px',
    flex: 1,
    background: 'rgba(255,255,255,0.08)',
    marginTop: '4px',
    marginBottom: '4px',
  },
  card: {
    flex: 1,
    padding: '10px 16px',
    marginBottom: '8px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  icon: { fontSize: '14px' },
  typeBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  dept: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 'auto',
  },
  timestamp: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
  },
  payload: {
    marginTop: '6px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    maxHeight: '60px',
    overflow: 'hidden',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '20px',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '13px',
    justifyContent: 'center',
  },
  emptyIcon: { fontSize: '20px' },
};
