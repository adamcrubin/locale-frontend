// Tables tab — generic DB table viewer.
// Lists whitelisted tables on the left, picks one, shows paginated rows.
// Supports search across all text columns + sortable columns.

import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function TablesTab() {
  const [tables, setTables] = useState([]);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState({ col: null, dir: 'desc' });
  const PAGE_SIZE = 50;

  // Load table list once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE}/admin/db/tables`);
        const json = await res.json();
        if (json.ok) {
          setTables(json.tables);
          if (!selected && json.tables.length) setSelected(json.tables[0].name);
        }
      } catch (e) { setError(e.message); }
    })();
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when changing table or search
  useEffect(() => { setPage(0); }, [selected, debouncedSearch]);

  // Load rows
  useEffect(() => {
    if (!selected) return;
    setLoading(true); setError(null);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (order.col) { params.set('order', order.col); params.set('dir', order.dir); }
    (async () => {
      try {
        const res = await fetch(`${BASE}/admin/db/table/${selected}?${params}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'unknown error');
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [selected, page, debouncedSearch, order]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, height: 'calc(100vh - 130px)' }}>
      {/* Left: table picker */}
      <div style={{
        background: 'rgba(255,255,255,.03)', border: '0.5px solid rgba(255,255,255,.08)',
        borderRadius: 8, padding: 8, overflowY: 'auto',
      }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Tables
        </div>
        {tables.map(t => (
          <button key={t.name} onClick={() => setSelected(t.name)} style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: selected === t.name ? 'rgba(201,168,76,.15)' : 'transparent',
            border: 'none', padding: '6px 8px', borderRadius: 6,
            fontSize: 12, color: selected === t.name ? '#C9A84C' : 'rgba(255,255,255,.7)',
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 2,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'monospace' }}>{t.name}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,.4)' }}>{t.count?.toLocaleString() ?? '—'}</span>
            </div>
            {t.error && <div style={{ fontSize: 9, color: '#ef4444' }}>{t.error}</div>}
          </button>
        ))}
      </div>

      {/* Right: rows */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Search + pagination strip */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${selected || '…'} (ILIKE all text columns)`}
            style={{
              padding: '6px 11px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,.12)',
              background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.85)',
              fontSize: 12, fontFamily: 'inherit', outline: 'none', flex: '1 1 240px', minWidth: 0,
            }}
          />
          {data && (
            <>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
                {data.total.toLocaleString()} rows · page {page + 1} of {Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
              </span>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={pgBtn}>← prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= data.total}
                style={pgBtn}>next →</button>
            </>
          )}
        </div>

        {error && <ErrorBox msg={error} />}

        {loading && !data && <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,.4)' }}>Loading…</div>}

        {data && (
          <div style={{
            overflow: 'auto', flex: 1, border: '0.5px solid rgba(255,255,255,.08)',
            borderRadius: 8, background: 'rgba(0,0,0,.2)',
          }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11, fontFamily: 'monospace' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#1C1A17', zIndex: 2 }}>
                <tr>
                  {data.columns.map(col => (
                    <th key={col} onClick={() => setOrder(o => ({
                      col,
                      dir: o.col === col && o.dir === 'desc' ? 'asc' : 'desc',
                    }))} style={{
                      textAlign: 'left', padding: '6px 8px', borderBottom: '0.5px solid rgba(255,255,255,.1)',
                      color: order.col === col ? '#C9A84C' : 'rgba(255,255,255,.6)',
                      fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>
                      {col} {order.col === col && (order.dir === 'desc' ? '↓' : '↑')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>
                    {data.columns.map(col => (
                      <td key={col} style={{
                        padding: '4px 8px', verticalAlign: 'top', maxWidth: 320,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        color: 'rgba(255,255,255,.75)',
                      }} title={String(row[col] ?? '')}>
                        {formatCell(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCell(v) {
  if (v == null) return <span style={{ color: 'rgba(255,255,255,.25)' }}>null</span>;
  if (typeof v === 'boolean') return v ? '✓' : '✕';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  return s.length > 80 ? s.slice(0, 80) + '…' : s;
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,.1)', border: '0.5px solid rgba(239,68,68,.3)',
      borderRadius: 8, padding: 12, color: '#ef4444', fontSize: 12, marginBottom: 10,
    }}>Error: {msg}</div>
  );
}

const pgBtn = {
  background: 'rgba(255,255,255,.06)', border: '0.5px solid rgba(255,255,255,.12)',
  color: 'rgba(255,255,255,.7)', padding: '4px 10px', borderRadius: 6,
  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
};
