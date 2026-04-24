import { useState, useRef, useEffect, useCallback, Component } from 'react';
import { ALL_CATEGORIES, ACTIVITIES as MOCK_ACTIVITIES, WEATHER as MOCK_WEATHER, CALENDAR_EVENTS, PROFILE_COLORS } from '../data/content';
import AIPromptModal from './AIPromptModal';
import WeatherIcon from './WeatherIcon';
import ThemeToggle, { useTheme } from './ThemeToggle';
import { postFeedback, fetchPromptResponse } from '../lib/api';
import { usePipelineStatus } from '../hooks/usePipelineStatus';

// ── Error boundary — catches column render crashes so the whole app doesn't go blank ──
class ColumnErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error('[ColumnErrorBoundary]', e, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, color:'var(--muted)', fontFamily:'var(--font-body)', padding:32 }}>
          <div style={{ fontSize:32 }}>⚠️</div>
          <div style={{ fontSize:14 }}>Something went wrong rendering the feed.</div>
          <button onClick={() => this.setState({ error: null })} style={{ fontSize:12, padding:'6px 16px', borderRadius:8, cursor:'pointer', background:'var(--accent-bg)', border:'0.5px solid var(--accent-border)', color:'var(--accent)', fontFamily:'var(--font-body)' }}>Try again</button>
          <details style={{ fontSize:10, color:'var(--muted)', maxWidth:400 }}><summary>Details</summary>{this.state.error?.message}</details>
        </div>
      );
    }
    return this.props.children;
  }
}

const QUICK_PROMPTS = [
  { label:'Plan my Saturday' },       { label:'Date night' },
  { label:'What can I do right now?' }, { label:'Free this weekend' },
  { label:'Rainy Sunday' },            { label:'Hidden gems' },
  { label:'Kid-friendly' },            { label:'Weekend away' },
];

// ── Frontend blocklist — catches anything that slipped past the backend ─────────
// Keep in sync with BLOCKLIST in extractor.js (backend is primary; this is the safety net).
const FRONTEND_BLOCKLIST = [
  'support group','surgery support','rotator cuff','online healing','online session',
  'virtual event','webinar','zoom meeting','online only','certification course',
  'ceu credits','continuing education','hoa meeting','homeowners association',
  'aa meeting','na meeting','anonymous meeting','recovery meeting',
  'therapy session','counseling session','mental health workshop',
  'timeshare','real estate seminar','investment seminar','insurance seminar',
  'civic federation','civic meeting','neighborhood meeting','town hall meeting',
  'wound care','shoulder surgery',
  'religious service','church service','bible study',
];

function isFrontendBlocked(act) {
  const combined = `${(act.title||'')} ${(act.description||'')}`.toLowerCase();
  return FRONTEND_BLOCKLIST.some(kw => combined.includes(kw));
}

// ── Detect if event is a restaurant/dining (not a specific event) ────────────
function isRestaurant(act) {
  const cats = act.categories || [];
  const tags = (act.tags || []).map(t => t.toLowerCase());
  const title = (act.title || '').toLowerCase();
  // Food category + no specific event keywords = likely a restaurant listing
  if (!cats.includes('food')) return false;
  // Real events always have a start_date — restaurants don't
  if (act.start_date) return false;
  const eventKeywords = [
    'festival','fest','fair','tasting','dinner','brunch','pop-up','popup',
    'market','competition','contest','class','workshop','tour','show','concert',
    'celebration','party','gala','night','week','weekend','event','experience',
    'gathering','happy hour','trivia','game','championship',
  ];
  return !eventKeywords.some(kw => title.includes(kw) || tags.includes(kw));
}

// ── Format time string: "7:00 PM" → "7pm", "11:30 AM" → "11:30am" ───────────
function formatTimeStr(raw) {
  if (!raw) return '';
  const m = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|AM|PM)/i);
  if (!m) return '';
  const h = parseInt(m[1]);
  const mins = m[2] && m[2] !== '00' ? `:${m[2]}` : '';
  const period = m[3].replace(/\./g,'').toLowerCase();
  return `${h}${mins}${period}`;
}

// ── Music genre tag extraction ────────────────────────────────────────────────
const MUSIC_GENRES = ['jazz','classical','rock','folk','blues','electronic','hip-hop','country','r&b','indie','soul','reggae','punk','metal','pop','funk','gospel','latin','afrobeat','bluegrass','acoustic','orchestra','opera','rap','ambient'];
function formatMusicGenre(act) {
  if (!(act.categories||[]).includes('music')) return null;
  const tags = (act.tags||[]).map(t=>t.toLowerCase());
  const genre = tags.find(t => MUSIC_GENRES.includes(t));
  if (!genre) return null;
  return genre.charAt(0).toUpperCase() + genre.slice(1);
}

// ── Smart when display ────────────────────────────────────────────────────────
function formatWhen(act) {
  // Restaurants without a specific event: time is not meaningful
  if (isRestaurant(act)) return '';

  const raw = (act.when_display || act.when || '').trim();
  const startTime = act.start_time || '';
  const endTime   = act.end_time   || '';

  // Detect day of week from raw string
  const lower = raw.toLowerCase();
  let day = '';
  if (lower.includes('friday')   || /^fri\b/.test(lower)) day = 'Fri';
  else if (lower.includes('saturday') || /^sat\b/.test(lower)) day = 'Sat';
  else if (lower.includes('sunday')   || /^sun\b/.test(lower)) day = 'Sun';
  else if (lower.includes('through') || lower.includes('thru') || lower.includes('–') || lower.includes(' - ')) {
    day = 'Fri–Sun';
  }

  // Also try start_date for day detection
  if (!day && act.start_date) {
    const d = new Date(act.start_date + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      const dow = d.getDay();
      if (dow === 5) day = 'Fri';
      else if (dow === 6) day = 'Sat';
      else if (dow === 0) day = 'Sun';
    }
  }

  // Build short date in parens like "(4/26)"
  let dateShort = '';
  if (act.start_date) {
    const d = new Date(act.start_date + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      dateShort = `(${d.getMonth()+1}/${d.getDate()})`;
    }
  }

  // Build time range
  let timeStr = '';
  const t1 = formatTimeStr(startTime) || formatTimeStr(raw.match(/\d{1,2}(?::\d{2})?\s*(?:am|pm)/i)?.[0] || '');
  const t2 = formatTimeStr(endTime);

  if (t1 && t2) timeStr = `${t1}–${t2}`;
  else if (t1) timeStr = t1;
  else if (/all.?day/i.test(raw)) timeStr = 'All day';

  // Fallback time if none found — guess from category/tags
  if (!timeStr) {
    const combined = `${lower} ${(act.tags||[]).join(' ').toLowerCase()} ${(act.categories||[]).join(' ')}`;
    if (combined.includes('morning') || combined.includes('breakfast') || combined.includes('brunch')) timeStr = 'Morning';
    else if (combined.includes('evening') || combined.includes('night') || combined.includes('dinner') || combined.includes('music') || combined.includes('concert') || combined.includes('show')) timeStr = 'Evening';
    else if (combined.includes('afternoon') || combined.includes('lunch') || combined.includes('midday')) timeStr = 'Afternoon';
    else timeStr = 'Anytime';
  }

  const dayWithDate = [day, dateShort].filter(Boolean).join(' ');
  return [dayWithDate, timeStr].filter(Boolean).join(' · ');
}

// ── Smart venue display: neighborhood or short venue name ────────────────────
function formatVenue(act) {
  const venue = act.venue || act.where || '';
  const neighborhood = act.neighborhood || '';

  // Prefer neighborhood for brevity, fall back to venue truncated
  const place = neighborhood || venue;
  if (!place) return '';

  // Strip city/state suffixes like ", Washington, DC" or ", Falls Church, VA"
  return place
    .replace(/,?\s*(Washington|DC|Falls Church|Arlington|Alexandria|Northern Virginia|NoVA|VA|MD)\b.*/gi, '')
    .trim()
    .slice(0, 30);
}

// ── Cost cleanup + smart guessing ────────────────────────────────────────────
const JUNK_COSTS = [
  'see details','check website','varies','tbd','register','visit website',
  'zoo admission','general admission','tickets required','price varies',
  'contact organizer','check eventbrite','more info','see website',
  'ticket required','admission','check schedule',
];

// Category-based price heuristics for when cost is unknown
const COST_HINTS = {
  food:     '$$ (?)',   // restaurants default mid-range
  music:    '$$ (?)',   // shows usually $15-40
  sports:   '$$ (?)',   // games/leagues vary
  arts:     '$ (?)',    // many free or low-cost
  outdoors: 'Free (?)',
  miss:     '$$ (?)',
  nerdy:    '$ (?)',    // talks/trivia often cheap
  away:     '$$$ (?)',  // travel costs more
  trips:    '$$ (?)',
  breweries:'$ (?)',
  comedy:   '$$ (?)',
  markets:  'Free (?)',
  wellness: '$$ (?)',
  family:   '$ (?)',
  film:     '$ (?)',
};

function formatCost(act) {
  const raw = (act.cost_display || act.cost || '').toLowerCase().trim();

  // Junk values → guess from category
  if (!raw || JUNK_COSTS.some(j => raw.includes(j))) {
    // Try category-based guess
    const cats = act.categories || [];
    for (const cat of cats) {
      if (COST_HINTS[cat]) return COST_HINTS[cat];
    }
    return '$? (?)';
  }

  // Must contain $ or 'free' to be a real price
  if (!raw.includes('$') && !raw.includes('free')) {
    const cats = act.categories || [];
    for (const cat of cats) {
      if (COST_HINTS[cat]) return COST_HINTS[cat];
    }
    return '$? (?)';
  }

  return act.cost_display || act.cost || '';
}

