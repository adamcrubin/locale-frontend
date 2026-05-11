// Overview tab — the default admin landing page. Consolidates the
// 6-7 daily-driver views into preset cards. No SQL required.
//
// Powered by GET /api/admin/overview which bundles parallel SELECTs
// into one response.

import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// One-tap operational jobs surfaced in the Overview tab so the operator
// can recover from the iPad without dropping to curl. Each entry is a
// POST against an existing admin endpoint; result text appears inline.
const QUICK_FIXES = [
  {
    id: 'pipeline',
    label: '🔥 Run full pipeline (force)',
    path: '/admin/refresh/scrape',
    body: { force: true },
    desc: 'Scrape + extract + backfill + merge against every active source. Bypasses the same-content hash skip. ~$1 in Anthropic credits per run.',
  },
  {
    id: 'health',
    label: '🏥 Source health probe',
    path: '/cron/source-health',
    desc: 'Classify every active source as healthy/drifted/broken/unknown. Updates parser_health columns so the Health tab + Sources tab show triage state.',
  },
  {
    id: 'heal',
    label: '🩹 Run all heals',
    path: '/cron/heal',
    desc: 'Stale-expiry, null categories, missing venues, Option-2 remap, pattern recategorization, article-title kill, sponsored rotation. Idempotent.',
  },
  {
    id: 'sweep',
    label: '🪣 Sweep never-produced sources',
    path: '/admin/sources/sweep',
    body: { filter: 'never-produced' },
    desc: 'Targeted scrape against sources that have never produced events. Useful after BLOCKED_SITES updates or new source seeds.',
  },
  {
    id: 'stale',
    label: '🧹 Kill stale undated events',
    path: '/admin/cleanup/stale-undated',
    desc: 'Deactivate rows with start_date in past + end_date null. Catches series wrappers (e.g. Sunset Cinema at The Wharf) that escape the stale-expiry heal.',
    confirm: true,
  },
];

