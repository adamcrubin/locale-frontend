// ── SourcesScreen.jsx ─────────────────────────────────────────────────────────
// Admin page for managing event sources.
// Shows all sources grouped by type with health status + event counts.
// Lets users add new sources via URL → Haiku auto-classification.
// Has a "Test" button per source for one-off debug scrape+extract.

import { useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ── Source type config ────────────────────────────────────────────────────────
const SOURCE_TYPES = {
  editorial:   { label: 'Editorial',    icon: '📰', color: '#C9A84C',  bg: 'rgba(201,168,76,.12)'  },
  venue:       { label: 'Venue',         icon: '🎭', color: '#818CF8',  bg: 'rgba(129,140,248,.12)' },
  government:  { label: 'Government',    icon: '🏛',  color: '#34D399',  bg: 'rgba(52,211,153,.12)'  },
  aggregator:  { label: 'Aggregator',    icon: '🔗', color: '#60A5FA',  bg: 'rgba(96,165,250,.12)'  },
  neighborhood:{ label: 'Neighborhood',  icon: '🏘',  color: '#F472B6',  bg: 'rgba(244,114,182,.12)' },
};

// Guess source type from name/url — used as fallback display
function guessType(source) {
  const n = (source.name + ' ' + source.url).toLowerCase();
  if (n.includes('post') || n.includes('washingtonian') || n.includes('dcist') || n.includes('times') || n.includes('axios') || n.includes('magazine') || n.includes('bethesda') || n.includes('arlington mag') || n.includes('51st') || n.includes('northern virginia mag')) return 'editorial';
  if (n.includes('eventbrite') || n.includes('ticketmaster') || n.includes('meetup') || n.includes('washington.org') || n.includes('fun in')) return 'aggregator';
  if (n.includes('library') || n.includes('national archives') || n.includes('falls church') || n.includes('fairfax') || n.includes('nova parks') || n.includes('fxva')) return 'government';
  if (n.includes('wolf trap') || n.includes('jammin') || n.includes('torpedo') || n.includes('politics') || n.includes('geeks')) return 'venue';
  return 'neighborhood';
}

// ── Status dot ────────────────────────────────────────────────────────────────
function StatusDot({ source }) {
  const ok      = source.last_ok && !source.last_error;
  const failing = !!source.last_error;
  const unseen  = !source.last_ok && !source.last_error;
  const color   = ok ? '#22c55e' : failing ? '#ef4444' : '#f59e0b';
  const label   = ok ? 'OK' : failing ? 'Failing' : 'Not yet run';
  return (
    <div title={source.last_error || label} style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div style={{ width:8, height:8, borderRadius:'50%', background:color, boxShadow:`0 0 6px ${color}88`, flexShrink:0 }} />
      <span style={{ fontSize:10, color: ok ? '#22c55e' : failing ? '#ef4444' : '#f59e0b' }}>{label}</span>
    </div>
  );
}

// ── Add Source Modal ──────────────────────────────────────────────────────────
function AddSourceModal({ onClose, onAdded }) {
  const [step,     setStep]     = useState('url');   // 'url' | 'confirm' | 'saving'
  const [url,      setUrl]      = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [draft,    setDraft]    = useState(null);

  const classify = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${BASE}/admin/sources/classify`, {
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
    }
    setLoading(false);
  };

  const save = async () => {
    setStep('saving');
    try {
      const res  = await fetch(`${BASE}/admin/sources/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, zip_code: '22046' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      onAdded(data.source);
    } catch (e) {
      setError(e.message);
      setStep('confirm');
    }
  };

  const inp = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '0.5px solid rgba(255,255,255,.15)',
    background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.9)',
    fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none',
    boxSizing: 'border-box',
  };

  const typeOptions = Object.entries(SOURCE_TYPES).map(([k,v]) => ({ value:k, label:v.label }));

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:80, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'#1C1A17', border:'0.5px solid rgba(255,255,255,.1)',
        borderRadius:14, padding:24, width:'100%', maxWidth:480,
        fontFamily:'DM Sans, sans-serif',
        animation:'fadeIn 200ms ease both',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:'rgba(255,255,255,.9)' }}>Add new source</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:2 }}>
              {step === 'url' ? 'Paste a URL — Haiku will auto-classify it' : step === 'confirm' ? 'Review and confirm details' : 'Saving...'}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.07)', border:'0.5px solid rgba(255,255,255,.1)', borderRadius:7, padding:'3px 10px', fontSize:13, cursor:'pointer', color:'rgba(255,255,255,.5)' }}>✕</button>
        </div>

        {step === 'url' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>Source URL</div>
              <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com/events"
                style={inp} onKeyDown={e=>e.key==='Enter'&&classify()} autoFocus />
            </div>
            {error && <div style={{ fontSize:12, color:'#FDA4AF', padding:'8px 12px', background:'rgba(159,18,57,.15)', borderRadius:8 }}>{error}</div>}
            <button onClick={classify} disabled={loading||!url.trim()} style={{
              padding:'10px', borderRadius:9, cursor:'pointer',
              background: 'rgba(201,168,76,.2)', border:'0.5px solid rgba(201,168,76,.35)',
              color:'#C9A84C', fontSize:13, fontWeight:600,
              opacity: (loading||!url.trim()) ? 0.5 : 1,
            }}>
              {loading ? '⏳ Classifying with Haiku...' : '→ Auto-classify'}
            </button>
          </div>
        )}

        {step === 'confirm' && draft && (
          <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
            {[
              ['Name',          'name',          'text',   null],
              ['Type',          'source_type',   'select', typeOptions],
              ['Category hint', 'category_hint', 'text',   null],
              ['URL',           'url',           'text',   null],
            ].map(([label, field, type, opts]) => (
              <div key={field}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginBottom:5, textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</div>
                {type === 'select' ? (
                  <select value={draft[field]||''} onChange={e=>setDraft(d=>({...d,[field]:e.target.value}))}
                    style={{...inp, cursor:'pointer'}}>
                    {opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input value={draft[field]||''} onChange={e=>setDraft(d=>({...d,[field]:e.target.value}))} style={inp} />
                )}
              </div>
            ))}
            {draft.needs_pattern && (
              <div style={{ fontSize:11, color:'#FCD34D', padding:'8px 12px', background:'rgba(252,211,77,.08)', borderRadius:8, border:'0.5px solid rgba(252,211,77,.2)' }}>
                ⚠ This site has dynamic URLs — a pattern resolver may be needed for accurate weekly scraping.
              </div>
            )}
            {error && <div style={{ fontSize:12, color:'#FDA4AF', padding:'8px 12px', background:'rgba(159,18,57,.15)', borderRadius:8 }}>{error}</div>}
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <button onClick={()=>setStep('url')} style={{ flex:1, padding:'9px', borderRadius:8, cursor:'pointer', background:'transparent', border:'0.5px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.4)', fontSize:12 }}>← Back</button>
              <button onClick={save} style={{ flex:2, padding:'9px', borderRadius:8, cursor:'pointer', background:'rgba(201,168,76,.2)', border:'0.5px solid rgba(201,168,76,.35)', color:'#C9A84C', fontSize:13, fontWeight:600 }}>
                ✓ Add source
              </button>
            </div>
          </div>
        )}

        {step === 'saving' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>⏳</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.5)' }}>Saving source...</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Test Result Panel ─────────────────────────────────────────────────────────
function TestPanel({ sourceId, sourceName, onClose }) {
  const [status,  setStatus]  = useState('running'); // 'running' | 'done' | 'error'
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const res  = await fetch(`${BASE}/admin/sources/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId, zip: '22046' }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        setResult(data);
        setStatus('done');
      } catch (e) {
        setError(e.message);
        setStatus('error');
      }
    };
    run();
  }, [sourceId]);

  return (
    <div style={{
      background: 'rgba(255,255,255,.04)', border: '0.5px solid rgba(255,255,255,.1)',
      borderRadius: 10, padding: 14, marginTop: 8,
      animation: 'fadeIn 200ms ease both',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,.7)' }}>🧪 Test: {sourceName}</div>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.3)', cursor:'pointer', fontSize:13 }}>✕</button>
      </div>

      {status === 'running' && (
        <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', fontStyle:'italic' }}>
          ⏳ Scraping and extracting... (15–30 seconds)
        </div>
      )}

      {status === 'error' && (
        <div style={{ fontSize:12, color:'#FDA4AF' }}>✗ {error}</div>
      )}

      {status === 'done' && result && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {[
              ['Scraped',  result.chars_scraped ? `${(result.chars_scraped/1000).toFixed(0)}k chars` : '—'],
              ['Method',   result.method || '—'],
              ['Extracted',`${result.events_extracted || 0} events`],
              ['With URL', `${result.events_with_url || 0} (${result.url_rate || '0%'})`],
            ].map(([label,val]) => (
              <div key={label} style={{ background:'rgba(255,255,255,.06)', borderRadius:7, padding:'6px 10px' }}>
                <div style={{ fontSize:9, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.07em' }}>{label}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,.85)', marginTop:2 }}>{val}</div>
              </div>
            ))}
          </div>
          {result.url_markers_in_text === 0 && (
            <div style={{ fontSize:11, color:'#FCD34D', padding:'7px 10px', background:'rgba(252,211,77,.08)', borderRadius:7, border:'0.5px solid rgba(252,211,77,.2)' }}>
              ⚠ No URL markers found in scraped text — link extraction won't work for this source.
            </div>
          )}
          {result.sample_events?.length > 0 && (
            <div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Sample events</div>
              {result.sample_events.map((e, i) => (
                <div key={i} style={{ padding:'6px 0', borderBottom:'0.5px solid rgba(255,255,255,.06)', fontSize:12 }}>
                  <div style={{ color:'rgba(255,255,255,.8)', fontWeight:500 }}>{e.title}</div>
                  <div style={{ color:'rgba(255,255,255,.35)', marginTop:2 }}>
                    {e.date} {e.url ? <span style={{ color:'#60A5FA' }}>🔗 {e.url.slice(0,50)}...</span> : <span style={{ color:'#ef4444' }}>✗ No URL</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Source Row ────────────────────────────────────────────────────────────────
function SourceRow({ source, eventCount, onToggle, onTest, testing }) {
  const [expanded, setExpanded] = useState(false);
  const type   = source.source_type || guessType(source);
  const typeConf = SOURCE_TYPES[type] || SOURCE_TYPES.neighborhood;
  const lastOk = source.last_ok ? new Date(source.last_ok).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Never';

  return (
    <div style={{
      borderBottom: '0.5px solid rgba(255,255,255,.06)',
      opacity: source.active ? 1 : 0.45,
      transition: 'opacity .2s',
    }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 90px 70px 80px 90px', alignItems:'center', padding:'10px 16px', gap:8 }}
        onClick={() => setExpanded(e => !e)}>

        {/* Name + type badge */}
        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
          <span style={{ fontSize:14, flexShrink:0 }}>{typeConf.icon}</span>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,.85)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{source.name}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{source.url}</div>
          </div>
        </div>

        {/* Type */}
        <div>
          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:99, background:typeConf.bg, color:typeConf.color, fontWeight:500 }}>
            {typeConf.label}
          </span>
        </div>

        {/* Status */}
        <StatusDot source={source} />

        {/* Event count */}
        <div style={{ fontSize:13, fontWeight:600, color: eventCount > 0 ? '#C9A84C' : 'rgba(255,255,255,.25)', textAlign:'center' }}>
          {eventCount ?? '—'}
        </div>

        {/* Last scraped */}
        <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', textAlign:'center' }}>{lastOk}</div>

        {/* Actions */}
        <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>onTest(source)} disabled={testing}
            title="Test this source" style={{
              padding:'3px 9px', borderRadius:6, fontSize:11, cursor:'pointer',
              background: testing ? 'rgba(255,255,255,.04)' : 'rgba(96,165,250,.15)',
              border:'0.5px solid rgba(96,165,250,.25)', color:'#60A5FA',
              opacity: testing ? 0.5 : 1,
            }}>🧪</button>
          <button onClick={()=>onToggle(source)}
            title={source.active ? 'Disable source' : 'Enable source'} style={{
              padding:'3px 9px', borderRadius:6, fontSize:11, cursor:'pointer',
              background: source.active ? 'rgba(239,68,68,.12)' : 'rgba(34,197,94,.12)',
              border: `0.5px solid ${source.active ? 'rgba(239,68,68,.25)' : 'rgba(34,197,94,.25)'}`,
              color: source.active ? '#ef4444' : '#22c55e',
            }}>{source.active ? 'Disable' : 'Enable'}</button>
        </div>
      </div>

      {/* Expanded test panel */}
      {expanded && testing === source.id && (
        <div style={{ padding:'0 16px 12px' }}>
          <TestPanel sourceId={source.id} sourceName={source.name} onClose={()=>setExpanded(false)} />
        </div>
      )}
      {source.last_error && expanded && (
        <div style={{ padding:'0 16px 12px' }}>
          <div style={{ fontSize:11, color:'#FDA4AF', padding:'8px 12px', background:'rgba(159,18,57,.12)', borderRadius:8 }}>
            Last error: {source.last_error}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main SourcesScreen ────────────────────────────────────────────────────────
export default function SourcesScreen({ onClose }) {
  const [sources,     setSources]     = useState([]);
  const [eventCounts, setEventCounts] = useState({});
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [showAdd,     setShowAdd]     = useState(false);
  const [testingId,   setTestingId]   = useState(null);
  const [filterType,  setFilterType]  = useState('all');
  const [search,      setSearch]      = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [srcRes, countRes] = await Promise.all([
        fetch(`${BASE}/sources?zip=22046`).then(r=>r.json()),
        fetch(`${BASE}/admin/sources/event-counts?zip=22046`).then(r=>r.json()).catch(()=>({counts:{}})),
      ]);
      setSources(srcRes.sources || []);
      setEventCounts(countRes.counts || {});
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleSource = async (source) => {
    try {
      await fetch(`${BASE}/admin/sources/${source.id}/toggle`, { method:'POST' });
      setSources(s => s.map(x => x.id === source.id ? {...x, active:!x.active} : x));
    } catch (e) { alert('Toggle failed: ' + e.message); }
  };

  const handleTest = (source) => {
    setTestingId(source.id);
    // TestPanel will auto-close after source row collapses — keep testing state for 60s
    setTimeout(() => setTestingId(null), 60000);
  };

  const handleAdded = (newSource) => {
    setSources(s => [newSource, ...s]);
    setShowAdd(false);
  };

  // Stats
  const active  = sources.filter(s => s.active);
  const failing = sources.filter(s => s.last_error);
  const totalEvents = Object.values(eventCounts).reduce((a,b) => a+b, 0);

  // Filter + search
  const visible = sources
    .filter(s => filterType === 'all' || (s.source_type || guessType(s)) === filterType)
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.url.toLowerCase().includes(search.toLowerCase()));

  // Group by type
  const grouped = {};
  for (const s of visible) {
    const t = s.source_type || guessType(s);
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(s);
  }

  return (
    <div className="fade-enter" style={{
      position:'fixed', inset:0, background:'#141210', zIndex:60,
      overflowY:'auto', display:'flex', flexDirection:'column',
      fontFamily:'DM Sans, sans-serif',
    }}>
      {/* ── Header ── */}
      <div style={{ background:'#1C1A17', borderBottom:'0.5px solid rgba(255,255,255,.07)', padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.06)', border:'0.5px solid rgba(255,255,255,.1)', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', color:'rgba(255,255,255,.5)' }}>← Back</button>
          <span className="serif" style={{ fontSize:20, color:'rgba(255,255,255,.9)', fontWeight:300 }}>Sources</span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,.25)' }}>Event data pipeline</span>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          background:'rgba(201,168,76,.2)', border:'0.5px solid rgba(201,168,76,.35)',
          borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:600,
          cursor:'pointer', color:'#C9A84C',
        }}>+ Add source</button>
      </div>

      <div style={{ padding:16, flex:1 }}>

        {/* ── Stats row ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:16 }}>
          {[
            ['Total sources',    sources.length,       '#C9A84C',  '📡'],
            ['Active',           active.length,         '#22c55e',  '✅'],
            ['Failing',          failing.length,        failing.length > 0 ? '#ef4444' : '#22c55e', '⚠️'],
            ['Events this wknd', totalEvents,           '#60A5FA',  '🗓'],
          ].map(([label, value, color, icon]) => (
            <div key={label} style={{ background:'rgba(255,255,255,.04)', border:'0.5px solid rgba(255,255,255,.08)', borderRadius:10, padding:'12px 14px' }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:22, fontWeight:700, color, lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:4, textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Filter bar ── */}
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search sources..."
            style={{ padding:'6px 11px', borderRadius:8, border:'0.5px solid rgba(255,255,255,.12)', background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.8)', fontSize:12, fontFamily:'DM Sans,sans-serif', outline:'none', width:180 }} />
          {['all', ...Object.keys(SOURCE_TYPES)].map(t => {
            const conf = SOURCE_TYPES[t];
            const active2 = filterType === t;
            return (
              <button key={t} onClick={()=>setFilterType(t)} style={{
                padding:'4px 12px', borderRadius:99, fontSize:11, cursor:'pointer',
                background: active2 ? (conf?.bg || 'rgba(201,168,76,.15)') : 'rgba(255,255,255,.04)',
                border: `0.5px solid ${active2 ? (conf?.color || '#C9A84C') + '55' : 'rgba(255,255,255,.1)'}`,
                color: active2 ? (conf?.color || '#C9A84C') : 'rgba(255,255,255,.4)',
                fontWeight: active2 ? 600 : 400,
              }}>{t === 'all' ? '✦ All' : `${conf.icon} ${conf.label}`}</button>
            );
          })}
          <button onClick={load} style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:8, fontSize:11, cursor:'pointer', background:'rgba(255,255,255,.06)', border:'0.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.4)' }}>↻ Refresh</button>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'rgba(255,255,255,.3)', fontSize:13 }}>Loading sources...</div>
        ) : error ? (
          <div style={{ fontSize:13, color:'#FDA4AF', padding:16 }}>Error: {error}</div>
        ) : (
          <div style={{ background:'rgba(255,255,255,.03)', border:'0.5px solid rgba(255,255,255,.08)', borderRadius:12, overflow:'hidden' }}>
            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 90px 70px 80px 90px', padding:'8px 16px', gap:8, borderBottom:'0.5px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.02)' }}>
              {['Source', 'Type', 'Status', 'Events', 'Last run', 'Actions'].map(h => (
                <div key={h} style={{ fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.25)' }}>{h}</div>
              ))}
            </div>

            {/* Rows grouped by type */}
            {Object.entries(grouped).map(([type, typeSources]) => {
              const conf = SOURCE_TYPES[type] || SOURCE_TYPES.neighborhood;
              return (
                <div key={type}>
                  <div style={{ padding:'6px 16px', background:'rgba(255,255,255,.02)', borderBottom:'0.5px solid rgba(255,255,255,.05)', display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ fontSize:12 }}>{conf.icon}</span>
                    <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:conf.color }}>{conf.label}</span>
                    <span style={{ fontSize:10, color:'rgba(255,255,255,.2)' }}>({typeSources.length})</span>
                  </div>
                  {typeSources.map(s => (
                    <SourceRow key={s.id} source={s}
                      eventCount={eventCounts[s.id]}
                      onToggle={toggleSource}
                      onTest={handleTest}
                      testing={testingId === s.id ? s.id : null}
                    />
                  ))}
                </div>
              );
            })}

            {visible.length === 0 && (
              <div style={{ padding:32, textAlign:'center', color:'rgba(255,255,255,.25)', fontSize:13 }}>No sources match your filter.</div>
            )}
          </div>
        )}

        <div style={{ fontSize:10, color:'rgba(255,255,255,.15)', marginTop:12, textAlign:'center' }}>
          ZIP 22046 · Falls Church, VA · Sources are scraped daily
        </div>
      </div>

      {showAdd && <AddSourceModal onClose={()=>setShowAdd(false)} onAdded={handleAdded} />}
    </div>
  );
}
