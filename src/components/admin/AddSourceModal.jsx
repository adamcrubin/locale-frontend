// AddSourceModal — paste a URL, Haiku auto-classifies it (name, type,
// category hint, needs_pattern flag), operator reviews + confirms, source
// gets inserted with active=true. Migrated from the legacy SourcesScreen
// overlay into the /admin#sources tab.
//
// Two-step flow: 'url' → 'confirm' → 'saving' → onAdded callback.

import { useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const SOURCE_TYPES = [
  { value: 'editorial',    label: 'Editorial' },
  { value: 'venue',        label: 'Venue' },
  { value: 'government',   label: 'Government' },
  { value: 'aggregator',   label: 'Aggregator' },
  { value: 'neighborhood', label: 'Neighborhood' },
];

export default function AddSourceModal({ onClose, onAdded }) {
  const [step, setStep] = useState('url');   // 'url' | 'confirm' | 'saving' | 'result'
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(null);
  const [addResult, setAddResult] = useState(null); // { source, validation, auto_gated }

  const classify = async () => {
    if (!url.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${BASE}/admin/sources/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Classification failed');
      setDraft(data.classification);
      setStep('confirm');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setStep('saving');
    try {
      const res = await fetch(`${BASE}/admin/sources/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, zip_code: 'dc-metro' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      // Show the auto-gate validation result instead of closing immediately.
      // Operator gets a chance to read the recommendation + see whether the
      // source landed active or auto-gated to inactive.
      setAddResult(data);
      setStep('result');
    } catch (e) {
      setError(e.message);
      setStep('confirm');
    }
  };

  const finish = () => {
    if (addResult?.source) onAdded(addResult.source);
    else onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1C1A17', border: '0.5px solid rgba(255,255,255,.1)',
        borderRadius: 12, padding: 22, width: '100%', maxWidth: 480,
        fontFamily: 'DM Sans, sans-serif', color: 'rgba(255,255,255,.85)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div className="serif" style={{ fontSize: 18, fontWeight: 300, color: 'rgba(255,255,255,.9)' }}>
              Add new source
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 3 }}>
              {step === 'url' ? 'Paste a URL — Haiku auto-classifies' :
               step === 'confirm' ? 'Review · save triggers a validation probe' :
               step === 'saving' ? 'Saving + validating…' :
               step === 'result' ? 'Validation result' :
               'Saving…'}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,.07)', border: '0.5px solid rgba(255,255,255,.1)',
            borderRadius: 7, padding: '3px 10px', fontSize: 13, cursor: 'pointer',
            color: 'rgba(255,255,255,.5)',
          }}>✕</button>
        </div>

        {step === 'url' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <Label>Source URL</Label>
              <input value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/events"
                onKeyDown={e => e.key === 'Enter' && classify()}
                autoFocus style={inputStyle} />
            </div>
            {error && <ErrorMsg>{error}</ErrorMsg>}
            <button onClick={classify} disabled={loading || !url.trim()} style={primaryBtn}>
              {loading ? '⏳ Classifying with Haiku…' : '→ Auto-classify'}
            </button>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', textAlign: 'center', lineHeight: 1.5 }}>
              Haiku reads the page, picks a source_type / category_hint / canonical name. Operator reviews before save.
            </div>
          </div>
        )}

        {step === 'confirm' && draft && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <Field label="Name">
              <input value={draft.name || ''} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Type">
              <select value={draft.source_type || ''} onChange={e => setDraft(d => ({ ...d, source_type: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                {SOURCE_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Category hint">
              <input value={draft.category_hint || ''} onChange={e => setDraft(d => ({ ...d, category_hint: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="URL">
              <input value={draft.url || ''} onChange={e => setDraft(d => ({ ...d, url: e.target.value }))} style={inputStyle} />
            </Field>
            {draft.needs_pattern && (
              <div style={{
                fontSize: 11, color: '#FCD34D',
                padding: '8px 12px', background: 'rgba(252,211,77,.08)',
                borderRadius: 8, border: '0.5px solid rgba(252,211,77,.2)',
              }}>
                ⚠ This site has dynamic URLs — needs a pattern resolver for weekly scraping.
              </div>
            )}
            {error && <ErrorMsg>{error}</ErrorMsg>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setStep('url')} style={ghostBtn}>← Back</button>
              <button onClick={save} style={{ ...primaryBtn, flex: 2 }}>✓ Add source</button>
            </div>
          </div>
        )}

        {step === 'saving' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Saving + validating…</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 6 }}>
              (~5-10s; runs HTTP + render + structured + yield probes)
            </div>
          </div>
        )}

        {step === 'result' && addResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ResultBanner result={addResult} />
            {addResult.validation && (
              <div style={{
                background: 'rgba(255,255,255,.03)', border: '0.5px solid rgba(255,255,255,.08)',
                borderRadius: 8, padding: 10, fontSize: 11,
              }}>
                <div style={{ color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>
                  Probe summary
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 10, rowGap: 3, color: 'rgba(255,255,255,.7)' }}>
                  <span style={{ color: 'rgba(255,255,255,.45)' }}>HTTP</span>
                  <span>{addResult.validation.http?.status ?? '—'} · {addResult.validation.http?.content_type || 'no content-type'}</span>
                  <span style={{ color: 'rgba(255,255,255,.45)' }}>Render</span>
                  <span>{addResult.validation.render?.kind ?? '—'}{addResult.validation.render?.framework ? ` (${addResult.validation.render.framework})` : ''}</span>
                  <span style={{ color: 'rgba(255,255,255,.45)' }}>JSON-LD events</span>
                  <span>{addResult.validation.structured?.jsonld_events ?? 0}</span>
                  <span style={{ color: 'rgba(255,255,255,.45)' }}>Microdata</span>
                  <span>{addResult.validation.structured?.microdata ?? 0}</span>
                  <span style={{ color: 'rgba(255,255,255,.45)' }}>Yield</span>
                  <span>
                    {addResult.validation.yield?.primitive_events != null
                      ? `${addResult.validation.yield.primitive_events} via ${addResult.validation.yield.used}`
                      : addResult.validation.yield?.haiku_events != null
                      ? `${addResult.validation.yield.haiku_events} via Haiku`
                      : '—'}
                  </span>
                </div>
              </div>
            )}
            <button onClick={finish} style={{ ...primaryBtn, width: '100%' }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultBanner({ result }) {
  const rec = result.validation?.recommendation;
  const gated = result.auto_gated;
  const color = gated ? '#ef4444'
              : rec === 'haiku-only' || rec === 'needs-declarative' ? '#F59E0B'
              : '#22c55e';
  const bg = gated ? 'rgba(239,68,68,.1)'
           : rec === 'haiku-only' || rec === 'needs-declarative' ? 'rgba(245,158,11,.1)'
           : 'rgba(34,197,94,.1)';
  const headline = gated
    ? '⚠ Auto-gated — landed as inactive'
    : `✓ Added · ${rec || 'no validation'}`;
  return (
    <div style={{
      background: bg, border: `0.5px solid ${color}55`, color,
      borderRadius: 8, padding: 12,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{headline}</div>
      {result.validation?.reason && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>
          {result.validation.reason}
        </div>
      )}
      {gated && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 6, lineHeight: 1.5 }}>
          The source row was saved but <code>active=false</code>. Click ⊘/✓ in the Sources tab to enable it manually if you want Pipeline 3 to scrape it anyway.
        </div>
      )}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 11, color: 'rgba(255,255,255,.45)', marginBottom: 6,
      textTransform: 'uppercase', letterSpacing: '.06em',
    }}>{children}</div>
  );
}

function Field({ label, children }) {
  return <div><Label>{label}</Label>{children}</div>;
}

function ErrorMsg({ children }) {
  return (
    <div style={{
      fontSize: 12, color: '#FDA4AF', padding: '8px 12px',
      background: 'rgba(159,18,57,.15)', borderRadius: 8,
    }}>{children}</div>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '0.5px solid rgba(255,255,255,.15)',
  background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.9)',
  fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none',
  boxSizing: 'border-box',
};
const primaryBtn = {
  padding: '10px', borderRadius: 9, cursor: 'pointer',
  background: 'rgba(201,168,76,.2)', border: '0.5px solid rgba(201,168,76,.45)',
  color: '#C9A84C', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
};
const ghostBtn = {
  flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
  background: 'transparent', border: '0.5px solid rgba(255,255,255,.12)',
  color: 'rgba(255,255,255,.5)', fontSize: 12, fontFamily: 'inherit',
};
