// Health tab — Pipeline 2 yield monitoring + triage view.
// Reads /api/admin/sources/health (cached parser_health from last cron run).
// Has a "Run probe now" button that fires /api/cron/source-health and refreshes.

import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const HEALTH_COLORS = {
  healthy: { bg: 'rgba(34,197,94,.1)',  border: 'rgba(34,197,94,.3)',  text: '#22c55e' },
  drifted: { bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.3)', text: '#F59E0B' },
  broken:  { bg: 'rgba(239,68,68,.1)',  border: 'rgba(239,68,68,.3)',  text: '#ef4444' },
  unknown: { bg: 'rgba(148,163,184,.1)', border: 'rgba(148,163,184,.3)', text: '#94A3B8' },
};

function formatRelativeTime(iso) {
  if (!iso) return 'never';
  try {
    const t = new Date(iso).getTime();
    if (isNaN(t)) return iso;
    const diffMin = (Date.now() - t) / 60000;
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${Math.round(diffMin)}m ago`;
    if (diffMin < 60 * 24) return `${Math.round(diffMin / 60)}h ago`;
    return `${Math.round(diffMin / 60 / 24)}d ago`;
  } catch { return iso; }
}

export default function HealthTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState({ broken: true, drifted: true, unknown: false, healthy: false });

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE}/admin/sources/health`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'unknown error');
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const runProbe = async () => {
    setRunning(true); setError(null);
    try {
      const res = await fetch(`${BASE}/cron/source-health`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'probe failed');
      // Re-load the cached view after probe completes (which updated rows)
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading && !data) return <Skeleton />;
  if (error) return <ErrorBox msg={error} onRetry={load} />;
  if (!data) return null;

  const { summary, sources, total_active } = data;
  // Group sources by health status
  const byHealth = { broken: [], drifted: [], unknown: [], healthy: [] };
  for (const s of sources) {
    const h = s.parser_health || 'unknown';
    if (byHealth[h]) byHealth[h].push(s);
  }

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
          <strong style={{ color: '#C9A84C' }}>{total_active}</strong> active sources
        </span>
        <Pill label="healthy" count={summary.healthy} color="healthy" />
        <Pill label="drifted" count={summary.drifted} color="drifted" />
        <Pill label="broken"  count={summary.broken}  color="broken" />
        <Pill label="unknown" count={summary.unknown} color="unknown" />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={load} disabled={loading} style={btn('ghost')}>↻ Refresh</button>
          <button onClick={runProbe} disabled={running} style={btn('primary')}>
            {running ? 'Running…' : 'Run probe now'}
          </button>
        </div>
      </div>

      {/* Sections */}
      {['broken', 'drifted', 'unknown', 'healthy'].map(h => (
        <Section
          key={h}
          health={h}
          sources={byHealth[h]}
          expanded={expanded[h]}
          onToggle={() => setExpanded(e => ({ ...e, [h]: !e[h] }))}
        />
      ))}
    </div>
  );
}

function Pill({ label, count, color }) {
  const c = HEALTH_COLORS[color];
  return (
    <span style={{
      background: c.bg, border: `0.5px solid ${c.border}`, color: c.text,
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
    }}>
      <strong>{count}</strong> {label}
    </span>
  );
}

function Section({ health, sources, expanded, onToggle }) {
  if (sources.length === 0) return null;
  const c = HEALTH_COLORS[health];
  const labelMap = { broken: 'Broken', drifted: 'Drifted', unknown: 'Unknown', healthy: 'Healthy' };
  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={onToggle} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8,
        color: c.text, fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
      }}>
        <span style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 120ms' }}>▶</span>
        {labelMap[health]} ({sources.length})
      </button>
      {expanded && (
        <div style={{ display: 'grid', gap: 6 }}>
          {sources.map(s => <SourceCard key={s.id} source={s} health={health} />)}
        </div>
      )}
    </div>
  );
}

function SourceCard({ source, health }) {
  const c = HEALTH_COLORS[health];
  return (
    <div style={{
      background: 'rgba(255,255,255,.03)', border: `0.5px solid ${c.border}`,
      borderRadius: 6, padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{
          background: c.bg, color: c.text, fontSize: 9, padding: '1px 5px',
          borderRadius: 3, fontWeight: 700, letterSpacing: '.05em',
        }}>{source.source_tier || '?'}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)' }}>
          {source.name}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
          checked {formatRelativeTime(source.parser_health_at)}
        </span>
      </div>
      {source.parser_health_reason && (
        <div style={{ fontSize: 11, color: c.text, marginBottom: 4 }}>
          {source.parser_health_reason}
        </div>
      )}
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span>{source.events_7d}/wk · {source.events_7d_prior} prior · {source.events_30d} 30d · {source.total_events} lifetime</span>
        {source.last_ok && <span>last ok: {formatRelativeTime(source.last_ok)}</span>}
        {source.url && (
          <a href={source.url} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,.4)', textDecoration: 'underline' }}>
            ↗ source URL
          </a>
        )}
      </div>
      {source.last_error && health === 'broken' && (
        <div style={{
          marginTop: 6, padding: '6px 8px', background: 'rgba(239,68,68,.08)',
          borderRadius: 4, fontSize: 10, color: 'rgba(239,68,68,.85)', fontFamily: 'monospace',
        }}>
          {source.last_error}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,.4)' }}>Loading health…</div>;
}

function ErrorBox({ msg, onRetry }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,.1)', border: '0.5px solid rgba(239,68,68,.3)',
      borderRadius: 8, padding: 16, color: '#ef4444', fontSize: 13,
    }}>
      Error: {msg}
      <button onClick={onRetry} style={{ marginLeft: 12, ...btn('ghost') }}>Retry</button>
    </div>
  );
}

function btn(variant) {
  if (variant === 'primary') {
    return {
      background: 'rgba(201,168,76,.2)', border: '0.5px solid rgba(201,168,76,.45)',
      color: '#C9A84C', padding: '6px 14px', borderRadius: 8, fontSize: 12,
      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    };
  }
  return {
    background: 'rgba(255,255,255,.06)', border: '0.5px solid rgba(255,255,255,.12)',
    color: 'rgba(255,255,255,.7)', padding: '6px 14px', borderRadius: 8, fontSize: 12,
    cursor: 'pointer', fontFamily: 'inherit',
  };
}
