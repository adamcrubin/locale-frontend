// Modal editor for a source's declarative extractor_config.
// Lets the operator paste/edit JSON, dry-run against the live source URL,
// see what the parser extracts, then save the config back to the row.

import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const TEMPLATE = {
  container: 'div.event-card',
  fields: {
    title: 'h3.event-title',
    venue: '.venue-name',
    start_date: { selector: '.event-date', transform: 'parseDate' },
    start_time: { selector: '.event-time', transform: 'parseTime' },
    cost_display: { selector: '.event-price', transform: 'parseCost' },
    url: { selector: 'a', attr: 'href', absolute: true },
    description: '.event-blurb',
  },
  defaults: {
    venue: 'My Venue Name',
    neighborhood: 'Penn Quarter',
    categories: ['arts'],
  },
  drop_if_missing: ['title', 'start_date'],
};

export default function ExtractorEditor({ source, onClose, onSaved }) {
  const initial = source.extractor_config
    ? JSON.stringify(source.extractor_config, null, 2)
    : JSON.stringify(TEMPLATE, null, 2);
  const [json, setJson] = useState(initial);
  const [parseError, setParseError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [fixtureBusy, setFixtureBusy] = useState(null); // fixture id currently replaying/deleting
  const [authorOpen, setAuthorOpen] = useState(false);
  const [authorHints, setAuthorHints] = useState('');
  const [authorExamples, setAuthorExamples] = useState('');
  const [authoring, setAuthoring] = useState(false);
  const [authorResult, setAuthorResult] = useState(null);
  const [authorError, setAuthorError] = useState(null);

  const loadFixtures = async () => {
    setFixturesLoading(true);
    try {
      const res = await fetch(`${BASE}/admin/sources/${source.id}/fixtures`);
      const j = await res.json();
      if (j.ok) setFixtures(j.fixtures || []);
    } catch (e) { /* ignore — non-blocking */ }
    finally { setFixturesLoading(false); }
  };

  useEffect(() => { loadFixtures(); }, [source.id]);

  const captureFixture = async () => {
    setFixtureBusy('capture');
    try {
      const res = await fetch(`${BASE}/admin/sources/${source.id}/fixtures/capture`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      await loadFixtures();
    } catch (e) {
      setSaveError(`capture failed: ${e.message}`);
    } finally {
      setFixtureBusy(null);
    }
  };

  const replayFixture = async (fixtureId) => {
    setFixtureBusy(fixtureId);
    try {
      const res = await fetch(`${BASE}/admin/fixtures/${fixtureId}/replay`, { method: 'POST' });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      await loadFixtures();
    } catch (e) {
      setSaveError(`replay failed: ${e.message}`);
    } finally {
      setFixtureBusy(null);
    }
  };

  const deleteFixture = async (fixtureId) => {
    if (!confirm('Delete this fixture?')) return;
    setFixtureBusy(fixtureId);
    try {
      await fetch(`${BASE}/admin/fixtures/${fixtureId}`, { method: 'DELETE' });
      await loadFixtures();
    } finally {
      setFixtureBusy(null);
    }
  };

  const runAuthor = async () => {
    setAuthoring(true); setAuthorError(null); setAuthorResult(null);
    try {
      // Parse examples if operator provided JSON-array text
      let examples = null;
      if (authorExamples.trim()) {
        try {
          examples = JSON.parse(authorExamples);
          if (!Array.isArray(examples)) examples = [examples];
        } catch {
          throw new Error('Examples field must be JSON: an event object or array of them');
        }
      }
      const res = await fetch(`${BASE}/admin/sources/${source.id}/author-extractor`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          examples,
          hints: authorHints || null,
          useCurrent: !!source.extractor_config,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'author call failed');
      setAuthorResult(j);
    } catch (e) {
      setAuthorError(e.message);
    } finally {
      setAuthoring(false);
    }
  };

  const useAuthored = () => {
    if (!authorResult?.config) return;
    setJson(JSON.stringify(authorResult.config, null, 2));
    setAuthorOpen(false);
    setAuthorResult(null);
  };

  const parseJson = () => {
    try {
      return JSON.parse(json);
    } catch (e) {
      setParseError(e.message);
      return null;
    }
  };

  const runTest = async () => {
    setParseError(null); setTestResult(null); setTesting(true);
    const config = parseJson();
    if (!config) { setTesting(false); return; }
    try {
      const res = await fetch(`${BASE}/admin/sources/test-extractor`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceId: source.id, config }),
      });
      const j = await res.json();
      if (!j.ok) {
        setTestResult({ error: j.error });
      } else {
        setTestResult(j);
      }
    } catch (e) {
      setTestResult({ error: e.message });
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    setParseError(null); setSaveError(null); setSaving(true);
    const config = parseJson();
    if (!config) { setSaving(false); return; }
    try {
      const res = await fetch(`${BASE}/admin/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ extractor_config: config }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      onSaved?.(j.source);
      onClose();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const clearConfig = async () => {
    if (!confirm('Remove the extractor config? Source falls back to generic primitives + Haiku.')) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/admin/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ extractor_config: null }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      onSaved?.(j.source);
      onClose();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1C1A17', border: '0.5px solid rgba(255,255,255,.1)',
        borderRadius: 12, width: '90vw', maxWidth: 1100, height: '88vh',
        display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 18px', borderBottom: '0.5px solid rgba(255,255,255,.1)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span className="serif" style={{ fontSize: 16, fontWeight: 300, color: 'rgba(255,255,255,.9)' }}>
            Extractor config
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{source.name}</span>
          <a href={source.url} target="_blank" rel="noreferrer" style={{
            fontSize: 11, color: 'rgba(255,255,255,.4)', fontFamily: 'monospace',
            textDecoration: 'underline',
          }}>{source.url} ↗</a>
          <button onClick={onClose} style={{
            marginLeft: 'auto', background: 'rgba(255,255,255,.07)',
            border: '0.5px solid rgba(255,255,255,.1)', borderRadius: 7,
            padding: '3px 10px', fontSize: 13, cursor: 'pointer', color: 'rgba(255,255,255,.5)',
          }}>✕</button>
        </div>

        {/* Body — split editor / preview */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12, minHeight: 0 }}>
          {/* Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
              Declarative config (JSON). See <code style={{ color: '#C9A84C' }}>SCRAPING_PIPELINE.md §6</code> for schema. Transforms: parseDate / parseTime / parseCost / trim / lowercase / slice:N.
            </div>
            <textarea
              value={json}
              onChange={e => { setJson(e.target.value); setParseError(null); }}
              spellCheck={false}
              style={{
                background: '#0F0E0C', border: '0.5px solid rgba(255,255,255,.12)',
                borderRadius: 8, padding: 12, color: 'rgba(255,255,255,.85)',
                fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 11, lineHeight: 1.5,
                outline: 'none', flex: 1, resize: 'none', minHeight: 0,
              }}
            />
            {parseError && (
              <div style={{
                fontSize: 11, color: '#ef4444', fontFamily: 'monospace',
                padding: '6px 8px', background: 'rgba(239,68,68,.08)', borderRadius: 4,
              }}>{parseError}</div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={runTest} disabled={testing} style={btnPrimary}>
                {testing ? 'Testing…' : '▶ Test against source URL'}
              </button>
              <button onClick={save} disabled={saving} style={btnGreen}>
                {saving ? 'Saving…' : '💾 Save config'}
              </button>
              <button onClick={() => setAuthorOpen(true)} style={btnPurple} title="Ask Claude Sonnet to author or patch this config from the live page HTML">
                🤖 Generate with Claude
              </button>
              <button onClick={clearConfig} disabled={saving} style={btnGhost}>
                Clear
              </button>
            </div>
            {saveError && (
              <div style={{ fontSize: 11, color: '#ef4444' }}>{saveError}</div>
            )}
          </div>

          {/* Preview + fixtures (split vertically) */}
          <div style={{ display: 'grid', gridTemplateRows: '1fr auto', gap: 8, minWidth: 0, minHeight: 0 }}>
          <div style={{
            background: 'rgba(0,0,0,.3)', border: '0.5px solid rgba(255,255,255,.08)',
            borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0,
          }}>
            <div style={{
              padding: '8px 12px', borderBottom: '0.5px solid rgba(255,255,255,.08)',
              fontSize: 11, color: 'rgba(255,255,255,.5)',
            }}>
              {!testResult && 'Test result preview'}
              {testResult?.error && <span style={{ color: '#ef4444' }}>Error: {testResult.error}</span>}
              {testResult?.ok && (
                <span>
                  ✓ {testResult.matched_containers} containers matched · {testResult.emitted} events emitted
                  {testResult.dropped > 0 && <span style={{ color: '#F59E0B' }}> · {testResult.dropped} dropped (missing required fields)</span>}
                  · {testResult.fetch_ms}ms fetch · {testResult.parse_ms}ms parse
                </span>
              )}
            </div>
            <div style={{ overflow: 'auto', flex: 1, padding: 12 }}>
              {testResult?.events?.length > 0 && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {testResult.events.slice(0, 50).map((evt, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,.03)', border: '0.5px solid rgba(255,255,255,.08)',
                      borderRadius: 6, padding: 8, fontSize: 11, color: 'rgba(255,255,255,.75)',
                    }}>
                      <div style={{ fontWeight: 600, color: 'rgba(255,255,255,.9)', marginBottom: 4 }}>
                        {evt.title || <em style={{ color: '#ef4444' }}>(no title)</em>}
                      </div>
                      {Object.entries(evt).filter(([k]) => k !== 'title').map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', gap: 8 }}>
                          <span style={{ color: 'rgba(255,255,255,.4)', minWidth: 110 }}>{k}:</span>
                          <span style={{ flex: 1, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {v === null ? <em style={{ color: 'rgba(255,255,255,.25)' }}>null</em>
                              : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {testResult.events.length > 50 && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', textAlign: 'center' }}>
                      … {testResult.events.length - 50} more
                    </div>
                  )}
                </div>
              )}
              {testResult?.ok && testResult.events.length === 0 && (
                <div style={{ color: '#F59E0B', fontSize: 12 }}>
                  Parser ran but emitted 0 events. Either selectors don't match or required fields ({JSON.stringify(testResult.drop_if_missing || ['title'])}) are missing.
                </div>
              )}
            </div>
          </div>

          {/* Fixtures section (Pipeline 2 stage 2B) */}
          <div style={{
            background: 'rgba(0,0,0,.3)', border: '0.5px solid rgba(255,255,255,.08)',
            borderRadius: 8, padding: 10, fontSize: 11,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>Fixtures</span>
              <span style={{ color: 'rgba(255,255,255,.4)' }}>
                {fixturesLoading ? 'loading…' : `${fixtures.length} saved`}
              </span>
              <button onClick={captureFixture} disabled={fixtureBusy === 'capture'} style={{
                marginLeft: 'auto',
                background: 'rgba(99,102,241,.2)', border: '0.5px solid rgba(99,102,241,.45)',
                color: '#A5B4FC', padding: '4px 10px', borderRadius: 6, fontSize: 11,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {fixtureBusy === 'capture' ? 'Capturing…' : '📸 Capture fixture'}
              </button>
            </div>
            {fixtures.length === 0 && !fixturesLoading && (
              <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 10 }}>
                Save a fixture to enable drift detection. Daily replay flags this source as drifted if the parser stops matching the saved baseline.
              </div>
            )}
            {fixtures.length > 0 && (
              <div style={{ display: 'grid', gap: 4 }}>
                {fixtures.map(f => {
                  const status = f.last_replay_status;
                  const statusColor = status === 'passed' ? '#22c55e'
                                    : status === 'drifted' ? '#F59E0B'
                                    : status === 'broken' ? '#ef4444'
                                    : 'rgba(255,255,255,.4)';
                  return (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '4px 6px', background: 'rgba(255,255,255,.03)', borderRadius: 4,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                      <span style={{ color: 'rgba(255,255,255,.85)', fontFamily: 'monospace', fontSize: 10 }}>
                        {f.label || 'fixture'}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 10 }}>
                        {f.expected_count} events
                      </span>
                      <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 10 }}>
                        captured {(f.captured_at || '').slice(0, 16).replace('T', ' ')}
                      </span>
                      {status && (
                        <span title={f.last_replay_diff ? JSON.stringify(f.last_replay_diff, null, 2) : ''}
                          style={{ color: statusColor, fontSize: 10, marginLeft: 'auto' }}>
                          {status}
                        </span>
                      )}
                      <button onClick={() => replayFixture(f.id)} disabled={fixtureBusy === f.id}
                        style={fixBtn}>↻</button>
                      <button onClick={() => deleteFixture(f.id)} disabled={fixtureBusy === f.id}
                        style={{ ...fixBtn, color: '#ef4444' }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Author dialog (overlays on top of editor) */}
        {authorOpen && (
          <div onClick={() => setAuthorOpen(false)} style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            borderRadius: 12,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: '#0F0E0C', border: '0.5px solid rgba(139,92,246,.4)',
              borderRadius: 10, width: '100%', maxWidth: 760, maxHeight: '100%',
              display: 'flex', flexDirection: 'column', padding: 18, gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="serif" style={{ fontSize: 16, fontWeight: 300, color: '#C4B5FD' }}>
                  🤖 Author with Claude
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
                  {source.extractor_config ? 'Patch existing config' : 'Generate from scratch'}
                </span>
                <button onClick={() => setAuthorOpen(false)} style={{
                  marginLeft: 'auto', background: 'rgba(255,255,255,.07)',
                  border: '0.5px solid rgba(255,255,255,.1)', borderRadius: 7,
                  padding: '3px 10px', fontSize: 13, cursor: 'pointer', color: 'rgba(255,255,255,.5)',
                }}>✕</button>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', lineHeight: 1.5 }}>
                Claude Sonnet will fetch the live HTML, identify the repeating event container, and propose a declarative config. Optionally narrow the task with hints + example output.
              </div>

              <label style={lblStyle}>
                Hints (optional) — free text describing what you want
                <textarea value={authorHints} onChange={e => setAuthorHints(e.target.value)}
                  placeholder="e.g. 'events are in the upcoming-shows tab, not the calendar grid'"
                  rows={2} style={textareaStyle} />
              </label>

              <label style={lblStyle}>
                Examples (optional) — JSON array of events you want extracted
                <textarea value={authorExamples} onChange={e => setAuthorExamples(e.target.value)}
                  placeholder={'[\n  { "title": "Bruno Mars", "start_date": "2026-05-09", "venue": "Cap One Arena" }\n]'}
                  rows={4} style={{ ...textareaStyle, fontFamily: 'monospace' }} />
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={runAuthor} disabled={authoring} style={btnPurple}>
                  {authoring ? 'Thinking… (~10s)' : '✨ Generate config'}
                </button>
                {authorResult?.config && (
                  <button onClick={useAuthored} style={btnGreen}>
                    ✓ Use this config
                  </button>
                )}
              </div>

              {authorError && (
                <div style={{
                  fontSize: 11, color: '#ef4444', fontFamily: 'monospace',
                  padding: '8px', background: 'rgba(239,68,68,.08)', borderRadius: 6,
                }}>{authorError}</div>
              )}

              {authorResult && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'hidden',
                }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>
                    <strong>Result:</strong> {authorResult.preview?.matched_containers ?? 0} containers · {authorResult.preview?.emitted ?? 0} events emitted
                    {authorResult.preview?.dropped > 0 && <span style={{ color: '#F59E0B' }}> · {authorResult.preview.dropped} dropped</span>}
                    · {authorResult.timing?.llm_ms}ms Claude · {authorResult.timing?.html_chars?.toLocaleString()} HTML chars
                  </div>
                  <pre style={{
                    margin: 0, padding: 10, background: 'rgba(0,0,0,.4)',
                    border: '0.5px solid rgba(255,255,255,.08)', borderRadius: 6,
                    fontSize: 10, color: 'rgba(255,255,255,.75)', overflow: 'auto',
                    maxHeight: 200, fontFamily: 'monospace',
                  }}>{JSON.stringify(authorResult.config, null, 2)}</pre>
                  {authorResult.preview?.events?.length > 0 && (
                    <details>
                      <summary style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', cursor: 'pointer' }}>
                        Sample extracted events ({authorResult.preview.events.length})
                      </summary>
                      <pre style={{
                        margin: '6px 0 0', padding: 8, background: 'rgba(0,0,0,.3)', borderRadius: 4,
                        fontSize: 10, color: 'rgba(255,255,255,.6)', fontFamily: 'monospace',
                        maxHeight: 150, overflow: 'auto',
                      }}>{JSON.stringify(authorResult.preview.events, null, 2)}</pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const lblStyle = {
  display: 'flex', flexDirection: 'column', gap: 4,
  fontSize: 11, color: 'rgba(255,255,255,.6)',
};
const textareaStyle = {
  background: '#0F0E0C', border: '0.5px solid rgba(255,255,255,.12)',
  borderRadius: 6, padding: 8, color: 'rgba(255,255,255,.85)',
  fontSize: 11, lineHeight: 1.5, outline: 'none', resize: 'vertical',
  fontFamily: 'inherit',
};
const fixBtn = {
  background: 'rgba(255,255,255,.06)', border: '0.5px solid rgba(255,255,255,.12)',
  color: 'rgba(255,255,255,.7)', padding: '2px 7px', borderRadius: 4,
  fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
};

const btnPrimary = {
  background: 'rgba(201,168,76,.2)', border: '0.5px solid rgba(201,168,76,.45)',
  color: '#C9A84C', padding: '7px 14px', borderRadius: 8, fontSize: 12,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
const btnGreen = {
  background: 'rgba(34,197,94,.15)', border: '0.5px solid rgba(34,197,94,.4)',
  color: '#22c55e', padding: '7px 14px', borderRadius: 8, fontSize: 12,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
const btnGhost = {
  background: 'rgba(255,255,255,.06)', border: '0.5px solid rgba(255,255,255,.12)',
  color: 'rgba(255,255,255,.5)', padding: '7px 14px', borderRadius: 8, fontSize: 12,
  cursor: 'pointer', fontFamily: 'inherit',
};
const btnPurple = {
  background: 'rgba(139,92,246,.18)', border: '0.5px solid rgba(139,92,246,.45)',
  color: '#C4B5FD', padding: '7px 14px', borderRadius: 8, fontSize: 12,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
