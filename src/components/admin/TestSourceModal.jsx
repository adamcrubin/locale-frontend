// TestSourceModal — runs /admin/sources/test for one source, shows the
// debug scrape+extract result. Useful when probing whether a source is
// producing events, what scrape method fires, and whether URL markers
// survive the htmlToText pass. Migrated from the legacy SourcesScreen
// inline TestPanel into the /admin#sources modal flow.

import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function TestSourceModal({ source, onClose }) {
  const [status, setStatus] = useState('running'); // 'running' | 'done' | 'error'
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE}/admin/sources/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: source.id, zip: 'dc-metro' }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!data.ok) throw new Error(data.error);
        setResult(data);
        setStatus('done');
      } catch (e) {
        if (cancelled) return;
        setError(e.message);
        setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [source.id]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1C1A17', border: '0.5px solid rgba(255,255,255,.1)',
        borderRadius: 12, padding: 22, width: '100%', maxWidth: 640,
        fontFamily: 'DM Sans, sans-serif', color: 'rgba(255,255,255,.85)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div className="serif" style={{ fontSize: 18, fontWeight: 300, color: 'rgba(255,255,255,.9)' }}>
              🧪 Test scrape
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 3 }}>
              {source.name}
            </div>
            <a href={source.url} target="_blank" rel="noreferrer" style={{
              fontSize: 11, color: 'rgba(255,255,255,.4)', fontFamily: 'monospace',
              textDecoration: 'underline',
            }}>{source.url}</a>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,.07)', border: '0.5px solid rgba(255,255,255,.1)',
            borderRadius: 7, padding: '3px 10px', fontSize: 13, cursor: 'pointer',
            color: 'rgba(255,255,255,.5)',
          }}>✕</button>
        </div>

        {status === 'running' && (
          <div style={{
            padding: 20, textAlign: 'center', color: 'rgba(255,255,255,.45)',
            fontSize: 13, fontStyle: 'italic',
          }}>
            ⏳ Scraping and extracting…<br />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>(15–30 seconds)</span>
          </div>
        )}

        {status === 'error' && (
          <div style={{
            fontSize: 12, color: '#FDA4AF', padding: '8px 12px',
            background: 'rgba(159,18,57,.15)', borderRadius: 8,
          }}>✗ {error}</div>
        )}

        {status === 'done' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Stat label="Scraped"   value={result.chars_scraped ? `${(result.chars_scraped/1000).toFixed(0)}k chars` : '—'} />
              <Stat label="Method"    value={result.method || '—'} />
              <Stat label="Extracted" value={`${result.events_extracted || 0} events`} />
              <Stat label="With URL"  value={`${result.events_with_url || 0} (${result.url_rate || '0%'})`} />
              <Stat label="URL markers" value={String(result.url_markers_in_text ?? 0)} />
            </div>

            {result.url_markers_in_text === 0 && (
              <div style={{
                fontSize: 11, color: '#FCD34D',
                padding: '8px 12px', background: 'rgba(252,211,77,.08)',
                borderRadius: 8, border: '0.5px solid rgba(252,211,77,.2)',
              }}>
                ⚠ No URL markers found in scraped text — link extraction won't work for this source.
              </div>
            )}

            {result.sample_events?.length > 0 && (
              <div>
                <div style={{
                  fontSize: 10, color: 'rgba(255,255,255,.35)',
                  textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6,
                }}>Sample events</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {result.sample_events.map((e, i) => (
                    <div key={i} style={{
                      padding: '8px 10px', background: 'rgba(255,255,255,.03)',
                      border: '0.5px solid rgba(255,255,255,.08)', borderRadius: 6,
                    }}>
                      <div style={{ color: 'rgba(255,255,255,.85)', fontWeight: 500, fontSize: 12 }}>
                        {e.title}
                      </div>
                      <div style={{
                        color: 'rgba(255,255,255,.4)', fontSize: 10, marginTop: 3,
                        display: 'flex', gap: 8, flexWrap: 'wrap',
                      }}>
                        {e.date && <span>{e.date}</span>}
                        {e.url ? (
                          <a href={e.url} target="_blank" rel="noreferrer" style={{ color: '#60A5FA', textDecoration: 'none' }}>
                            🔗 {e.url.slice(0, 50)}…
                          </a>
                        ) : (
                          <span style={{ color: '#ef4444' }}>✗ No URL</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,.06)', borderRadius: 7, padding: '6px 10px',
      minWidth: 90,
    }}>
      <div style={{
        fontSize: 9, color: 'rgba(255,255,255,.35)',
        textTransform: 'uppercase', letterSpacing: '.07em',
      }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
