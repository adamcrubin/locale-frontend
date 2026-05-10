// Cron tab — manual pipeline triggers. Buttons fire the same endpoints
// cron-job.org calls on schedule. Useful for "run it now" diagnostics
// without waiting for the next scheduled tick.

import { useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const JOBS = [
  {
    id: 'heal', label: 'Run all heals', method: 'POST', path: '/cron/heal',
    desc: 'Stale-expiry, null categories, missing venues, recurring dates, Option-2 remap, pattern recategorization, article-title kill, sponsored rotation. Idempotent. Recommended cadence: every 2h.',
  },
  {
    id: 'backfill', label: 'Backfill missing fields', method: 'POST', path: '/cron/backfill',
    desc: 'Per-event web_search to fill venue/url/date/neighborhood/description. 3 retries × 6h cooldown. Recommended: every 6h.',
  },
  {
    id: 'source-health', label: 'Source health probe', method: 'POST', path: '/cron/source-health',
    desc: 'Classify every active source as healthy/drifted/broken/unknown. Updates parser_health columns. Recommended: daily.',
  },
  {
    id: 'sweep-empty', label: 'Sweep never-produced sources', method: 'POST', path: '/admin/sources/sweep',
    body: { filter: 'never-produced' },
    desc: 'Targeted scrape against sources that have never produced events. Useful after BLOCKED_SITES updates or new source seeds.',
  },
  {
    id: 'refresh-scrape', label: 'Full pipeline run (force)', method: 'POST', path: '/admin/refresh/scrape',
    body: { force: true },
    desc: 'Force a full scrape + extract + backfill + merge across all active sources. Bypasses the same-content hash skip. Heavy — ~$1 in Anthropic credits.',
  },
  {
    id: 'warm', label: 'Wake dyno', method: 'GET', path: '/events?warm=1',
    desc: 'Cheap probe that touches DB but skips weather/scoring. Same endpoint the keep-warm cron pings every 5 min.',
  },
];

export default function CronTab() {
  const [results, setResults] = useState({}); // job_id → { ok, ts, summary, error }

  const runJob = async (job) => {
    setResults(r => ({ ...r, [job.id]: { running: true } }));
    const start = Date.now();
    try {
      const opts = {
        method: job.method,
        headers: { 'content-type': 'application/json' },
      };
      if (job.body) opts.body = JSON.stringify(job.body);
      const res = await fetch(`${BASE}${job.path}`, opts);
      const json = await res.json().catch(() => ({ ok: false, error: 'invalid JSON response' }));
      const elapsed = Math.round((Date.now() - start) / 1000);
      setResults(r => ({
        ...r,
        [job.id]: {
          ok: !!json.ok,
          ts: new Date().toLocaleTimeString(),
          elapsed,
          summary: json.summary || json,
          error: json.ok ? null : (json.error || `HTTP ${res.status}`),
        },
      }));
    } catch (e) {
      setResults(r => ({
        ...r,
        [job.id]: { ok: false, ts: new Date().toLocaleTimeString(), error: e.message },
      }));
    }
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 16 }}>
        Manual triggers for the same endpoints cron-job.org calls on schedule. Click a button to fire the job synchronously and see the result.
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {JOBS.map(job => {
          const r = results[job.id];
          return (
            <div key={job.id} style={{
              background: 'rgba(255,255,255,.03)', border: '0.5px solid rgba(255,255,255,.08)',
              borderRadius: 8, padding: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <button onClick={() => runJob(job)} disabled={r?.running} style={{
                  background: r?.ok === false ? 'rgba(239,68,68,.15)' : r?.ok ? 'rgba(34,197,94,.15)' : 'rgba(201,168,76,.2)',
                  border: `0.5px solid ${r?.ok === false ? 'rgba(239,68,68,.4)' : r?.ok ? 'rgba(34,197,94,.4)' : 'rgba(201,168,76,.45)'}`,
                  color: r?.ok === false ? '#ef4444' : r?.ok ? '#22c55e' : '#C9A84C',
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', minWidth: 200, textAlign: 'left',
                }}>
                  {r?.running ? 'Running…' : job.label}
                </button>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontFamily: 'monospace' }}>
                  {job.method} {job.path}
                </span>
                {r?.ts && (
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginLeft: 'auto' }}>
                    {r.ok ? '✓' : '✕'} {r.ts}{r.elapsed != null ? ` (${r.elapsed}s)` : ''}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', lineHeight: 1.5 }}>
                {job.desc}
              </div>
              {r?.error && (
                <div style={{
                  marginTop: 8, padding: '6px 8px', background: 'rgba(239,68,68,.08)',
                  borderRadius: 4, fontSize: 11, color: '#ef4444', fontFamily: 'monospace',
                }}>
                  {r.error}
                </div>
              )}
              {r?.summary && !r.error && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', cursor: 'pointer' }}>
                    Result JSON
                  </summary>
                  <pre style={{
                    margin: '6px 0 0', padding: 8, background: 'rgba(0,0,0,.3)',
                    borderRadius: 4, fontSize: 10, fontFamily: 'monospace',
                    color: 'rgba(255,255,255,.6)', maxHeight: 240, overflowY: 'auto',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  }}>{JSON.stringify(r.summary, null, 2)}</pre>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
