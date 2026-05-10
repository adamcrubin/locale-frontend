// Suggestions tab — source_suggestions queue. Auto-discovered hosts that
// didn't auto-promote (singular events or single-aggregator hits with
// festival-style names) wait here for operator approve / reject.

import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function SuggestionsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState({});

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE}/admin/source-suggestions`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setItems(json.suggestions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    setActing(a => ({ ...a, [id]: action }));
    try {
      const res = await fetch(`${BASE}/admin/source-suggestions/${id}/${action}`, { method: 'POST' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      // Remove from list optimistically
      setItems(items => items.filter(i => i.id !== id));
    } catch (e) {
      setError(`${action} failed: ${e.message}`);
    } finally {
      setActing(a => { const next = { ...a }; delete next[id]; return next; });
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,.4)' }}>Loading suggestions…</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
          <strong style={{ color: '#C9A84C' }}>{items.length}</strong> pending suggestion{items.length === 1 ? '' : 's'}
        </span>
        <button onClick={load} style={{
          background: 'rgba(255,255,255,.06)', border: '0.5px solid rgba(255,255,255,.12)',
          color: 'rgba(255,255,255,.7)', padding: '4px 10px', borderRadius: 6,
          fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto',
        }}>↻ Refresh</button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,.1)', border: '0.5px solid rgba(239,68,68,.3)',
          borderRadius: 8, padding: 12, color: '#ef4444', fontSize: 12, marginBottom: 12,
        }}>{error}</div>
      )}

      {items.length === 0 && !error && (
        <div style={{
          padding: 30, textAlign: 'center', color: 'rgba(255,255,255,.35)',
          background: 'rgba(255,255,255,.02)', borderRadius: 8, fontSize: 13,
        }}>
          No pending suggestions. New candidate sources surface here when discovered by Pipeline 3 stage 5.
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {items.map(item => (
          <div key={item.id} style={{
            background: 'rgba(255,255,255,.03)', border: '0.5px solid rgba(255,255,255,.08)',
            borderRadius: 8, padding: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.9)' }}>
                {item.name || item.host || 'unnamed'}
              </span>
              <a href={item.url} target="_blank" rel="noreferrer" style={{
                fontSize: 11, color: 'rgba(255,255,255,.5)', textDecoration: 'underline',
                fontFamily: 'monospace',
              }}>{item.url} ↗</a>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span>seen by <strong>{item.aggregator_count ?? '?'}</strong> aggregator{item.aggregator_count === 1 ? '' : 's'}</span>
              <span>distinct titles: <strong>{item.distinct_titles ?? '?'}</strong></span>
              {item.singular_event && <span style={{ color: '#F59E0B' }}>flagged as singular event</span>}
              {item.created_at && <span style={{ color: 'rgba(255,255,255,.35)' }}>queued {item.created_at}</span>}
            </div>
            {item.sample_titles && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginBottom: 6 }}>
                e.g. {Array.isArray(item.sample_titles) ? item.sample_titles.slice(0, 3).join(' · ') : item.sample_titles}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => act(item.id, 'approve')} disabled={acting[item.id]}
                style={btnGreen}>{acting[item.id] === 'approve' ? '…' : 'Approve'}</button>
              <button onClick={() => act(item.id, 'reject')} disabled={acting[item.id]}
                style={btnRed}>{acting[item.id] === 'reject' ? '…' : 'Reject'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const btnGreen = {
  background: 'rgba(34,197,94,.15)', border: '0.5px solid rgba(34,197,94,.4)',
  color: '#22c55e', padding: '5px 12px', borderRadius: 6, fontSize: 11,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
const btnRed = {
  background: 'rgba(239,68,68,.15)', border: '0.5px solid rgba(239,68,68,.4)',
  color: '#ef4444', padding: '5px 12px', borderRadius: 6, fontSize: 11,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
