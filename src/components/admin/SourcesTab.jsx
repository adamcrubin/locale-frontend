// Sources tab — canonical source admin: list, add, test, edit extractor,
// toggle headless, run validation probe, replay fixtures, enable/disable.
// The Suggestions tab handles the auto-discovered candidates queue.

import { useEffect, useState } from 'react';
import ExtractorEditor from './ExtractorEditor';
import ValidationModal from './ValidationModal';
import AddSourceModal from './AddSourceModal';
import TestSourceModal from './TestSourceModal';

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
  const [editing, setEditing] = useState(null); // source whose extractor we're editing
  const [validating, setValidating] = useState(null); // source id currently being validated
  const [validationModal, setValidationModal] = useState(null); // { source, report }
  const [headlessStatus, setHeadlessStatus] = useState(null); // { configured, provider }
  const [headlessToggling, setHeadlessToggling] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [testing, setTesting] = useState(null); // source being tested
  const [toggling, setToggling] = useState(null); // source id currently being active-toggled

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

    // One-time check for headless config so we can show a warning when
    // sources have use_headless=true but no provider is set server-side.
    fetch(`${BASE}/admin/headless/status`)
      .then(r => r.json())
      .then(j => j.ok && setHeadlessStatus(j))
      .catch(() => {});
  }, []);

  const reload = () => {
    fetch(`${BASE}/admin/sources/health`).then(r => r.json()).then(j => j.ok && setData(j));
  };

  const toggleActive = async (source) => {
    const next = !source.active;
    setToggling(source.id);
    try {
      const res = await fetch(`${BASE}/admin/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ active: next }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      setData(d => ({ ...d, sources: d.sources.map(s => s.id === source.id ? { ...s, active: next } : s) }));
    } catch (e) {
      alert(`Toggle failed: ${e.message}`);
    } finally {
      setToggling(null);
    }
  };

  const toggleHeadless = async (source) => {
    setHeadlessToggling(source.id);
    const next = !source.use_headless;
    try {
      const res = await fetch(`${BASE}/admin/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ use_headless: next }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      setData(d => ({
        ...d,
        sources: d.sources.map(s => s.id === source.id ? { ...s, use_headless: next } : s),
      }));
    } catch (e) {
      alert(`Toggle failed: ${e.message}`);
    } finally {
      setHeadlessToggling(null);
    }
  };

  const runValidation = async (source) => {
    setValidating(source.id);
    try {
      const res = await fetch(`${BASE}/admin/sources/${source.id}/validate`, { method: 'POST' });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      // Refresh the source row in state
      setData(d => ({
        ...d,
        sources: d.sources.map(s => s.id === source.id
          ? { ...s, validation_status: j.status, validation_report: j, validation_at: j.probed_at }
          : s),
      }));
      // Auto-open the modal so the operator sees the recommendation
      setValidationModal({ source, report: j });
    } catch (e) {
      alert(`Validation failed: ${e.message}`);
    } finally {
      setValidating(null);
    }
  };

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

  const headlessNeedingConfig = sources.some(s => s.use_headless) && headlessStatus && !headlessStatus.configured;

  return (
    <div>
      {headlessNeedingConfig && (
        <div style={{
          marginBottom: 12, padding: '10px 14px',
          background: 'rgba(245,158,11,.1)', border: '0.5px solid rgba(245,158,11,.4)',
          borderRadius: 8, fontSize: 12, color: '#F59E0B',
        }}>
          ⚠️ One or more sources have <code style={{ background: 'rgba(0,0,0,.2)', padding: '1px 5px', borderRadius: 3 }}>use_headless=true</code> but no headless provider is configured server-side.
          Set <code style={{ background: 'rgba(0,0,0,.2)', padding: '1px 5px', borderRadius: 3 }}>HEADLESS_PROVIDER</code> and <code style={{ background: 'rgba(0,0,0,.2)', padding: '1px 5px', borderRadius: 3 }}>HEADLESS_API_KEY</code> on Render. Until then those sources fall back to web search.
        </div>
      )}
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
        <button onClick={() => setAddOpen(true)} style={{
          background: 'rgba(201,168,76,.2)', border: '0.5px solid rgba(201,168,76,.45)',
          color: '#C9A84C', padding: '5px 12px', borderRadius: 6, fontSize: 11,
          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>+ Add source</button>
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
              <Th>headless</Th>
              <Th>validation</Th>
              <Th>diagnosis</Th>
              <Th>actions</Th>
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
                <Td>
                  <button onClick={() => toggleHeadless(s)} disabled={headlessToggling === s.id}
                    title={s.use_headless ? 'Routes through HEADLESS_PROVIDER. Click to disable.' : 'Use direct HTTP. Click to route through headless browser (for SPAs).'}
                    style={{
                      background: s.use_headless ? 'rgba(139,92,246,.15)' : 'rgba(255,255,255,.04)',
                      border: `0.5px solid ${s.use_headless ? 'rgba(139,92,246,.45)' : 'rgba(255,255,255,.12)'}`,
                      color: s.use_headless ? '#C4B5FD' : 'rgba(255,255,255,.4)',
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}>
                    {s.use_headless ? '🌐 on' : 'off'}
                  </button>
                </Td>
                <Td>
                  <ValidationCell
                    source={s}
                    busy={validating === s.id}
                    onValidate={() => runValidation(s)}
                    onView={() => setValidationModal({ source: s, report: s.validation_report })}
                  />
                </Td>
                <Td><span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>
                  {s.parser_health_reason || s.last_error || '—'}
                </span></Td>
                <Td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setTesting(s)} title="Run test scrape + extract"
                      style={iconBtn('#60A5FA')}>🧪</button>
                    <button onClick={() => toggleActive(s)} disabled={toggling === s.id}
                      title={s.active ? 'Disable source' : 'Enable source'}
                      style={iconBtn(s.active ? '#ef4444' : '#22c55e')}>
                      {s.active ? '⊘' : '✓'}
                    </button>
                  </div>
                </Td>
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

      {validationModal && (
        <ValidationModal
          source={validationModal.source}
          report={validationModal.report}
          onClose={() => setValidationModal(null)}
        />
      )}

      {addOpen && (
        <AddSourceModal
          onClose={() => setAddOpen(false)}
          onAdded={() => { setAddOpen(false); reload(); }}
        />
      )}

      {testing && (
        <TestSourceModal source={testing} onClose={() => setTesting(null)} />
      )}
    </div>
  );
}

function iconBtn(color) {
  return {
    background: `${color}1f`, border: `0.5px solid ${color}66`, color,
    padding: '2px 7px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
    fontFamily: 'inherit', minWidth: 26,
  };
}

function ValidationCell({ source, busy, onValidate, onView }) {
  const status = source.validation_status;
  const rec = source.validation_report?.recommendation;
  const colorMap = {
    validated: { bg: 'rgba(34,197,94,.12)',  bd: 'rgba(34,197,94,.4)',  fg: '#22c55e' },
    failed:    { bg: 'rgba(239,68,68,.12)',  bd: 'rgba(239,68,68,.4)',  fg: '#ef4444' },
    pending:   { bg: 'rgba(245,158,11,.12)', bd: 'rgba(245,158,11,.4)', fg: '#F59E0B' },
  };
  const c = colorMap[status] || { bg: 'rgba(255,255,255,.04)', bd: 'rgba(255,255,255,.12)', fg: 'rgba(255,255,255,.5)' };
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {status ? (
        <button onClick={onView} style={{
          background: c.bg, border: `0.5px solid ${c.bd}`, color: c.fg,
          padding: '2px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
          fontFamily: 'inherit',
        }} title={`Recommendation: ${rec || '?'}\nClick to view report`}>
          {status}{rec ? ` · ${rec}` : ''}
        </button>
      ) : (
        <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 10 }}>—</span>
      )}
      <button onClick={onValidate} disabled={busy} style={{
        background: 'rgba(99,102,241,.12)', border: '0.5px solid rgba(99,102,241,.4)',
        color: '#A5B4FC', padding: '2px 8px', borderRadius: 4, fontSize: 10,
        cursor: 'pointer', fontFamily: 'inherit',
      }} title="Probe URL + structured data + run a sample extraction">
        {busy ? '…' : status ? '↻' : 'probe'}
      </button>
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
