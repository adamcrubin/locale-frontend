// Modal that surfaces a source's most recent validation_report in a
// human-readable layout. Opened from SourcesTab's validation cell.

const REC_COLORS = {
  'auto-jsonld':        { bg: 'rgba(34,197,94,.15)',  fg: '#22c55e' },
  'auto-microdata':     { bg: 'rgba(34,197,94,.15)',  fg: '#22c55e' },
  'auto-tribe':         { bg: 'rgba(34,197,94,.15)',  fg: '#22c55e' },
  'auto-articleList':   { bg: 'rgba(34,197,94,.15)',  fg: '#22c55e' },
  'needs-declarative':  { bg: 'rgba(99,102,241,.15)', fg: '#A5B4FC' },
  'haiku-only':         { bg: 'rgba(245,158,11,.15)', fg: '#F59E0B' },
  'needs-headless':     { bg: 'rgba(245,158,11,.15)', fg: '#F59E0B' },
  'no-events':          { bg: 'rgba(148,163,184,.15)', fg: '#94A3B8' },
  'blocked':            { bg: 'rgba(239,68,68,.15)',  fg: '#ef4444' },
};

const REC_NEXT_STEP = {
  'auto-jsonld':       'No extractor_config needed — generic primitive will handle it. Just leave active=true.',
  'auto-microdata':    'No extractor_config needed — microdata primitive will handle it.',
  'auto-tribe':        'No extractor_config needed — Tribe Events Calendar primitive will handle it.',
  'auto-articleList':  'Generic articleList primitive works. No further action needed.',
  'needs-declarative': 'Author a declarative extractor_config in the Extractor tab. Selectors should target the consistent repeating structure on the page.',
  'haiku-only':        'Source will use Haiku extraction. Higher cost ($0.005/run), variable precision. Acceptable for editorial roundups.',
  'needs-headless':    'Page is JS-rendered. Add to BLOCKED_SITES to route through web search, or wait for headless browser support.',
  'no-events':         'URL loaded but no event content was found. Check the URL — might be the wrong page, or the source is genuinely empty right now.',
  'blocked':           'Direct HTTP failed. Add to BLOCKED_SITES so the scraper routes through web search instead.',
};

export default function ValidationModal({ source, report, onClose }) {
  if (!report) return null;
  const rec = report.recommendation;
  const recColor = REC_COLORS[rec] || { bg: 'rgba(255,255,255,.06)', fg: 'rgba(255,255,255,.7)' };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1C1A17', border: '0.5px solid rgba(255,255,255,.1)',
        borderRadius: 12, width: '90vw', maxWidth: 720, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif',
        color: 'rgba(255,255,255,.85)',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 18px', borderBottom: '0.5px solid rgba(255,255,255,.1)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span className="serif" style={{ fontSize: 16, fontWeight: 300, color: 'rgba(255,255,255,.9)' }}>
            Validation report
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{source?.name}</span>
          <button onClick={onClose} style={{
            marginLeft: 'auto', background: 'rgba(255,255,255,.07)',
            border: '0.5px solid rgba(255,255,255,.1)', borderRadius: 7,
            padding: '3px 10px', fontSize: 13, cursor: 'pointer', color: 'rgba(255,255,255,.5)',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: 18, overflowY: 'auto', display: 'grid', gap: 14 }}>
          {/* Recommendation banner */}
          <div style={{
            background: recColor.bg, border: `0.5px solid ${recColor.fg}55`,
            borderRadius: 8, padding: 12,
          }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
              Recommendation
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: recColor.fg, marginBottom: 4 }}>
              {rec || 'unknown'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginBottom: 8 }}>
              {report.reason}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', lineHeight: 1.5, fontStyle: 'italic' }}>
              {REC_NEXT_STEP[rec] || 'Review the probe details below for next steps.'}
            </div>
          </div>

          {/* Probe details */}
          <Section title="HTTP probe">
            <KV k="Status"        v={badge(report.http?.status, statusColor(report.http?.status))} />
            <KV k="Content-Type"  v={report.http?.content_type || <em>none</em>} />
            <KV k="Body chars"    v={report.http?.body_chars?.toLocaleString() ?? '—'} />
            <KV k="Elapsed"       v={`${report.http?.elapsed_ms ?? '—'} ms`} />
            <KV k="Final URL"     v={<code style={{ fontSize: 10 }}>{report.http?.final_url}</code>} />
            {report.http?.error && <KV k="Error" v={<span style={{ color: '#ef4444' }}>{report.http.error}</span>} />}
          </Section>

          <Section title="Render probe">
            <KV k="Kind"          v={badge(report.render?.kind, renderColor(report.render?.kind))} />
            <KV k="Tag count"     v={report.render?.tag_count?.toLocaleString() ?? '—'} />
            <KV k="Text length"   v={report.render?.text_length?.toLocaleString() ?? '—'} />
            {report.render?.script_bytes_ratio != null && (
              <KV k="Script ratio" v={`${Math.round(report.render.script_bytes_ratio * 100)}%`} />
            )}
            {report.render?.framework && <KV k="Framework" v={report.render.framework} />}
          </Section>

          <Section title="Structured data">
            <KV k="JSON-LD events"  v={count(report.structured?.jsonld_events)} />
            <KV k="Microdata events" v={count(report.structured?.microdata)} />
            <KV k="OG meta tags"    v={count(report.structured?.og_meta)} />
            <KV k="Tribe markup"    v={report.structured?.tribe ? '✓' : '—'} />
          </Section>

          <Section title="Yield probe">
            <KV k="Generic primitive" v={count(report.yield?.primitive_events)} />
            {report.yield?.haiku_events != null && (
              <KV k="Haiku found"     v={count(report.yield?.haiku_events)} />
            )}
            <KV k="Method used"       v={report.yield?.used || <em>none</em>} />
            {report.yield?.sample_titles?.length > 0 && (
              <KV k="Sample titles" v={
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11 }}>
                  {report.yield.sample_titles.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              } />
            )}
            {report.yield?.error && <KV k="Error" v={<span style={{ color: '#ef4444' }}>{report.yield.error}</span>} />}
            {report.yield?.note  && <KV k="Note"  v={report.yield.note} />}
          </Section>

          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', textAlign: 'right' }}>
            probed at {report.probed_at}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,.03)', border: '0.5px solid rgba(255,255,255,.08)',
      borderRadius: 8, padding: 12,
    }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 12, rowGap: 4, fontSize: 11 }}>
        {children}
      </div>
    </div>
  );
}

function KV({ k, v }) {
  return (
    <>
      <span style={{ color: 'rgba(255,255,255,.5)' }}>{k}</span>
      <span style={{ color: 'rgba(255,255,255,.85)' }}>{v}</span>
    </>
  );
}

function badge(val, color) {
  if (val == null) return <em>—</em>;
  return (
    <span style={{
      background: `${color}22`, border: `0.5px solid ${color}66`, color,
      padding: '1px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600,
    }}>{val}</span>
  );
}

function count(n) {
  if (n == null) return <em>—</em>;
  const v = Number(n);
  if (v === 0) return <span style={{ color: 'rgba(255,255,255,.35)' }}>0</span>;
  return <strong>{v}</strong>;
}

function statusColor(status) {
  if (status == null) return '#ef4444';
  if (status >= 200 && status < 300) return '#22c55e';
  if (status >= 300 && status < 400) return '#F59E0B';
  return '#ef4444';
}

function renderColor(kind) {
  return kind === 'server-rendered' ? '#22c55e'
       : kind === 'spa' ? '#F59E0B'
       : kind === 'thin' ? '#F59E0B'
       : '#94A3B8';
}