// ── Deduplicate activities across categories by normalized title ──────────────
function dedupeActivities(acts) {
  const seen = new Set();
  return acts.filter(a => {
    const key = (a.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Time-of-day buckets derived from start_time or when_display
function getTimeOfDay(act) {
  const when = (act.start_time || act.when_display || act.when || '').toLowerCase();
  const m = when.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (!m) return 'any';
  let h = parseInt(m[1]);
  if (m[3] === 'pm' && h !== 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  if (h < 12) return 'morning';
  if (h < 17) return 'midday';
  return 'night';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWeekendWeather(weather) {
  const days = (weather?.length > 0) ? weather : MOCK_WEATHER;
  const fri = days.find(d => d.day?.toLowerCase().startsWith('fri'));
  const sat = days.find(d => d.day?.toLowerCase().startsWith('sat'));
  const sun = days.find(d => d.day?.toLowerCase().startsWith('sun'));
  return (fri && sat && sun) ? [fri, sat, sun] : days.slice(0, 3);
}

function getWeatherBoost(weather) {
  const sat = getWeekendWeather(weather)[1] || {};
  if ((sat.precip || 0) > 50) return { boost:['arts','music','food','nerdy'], dim:['outdoors'] };
  if ((sat.hi || 0) > 70 && (sat.precip || 0) < 20) return { boost:['outdoors'], dim:[] };
  return { boost:[], dim:[] };
}

function getWeekendDateStr() {
  const now = new Date();
  const day = now.getDay();
  let daysToFri = (5 - day + 7) % 7;
  if (day === 6) daysToFri = 6; else if (day === 0) daysToFri = 5;
  const fri = new Date(now); fri.setDate(now.getDate() + (day === 6 ? -1 : day === 0 ? -2 : daysToFri));
  const sat = new Date(fri); sat.setDate(fri.getDate() + 1);
  const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
  const fmtShort = d => d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
  return { satStr:fmtShort(sat), sunStr:fmtShort(sun), sat, sun };
}

function isPastEvent(act) {
  const when = (act.when || '').toLowerCase();
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday:'short' }).toLowerCase().slice(0,3);
  const dayOrder = ['sun','mon','tue','wed','thu','fri','sat'];
  const todayIdx = dayOrder.indexOf(today);
  for (const d of dayOrder) {
    if (when.includes(d)) {
      const eventIdx = dayOrder.indexOf(d);
      if (eventIdx < todayIdx && todayIdx - eventIdx < 4) return true;
    }
  }
  return false;
}

// Sort categories by how many good events they have (relevancy-weighted)
function sortCategoriesByRelevancy(cats, activities) {
  return [...cats].sort((a, b) => {
    const aScore = (activities[a.id] || MOCK_ACTIVITIES[a.id] || [])
      .reduce((s, e) => s + (e.final_score || e.base_score || 0.5), 0);
    const bScore = (activities[b.id] || MOCK_ACTIVITIES[b.id] || [])
      .reduce((s, e) => s + (e.final_score || e.base_score || 0.5), 0);
    return bScore - aScore;
  });
}

// ── Action buttons ────────────────────────────────────────────────────────────
function ABtn({ icon, title, onClick, dim, isMap, hoverBg, hoverColor, color, active, activeBg, activeColor }) {
  const [h, setH] = useState(false);
  const bg  = active ? activeBg  : (h ? (hoverBg  || 'rgba(0,0,0,.06)') : 'transparent');
  const clr = active ? activeColor : (h ? (hoverColor || '#1C1A17') : (color || (dim ? 'rgba(0,0,0,.2)' : '#6A6560')));

  if (isMap) return (
    <button onClick={onClick} title={title} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{
      width:28,height:28,borderRadius:8,border:`0.5px solid ${h?'rgba(234,67,53,.3)':'rgba(0,0,0,.12)'}`,
      background:h?'#FFF5F5':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,transition:'all .12s',
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill={h?"#EA4335":"#aaa"}/></svg>
    </button>
  );

  return (
    <button onClick={onClick} title={title} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{
      width:28,height:28,borderRadius:8,
      border:`0.5px solid ${active?(activeColor+'44'):'rgba(0,0,0,.12)'}`,
      background:bg,cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',
      color:clr,transition:'all .12s',fontFamily:'DM Sans,sans-serif',opacity:dim?0.35:1,
    }}>{icon}</button>
  );
}

function ActionBar({ act, catId, onCal, onRemove, onHeart, onThumbUp, onThumbDown, onReserve, homeAddress }) {
  const [thumbed,    setThumbed]    = useState(null);
  const [copied,     setCopied]     = useState(false);
  const [shareOpen,  setShareOpen]  = useState(false);

  const handleDirections = () => {
    const dest   = encodeURIComponent(act.address || act.where || act.title);
    const origin = homeAddress ? encodeURIComponent(homeAddress) : '';
    window.open(origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`
      : `https://www.google.com/maps/search/?api=1&query=${dest}`, '_blank');
  };

  const eventUrl  = act.url || `https://www.google.com/search?q=${encodeURIComponent((act.title||'') + ' ' + (act.venue || act.where || 'DC'))}`;
  const shareText = `${act.title}${act.when ? ' — ' + act.when : ''}${act.where ? ' at ' + act.where : ''}`;

  const handleShare = async (e) => {
    e.stopPropagation();
    // Try native share first (works great on mobile)
    if (navigator.share && navigator.canShare?.({ title: act.title, url: eventUrl })) {
      try { await navigator.share({ title: act.title, text: shareText, url: eventUrl }); return; } catch {}
    }
    // Desktop: show popover
    setShareOpen(s => !s);
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(eventUrl); } catch { prompt('Copy this link:', eventUrl); }
    setCopied(true);
    setTimeout(() => { setCopied(false); setShareOpen(false); }, 1800);
  };

  const SHARE_OPTIONS = [
    {
      label: 'Copy link',
      icon: copied ? '✓' : '🔗',
      color: copied ? '#22c55e' : '#6B6560',
      action: copyLink,
    },
    {
      label: 'Email',
      icon: '✉️',
      color: '#6B6560',
      action: () => { window.open(`mailto:?subject=${encodeURIComponent(act.title)}&body=${encodeURIComponent(shareText + '\n\n' + eventUrl)}`); setShareOpen(false); },
    },
    {
      label: 'WhatsApp',
      icon: '💬',
      color: '#25D366',
      action: () => { window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + eventUrl)}`,'_blank'); setShareOpen(false); },
    },
    {
      label: 'Facebook',
      icon: '📘',
      color: '#1877F2',
      action: () => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`,'_blank','width=600,height=400'); setShareOpen(false); },
    },
    {
      label: 'X / Twitter',
      icon: '✖',
      color: '#1C1A17',
      action: () => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventUrl)}`,'_blank','width=600,height=400'); setShareOpen(false); },
    },
  ];

  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4, position:'relative' }}>
      <ABtn icon="📅" title="Add to calendar" onClick={()=>onCal(act)} />
      <ABtn isMap title="Directions" onClick={handleDirections} />

      {/* Ticket link — only shown when ticket_url exists */}
      {act.ticket_url && (
        <a href={act.ticket_url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()} title="Buy tickets"
          style={{ textDecoration:'none' }}>
          <button style={{
            width:28, height:28, borderRadius:8,
            border:'0.5px solid rgba(201,168,76,.35)',
            background:'rgba(201,168,76,.12)',
            cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center',
            color:'#C9A84C',
          }}>🎟</button>
        </a>
      )}

      {/* Info link */}
      <a href={eventUrl} target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()} title={act.url ? 'Open event page' : 'Search for this event'}
        style={{ textDecoration:'none' }}>
        <button style={{
          width:28, height:28, borderRadius:8,
          border:`0.5px solid ${act.url ? 'rgba(37,99,235,.3)' : 'rgba(0,0,0,.12)'}`,
          background: act.url ? 'rgba(37,99,235,.08)' : 'transparent',
          cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center',
          color: act.url ? '#2563EB' : '#aaa', opacity: act.url ? 1 : 0.5,
        }}>🔗</button>
      </a>

      {/* Share button + popover */}
      <div style={{ position:'relative' }}>
        <button
          onClick={handleShare}
          title="Share this event"
          style={{
            width:28, height:28, borderRadius:8,
            border:`0.5px solid ${shareOpen ? 'rgba(201,168,76,.4)' : 'rgba(0,0,0,.12)'}`,
            background: shareOpen ? 'rgba(201,168,76,.1)' : 'transparent',
            cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center',
            color: shareOpen ? '#C9A84C' : '#6B6560',
            transition: 'all .15s',
            fontWeight: 600,
          }}
        >↗</button>

        {shareOpen && (
          <>
            {/* Backdrop */}
            <div style={{ position:'fixed', inset:0, zIndex:98 }} onClick={()=>setShareOpen(false)} />
            {/* Popover */}
            <div style={{
              position:'absolute', bottom:34, left:'50%', transform:'translateX(-50%)',
              background:'#FFFFFF', border:'1px solid rgba(0,0,0,.1)',
              borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.15)',
              padding:'6px', zIndex:99,
              display:'flex', flexDirection:'column', gap:1,
              minWidth:140,
              animation:'fadeIn 120ms ease both',
            }}>
              {/* Arrow */}
              <div style={{
                position:'absolute', bottom:-5, left:'50%', transform:'translateX(-50%)',
                width:10, height:10, background:'#FFFFFF',
                border:'1px solid rgba(0,0,0,.1)', borderTop:'none', borderLeft:'none',
                transform:'translateX(-50%) rotate(45deg)',
              }}/>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8B3AA', padding:'4px 8px 2px' }}>
                Share event
              </div>
              {SHARE_OPTIONS.map(opt => (
                <button key={opt.label} onClick={(e)=>{ e.stopPropagation(); opt.action(); }}
                  style={{
                    display:'flex', alignItems:'center', gap:8,
                    padding:'7px 10px', borderRadius:7, border:'none',
                    background:'transparent', cursor:'pointer', width:'100%', textAlign:'left',
                    fontFamily:'DM Sans, sans-serif', transition:'background .1s',
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background='#F4F1EB'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <span style={{ fontSize:14, width:20, textAlign:'center' }}>{opt.icon}</span>
                  <span style={{ fontSize:12, color: copied && opt.label==='Copy link' ? '#22c55e' : '#3A3530', fontWeight:500 }}>{copied && opt.label==='Copy link' ? 'Copied!' : opt.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{flex:1}}/>
      <ABtn icon="♥" title="Save" onClick={()=>onHeart(act)} hoverBg="#FFF1F2" hoverColor="#E53E3E" color="#E53E3E" />
      <ABtn icon="👍" title={thumbed==='up'?"Undo":"More like this"} onClick={()=>{setThumbed(t=>t==='up'?null:'up');onThumbUp(act);}} active={thumbed==='up'} activeBg="#E8F5EC" activeColor="#1A6332" />
      <ABtn icon="👎" title={thumbed==='down'?"Undo":"Less like this"} onClick={()=>{setThumbed(t=>t==='down'?null:'down');onThumbDown(act);}} active={thumbed==='down'} activeBg="#FFF1F2" activeColor="#9A3412" />
    </div>
  );
}

// ── Activity card ─────────────────────────────────────────────────────────────
function ActCard({ act, catId, onCal, onRemove, onHeart, onThumbUp, onThumbDown, onReserve, homeAddress, profileId }) {
  const [expanded,      setExpanded]      = useState(false);
  const [thumbFeedback, setThumbFeedback] = useState(null);
  const [exiting,       setExiting]       = useState(false);

  const isRec      = act.content_type === 'recommendation';
  const isExpanded = expanded;
  const isCompact  = !isExpanded;

  const sendFeedback = (fb) => {
    if (!act.id || !profileId) return;
    postFeedback(profileId, act.id, act.content_type || 'event', fb).catch(() => {});
  };

  const handleThumbUp   = () => { sendFeedback('up');   setThumbFeedback({ msg:"We'll show more like this 👍", ok:true  }); onThumbUp(act);   setTimeout(() => setThumbFeedback(null), 2200); };
  const handleThumbDown = () => { sendFeedback('down'); setThumbFeedback({ msg:"Got it -- we'll show less like this 👎", ok:false }); onThumbDown(act); setTimeout(() => setThumbFeedback(null), 2200); };

  const toggle = () => setExpanded(e => !e);

  return (
    <div style={{
      background:   isRec ? '#F9F7F4' : '#FFFFFF',
      border:       '1px solid rgba(0,0,0,0.10)',
      borderRadius: 8,
      minHeight:    44,
      flexShrink:   0,
      boxShadow:    '0 1px 3px rgba(0,0,0,0.06)',
      animation:    exiting ? 'cardOut 200ms ease both' : 'fadeIn 220ms ease both',
      transition:   'box-shadow .15s',
    }}>
      {thumbFeedback && (
        <div style={{
          padding: '9px 12px',
          background: thumbFeedback.ok ? 'rgba(232,245,236,.95)' : 'rgba(255,241,242,.95)',
          fontSize: 12, color: thumbFeedback.ok ? '#1A6332' : '#9A3412',
          fontStyle: 'italic', textAlign: 'center',
          animation: 'fadeIn 150ms ease both',
        }}>{thumbFeedback.msg}</div>
      )}

      {/* ── Header row -- always visible, tap to expand ── */}
      <div
        onClick={toggle}
        style={{
          padding: isCompact ? '7px 10px' : '9px 12px 6px',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer',
          minHeight: 44,
          background: isRec ? '#F9F7F4' : '#FFFFFF',
          userSelect: 'none',
        }}
      >
        {isRec && <span style={{ fontSize: 10, flexShrink: 0 }}>🔄</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1A17', lineHeight: 1.3,
            overflow: isCompact ? 'hidden' : 'visible',
            textOverflow: isCompact ? 'ellipsis' : 'clip',
            whiteSpace: isCompact ? 'nowrap' : 'normal',
          }}>{act.title}</div>
          <div style={{ fontSize: 12, color: '#6B6560', marginTop: 2,
            overflow: isCompact ? 'hidden' : 'visible',
            textOverflow: isCompact ? 'ellipsis' : 'clip',
            whiteSpace: isCompact ? 'nowrap' : 'normal',
            display:'flex', alignItems:'center', gap:4, flexWrap: isCompact ? 'nowrap' : 'wrap',
          }}>
            {formatMusicGenre(act) && (
              <span style={{ fontSize:10, padding:'1px 6px', borderRadius:99, background:'rgba(139,92,246,.12)', color:'#7C3AED', border:'0.5px solid rgba(139,92,246,.25)', flexShrink:0, fontWeight:500 }}>{formatMusicGenre(act)}</span>
            )}
            <span style={{ overflow: isCompact ? 'hidden' : 'visible', textOverflow: isCompact ? 'ellipsis' : 'clip', whiteSpace: isCompact ? 'nowrap' : 'normal' }}>
              {[formatWhen(act), formatVenue(act), formatCost(act)].filter(Boolean).join(' · ')}
            </span>
          </div>
        </div>
        {act._conflict && <span title="Conflicts with existing calendar event" style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: '#FEE2E2', color: '#DC2626', flexShrink: 0 }}>⚠ conflict</span>}
        {/* Chevron -- ▾ when collapsed, ▴ when expanded */}
        <span style={{
          fontSize: 10, color: 'var(--subtle)', flexShrink: 0,
          transition: 'transform .2s',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>▾</span>
      </div>

      {/* ── Expanded body -- conditional render so card height is always honest ── */}
      {isExpanded && (
        <div style={{ padding: '0 12px 10px' }}>
          {/* Why blurb */}
          {act.why && (
            <div style={{ fontSize: 11, color: '#6B6560', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 6 }}>
              {act.why}
            </div>
          )}
          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
            {act.tags?.map(t => (
              <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'var(--bg2)', color: 'var(--muted)', border: '0.5px solid var(--border)' }}>{t}</span>
            ))}
          </div>
          {/* Action bar */}
          <ActionBar act={act} catId={catId} onCal={onCal} onRemove={() => { sendFeedback('dismissed'); setExiting(true); setTimeout(() => onRemove(act), 200); }}
            onHeart={onHeart} onThumbUp={handleThumbUp} onThumbDown={handleThumbDown}
            onReserve={onReserve} homeAddress={homeAddress} />
        </div>
      )}
    </div>
  );
}

// ── Simple weather pill bar ───────────────────────────────────────────────────
function WeatherPillBar({ weather, onWeather }) {
  const days = weather?.length > 0 ? weather : MOCK_WEATHER;
  const pills = ['fri','sat','sun'].map(d =>
    days.find(w => w.day?.toLowerCase().startsWith(d))
  ).filter(Boolean);

  return (
    <div style={{
      background: '#1C1A17', borderBottom: '0.5px solid rgba(255,255,255,.06)',
      padding: '6px 18px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
    }}>
      {pills.map((d, i) => {
        const idx = days.indexOf(d);
        return (
          <button key={d.day} onClick={() => onWeather(idx >= 0 ? idx : i)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,.06)', border: '0.5px solid rgba(255,255,255,.1)',
            borderRadius: 99, padding: '5px 14px', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', transition: 'background .12s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.5)', letterSpacing: '.06em', textTransform: 'uppercase', width: 26 }}>{d.day}</span>
            <WeatherIcon icon={d.icon} desc={d.desc} size={16} />
            {d.nightIcon && d.nightIcon !== d.icon && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>→<WeatherIcon icon={d.nightIcon} desc={d.nightDesc||''} size={13} /></span>
            )}
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.85)' }}>{d.hi}°/<span style={{ color:'rgba(255,255,255,.5)' }}>{d.lo}°</span></span>
            {d.precip > 20 && <span style={{ fontSize: 10, color: '#93C5FD' }}>{d.precip}%</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Combined Spotlight + Weather bar ─────────────────────────────────────────
// Replaces both the old SpotlightStrip and the separate weather strip.
// Shows: [top 3 spotlight events] | [Fri Sat Sun weather pills]
// Has a hide button to collapse the whole bar.
function SpotlightWeatherBar({ activities, weather, onCal, onWeather }) {
  const [hidden, setHidden] = useState(false);

  const weekendWeather = (() => {
    const days = weather?.length > 0 ? weather : MOCK_WEATHER;
    const fri = days.find(d => d.day?.toLowerCase().startsWith('fri'));
    const sat = days.find(d => d.day?.toLowerCase().startsWith('sat'));
    const sun = days.find(d => d.day?.toLowerCase().startsWith('sun'));
    return (fri && sat && sun) ? [fri, sat, sun] : days.slice(0, 3);
  })();

  const isMob = typeof window !== 'undefined' && window.innerWidth < 768;
  const spotlightItems = Object.values(activities).flat()
    .filter(a => a?.title)
    .sort((a, b) => ((b.final_score||b.base_score||0) + (b.expires ? 0.3 : 0)) - ((a.final_score||a.base_score||0) + (a.expires ? 0.3 : 0)))
    .slice(0, isMob ? 1 : 3);

  if (hidden) {
    return (
      <div style={{ background: '#1C1A17', borderBottom: '0.5px solid rgba(255,255,255,.06)', padding: '5px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', letterSpacing: '.06em' }}>SPOTLIGHT HIDDEN</span>
        <button onClick={() => setHidden(false)} style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Show ▾</button>
      </div>
    );
  }

  return (
    <div style={{ background: '#1C1A17', borderBottom: '0.5px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
      <div style={{ padding: '6px 18px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#C9A84C' }}>⭐ Don't miss</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setHidden(true)} style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Hide ✕</button>
      </div>
      <div style={{ padding: '0 18px 8px', display: 'flex', gap: 8, overflowX: 'auto' }} className="no-scroll">
        {/* Spotlight cards */}
        {spotlightItems.map(act => (
          <div key={act.title} onClick={() => onCal(act)} style={{
            flexShrink: 0, width: 180, background: 'rgba(255,255,255,.06)', border: '0.5px solid rgba(255,255,255,.1)',
            borderRadius: 9, padding: '8px 11px', cursor: 'pointer', transition: 'background .12s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.88)', lineHeight: 1.25, marginBottom: 3 }}>{act.title}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{act.when}{act.cost ? ` · ${act.cost}` : ''}</div>
          </div>
        ))}

        {/* Divider */}
        {spotlightItems.length > 0 && weekendWeather.length > 0 && (
          <div style={{ width: 1, background: 'rgba(255,255,255,.08)', flexShrink: 0, margin: '0 4px', alignSelf: 'stretch' }} />
        )}

        {/* Weather pills -- ambient style */}
        {weekendWeather.map((d, i) => {
          const weatherIdx = (weather?.length > 0 ? weather : MOCK_WEATHER).indexOf(d);
          return (
            <button key={d.day || i}
              onClick={() => onWeather(weatherIdx >= 0 ? weatherIdx : i)}
              style={{
                flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                background: 'rgba(255,255,255,.05)', border: '0.5px solid rgba(255,255,255,.09)',
                borderRadius: 9, padding: '7px 12px', cursor: 'pointer', transition: 'background .12s',
                minWidth: 62,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.05)'}
            >
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{d.day}</span>
              <WeatherIcon icon={d.icon} desc={d.desc} size={18} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.8)' }}>{d.hi}°</span>
              {d.precip > 20 && <span style={{ fontSize: 9, color: '#93C5FD' }}>{d.precip}%</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
// Option B: Full-width hero card at top of first column
function SpotlightHero({ activities, onCal }) {
  const hero = Object.values(activities).flat()
    .filter(a=>a&&a.title)
    .sort((a,b)=>((b.final_score||b.base_score||0)+(b.expires?0.5:0))-((a.final_score||a.base_score||0)+(a.expires?0.5:0)))[0];

  if (!hero) return null;
  const cat = ALL_CATEGORIES.find(c=>(hero.categories||[hero.category||'']).includes(c.id));

  return (
    <div onClick={()=>onCal(hero)} style={{
      margin:'0 0 8px',background:'linear-gradient(135deg,#1C1A17 0%,#2A2520 100%)',
      border:'0.5px solid rgba(201,168,76,.25)',borderRadius:12,padding:'14px 16px',
      cursor:'pointer',transition:'all .15s',
    }}
      onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.5)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.25)'}
    >
      <div style={{fontSize:9,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#C9A84C',marginBottom:6}}>⭐ Spotlight this weekend</div>
      {cat&&<span className={cat.cls} style={{fontSize:9,padding:'1px 7px',borderRadius:99,marginBottom:6,display:'inline-block'}}>{cat.icon} {cat.label}</span>}
      <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:22,fontWeight:400,color:'rgba(255,255,255,.95)',lineHeight:1.2,marginBottom:5}}>{hero.title}</div>
      <div style={{fontSize:11,color:'rgba(255,255,255,.5)',marginBottom:4}}>{hero.when} · {hero.where} · {hero.cost}</div>
      <div style={{fontSize:11,color:'rgba(255,255,255,.38)',fontStyle:'italic'}}>{hero.why}</div>
      {hero.expires&&<div style={{fontSize:10,color:'#C9A84C',marginTop:6}}>⚡ Expiring this weekend -- don't miss it</div>}
    </div>
  );
}

// Option A: Entry overlay
function SpotlightOverlay({ activities, onDismiss, onCal }) {
  const [visible, setVisible] = useState(true);
  const hero = Object.values(activities).flat()
    .filter(a=>a&&a.title)
    .sort((a,b)=>((b.final_score||b.base_score||0)+(b.expires?0.5:0))-((a.final_score||a.base_score||0)+(a.expires?0.5:0)))[0];

  useEffect(()=>{ const t=setTimeout(()=>{setVisible(false);onDismiss();},5000); return ()=>clearTimeout(t); },[]);

  if (!visible||!hero) return null;
  const cat = ALL_CATEGORIES.find(c=>(hero.categories||[]).includes(c.id));

  return (
    <div onClick={()=>{setVisible(false);onDismiss();}} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:60,
      display:'flex',alignItems:'center',justifyContent:'center',padding:24,
      animation:'fadeIn 300ms ease both',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'#1C1A17',borderRadius:16,border:'0.5px solid rgba(201,168,76,.3)',
        padding:28,maxWidth:420,width:'100%',
        animation:'scaleIn 350ms cubic-bezier(.34,1.56,.64,1) both',
      }}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'#C9A84C',marginBottom:10}}>⭐ This weekend's spotlight</div>
        {cat&&<span className={cat.cls} style={{fontSize:10,padding:'2px 9px',borderRadius:99,marginBottom:10,display:'inline-block'}}>{cat.icon} {cat.label}</span>}
        <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:28,fontWeight:400,color:'rgba(255,255,255,.95)',lineHeight:1.2,marginBottom:8}}>{hero.title}</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.5)',marginBottom:8}}>{hero.when} · {hero.where} · {hero.cost}</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.5)',fontStyle:'italic',lineHeight:1.6,marginBottom:16}}>{hero.why}</div>
        {hero.expires&&<div style={{fontSize:11,color:'#C9A84C',marginBottom:16}}>⚡ Last chance this weekend</div>}
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>onCal(hero)} style={{flex:1,padding:10,borderRadius:9,background:'rgba(201,168,76,.2)',border:'0.5px solid rgba(201,168,76,.3)',color:'#C9A84C',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Add to calendar</button>
          <button onClick={()=>{setVisible(false);onDismiss();}} style={{padding:'10px 16px',borderRadius:9,background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.4)',fontSize:12,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Dismiss</button>
        </div>
        <div style={{fontSize:10,color:'rgba(255,255,255,.2)',textAlign:'center',marginTop:10}}>Auto-dismisses in 5s</div>
      </div>
    </div>
  );
}

// ── Desktop sidebar -- Spotlight + Weekend Calendar ───────────────────────────
// Always shown on desktop. Top: best event of the weekend.
// Bottom: Fri/Sat/Sun calendar sections from calQueue.
function WeekendSidebar({ activities, calQueue, weather, onCal, onWeather, calendar, onEditCal }) {
  // Top spotlight event
  const hero = Object.values(activities).flat()
    .filter(a => a?.title)
    .sort((a,b) => ((b.final_score||b.base_score||0)+(b.expires?0.3:0)) - ((a.final_score||a.base_score||0)+(a.expires?0.3:0)))[0];

  // Weekend dates
  const now = new Date();
  const dow = now.getDay();
  let dToFri = (5-dow+7)%7;
  if (dow===6) dToFri=6; else if (dow===0) dToFri=5;
  const fri = new Date(now); fri.setDate(now.getDate()+(dow===6?-1:dow===0?-2:dToFri)); fri.setHours(0,0,0,0);
  const sat = new Date(fri); sat.setDate(fri.getDate()+1);
  const sun = new Date(fri); sun.setDate(fri.getDate()+2);
  const toKey = d => d.toISOString().split('T')[0];

  // Bucket calQueue into days
  const byDay = { [toKey(fri)]:[], [toKey(sat)]:[], [toKey(sun)]:[] };
  for (const e of (calQueue||[])) {
    if (byDay[e.date] !== undefined) byDay[e.date].push(e);
  }

  const weekendWeather = (() => {
    const days = weather?.length > 0 ? weather : MOCK_WEATHER;
    return ['fri','sat','sun'].map(d =>
      days.find(w => w.day?.toLowerCase().startsWith(d)) || null
    ).filter(Boolean);
  })();

  const dayLabels = [
    { date: fri, key: toKey(fri), label: 'Friday',   short: 'FRI' },
    { date: sat, key: toKey(sat), label: 'Saturday',  short: 'SAT' },
    { date: sun, key: toKey(sun), label: 'Sunday',    short: 'SUN' },
  ];

  const calConnected = calendar?.connected || false;

  return (
    <div style={{
      width: 220, background: '#1A1815', borderLeft: '0.5px solid rgba(255,255,255,.07)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
    }}>
      {/* ── Spotlight ── */}
      {hero && (
        <div
          onClick={() => onCal(hero)}
          style={{
            padding: '11px 14px', borderBottom: '0.5px solid rgba(255,255,255,.07)',
            cursor: 'pointer', flexShrink: 0, transition: 'background .12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{fontSize:8,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#C9A84C',marginBottom:5}}>
            ⭐ TOP PICK
          </div>
          <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.88)',lineHeight:1.25,marginBottom:3}}>{hero.title}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,.38)',lineHeight:1.3}}>
            {hero.when}{hero.cost ? ` · ${hero.cost}` : ''}
          </div>
          {hero.expires && <div style={{fontSize:9,color:'#C9A84C',marginTop:4}}>⚡ Last chance</div>}
          {hero.why && <div style={{fontSize:10,color:'rgba(255,255,255,.28)',fontStyle:'italic',lineHeight:1.4,marginTop:4}}>{hero.why?.slice(0,80)}{hero.why?.length>80?'...':''}</div>}
        </div>
      )}

      {/* ── Your Weekend calendar ── */}
      <div style={{
        fontSize:8,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',
        color:'rgba(255,255,255,.28)', padding:'9px 14px 5px',flexShrink:0,
        display:'flex',alignItems:'center',justifyContent:'space-between',
      }}>
        <span>📅 Your Weekend</span>
        {!calConnected && (
          <span style={{fontSize:8,color:'rgba(255,255,255,.2)',fontWeight:400,fontStyle:'italic'}}>Not connected</span>
        )}
      </div>

      <div style={{flex:1,overflowY:'auto'}} className="no-scroll">
        {dayLabels.map(({ key, label, short, date }) => {
          const events = byDay[key] || [];
          const wx = weekendWeather.find(w => w.day?.toLowerCase().startsWith(short.toLowerCase()));
          return (
            <div key={key} style={{borderTop:'0.5px solid rgba(255,255,255,.05)'}}>
              {/* Day header */}
              <div style={{
                padding:'6px 14px 4px',display:'flex',alignItems:'center',gap:6,
              }}>
                <span style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,.55)',letterSpacing:'.04em',flex:1}}>{label} {date.getDate()}</span>
                {wx && (
                <button onClick={() => {
                  const allDays = weather?.length > 0 ? weather : MOCK_WEATHER;
                  const idx = allDays.findIndex(d => d.day?.toLowerCase().startsWith(short.toLowerCase()));
                  if (idx>=0) onWeather(idx);
                }} style={{
                  display:'flex',alignItems:'center',gap:4,
                  background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.12)',
                  borderRadius:99,padding:'3px 9px',cursor:'pointer',
                }}>
                  <WeatherIcon icon={wx.icon} desc={wx.desc} size={12} />
                  <span style={{fontSize:10,color:'rgba(255,255,255,.65)',fontWeight:500}}>{wx.hi}°</span>
                </button>
              )}
              </div>

              {/* Events for this day */}
              {events.length === 0 ? (
                <div style={{padding:'3px 14px 8px',fontSize:10,color:'rgba(255,255,255,.2)',fontStyle:'italic'}}>
                  {calConnected ? 'Nothing scheduled' : 'No events yet'}
                </div>
              ) : (
                <div style={{padding:'0 8px 6px',display:'flex',flexDirection:'column',gap:3}}>
                  {events
                    .sort((a,b) => (a.time||'').localeCompare(b.time||''))
                    .map((e,i) => (
                      <div key={i}
                        onClick={() => e.googleId && onEditCal?.(e)}
                        style={{
                          display:'flex',alignItems:'baseline',gap:5,
                          padding:'4px 6px',borderRadius:5,
                          background:'rgba(255,255,255,.04)',
                          border:'0.5px solid rgba(255,255,255,.06)',
                          cursor: e.googleId ? 'pointer' : 'default',
                          transition:'background .12s',
                        }}
                        onMouseEnter={ev => { if (e.googleId) ev.currentTarget.style.background='rgba(255,255,255,.09)'; }}
                        onMouseLeave={ev => { if (e.googleId) ev.currentTarget.style.background='rgba(255,255,255,.04)'; }}
                      >
                        <span style={{fontSize:9,color:'rgba(255,255,255,.3)',flexShrink:0,width:32,lineHeight:1.2}}>{e.time||'All day'}</span>
                        <span style={{fontSize:11,color:'rgba(255,255,255,.72)',fontWeight:500,lineHeight:1.2,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.title||e.name}</span>
                        {e.googleId && <span style={{fontSize:8,color:'rgba(255,255,255,.2)',flexShrink:0}}>✎</span>}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          );
        })}

        {/* Calendar connection hint if not connected */}
        {!calConnected && (
          <div style={{margin:'8px',padding:'10px 12px',borderRadius:8,background:'rgba(255,255,255,.03)',border:'0.5px solid rgba(255,255,255,.07)'}}>
            <div style={{fontSize:9,color:'rgba(255,255,255,.25)',lineHeight:1.4}}>
              📅 Calendar connects automatically when you sign in with Google
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Ask Claude chat ───────────────────────────────────────────────────────────
function AskClaude({ settings, activeProfile, onClose }) {
  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const inputRef = useRef(null);

  useEffect(()=>{ inputRef.current?.focus(); },[]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      // POST to /ask for free-text questions (not the preset prompt itineraries)
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const res  = await fetch(`${BASE}/ask`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          city:     settings?.city || 'Falls Church, VA',
          profile:  activeProfile ? {
            id:      activeProfile.id,
            prefs:   activeProfile.prefs || [],
            aboutMe: (activeProfile.aboutMe || '').slice(0, 200),
          } : null,
        }),
      });
      const json = await res.json();
      const data = json.data;
      // Format the structured response into readable chat text
      const parts = [];
      if (data?.intro) parts.push(data.intro);
      if (data?.items?.length) {
        parts.push('');
        data.items.forEach(i => {
          const label = [i.time, i.title].filter(Boolean).join(' -- ');
          parts.push(`${i.icon ? i.icon + ' ' : ''}${label}${i.detail ? '\n' + i.detail : ''}`);
        });
      }
      if (data?.note) parts.push('\n💡 ' + data.note);
      setMessages(m => [...m, { role: 'claude', text: parts.join('\n') }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'claude', text: "Sorry, couldn't connect right now. Try again?" }]);
    }
    setLoading(false);
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:70,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 0 0 0'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'#1C1A17',width:'100%',maxWidth:560,
        borderRadius:'16px 16px 0 0',border:'0.5px solid rgba(255,255,255,.12)',
        display:'flex',flexDirection:'column',maxHeight:'70vh',
        animation:'sheetUp 300ms cubic-bezier(.4,0,.2,1) both',
      }}>
        {/* Header */}
        <div style={{padding:'14px 18px',borderBottom:'0.5px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontSize:11,color:'#C9A84C',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:2}}>🎤 Ask Claude</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.4)'}}>Ask anything about this weekend in {settings?.city||'DC'}</div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.12)',borderRadius:8,padding:'5px 12px',fontSize:12,cursor:'pointer',fontFamily:'DM Sans,sans-serif',color:'rgba(255,255,255,.55)'}}>✕</button>
        </div>
        {/* Experimental banner */}
        <div style={{padding:'7px 18px',background:'rgba(201,168,76,.06)',borderBottom:'0.5px solid rgba(201,168,76,.12)',flexShrink:0}}>
          <span style={{fontSize:10,color:'rgba(201,168,76,.6)',letterSpacing:'.04em'}}>⚠️ Experimental — answers are general and may not reflect current event listings</span>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:'auto',padding:'14px 18px',display:'flex',flexDirection:'column',gap:10}} className="no-scroll">
          {messages.length === 0 && (
            <div style={{fontSize:12,color:'rgba(255,255,255,.3)',fontStyle:'italic',textAlign:'center',paddingTop:20}}>
              Ask me anything -- "good dog-friendly hikes?", "best brunch near Georgetown?", "what should we do Sunday afternoon?"
            </div>
          )}
          {messages.map((m,i)=>(
            <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
              <div style={{
                maxWidth:'85%',padding:'9px 13px',borderRadius:10,fontSize:12,lineHeight:1.6,
                background:m.role==='user'?'rgba(201,168,76,.2)':'rgba(255,255,255,.07)',
                border:`0.5px solid ${m.role==='user'?'rgba(201,168,76,.3)':'rgba(255,255,255,.08)'}`,
                color:m.role==='user'?'#C9A84C':'rgba(255,255,255,.8)',
                whiteSpace:'pre-wrap',
              }}>{m.text}</div>
            </div>
          ))}
          {loading&&(
            <div style={{display:'flex',justifyContent:'flex-start'}}>
              <div style={{padding:'9px 13px',borderRadius:10,background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.08)',fontSize:12,color:'rgba(255,255,255,.4)',fontStyle:'italic'}}>Thinking...</div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{padding:'12px 18px',borderTop:'0.5px solid rgba(255,255,255,.08)',display:'flex',gap:8,flexShrink:0}}>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder="Ask about this weekend..." style={{
              flex:1,background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.12)',
              borderRadius:8,padding:'8px 12px',fontSize:12,color:'rgba(255,255,255,.8)',
              fontFamily:'DM Sans,sans-serif',outline:'none',
            }}
          />
          <button onClick={send} disabled={!input.trim()||loading} style={{
            padding:'8px 16px',borderRadius:8,background:'rgba(201,168,76,.2)',
            border:'0.5px solid rgba(201,168,76,.3)',color:'#C9A84C',
            fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',
            opacity:(!input.trim()||loading)?0.4:1,transition:'opacity .15s',
          }}>Send</button>
        </div>
      </div>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────
function CatColumn({ cat, activities, removed, onCal, onRemove, onHeart, onThumbUp, onThumbDown, onReserve, weatherDim, weatherBoost, homeAddress, profileId, spotlightMode, isMobile, timeFilter, hasConflict, crossCatSeen, curatedMode }) {
  const allActsUnsliced = dedupeActivities(
    (activities[cat.id]?.length>0 ? activities[cat.id] : MOCK_ACTIVITIES[cat.id]||[])
      .filter(a => !removed[`${cat.id}::${a.title}`])
      .filter(a => !isPastEvent(a))
      .filter(a => !isFrontendBlocked(a))
      .filter(a => {
        // Cross-category dedup: skip if another column already claimed this title
        if (crossCatSeen) {
          const key = (a.title||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,40);
          if (crossCatSeen.has(key)) return false;
          crossCatSeen.add(key);
        }
        return true;
      })
      .filter(a => {
        if (!timeFilter || timeFilter === 'all') return true;
        const tod = getTimeOfDay(a);
        return tod === timeFilter || tod === 'any';
      })
  );
  const allActs = curatedMode ? allActsUnsliced.slice(0, 5) : allActsUnsliced;

  const isDimmed  = weatherDim.includes(cat.id);
  const isBoosted = weatherBoost.includes(cat.id);
  const showHero  = spotlightMode === 'hero';

  return (
    <div style={{display:'flex',flexDirection:'column',borderRight:'0.5px solid var(--border)',minWidth:0,minHeight:0,overflow:'hidden',opacity:isDimmed?0.65:1,transition:'opacity .3s'}}>
      <div className={`${cat.cls}`} style={{padding:'10px 13px 9px',display:'flex',flexDirection:'column',alignItems:'center',gap:3,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7,width:'100%'}}>
          <span style={{fontSize:14}}>{cat.icon}</span>
          <span style={{fontSize:12,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',textAlign:'center',flex:1}}>{cat.label}</span>
          <span style={{fontSize:14}}>{cat.icon}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          {isBoosted&&<span style={{fontSize:9,background:'rgba(0,0,0,.12)',padding:'1px 5px',borderRadius:99}}>☀ great today</span>}
          {isDimmed&&<span style={{fontSize:9,background:'rgba(0,0,0,.12)',padding:'1px 5px',borderRadius:99}}>🌧 rain</span>}
          <span style={{fontSize:10,opacity:.45}}>{allActs.length}</span>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'10px 8px',display:'flex',flexDirection:'column',gap:8,background:'#F4F1EB',minHeight:0}}>
        {showHero && <SpotlightHero activities={{[cat.id]:allActs}} onCal={onCal} />}
        {allActs.length===0
          ? <div style={{padding:'12px 4px',fontSize:11,color:'#B8B3AA',fontStyle:'italic'}}>Nothing here -- check back Thursday</div>
          : allActs.map(a=>(
              <ActCard key={a.title} act={{...a, _conflict: hasConflict?.(a)}} catId={cat.id}
                onCal={onCal}
                onRemove={()=>onRemove(cat.id,a)}
                onHeart={()=>onHeart(cat.id,a)}
                onThumbUp={()=>onThumbUp(cat.id,a)}
                onThumbDown={()=>onThumbDown(cat.id,a)}
                onReserve={onReserve}
                homeAddress={homeAddress}
                profileId={profileId}
              />
            ))
        }
      </div>
    </div>
  );
}

// ── Stacked column: two low-count categories sharing one column slot ──────────
function StackedColumn({ cats, ...colProps }) {
  // NOTE: do NOT destructure `activities` here — it must stay in colProps so CatColumn receives it.
  // Stripping it caused CatColumn to crash (activities[cat.id] throws on undefined) → blank screen.
  return (
    <div style={{ display:'flex', flexDirection:'column', borderRight:'0.5px solid var(--border)', minWidth:0, minHeight:0, overflow:'hidden' }}>
      {cats.map((cat, i) => (
        <div key={cat.id} style={{
          flex: 1, display:'flex', flexDirection:'column', minHeight:0,
          borderBottom: i < cats.length-1 ? '1px solid var(--border)' : 'none',
          overflow: 'hidden',
        }}>
          <CatColumn cat={cat} {...colProps} />
        </div>
      ))}
    </div>
  );
}

// ── Mobile single-column layout ───────────────────────────────────────────────
function MobileLayout({ visibleCats, activities, removed, onCal, onRemove, onHeart, onThumbUp, onThumbDown, onReserve, weatherDim, weatherBoost, homeAddress, profileId, spotlightMode, timeFilter, curatedMode }) {
  const [activeCat, setActiveCat] = useState(visibleCats[0]?.id || 'outdoors');
  const swipeX   = useRef(null);
  const swipeDir = useRef(null);
  const tabsRef  = useRef(null);

  const catIdx = visibleCats.findIndex(c => c.id === activeCat);
  const cat    = visibleCats[catIdx] || visibleCats[0];

  // Scroll active tab into view when category changes
  useEffect(() => {
    const el = tabsRef.current?.querySelector(`[data-cat="${activeCat}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeCat]);

  const onTS = e => { swipeX.current = e.touches[0].clientX; swipeDir.current = null; };
  const onTM = e => {
    if (swipeDir.current) return;
    const dx = Math.abs(e.touches[0].clientX - swipeX.current);
    const dy = Math.abs(e.touches[0].clientY - swipeX.current);
    if (dx > 8 && dx > dy) swipeDir.current = 'h';
    else if (dy > 8) swipeDir.current = 'v';
  };
  const onTE = e => {
    if (swipeDir.current !== 'h') return;
    const dx = e.changedTouches[0].clientX - swipeX.current;
    if (dx < -40 && catIdx < visibleCats.length - 1) setActiveCat(visibleCats[catIdx + 1].id);
    else if (dx > 40 && catIdx > 0) setActiveCat(visibleCats[catIdx - 1].id);
  };

  if (!cat) return null;

  const allActs = (activities[cat.id]?.length > 0 ? activities[cat.id] : MOCK_ACTIVITIES[cat.id] || [])
    .filter(a => !removed[`${cat.id}::${a.title}`])
    .filter(a => !isPastEvent(a))
    .filter(a => {
      if (!timeFilter || timeFilter === 'all') return true;
      const tod = getTimeOfDay(a);
      return tod === timeFilter || tod === 'any';
    });

  const isDimmed  = weatherDim.includes(cat.id);
  const isBoosted = weatherBoost.includes(cat.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, background: 'var(--bg)' }}>

      {/* ── Category tab strip ── */}
      <div ref={tabsRef} style={{
        display: 'flex', overflowX: 'auto', flexShrink: 0,
        background: 'var(--surface)', borderBottom: '0.5px solid var(--border)',
        WebkitOverflowScrolling: 'touch',
      }} className="no-scroll">
        {visibleCats.map(c => {
          const active    = c.id === activeCat;
          const boosted   = weatherBoost.includes(c.id);
          const dimmed    = weatherDim.includes(c.id);
          return (
            <button key={c.id} data-cat={c.id} onClick={() => setActiveCat(c.id)} style={{
              padding: '10px 14px', border: 'none', flexShrink: 0, cursor: 'pointer',
              borderBottom: `2px solid ${active ? 'var(--text)' : 'transparent'}`,
              background: 'transparent',
              fontFamily: 'var(--font-body)', fontSize: 12,
              fontWeight: active ? 700 : 400,
              color: active ? 'var(--text)' : 'var(--muted)',
              display: 'flex', alignItems: 'center', gap: 5,
              opacity: dimmed ? 0.5 : 1, transition: 'all .15s',
            }}>
              <span style={{ fontSize: 14 }}>{c.icon}</span>
              <span>{c.label}</span>
              {boosted && <span style={{ fontSize: 9, color: '#92400E' }}>☀</span>}
              {/* Event count badge */}
              {(activities[c.id]?.length > 0) && (
                <span style={{
                  fontSize: 9, fontWeight: 700, minWidth: 14, height: 14,
                  borderRadius: 99, background: active ? 'var(--text)' : 'var(--border)',
                  color: active ? 'var(--bg)' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                }}>{activities[c.id].length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Category header ── */}
      <div className={cat.cls} style={{
        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <span style={{ fontSize: 18 }}>{cat.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', flex: 1 }}>{cat.label}</span>
        {isBoosted && <span style={{ fontSize: 10, background: 'rgba(0,0,0,.12)', padding: '2px 7px', borderRadius: 99 }}>☀ great today</span>}
        {isDimmed  && <span style={{ fontSize: 10, background: 'rgba(0,0,0,.12)', padding: '2px 7px', borderRadius: 99 }}>🌧 rain likely</span>}
        <span style={{ fontSize: 11, color: 'var(--muted)', opacity: .6 }}>{allActs.length} options</span>
      </div>

      {/* ── Card list -- full width, comfortable padding ── */}
      <div
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
        style={{
          flex: 1, overflowY: 'auto', padding: '10px 12px',
          display: 'flex', flexDirection: 'column', gap: 8,
          WebkitOverflowScrolling: 'touch',
        }}
        className="no-scroll"
      >
        {allActs.length === 0 ? (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.6,
          }}>
            Nothing here yet{timeFilter !== 'all' ? ' for this time of day' : ''}
            <div style={{ fontSize: 11, marginTop: 8, opacity: .6 }}>Check back Thursday for weekend picks</div>
          </div>
        ) : (
          allActs.map(a => (
            <ActCard key={a.title} act={a} catId={cat.id}
              onCal={onCal}
              onRemove={() => onRemove(cat.id, a)}
              onHeart={() => onHeart(cat.id, a)}
              onThumbUp={() => onThumbUp(cat.id, a)}
              onThumbDown={() => onThumbDown(cat.id, a)}
              onReserve={onReserve}
              homeAddress={homeAddress}
              profileId={profileId}
            />
          ))
        )}
      </div>

      {/* ── Swipe indicator dots ── */}
      <div style={{
        padding: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4,
        background: 'var(--bg2)', borderTop: '0.5px solid var(--border)', flexShrink: 0,
      }}>
        {visibleCats.map(c => (
          <div key={c.id} onClick={() => setActiveCat(c.id)} style={{
            width: c.id === activeCat ? 20 : 6,
            height: 6, borderRadius: 99,
            background: c.id === activeCat ? 'var(--text)' : 'var(--border)',
            cursor: 'pointer', transition: 'all .25s',
            flexShrink: 0,
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Reserve modal ─────────────────────────────────────────────────────────────
function ReserveModal({ activity, catId, onClose, homeAddress }) {
  const [step,setStep]=useState(1); const [party,setParty]=useState(2); const [time,setTime]=useState('7:00 PM');
  const {satStr}=getWeekendDateStr();
  const isTicket=['sports','music'].includes(catId)||activity.tags?.some(t=>['baseball','concert','theater','arena','stadium'].includes(t));
  const isFood=['food'].includes(catId)||activity.reservable;
  const platform=isTicket?'StubHub':isFood?'Resy':'OpenTable';
  const platformColor=isTicket?'#60A5FA':isFood?'#F97316':'#34D399';
  const platformBg=isTicket?'rgba(96,165,250,.2)':isFood?'rgba(249,115,22,.2)':'rgba(52,211,153,.2)';
  const platformBorder=isTicket?'rgba(96,165,250,.3)':isFood?'rgba(249,115,22,.3)':'rgba(52,211,153,.3)';
  const times=isTicket?['General Admission','Section 101 Row C','Section 114 Row F','VIP Floor']:['6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM'];
  const handleBook=()=>{
    const v=encodeURIComponent(activity.title);
    if(platform==='Resy') window.open(`https://resy.com/cities/washington-dc?query=${v}`,'_blank');
    else if(platform==='OpenTable') window.open(`https://www.opentable.com/s?term=${v}&covers=${party}`,'_blank');
    else window.open(`https://www.stubhub.com/find/s/?q=${v}`,'_blank');
    setStep(3);
  };
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:75,padding:20}} onClick={onClose}>
      <div className="scale-enter" onClick={e=>e.stopPropagation()} style={{background:'#1C1A17',borderRadius:14,border:'0.5px solid rgba(255,255,255,.1)',width:310,maxWidth:'100%',overflow:'hidden'}}>
        <div style={{padding:'13px 17px',borderBottom:'0.5px solid rgba(255,255,255,.08)',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div><div style={{fontSize:11,color:platformColor,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:2}}>{isTicket?'🎟':'🍽'} {platform}</div>
          <div className="serif" style={{fontSize:15,color:'rgba(255,255,255,.9)',fontWeight:300}}>{activity.title}</div></div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.1)',borderRadius:7,padding:'3px 9px',fontSize:12,cursor:'pointer',fontFamily:'DM Sans,sans-serif',color:'rgba(255,255,255,.5)'}}>✕</button>
        </div>
        {step===1&&<div style={{padding:'14px 17px'}}>
          {!isTicket&&<><div style={{fontSize:10,color:'rgba(255,255,255,.4)',letterSpacing:'.05em',textTransform:'uppercase',marginBottom:7}}>Party size</div>
          <div style={{display:'flex',gap:5,marginBottom:13}}>{[1,2,3,4,5,6].map(n=><button key={n} onClick={()=>setParty(n)} style={{width:34,height:34,borderRadius:8,border:'0.5px solid rgba(255,255,255,.12)',background:party===n?platformBg:'rgba(255,255,255,.05)',color:party===n?platformColor:'rgba(255,255,255,.6)',cursor:'pointer',fontSize:13,fontWeight:500,fontFamily:'DM Sans,sans-serif',transition:'all .12s'}}>{n}</button>)}</div></>}
          <div style={{fontSize:10,color:'rgba(255,255,255,.4)',letterSpacing:'.05em',textTransform:'uppercase',marginBottom:7}}>{isTicket?'Section':'Time'}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:13}}>{times.map(t=><button key={t} onClick={()=>setTime(t)} style={{padding:'7px 5px',borderRadius:8,border:'0.5px solid rgba(255,255,255,.12)',background:time===t?platformBg:'rgba(255,255,255,.05)',color:time===t?platformColor:'rgba(255,255,255,.6)',cursor:'pointer',fontSize:11,fontFamily:'DM Sans,sans-serif',transition:'all .12s',textAlign:'center'}}>{t}</button>)}</div>
          <button onClick={()=>setStep(2)} style={{width:'100%',padding:10,borderRadius:9,background:platformBg,color:platformColor,border:`0.5px solid ${platformBorder}`,fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Continue → {!isTicket&&`${party} guests · `}{time}</button>
        </div>}
        {step===2&&<div style={{padding:'14px 17px'}}>
          <div style={{background:'rgba(255,255,255,.04)',borderRadius:9,padding:'11px 13px',marginBottom:13}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,.6)',lineHeight:1.7}}>
              <div><strong style={{color:'rgba(255,255,255,.82)'}}>{activity.title}</strong></div>
              <div>{activity.where}</div><div>{satStr} · {time}{!isTicket&&` · ${party} guests`}</div>
              <div style={{color:platformColor,marginTop:3,fontSize:11}}>via {platform}{!isTicket&&' -- free to cancel'}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>setStep(1)} style={{flex:1,padding:8,borderRadius:8,background:'transparent',border:'0.5px solid rgba(255,255,255,.12)',fontSize:12,cursor:'pointer',fontFamily:'DM Sans,sans-serif',color:'rgba(255,255,255,.4)'}}>Back</button>
            <button onClick={handleBook} style={{flex:2,padding:8,borderRadius:8,background:platformBg,color:platformColor,border:`0.5px solid ${platformBorder}`,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Open {platform} →</button>
          </div>
        </div>}
        {step===3&&<div style={{padding:'22px 17px',textAlign:'center'}}>
          <div style={{fontSize:38,marginBottom:10}}>{isTicket?'🎟':'✅'}</div>
          <div style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.9)',marginBottom:5}}>Opening {platform}...</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.4)',lineHeight:1.7,marginBottom:14}}>{activity.title}<br/>Complete your booking on {platform}</div>
          <button onClick={onClose} style={{padding:'8px 22px',borderRadius:99,background:'rgba(255,255,255,.08)',border:'0.5px solid rgba(255,255,255,.12)',fontSize:12,color:'rgba(255,255,255,.7)',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Done</button>
        </div>}
      </div>
    </div>
  );
}


// ── Reactive isMobile hook ────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ActiveMode({ settings, activeProfile, calQueue, activities={}, weather=[], activitiesSource='mock', weatherSource='mock', calendar, onCalendar, onWeather, onSettings, onAmbient, onSwitchProfile, onSaveItem, onShowSaved, onThumbUp, onThumbDown, onEditCal }) {
  const [removed,      setRemoved]      = useState({});
  const [activeCat,    setActiveCat]    = useState('all');
  const [timeFilter,   setTimeFilter]   = useState('all');   // 'all' | 'morning' | 'midday' | 'night'
  const [aiPrompt,     setAiPrompt]     = useState(null);
  const [reserveAct,   setReserveAct]   = useState(null);
  const [colPage,      setColPage]      = useState(0);
  const [showAsk,      setShowAsk]      = useState(false);
  const [overlayShown, setOverlayShown] = useState(false);

  const { themeId, setTheme, currentTheme } = useTheme();
  const { active: pipelineActive, label: pipelineLabel } = usePipelineStatus();

  const profileColor  = PROFILE_COLORS.find(c=>c.id===activeProfile?.colorId)||PROFILE_COLORS[0];
  const { boost, dim } = getWeatherBoost(weather);
  const weekendWeather = getWeekendWeather(weather);
  const homeAddress    = settings?.homeAddress||activeProfile?.homeAddress||'';

  const spotlightMode= settings?.spotlightMode|| 'strip';
  const columnOrder  = settings?.columnOrder  || 'relevancy';
  const curatedMode  = settings?.curatedMode  || false;

  // Reactive mobile detection -- updates on resize
  const isMobile = useIsMobile();

  const removeAct  = (catId,act) => setRemoved(r=>({...r,[`${catId}::${act.title}`]:true}));
  const heartAct   = (catId,act) => onSaveItem?.({...act,catId});
  const thumbUp    = (catId,act) => onThumbUp?.(catId,act);
  const thumbDown  = (catId,act) => { setRemoved(r=>({...r,[`${catId}::${act.title}`]:true})); onThumbDown?.(catId,act); };

  const catStates    = activeProfile?.categoryStates||{};
  const alwaysCats   = ALL_CATEGORIES.filter(c=>catStates[c.id]==='always');
  const sometimesCats= ALL_CATEGORIES.filter(c=>catStates[c.id]==='sometimes');
  const defaultCats  = ALL_CATEGORIES.slice(0,9);
  let baseCats = activeCat==='all'
    ? (alwaysCats.length>0?[...alwaysCats,...sometimesCats.slice(0,4)]:defaultCats)
    : ALL_CATEGORIES.filter(c=>c.id===activeCat);

  // Apply column ordering
  const visibleCats = columnOrder==='relevancy'
    ? sortCategoriesByRelevancy(baseCats, activities)
    : columnOrder==='random'
    ? [...baseCats].sort(()=>Math.random()-0.5)
    : baseCats;

  const COLS_PER_PAGE = isMobile ? 1 : 4;
  const numPages = Math.max(1, Math.ceil(visibleCats.length/COLS_PER_PAGE));
  // Clamp colPage when live data loads and numPages shrinks
  const safePage = Math.min(colPage, numPages - 1);
  const pageCats = visibleCats.slice(safePage*COLS_PER_PAGE, safePage*COLS_PER_PAGE+COLS_PER_PAGE);
  // Keep state in sync so arrows work correctly on next press
  useEffect(() => { if (colPage !== safePage) setColPage(safePage); }, [numPages]);

  // Swipe
  const swipeX   = useRef(null);
  const swipeDir = useRef(null);
  const onTS = e=>{swipeX.current=e.touches[0].clientX;swipeDir.current=null;};
  const onTM = e=>{if(swipeDir.current)return;const dx=Math.abs(e.touches[0].clientX-swipeX.current);const dy=Math.abs(e.touches[0].clientY-swipeX.current);if(dx>6||dy>6)swipeDir.current=dx>dy?'h':'v';};
  const onTE = e=>{if(swipeDir.current!=='h')return;const dx=e.changedTouches[0].clientX-swipeX.current;if(dx<-40&&safePage<numPages-1)setColPage(p=>Math.min(p+1,numPages-1));else if(dx>40&&safePage>0)setColPage(p=>Math.max(p-1,0));};

  // Cross-category dedup set — mutable, passed into each CatColumn
  // First column to claim a title wins; subsequent columns skip duplicates
  const crossCatSeen = new Set();

  const colProps = { removed, onCal:onCalendar, onRemove:removeAct, onHeart:heartAct, onThumbUp:thumbUp, onThumbDown:thumbDown, onReserve:(act,cid)=>setReserveAct({act,catId:cid}), weatherDim:dim, weatherBoost:boost, homeAddress, profileId:activeProfile?.id||'default', spotlightMode, activities, isMobile, timeFilter, hasConflict: calendar?.hasConflict, crossCatSeen, curatedMode };

  // Calendar strip data -- sort calQueue into Fri/Sat/Sun buckets
  const now2 = new Date();
  const day2 = now2.getDay();
  let daysToFri2 = (5-day2+7)%7;
  if (day2===6) daysToFri2=6; else if (day2===0) daysToFri2=5;
  const fri2 = new Date(now2); fri2.setDate(now2.getDate()+(day2===6?-1:day2===0?-2:daysToFri2)); fri2.setHours(0,0,0,0);
  const sat2 = new Date(fri2); sat2.setDate(fri2.getDate()+1);
  const sun2 = new Date(fri2); sun2.setDate(fri2.getDate()+2);
  const fmtDate2 = d => d.toISOString().split('T')[0];
  const calStrip = { fri:[], sat:[], sun:[] };
  for (const e of (calQueue||[])) {
    if (e.date===fmtDate2(fri2)) calStrip.fri.push(e);
    else if (e.date===fmtDate2(sat2)) calStrip.sat.push(e);
    else if (e.date===fmtDate2(sun2)) calStrip.sun.push(e);
  }

  return (
    <div className="fade-enter" style={{display:'grid',gridTemplateRows:'auto auto 1fr auto',height:'100%',background:'var(--bg)',overflow:'hidden',fontFamily:'var(--font-body)'}}>

      {/* ── Header ── */}
      <div style={{background:'var(--header-bg)',padding:'9px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:20,color:'rgba(255,255,255,.9)',fontWeight:300,letterSpacing:'.06em',fontFamily:'var(--font-display)'}}>Locale</span>
          <span style={{fontSize:11,color:'rgba(255,255,255,.28)',fontFamily:'var(--font-body)'}}>{settings.city}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {/* Ask -- always shown */}
          <button onClick={()=>setShowAsk(true)} style={{fontSize:11,padding:'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'var(--accent-bg)',border:'0.5px solid var(--accent-border)',color:'var(--accent)',fontFamily:'var(--font-body)'}}>
            {isMobile ? '✏️' : 'Ask'}
          </button>
          {/* Status dot -- always shown */}
          <div title={`Activities: ${activitiesSource}`} style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:activitiesSource==='live'?'#22c55e':'#f59e0b',boxShadow:activitiesSource==='live'?'0 0 6px #22c55e88':'0 0 6px #f59e0b66'}}/>
          {/* Saved -- desktop only */}
          {!isMobile && (
            <button onClick={onShowSaved} style={{fontSize:13,padding:'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.12)',color:'#E53E3E',fontFamily:'var(--font-body)'}}>♥</button>
          )}
          {/* Profile avatar -- always shown, name hidden on mobile */}
          <button onClick={onSwitchProfile} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 7px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:profileColor.border,border:`0.5px solid ${profileColor.border}`,fontFamily:'var(--font-body)'}}>
            <div style={{width:16,height:16,borderRadius:'50%',background:profileColor.hex,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'white',fontWeight:600}}>{activeProfile?.name?.charAt(0)||'A'}</div>
            {!isMobile && <span style={{fontSize:11,color:profileColor.light,fontWeight:500}}>{activeProfile?.name}</span>}
            <span style={{fontSize:9,color:`${profileColor.light}88`}}>▾</span>
          </button>
          {/* Pipeline live indicator */}
          {pipelineActive && (
            <div style={{display:'flex',alignItems:'center',gap:5,padding:'3px 9px',borderRadius:99,background:'rgba(201,168,76,.12)',border:'0.5px solid rgba(201,168,76,.25)'}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#C9A84C',display:'inline-block',animation:'pulse 1.2s ease-in-out infinite'}}/>
              <span style={{fontSize:10,color:'#C9A84C',fontWeight:500,whiteSpace:'nowrap'}}>{pipelineLabel}</span>
            </div>
          )}
          {/* Settings -- always shown */}
          <button onClick={() => onSettings()} style={{fontSize:isMobile?14:11,padding:isMobile?'4px 7px':'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.12)',color:'rgba(255,255,255,.55)',fontFamily:'var(--font-body)'}}>⚙</button>
          {/* Ambient -- desktop only */}
          {!isMobile && (
            <button onClick={onAmbient} style={{fontSize:11,padding:'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'var(--accent-bg)',border:'0.5px solid var(--accent-border)',color:'var(--accent)',fontFamily:'var(--font-body)'}}>Ambient</button>
          )}
        </div>
      </div>

      {/* ── Quick prompts ── */}
      <div style={{background:'var(--header-bg2)',padding:isMobile?'5px 10px':'7px 18px',display:'flex',alignItems:'center',gap:8}}>
        <div style={{display:'flex',gap:5,overflowX:'auto',flex:1}} className="no-scroll">
          {(isMobile ? QUICK_PROMPTS.slice(0,3) : QUICK_PROMPTS).map(p=>(
            <button key={p.label} onClick={()=>setAiPrompt(p)} style={{
              fontSize:isMobile?10:11,padding:isMobile?'4px 9px':'5px 12px',borderRadius:99,whiteSpace:'nowrap',
              background:'rgba(255,255,255,.09)',border:'0.5px solid rgba(255,255,255,.14)',
              color:'rgba(255,255,255,.7)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:500,transition:'all .15s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(201,168,76,.2)';e.currentTarget.style.color='#C9A84C';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.09)';e.currentTarget.style.color='rgba(255,255,255,.7)';}}
            >{p.label}</button>
          ))}
          {!isMobile && <button onClick={()=>setShowAsk(true)} style={{
            fontSize:11,padding:'5px 12px',borderRadius:99,whiteSpace:'nowrap',
            background:'rgba(201,168,76,.1)',border:'0.5px solid rgba(201,168,76,.2)',
            color:'rgba(201,168,76,.7)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:500,flexShrink:0,
          }}>✏️ Ask anything...</button>}
        </div>
      </div>





      {/* ── Main content ── */}
      <ColumnErrorBoundary>
      {isMobile
        ? <MobileLayout visibleCats={visibleCats} {...colProps} />
        : <div style={{display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0}}>
            <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>
              {/* Columns grid -- low-count categories get stacked 2-per-column */}
              {(() => {
                // Build column slots: pair cats with ≤3 events together
                const slots = [];
                let i = 0;
                while (i < pageCats.length) {
                  const cat = pageCats[i];
                  const count = (activities[cat.id] || []).filter(a => !isFrontendBlocked(a)).length;
                  const nextCat = pageCats[i+1];
                  const nextCount = nextCat ? (activities[nextCat.id] || []).filter(a => !isFrontendBlocked(a)).length : 999;
                  // Stack if both this and next are low-count (≤3 events each)
                  if (count <= 3 && nextCat && nextCount <= 3) {
                    slots.push({ type:'stacked', cats:[cat, nextCat] });
                    i += 2;
                  } else {
                    slots.push({ type:'single', cat });
                    i += 1;
                  }
                }
                return (
                  <div onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
                    style={{flex:1,display:'grid',gridTemplateColumns:`repeat(${slots.length},1fr)`,minHeight:0}}
                  >
                    {slots.map((slot, si) =>
                      slot.type === 'stacked'
                        ? <StackedColumn key={slot.cats.map(c=>c.id).join('+')} cats={slot.cats} {...colProps} />
                        : <CatColumn key={slot.cat.id} cat={slot.cat} {...colProps} />
                    )}
                  </div>
                );
              })()}
              {/* Sidebar -- RIGHT side, outside the columns grid */}
              <WeekendSidebar
                activities={activities}
                calQueue={calQueue}
                weather={weather}
                onCal={onCalendar}
                onWeather={onWeather}
                calendar={calendar}
                onEditCal={onEditCal}
              />
            </div>

            {/* Page nav */}
            {numPages>1&&(
              <div style={{background:'#1C1A17',borderTop:'0.5px solid rgba(255,255,255,.06)',padding:'6px 18px',display:'flex',alignItems:'center',gap:8}}>
                <button onClick={()=>setColPage(p=>Math.max(0,p-1))} style={{padding:'7px 20px',borderRadius:10,cursor:'pointer',background:'rgba(255,255,255,.1)',border:'0.5px solid rgba(255,255,255,.18)',color:'rgba(255,255,255,.8)',fontSize:18,fontFamily:'DM Sans,sans-serif',fontWeight:500,lineHeight:1,transition:'all .15s'}}>←</button>
                <div style={{flex:1,display:'flex',justifyContent:'center',gap:5}}>
                  {Array.from({length:numPages}).map((_,i)=>(
                    <div key={i} onClick={()=>setColPage(i)} style={{width:i===safePage?18:6,height:6,borderRadius:99,background:i===safePage?'#C9A84C':'rgba(255,255,255,.2)',cursor:'pointer',transition:'all .2s'}}/>
                  ))}
                </div>
                <button onClick={()=>setColPage(p=>(p+1)%numPages)} style={{padding:'7px 20px',borderRadius:10,cursor:'pointer',background:'rgba(201,168,76,.2)',border:'0.5px solid rgba(201,168,76,.35)',color:'#C9A84C',fontSize:18,fontFamily:'DM Sans,sans-serif',fontWeight:500,lineHeight:1,transition:'all .15s'}}>→</button>
              </div>
            )}
          </div>
      }
      </ColumnErrorBoundary>

      {/* ── Footer: time filter only ── */}
      <div style={{background:'var(--bg2)',borderTop:'0.5px solid var(--border)',padding:'5px 18px',display:'flex',alignItems:'center',gap:4,overflowX:'auto'}} className="no-scroll">
        <span style={{fontSize:11,color:'var(--muted)',marginRight:4,flexShrink:0}}>Time:</span>
        {[{id:'all',label:'Any time'},{id:'morning',label:'🌅 Morning'},{id:'midday',label:'☀️ Midday'},{id:'night',label:'🌙 Evening'}].map(t=>(
          <button key={t.id} onClick={()=>setTimeFilter(t.id)} style={{
            fontSize:11,padding:'4px 12px',borderRadius:'var(--radius-pill)',cursor:'pointer',whiteSpace:'nowrap',
            background:timeFilter===t.id?'var(--dark)':'transparent',
            color:timeFilter===t.id?'rgba(255,255,255,.85)':'var(--muted)',
            border:timeFilter===t.id?'none':'0.5px solid var(--border)',
            fontFamily:'var(--font-body)',transition:'all .15s',flexShrink:0,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Overlays ── */}
      {spotlightMode==='overlay'&&!overlayShown&&Object.values(activities).flat().length>0&&(
        <SpotlightOverlay activities={activities} onDismiss={()=>setOverlayShown(true)} onCal={onCalendar} />
      )}
      {showAsk&&<AskClaude settings={settings} activeProfile={activeProfile} onClose={()=>setShowAsk(false)} />}
      {aiPrompt&&<AIPromptModal prompt={aiPrompt} settings={settings} activeProfile={activeProfile} onClose={()=>setAiPrompt(null)} />}
      {reserveAct&&<ReserveModal activity={reserveAct.act} catId={reserveAct.catId} onClose={()=>setReserveAct(null)} homeAddress={homeAddress} />}
    </div>
  );
}