export default function OverviewTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fixResults, setFixResults] = useState({});
  const [fixRunning, setFixRunning] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE}/admin/overview`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runFix = async (fix) => {
    if (fix.confirm && !confirm(`Run "${fix.label}"? ${fix.desc}`)) return;
    setFixRunning(fix.id);
    setFixResults(r => ({ ...r, [fix.id]: { running: true } }));
    const start = Date.now();
    try {
      const res = await fetch(`${BASE}${fix.path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: fix.body ? JSON.stringify(fix.body) : '{}',
      });
      const j = await res.json().catch(() => ({ ok: false, error: 'invalid JSON' }));
      const elapsed = Math.round((Date.now() - start) / 1000);
      setFixResults(r => ({
        ...r,
        [fix.id]: {
          ok: !!j.ok,
          ts: new Date().toLocaleTimeString(),
          elapsed,
          summary: j.summary || j,
          error: j.ok ? null : (j.error || `HTTP ${res.status}`),
        },
      }));
      // Refresh the overview data after a successful op so the cards reflect it
      if (j.ok) load();
    } catch (e) {
      setFixResults(r => ({ ...r, [fix.id]: { ok: false, error: e.message, ts: new Date().toLocaleTimeString() } }));
    } finally {
      setFixRunning(null);
    }
  };

  if (loading && !data) return <Skeleton />;
  if (error) return <ErrorBox msg={error} onRetry={load} />;
  if (!data) return null;

  const totalCats = data.weekend_by_category.reduce((acc, c) => acc + Number(c.n), 0);
  const sh = data.source_health;
  const pip = data.pipeline;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Top strip — quick refresh */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
          Weekend window: <strong style={{ color: '#C9A84C' }}>{data.weekend.fri} → {data.weekend.sun}</strong>
        </span>
        <button onClick={load} style={refreshBtn}>↻ Refresh</button>
      </div>

      {/* Quick fixes — operator-tappable from the iPad without curl */}
      <Card title="Quick fixes · one-tap ops" accent="#C4B5FD">
        <div style={{ display: 'grid', gap: 8 }}>
          {QUICK_FIXES.map(fix => {
            const r = fixResults[fix.id];
            return (
              <div key={fix.id} style={{
                background: 'rgba(255,255,255,.03)', border: '0.5px solid rgba(255,255,255,.08)',
                borderRadius: 8, padding: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <button onClick={() => runFix(fix)} disabled={fixRunning === fix.id || r?.running}
                    style={{
                      background: r?.ok === false ? 'rgba(239,68,68,.15)'
                                : r?.ok === true ? 'rgba(34,197,94,.15)'
                                : 'rgba(139,92,246,.18)',
                      border: `0.5px solid ${r?.ok === false ? 'rgba(239,68,68,.4)'
                                          : r?.ok === true ? 'rgba(34,197,94,.4)'
                                          : 'rgba(139,92,246,.45)'}`,
                      color: r?.ok === false ? '#ef4444'
                           : r?.ok === true ? '#22c55e'
                           : '#C4B5FD',
                      padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit', minWidth: 220, textAlign: 'left',
                    }}>
                    {r?.running ? 'Running…' : fix.label}
                  </button>
                  {r?.ts && (
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
                      {r.ok ? '✓' : '✕'} {r.ts}{r.elapsed != null ? ` (${r.elapsed}s)` : ''}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', lineHeight: 1.5, marginLeft: 0 }}>
                  {fix.desc}
                </div>
                {r?.error && (
                  <div style={{
                    marginTop: 6, padding: '5px 8px',
                    background: 'rgba(239,68,68,.08)', borderRadius: 4,
                    fontSize: 10, color: '#ef4444', fontFamily: 'monospace',
                  }}>{r.error}</div>
                )}
                {r?.summary && r.ok && (
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', cursor: 'pointer' }}>
                      Result
                    </summary>
                    <pre style={{
                      margin: '4px 0 0', padding: 6, background: 'rgba(0,0,0,.3)',
                      borderRadius: 3, fontSize: 9, fontFamily: 'monospace',
                      color: 'rgba(255,255,255,.55)', maxHeight: 180, overflowY: 'auto',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    }}>{JSON.stringify(r.summary, null, 2)}</pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Row 1 — This weekend by category */}
      <Card title={`This weekend's events · ${totalCats} total`} accent="#C9A84C">
        {data.weekend_by_category.length === 0 ? (
          <Empty>No events queued for this weekend yet.</Empty>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
            {data.weekend_by_category.map(c => (
              <Stat key={c.category || 'null'} label={c.category || '(null)'} value={c.n} />
            ))}
          </div>
        )}
      </Card>

      {/* Row 2 — Source health + Pipeline activity (split) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card title="Source health" accent="#22c55e">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <Stat label="healthy" value={sh.healthy ?? 0} color="#22c55e" />
            <Stat label="drifted" value={sh.drifted ?? 0} color="#F59E0B" />
            <Stat label="broken"  value={sh.broken  ?? 0} color="#ef4444" />
            <Stat label="unknown" value={sh.unknown ?? 0} color="#94A3B8" />
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 8, lineHeight: 1.5 }}>
            View detail in the Health tab. Click sources to triage broken / drifted parsers.
          </div>
        </Card>

        <Card title="Pipeline activity" accent="#60A5FA">
          <KV k="Last scrape"          v={relative(pip?.last_scrape)} />
          <KV k="Last event update"    v={relative(pip?.last_event_update)} />
          <KV k="Pending suggestions"  v={pip?.pending_suggestions ?? 0} />
          <KV k="Active total"         v={data.event_totals?.active_total ?? 0} />
          <KV k="Recurring"            v={data.event_totals?.recurring ?? 0} />
          <KV k="Backfill pending"     v={data.event_totals?.backfill_pending ?? 0} />
        </Card>
      </div>

      {/* Row 3 — Recent extractions */}
      <Card title="Recent extractions · last 24h" accent="#A5B4FC">
        {data.recent_extractions.length === 0 ? (
          <Empty>No new events in the last 24 hours.</Empty>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
            <thead>
              <tr>
                <Th>Source</Th>
                <Th align="right">New events</Th>
                <Th>Latest</Th>
              </tr>
            </thead>
            <tbody>
              {data.recent_extractions.map(r => (
                <tr key={r.name} style={{ borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>
                  <Td>{r.name}</Td>
                  <Td align="right" mono>{r.new_events}</Td>
                  <Td mono dim>{relative(r.latest)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Row 4 — Duplicate hunt */}
      <Card title="Possible duplicates · venues with 3+ active events" accent="#F59E0B">
        {data.duplicates.length === 0 ? (
          <Empty>No suspicious clusters — merge pass is doing its job.</Empty>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {data.duplicates.map(d => (
              <div key={d.venue} style={{
                background: 'rgba(255,255,255,.03)', border: '0.5px solid rgba(255,255,255,.08)',
                borderRadius: 6, padding: '8px 10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.9)' }}>{d.venue}</span>
                  <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 700 }}>{d.n}x</span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {d.titles}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Row 5 — Sponsored rotation status */}
      {data.sponsored_active && (
        <Card title="Sponsored rotation · active this week" accent="#C4B5FD">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.9)' }}>
              {data.sponsored_active.title}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>
              {data.sponsored_active.start_date} → expires {data.sponsored_active.expires_at}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Small UI primitives ────────────────────────────────────────────────────

function Card({ title, accent, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,.03)', border: '0.5px solid rgba(255,255,255,.08)',
      borderRadius: 10, padding: 14,
    }}>
      <div style={{
        fontSize: 11, color: accent, marginBottom: 10,
        textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700,
      }}>{title}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{
      padding: '8px 10px', borderRadius: 8,
      background: 'rgba(255,255,255,.04)',
    }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 700, marginTop: 2,
        color: color || 'rgba(255,255,255,.85)',
      }}>{value}</div>
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>
      <span style={{ color: 'rgba(255,255,255,.5)' }}>{k}</span>
      <span style={{ color: 'rgba(255,255,255,.85)', fontWeight: 600 }}>{v}</span>
    </div>
  );
}

function Th({ children, align = 'left' }) {
  return (
    <th style={{
      textAlign: align, padding: '6px 8px', borderBottom: '0.5px solid rgba(255,255,255,.1)',
      color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em',
    }}>{children}</th>
  );
}

function Td({ children, align = 'left', mono = false, dim = false }) {
  return (
    <td style={{
      textAlign: align, padding: '5px 8px',
      fontFamily: mono ? 'monospace' : 'inherit',
      color: dim ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.85)',
      fontSize: 11,
    }}>{children}</td>
  );
}

function Empty({ children }) {
  return <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', fontStyle: 'italic' }}>{children}</div>;
}

function Skeleton() {
  return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,.4)' }}>Loading overview…</div>;
}

function ErrorBox({ msg, onRetry }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,.1)', border: '0.5px solid rgba(239,68,68,.3)',
      borderRadius: 8, padding: 12, color: '#ef4444', fontSize: 12,
    }}>
      Error: {msg}
      <button onClick={onRetry} style={{ ...refreshBtn, marginLeft: 12 }}>Retry</button>
    </div>
  );
}

function relative(iso) {
  if (!iso) return '—';
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 0) return iso;
    const min = ms / 60000;
    if (min < 1) return 'just now';
    if (min < 60) return `${Math.round(min)}m ago`;
    if (min < 60 * 24) return `${Math.round(min / 60)}h ago`;
    return `${Math.round(min / 60 / 24)}d ago`;
  } catch { return iso; }
}

const refreshBtn = {
  background: 'rgba(255,255,255,.06)', border: '0.5px solid rgba(255,255,255,.12)',
  color: 'rgba(255,255,255,.65)', padding: '4px 12px', borderRadius: 6,
  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
};
