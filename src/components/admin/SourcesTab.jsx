// Sources tab — list of all sources with tier / health / event count / last_error.
// Lighter than the legacy SourcesScreen overlay — focused on diagnosis, not adding.
// (Add-source workflow lives in Sources screen for now; Suggestions tab handles
// auto-discovered candidates.)

import { useEffect, useState } from 'react';
import ExtractorEditor from './ExtractorEditor';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const TIER_COLORS = {
  A: '#C9A84C', B: '#60A5FA', C: 'rgba(255,255,255,.5)', D: '#94A3B8',
};
const HEALTH_COLORS = {
  healthy: '#22c55e', drifted: '#F59E0B', broken: '#ef4444', unknown: '#94A3B8',
};

export default function SourcesTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all | active | broken | drifted | inactive
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('events'); // events | tier | last_ok | name
  const [editing, setEditing] = useState(null); // source object whose extractor we're editing

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`${BASE}/admin/sources/health`)
      .then(r => r.json())
      .then(json => {
        if (!json.ok) throw new Error(json.error);
        setData(json);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,.4)' }}>Loading sources…</div>;
  if (error) return <ErrorBox msg={error} />;
  if (!data) return null;

  let sources = data.sources;
  if (filter === 'broken')   sources = sources.filter(s => s.parser_health === 'broken');
  if (filter === 'drifted')  sources = sources.filter(s => s.parser_health === 'drifted');
  if (filter === 'inactive') sources = sources.filter(s => !s.active);

  if (search) {
    const q = search.toLowerCase();
    sources = sources.filter(s =>
      s.name.toLowerCase().includes(q) || (s.url || '').toLowerCase().includes(q)
    );
  }

  const sortFns = {
    events:  (a, b) => Number(b.events_7d) - Number(a.events_7d),
    tier:    (a, b) => (a.source_tier || 'C').localeCompare(b.source_tier || 'C'),
    last_ok: (a, b) => new Date(b.last_ok || 0) - new Date(a.last_ok || 0),
    name:    (a, b) => a.name.localeCompare(b.name),
  };
  sources = [...sources].sort(sortFns[sort] || sortFns.events);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name or URL…"
          style={inputStyle} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={selectStyle}>
          <option value="all">All ({data.total_active} active)</option>
          <option value="broken">Broken ({data.summary.broken})</option>
          <option value="drifted">Drifted ({data.summary.drifted})</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle}>
          <option value="events">Sort: events this week</option>
          <option value="tier">Sort: tier</option>
          <option value="last_ok">Sort: most recent</option>
          <option value="name">Sort: A-Z</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
          {sources.length} matching
        </span>
      </div>

      <div style={{
        overflow: 'auto', border: '0.5px solid rgba(255,255,255,.08)',
        borderRadius: 8, background: 'rgba(0,0,0,.2)',
      }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
          <thead style={{ position: 'sticky', top: 0, background: '#1C1A17', zIndex: 2 }}>
            <tr>
              <Th>Name</Th>
              <Th>Tier</Th>
              <Th>Health</Th>
              <Th align="right">7d</Th>
              <Th align="right">14d-prior</Th>
              <Th align="right">30d</Th>
              <Th align="right">total</Th>
              <Th>last_ok</Th>
              <Th>extractor</Th>
              <Th>diagnosis</Th>
            </tr>
          </thead>
          <tbody>
            {sources.map(s => (
              <tr key={s.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>
                <Td><a href={s.url} target="_blank" rel="noreferrer"
                  style={{ color: 'rgba(255,255,255,.85)', textDecoration: 'none' }}>{s.name}</a></Td>
                <Td><span style={{ color: TIER_COLORS[s.source_tier] || '#fff', fontWeight: 700, fontSize: 10 }}>{s.source_tier || '?'}</span></Td>
                <Td><HealthDot health={s.parser_health} /></Td>
                <Td align="right" mono>{s.events_7d}</Td>
                <Td align="right" mono>{s.events_7d_prior}</Td>
                <Td align="right" mono>{s.events_30d}</Td>
                <Td align="right" mono>{s.total_events}</Td>
                <Td mono>{formatDate(s.last_ok)}</Td>
                <Td>
                  <button onClick={() => setEditing(s)} style={{
                    background: s.extractor_config ? 'rgba(34,197,94,.12)' : 'rgba(255,255,255,.04)',
                    border: `0.5px solid ${s.extractor_config ? 'rgba(34,197,94,.4)' : 'rgba(255,255,255,.12)'}`,
                    color: s.extractor_config ? '#22c55e' : 'rgba(255,255,255,.5)',
                    padding: '2px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>{s.extractor_config ? '✓ edit' : '+ add'}</button>
                </Td>
                <Td><span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>
                  {s.parser_health_reason || s.last_error || '—'}
                </span></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ExtractorEditor
          source={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            // Optimistically merge updated row
            setData(d => ({
              ...d,
              sources: d.sources.map(s => s.id === updated.id ? { ...s, ...updated } : s),
            }));
          }}
        />
      )}
    </div>
  );
}

function Th({ children, align = 'left' }) {
  return (
    <th style={{
      textAlign: align, padding: '6px 8px', borderBottom: '0.5px solid rgba(255,255,255,.1)',
      color: 'rgba(255,255,255,.6)', fontWeight: 600, whiteSpace: 'nowrap',
    }}>{children}</th>
  );
}

function Td({ children, align = 'left', mono = false }) {
  return (
    <td style={{
      textAlign: align, padding: '5px 8px', verticalAlign: 'top',
      fontFamily: mono ? 'monospace' : 'inherit',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320,
    }}>{children}</td>
  );
}

function HealthDot({ health }) {
  const color = HEALTH_COLORS[health] || HEALTH_COLORS.unknown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 4px ${color}aa` }} />
      <span style={{ color, fontSize: 10 }}>{health || 'unknown'}</span>
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return <span style={{ color: 'rgba(255,255,255,.25)' }}>never</span>;
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 16).replace('T', ' ');
  } catch { return iso; }
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,.1)', border: '0.5px solid rgba(239,68,68,.3)',
      borderRadius: 8, padding: 12, color: '#ef4444', fontSize: 12,
    }}>Error: {msg}</div>
  );
}

const inputStyle = {
  padding: '6px 11px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,.12)',
  background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.85)',
  fontSize: 12, fontFamily: 'inherit', outline: 'none', flex: '1 1 220px', minWidth: 0,
};
const selectStyle = {
  padding: '6px 10px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,.12)',
  background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.75)',
  fontSize: 11, fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
};
