// SQL tab — read-only SELECT/WITH playground.
// Backend (POST /admin/db/query) sanitizes the input and rejects anything
// that isn't a single SELECT/WITH statement. 5000-row hard cap.

import { useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const SAMPLES = [
  {
    label: 'Active events this weekend',
    sql: `SELECT title, venue, start_date, end_date, source_name
FROM events
WHERE active = true
  AND (start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 3
       OR (end_date IS NOT NULL AND start_date <= CURRENT_DATE + 3 AND end_date >= CURRENT_DATE))
ORDER BY start_date NULLS LAST
LIMIT 50`,
  },
  {
    label: 'Source coverage by category',
    sql: `SELECT category, COUNT(*) AS n
FROM events
WHERE active = true
GROUP BY category
ORDER BY n DESC`,
  },
  {
    label: 'Failing sources (catastrophic)',
    sql: `SELECT name, url, last_error, last_ok::date
FROM sources
WHERE active = true
  AND last_error ~* '(403|404|forbidden|all resolved urls failed)'
ORDER BY last_ok ASC NULLS FIRST`,
  },
  {
    label: 'Yield delta week-over-week',
    sql: `SELECT s.name, s.source_tier,
       COUNT(e.id) FILTER (WHERE e.updated_at >= NOW() - INTERVAL '7 days') AS this_wk,
       COUNT(e.id) FILTER (WHERE e.updated_at >= NOW() - INTERVAL '14 days'
                           AND e.updated_at < NOW() - INTERVAL '7 days') AS last_wk
FROM sources s LEFT JOIN events e ON e.source_id = s.id
WHERE s.active = true
GROUP BY s.id
HAVING COUNT(e.id) FILTER (WHERE e.updated_at >= NOW() - INTERVAL '14 days') > 0
ORDER BY this_wk - last_wk ASC
LIMIT 30`,
  },
  {
    label: 'Pinstripes-style duplicate hunt',
    sql: `SELECT venue, COUNT(*) AS n, string_agg(title, ' | ') AS titles
FROM events
WHERE active = true AND venue IS NOT NULL
GROUP BY venue
HAVING COUNT(*) >= 3
ORDER BY n DESC
LIMIT 20`,
  },
];

export default function SqlTab() {
  const [sql, setSql] = useState('SELECT category, COUNT(*) AS n\nFROM events\nWHERE active = true\nGROUP BY category\nORDER BY n DESC');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [limit, setLimit] = useState(500);

  const run = async () => {
    setRunning(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${BASE}/admin/db/query`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: sql, limit }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'unknown error');
      setResult(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 'calc(100vh - 130px)' }}>
      {/* Sample queries strip */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', alignSelf: 'center', marginRight: 4 }}>
          SAMPLES:
        </span>
        {SAMPLES.map(s => (
          <button key={s.label} onClick={() => setSql(s.sql)} style={{
            background: 'rgba(255,255,255,.05)', border: '0.5px solid rgba(255,255,255,.1)',
            color: 'rgba(255,255,255,.65)', padding: '3px 9px', borderRadius: 99,
            fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
          }}>{s.label}</button>
        ))}
      </div>

      {/* Editor */}
      <textarea
        value={sql}
        onChange={e => setSql(e.target.value)}
        onKeyDown={e => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); }
        }}
        placeholder="SELECT … FROM events WHERE …"
        style={{
          background: '#0F0E0C', border: '0.5px solid rgba(255,255,255,.12)',
          borderRadius: 8, padding: 12, color: 'rgba(255,255,255,.85)',
          fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 12, lineHeight: 1.55,
          resize: 'vertical', minHeight: 140, outline: 'none',
        }}
      />

      {/* Run + limit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={run} disabled={running} style={{
          background: 'rgba(201,168,76,.2)', border: '0.5px solid rgba(201,168,76,.45)',
          color: '#C9A84C', padding: '8px 18px', borderRadius: 8, fontSize: 12,
          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>{running ? 'Running…' : '▶ Run query (⌘↵)'}</button>
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
          Limit:
          <input type="number" value={limit} onChange={e => setLimit(Math.max(1, Math.min(5000, parseInt(e.target.value) || 500)))}
            style={{
              background: 'rgba(255,255,255,.06)', border: '0.5px solid rgba(255,255,255,.12)',
              color: 'rgba(255,255,255,.85)', padding: '4px 8px', borderRadius: 6,
              fontSize: 11, fontFamily: 'inherit', width: 80, marginLeft: 6,
            }} />
        </label>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginLeft: 'auto' }}>
          Read-only · only SELECT and WITH allowed · 5000 row max
        </span>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,.1)', border: '0.5px solid rgba(239,68,68,.3)',
          borderRadius: 8, padding: 12, color: '#ef4444', fontSize: 12, fontFamily: 'monospace',
        }}>{error}</div>
      )}

      {result && (
        <div style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
          background: 'rgba(0,0,0,.2)', border: '0.5px solid rgba(255,255,255,.08)',
          borderRadius: 8, overflow: 'hidden',
        }}>
          <div style={{
            padding: '6px 12px', borderBottom: '0.5px solid rgba(255,255,255,.08)',
            fontSize: 11, color: 'rgba(255,255,255,.5)', display: 'flex', gap: 14,
          }}>
            <span><strong>{result.rowCount?.toLocaleString()}</strong> rows</span>
            <span>{result.elapsed_ms}ms</span>
            {result.rowCount === result.limit && (
              <span style={{ color: '#F59E0B' }}>(hit limit)</span>
            )}
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11, fontFamily: 'monospace' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#1C1A17', zIndex: 2 }}>
                <tr>
                  {result.columns.map(col => (
                    <th key={col} style={{
                      textAlign: 'left', padding: '6px 8px',
                      borderBottom: '0.5px solid rgba(255,255,255,.1)',
                      color: 'rgba(255,255,255,.6)', fontWeight: 600, whiteSpace: 'nowrap',
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>
                    {result.columns.map(col => (
                      <td key={col} style={{
                        padding: '4px 8px', verticalAlign: 'top', maxWidth: 320,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        color: 'rgba(255,255,255,.75)',
                      }} title={String(row[col] ?? '')}>{formatCell(row[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
