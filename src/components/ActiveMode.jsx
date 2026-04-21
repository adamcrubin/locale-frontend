import { useState, useRef, useEffect, useCallback } from 'react';
import { ALL_CATEGORIES, ACTIVITIES as MOCK_ACTIVITIES, WEATHER as MOCK_WEATHER, CALENDAR_EVENTS, PROFILE_COLORS } from '../data/content';
import AIPromptModal from './AIPromptModal';
import WeatherIcon from './WeatherIcon';
import ThemeToggle, { useTheme } from './ThemeToggle';
import { postFeedback, fetchPromptResponse } from '../lib/api';

const QUICK_PROMPTS = [
  { label:'Plan my Saturday' }, { label:'Date night' },
  { label:'What can I do right now?' }, { label:'Dog-friendly' },
  { label:'Rainy Sunday' }, { label:'Free only' },
  { label:'With Kailee' }, { label:'Weekend away' },
];

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
  const [thumbed, setThumbed] = useState(null);

  const handleDirections = () => {
    const dest   = encodeURIComponent(act.address || act.where || act.title);
    const origin = homeAddress ? encodeURIComponent(homeAddress) : '';
    window.open(origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`
      : `https://www.google.com/maps/search/?api=1&query=${dest}`, '_blank');
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
      <ABtn icon="📅" title="Add to calendar" onClick={()=>onCal(act)} />
      <ABtn icon="🎟" title="Reserve/tickets" onClick={()=>onReserve(act,catId)} dim={!act.reservable&&!['sports','music'].includes(catId)} />
      <ABtn isMap title="Directions" onClick={handleDirections} />
      <ABtn icon="✕" title="Hide" onClick={onRemove} hoverBg="#FFF1F2" hoverColor="#E53E3E" />
      <div style={{flex:1}}/>
      <ABtn icon="♥" title="Save" onClick={()=>onHeart(act)} hoverBg="#FFF1F2" hoverColor="#E53E3E" color="#E53E3E" />
      <ABtn icon="👍" title={thumbed==='up'?"Undo":"More like this"} onClick={()=>{setThumbed(t=>t==='up'?null:'up');onThumbUp(act);}} active={thumbed==='up'} activeBg="#E8F5EC" activeColor="#1A6332" />
      <ABtn icon="👎" title={thumbed==='down'?"Undo":"Less like this"} onClick={()=>{setThumbed(t=>t==='down'?null:'down');onThumbDown(act);}} active={thumbed==='down'} activeBg="#FFF1F2" activeColor="#9A3412" />
    </div>
  );
}

// ── Activity card ─────────────────────────────────────────────────────────────
function ActCard({ act, catId, onCal, onRemove, onHeart, onThumbUp, onThumbDown, onReserve, homeAddress, profileId, cardMode, forceExpand }) {
  const [expanded,      setExpanded]      = useState(forceExpand || false);
  const [thumbFeedback, setThumbFeedback] = useState(null);
  const [exiting,       setExiting]       = useState(false);
  const contentRef = useRef(null);

  const isRec      = act.content_type === 'recommendation';
  const score      = act.final_score || act.base_score || 0.5;
  const autoExpand = forceExpand || (cardMode === 'relevancy' && score >= 0.75);
  const isExpanded = autoExpand || expanded;
  const isCompact  = !isExpanded;

  const sendFeedback = (fb) => {
    if (!act.id || !profileId) return;
    postFeedback(profileId, act.id, act.content_type || 'event', fb).catch(() => {});
  };

  const handleThumbUp   = () => { sendFeedback('up');   setThumbFeedback({ msg:"We'll show more like this 👍", ok:true  }); onThumbUp(act);   setTimeout(() => setThumbFeedback(null), 2200); };
  const handleThumbDown = () => { sendFeedback('down'); setThumbFeedback({ msg:"Got it — we'll show less like this 👎", ok:false }); onThumbDown(act); setTimeout(() => setThumbFeedback(null), 2200); };

  const toggle = () => setExpanded(e => !e);

  return (
    <div style={{
      background:   isRec ? 'var(--surface2)' : 'var(--surface)',
      border:       `0.5px solid var(--border)`,
      borderRadius: 8,
      overflow:     'hidden',
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

      {/* ── Header row — always visible, tap to expand ── */}
      <div
        onClick={toggle}
        style={{
          padding: isCompact ? '7px 10px' : '9px 12px 6px',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer',
          background: isRec ? 'var(--surface2)' : 'var(--surface)',
          userSelect: 'none',
        }}
      >
        {isRec && <span style={{ fontSize: 10, flexShrink: 0 }}>🔄</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2,
            overflow: isCompact ? 'hidden' : 'visible',
            textOverflow: isCompact ? 'ellipsis' : 'clip',
            whiteSpace: isCompact ? 'nowrap' : 'normal',
          }}>{act.title}</div>
          <div style={{ fontSize: 10, color: '#8A8378', marginTop: 1,
            overflow: isCompact ? 'hidden' : 'visible',
            textOverflow: isCompact ? 'ellipsis' : 'clip',
            whiteSpace: isCompact ? 'nowrap' : 'normal',
          }}>
            {act.when}{act.where ? ` · ${act.where}` : ''}{act.cost ? ` · ${act.cost}` : ''}
          </div>
        </div>
        {act.expires && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: '#FEF3E2', color: '#92400E', flexShrink: 0 }}>⚡</span>}
        {/* Link icon — opens event URL in new tab, stops propagation so it doesn't toggle card */}
        {act.url && (
          <a href={act.url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 13, color: '#93BBFD', flexShrink: 0, textDecoration: 'none', lineHeight: 1 }}
            title="Open event page">🔗</a>
        )}
        {/* Chevron — ▾ when collapsed, ▴ when expanded */}
        <span style={{
          fontSize: 10, color: 'var(--subtle)', flexShrink: 0,
          transition: 'transform .2s',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>▾</span>
      </div>

      {/* ── Expanded body — smooth height transition via max-height ── */}
      <div style={{
        maxHeight: isExpanded ? 400 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div ref={contentRef} style={{ padding: '0 12px 10px' }}>
          {/* Why blurb */}
          {act.why && (
            <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 6 }}>
              {act.why}
            </div>
          )}
          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
            {act.tags?.map(t => (
              <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'var(--bg2)', color: 'var(--muted)', border: '0.5px solid var(--border)' }}>{t}</span>
            ))}
            {act.expires && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: '#FEF3E2', color: '#92400E' }}>expiring soon</span>}
          </div>
          {/* Action bar */}
          <ActionBar act={act} catId={catId} onCal={onCal} onRemove={() => { sendFeedback('dismissed'); setExiting(true); setTimeout(() => onRemove(act), 200); }}
            onHeart={onHeart} onThumbUp={handleThumbUp} onThumbDown={handleThumbDown}
            onReserve={onReserve} homeAddress={homeAddress} />
        </div>
      </div>
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

  const spotlightItems = Object.values(activities).flat()
    .filter(a => a?.title)
    .sort((a, b) => ((b.final_score||b.base_score||0) + (b.expires ? 0.3 : 0)) - ((a.final_score||a.base_score||0) + (a.expires ? 0.3 : 0)))
    .slice(0, 3);

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
            {act.expires && <div style={{ fontSize: 9, color: '#C9A84C', marginTop: 3 }}>⚡ Last chance</div>}
          </div>
        ))}

        {/* Divider */}
        {spotlightItems.length > 0 && weekendWeather.length > 0 && (
          <div style={{ width: 1, background: 'rgba(255,255,255,.08)', flexShrink: 0, margin: '0 4px', alignSelf: 'stretch' }} />
        )}

        {/* Weather pills — ambient style */}
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
      {hero.expires&&<div style={{fontSize:10,color:'#C9A84C',marginTop:6}}>⚡ Expiring this weekend — don't miss it</div>}
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

// Option E: Sidebar spotlight (replaces "Your Weekend" header)
function SpotlightSidebar({ activities, onCal }) {
  const hero = Object.values(activities).flat()
    .filter(a=>a&&a.title)
    .sort((a,b)=>((b.final_score||b.base_score||0)+(b.expires?0.5:0))-((a.final_score||a.base_score||0)+(a.expires?0.5:0)))[0];

  if (!hero) return null;

  return (
    <div style={{padding:'10px 14px',borderBottom:'0.5px solid rgba(255,255,255,.06)',cursor:'pointer'}} onClick={()=>onCal(hero)}>
      <div style={{fontSize:9,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#C9A84C',marginBottom:6}}>⭐ Spotlight</div>
      <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.9)',lineHeight:1.2,marginBottom:3}}>{hero.title}</div>
      <div style={{fontSize:10,color:'rgba(255,255,255,.4)',marginBottom:3}}>{hero.when} · {hero.cost}</div>
      <div style={{fontSize:10,color:'rgba(255,255,255,.32)',fontStyle:'italic',lineHeight:1.4}}>{hero.why}</div>
      {hero.expires&&<div style={{fontSize:9,color:'#C9A84C',marginTop:4}}>⚡ Last chance</div>}
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
          const label = [i.time, i.title].filter(Boolean).join(' — ');
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

        {/* Messages */}
        <div style={{flex:1,overflowY:'auto',padding:'14px 18px',display:'flex',flexDirection:'column',gap:10}} className="no-scroll">
          {messages.length === 0 && (
            <div style={{fontSize:12,color:'rgba(255,255,255,.3)',fontStyle:'italic',textAlign:'center',paddingTop:20}}>
              Ask me anything — "good dog-friendly hikes?", "best brunch near Georgetown?", "what should we do Sunday afternoon?"
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
function CatColumn({ cat, activities, removed, onCal, onRemove, onHeart, onThumbUp, onThumbDown, onReserve, weatherDim, weatherBoost, homeAddress, profileId, cardMode, spotlightMode, isMobile, timeFilter }) {
  const allActs = (activities[cat.id]?.length>0 ? activities[cat.id] : MOCK_ACTIVITIES[cat.id]||[])
    .filter(a => !removed[`${cat.id}::${a.title}`])
    .filter(a => !isPastEvent(a))
    .filter(a => {
      if (!timeFilter || timeFilter === 'all') return true;
      const tod = getTimeOfDay(a);
      return tod === timeFilter || tod === 'any';
    });

  const isDimmed  = weatherDim.includes(cat.id);
  const isBoosted = weatherBoost.includes(cat.id);
  const showHero  = spotlightMode === 'hero';

  return (
    <div style={{display:'flex',flexDirection:'column',borderRight:'0.5px solid var(--border)',minWidth:0,overflow:'hidden',opacity:isDimmed?0.65:1,transition:'opacity .3s'}}>
      <div className={`${cat.cls}`} style={{padding:'9px 13px 8px',display:'flex',alignItems:'center',gap:7,flexShrink:0}}>
        <span style={{fontSize:15}}>{cat.icon}</span>
        <span style={{fontSize:10,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',flex:1}}>{cat.label}</span>
        {isBoosted&&<span style={{fontSize:9,background:'rgba(0,0,0,.12)',padding:'1px 5px',borderRadius:99}}>☀ great today</span>}
        {isDimmed&&<span style={{fontSize:9,background:'rgba(0,0,0,.12)',padding:'1px 5px',borderRadius:99}}>🌧 rain</span>}
        <span style={{fontSize:10,opacity:.45}}>{allActs.length}</span>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'8px',display:'flex',flexDirection:'column',gap:cardMode==='compact'||cardMode==='relevancy'?4:7,background:'var(--bg)'}} className="no-scroll">
        {showHero && <SpotlightHero activities={{[cat.id]:allActs}} onCal={onCal} />}
        {allActs.length===0
          ? <div style={{padding:'12px 4px',fontSize:11,color:'#B8B3AA',fontStyle:'italic'}}>Nothing here — check back Thursday</div>
          : allActs.map(a=>(
              <ActCard key={a.title} act={a} catId={cat.id}
                onCal={onCal}
                onRemove={()=>onRemove(cat.id,a)}
                onHeart={()=>onHeart(cat.id,a)}
                onThumbUp={()=>onThumbUp(cat.id,a)}
                onThumbDown={()=>onThumbDown(cat.id,a)}
                onReserve={onReserve}
                homeAddress={homeAddress}
                profileId={profileId}
                cardMode={cardMode}
              />
            ))
        }
      </div>
    </div>
  );
}

// ── Mobile single-column layout ───────────────────────────────────────────────
function MobileLayout({ visibleCats, activities, removed, onCal, onRemove, onHeart, onThumbUp, onThumbDown, onReserve, weatherDim, weatherBoost, homeAddress, profileId, cardMode, spotlightMode, timeFilter }) {
  const [activeCat, setActiveCat] = useState(visibleCats[0]?.id || 'outdoors');
  const swipeX = useRef(null);
  const swipeDir = useRef(null);

  const catIdx = visibleCats.findIndex(c=>c.id===activeCat);
  const cat    = visibleCats[catIdx] || visibleCats[0];

  const onTS = e => { swipeX.current=e.touches[0].clientX; swipeDir.current=null; };
  const onTM = e => {
    if (swipeDir.current) return;
    const dx = Math.abs(e.touches[0].clientX-swipeX.current);
    const dy = Math.abs(e.touches[0].clientY-(swipeX.current||0));
    if (dx>8) swipeDir.current='h';
  };
  const onTE = e => {
    if (swipeDir.current!=='h') return;
    const dx = e.changedTouches[0].clientX - swipeX.current;
    if (dx < -40 && catIdx < visibleCats.length-1) setActiveCat(visibleCats[catIdx+1].id);
    else if (dx > 40 && catIdx > 0) setActiveCat(visibleCats[catIdx-1].id);
  };

  if (!cat) return null;
  const allActs = (activities[cat.id]?.length>0 ? activities[cat.id] : MOCK_ACTIVITIES[cat.id]||[])
    .filter(a=>!removed[`${cat.id}::${a.title}`])
    .filter(a=>!isPastEvent(a))
    .filter(a => {
      if (!timeFilter || timeFilter === 'all') return true;
      const tod = getTimeOfDay(a);
      return tod === timeFilter || tod === 'any';
    });

  return (
    <div style={{display:'flex',flexDirection:'column',overflow:'hidden',flex:1}}>
      {/* Category tabs */}
      <div style={{display:'flex',overflowX:'auto',borderBottom:'0.5px solid rgba(0,0,0,.08)',background:'#fff'}} className="no-scroll">
        {visibleCats.map(c=>{
          const isBoosted = weatherBoost.includes(c.id);
          const isDimmed  = weatherDim.includes(c.id);
          return (
            <button key={c.id} onClick={()=>setActiveCat(c.id)} style={{
              padding:'9px 12px',border:'none',borderBottom:`2px solid ${c.id===activeCat?'#1C1A17':'transparent'}`,
              background:'transparent',cursor:'pointer',flexShrink:0,
              fontFamily:'DM Sans,sans-serif',fontSize:11,fontWeight:c.id===activeCat?700:400,
              color:c.id===activeCat?'#1C1A17':'#8A8378',display:'flex',alignItems:'center',gap:5,
              opacity:isDimmed?0.6:1,transition:'all .15s',
            }}>
              <span>{c.icon}</span>
              <span>{c.label}</span>
              {isBoosted&&<span style={{fontSize:8,color:'#92400E'}}>☀</span>}
            </button>
          );
        })}
      </div>

      {/* Single column content */}
      <div onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
        style={{flex:1,overflowY:'auto',padding:'8px',display:'flex',flexDirection:'column',gap:cardMode==='compact'||cardMode==='relevancy'?4:7}}
        className="no-scroll"
      >
        {allActs.length===0
          ? <div style={{padding:'24px',fontSize:12,color:'#B8B3AA',fontStyle:'italic',textAlign:'center'}}>Nothing here — check back Thursday</div>
          : allActs.map(a=>(
              <ActCard key={a.title} act={a} catId={cat.id}
                onCal={onCal} onRemove={()=>onRemove(cat.id,a)}
                onHeart={()=>onHeart(cat.id,a)} onThumbUp={()=>onThumbUp(cat.id,a)}
                onThumbDown={()=>onThumbDown(cat.id,a)} onReserve={onReserve}
                homeAddress={homeAddress} profileId={profileId} cardMode={cardMode}
              />
            ))
        }
      </div>

      {/* Swipe dots */}
      <div style={{padding:'6px',display:'flex',justifyContent:'center',gap:5,background:'#F4F1EB',borderTop:'0.5px solid rgba(0,0,0,.08)'}}>
        {visibleCats.map((c,i)=>(
          <div key={c.id} onClick={()=>setActiveCat(c.id)} style={{
            width:c.id===activeCat?18:6,height:6,borderRadius:99,
            background:c.id===activeCat?'#1C1A17':'rgba(0,0,0,.2)',
            cursor:'pointer',transition:'all .2s',
          }}/>
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
              <div style={{color:platformColor,marginTop:3,fontSize:11}}>via {platform}{!isTicket&&' — free to cancel'}</div>
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ActiveMode({ settings, activeProfile, calQueue, activities={}, weather=[], activitiesSource='mock', weatherSource='mock', onCalendar, onWeather, onSettings, onAmbient, onSwitchProfile, onSaveItem, onShowSaved, onThumbUp, onThumbDown }) {
  const [removed,      setRemoved]      = useState({});
  const [activeCat,    setActiveCat]    = useState('all');
  const [timeFilter,   setTimeFilter]   = useState('all');   // 'all' | 'morning' | 'midday' | 'night'
  const [aiPrompt,     setAiPrompt]     = useState(null);
  const [reserveAct,   setReserveAct]   = useState(null);
  const [colPage,      setColPage]      = useState(0);
  const [showAsk,      setShowAsk]      = useState(false);
  const [overlayShown, setOverlayShown] = useState(false);

  const { themeId, setTheme, currentTheme } = useTheme();

  const profileColor  = PROFILE_COLORS.find(c=>c.id===activeProfile?.colorId)||PROFILE_COLORS[0];
  const { boost, dim } = getWeatherBoost(weather);
  const weekendWeather = getWeekendWeather(weather);
  const homeAddress    = settings?.homeAddress||activeProfile?.homeAddress||'';

  const cardMode     = settings?.cardMode     || 'compact';
  const spotlightMode= settings?.spotlightMode|| 'strip';
  const columnOrder  = settings?.columnOrder  || 'relevancy';

  // Detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const removeAct  = (catId,act) => setRemoved(r=>({...r,[`${catId}::${act.title}`]:true}));
  const heartAct   = (catId,act) => onSaveItem?.({...act,catId});
  const thumbUp    = (catId,act) => onThumbUp?.(catId,act);
  const thumbDown  = (catId,act) => { setRemoved(r=>({...r,[`${catId}::${act.title}`]:true})); onThumbDown?.(catId,act); };

  const catStates    = activeProfile?.categoryStates||{};
  const alwaysCats   = ALL_CATEGORIES.filter(c=>catStates[c.id]==='always');
  const sometimesCats= ALL_CATEGORIES.filter(c=>catStates[c.id]==='sometimes');
  const defaultCats  = ALL_CATEGORIES.slice(0,9);
  let baseCats = activeCat==='all'
    ? (alwaysCats.length>0?[...alwaysCats,...sometimesCats.slice(0,2)]:defaultCats)
    : ALL_CATEGORIES.filter(c=>c.id===activeCat);

  // Apply column ordering
  const visibleCats = columnOrder==='relevancy'
    ? sortCategoriesByRelevancy(baseCats, activities)
    : columnOrder==='random'
    ? [...baseCats].sort(()=>Math.random()-0.5)
    : baseCats;

  const COLS_PER_PAGE = isMobile ? 1 : 4;
  const numPages = Math.ceil(visibleCats.length/COLS_PER_PAGE);
  const pageCats = visibleCats.slice(colPage*COLS_PER_PAGE, colPage*COLS_PER_PAGE+COLS_PER_PAGE);

  // Swipe
  const swipeX   = useRef(null);
  const swipeDir = useRef(null);
  const onTS = e=>{swipeX.current=e.touches[0].clientX;swipeDir.current=null;};
  const onTM = e=>{if(swipeDir.current)return;const dx=Math.abs(e.touches[0].clientX-swipeX.current);const dy=Math.abs(e.touches[0].clientY-swipeX.current);if(dx>6||dy>6)swipeDir.current=dx>dy?'h':'v';};
  const onTE = e=>{if(swipeDir.current!=='h')return;const dx=e.changedTouches[0].clientX-swipeX.current;if(dx<-40&&colPage<numPages-1)setColPage(p=>p+1);else if(dx>40&&colPage>0)setColPage(p=>p-1);};

  const colProps = { removed, onCal:onCalendar, onRemove:removeAct, onHeart:heartAct, onThumbUp:thumbUp, onThumbDown:thumbDown, onReserve:(act,cid)=>setReserveAct({act,catId:cid}), weatherDim:dim, weatherBoost:boost, homeAddress, profileId:activeProfile?.id||'default', cardMode, spotlightMode, activities, isMobile, timeFilter };

  // Calendar strip data — sort calQueue into Fri/Sat/Sun buckets
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
    <div className="fade-enter" style={{display:'grid',gridTemplateRows:'auto auto auto auto 1fr auto',height:'100%',background:'var(--bg)',overflow:'hidden',fontFamily:'var(--font-body)'}}>

      {/* ── Header ── */}
      <div style={{background:'var(--header-bg)',padding:'9px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:20,color:'rgba(255,255,255,.9)',fontWeight:300,letterSpacing:'.06em',fontFamily:'var(--font-display)'}}>Locale</span>
          <span style={{fontSize:11,color:'rgba(255,255,255,.28)',fontFamily:'var(--font-body)'}}>{settings.city}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {/* Theme toggle */}
          <ThemeToggle themeId={themeId} setTheme={setTheme} currentTheme={currentTheme} />
          <div style={{display:'flex',background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.1)',borderRadius:'var(--radius-btn)',overflow:'hidden'}}>
            {[['compact','≡','Compact'],['relevancy','⬛','Smart'],['full','▤','Full']].map(([mode,icon,label])=>(
              <button key={mode} onClick={()=>onSettings&&onSettings({cardMode:mode})} title={label} style={{
                padding:'4px 8px',border:'none',background:cardMode===mode?'rgba(255,255,255,.15)':'transparent',
                color:cardMode===mode?'rgba(255,255,255,.9)':'rgba(255,255,255,.35)',cursor:'pointer',
                fontSize:12,fontFamily:'var(--font-body)',transition:'all .12s',
              }}>{icon}</button>
            ))}
          </div>
          <button onClick={()=>setShowAsk(true)} style={{fontSize:11,padding:'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'var(--accent-bg)',border:'0.5px solid var(--accent-border)',color:'var(--accent)',fontFamily:'var(--font-body)'}}>Ask</button>
          <div title={`Activities: ${activitiesSource}`} style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:activitiesSource==='live'?'#22c55e':'#f59e0b',boxShadow:activitiesSource==='live'?'0 0 6px #22c55e88':'0 0 6px #f59e0b66'}}/>
          <button onClick={onShowSaved} style={{fontSize:13,padding:'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.12)',color:'#E53E3E',fontFamily:'var(--font-body)'}}>♥</button>
          <button onClick={onSwitchProfile} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:profileColor.border,border:`0.5px solid ${profileColor.border}`,fontFamily:'var(--font-body)'}}>
            <div style={{width:16,height:16,borderRadius:'50%',background:profileColor.hex,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'white',fontWeight:600}}>{activeProfile?.name?.charAt(0)||'A'}</div>
            {!isMobile&&<span style={{fontSize:11,color:profileColor.light,fontWeight:500}}>{activeProfile?.name}</span>}
            <span style={{fontSize:9,color:`${profileColor.light}88`}}>▾</span>
          </button>
          <button onClick={() => onSettings()} style={{fontSize:11,padding:'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.12)',color:'rgba(255,255,255,.55)',fontFamily:'var(--font-body)'}}>⚙</button>
          <button onClick={onAmbient} style={{fontSize:11,padding:'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'var(--accent-bg)',border:'0.5px solid var(--accent-border)',color:'var(--accent)',fontFamily:'var(--font-body)'}}>Ambient</button>
        </div>
      </div>

      {/* ── Quick prompts ── */}
      <div style={{background:'var(--header-bg2)',padding:'7px 18px',display:'flex',alignItems:'center',gap:8}}>
        <div style={{display:'flex',gap:5,overflowX:'auto',flex:1}} className="no-scroll">
          {QUICK_PROMPTS.map(p=>(
            <button key={p.label} onClick={()=>setAiPrompt(p)} style={{
              fontSize:11,padding:'5px 12px',borderRadius:99,whiteSpace:'nowrap',
              background:'rgba(255,255,255,.09)',border:'0.5px solid rgba(255,255,255,.14)',
              color:'rgba(255,255,255,.7)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:500,transition:'all .15s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(201,168,76,.2)';e.currentTarget.style.color='#C9A84C';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.09)';e.currentTarget.style.color='rgba(255,255,255,.7)';}}
            >{p.label}</button>
          ))}
          <button onClick={()=>setShowAsk(true)} style={{
            fontSize:11,padding:'5px 12px',borderRadius:99,whiteSpace:'nowrap',
            background:'rgba(201,168,76,.1)',border:'0.5px solid rgba(201,168,76,.2)',
            color:'rgba(201,168,76,.7)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:500,flexShrink:0,
          }}>✏️ Ask anything...</button>
        </div>
      </div>

      {/* ── Spotlight + Weather combined bar ── */}
      <SpotlightWeatherBar activities={activities} weather={weather} onCal={onCalendar} onWeather={onWeather} />

      {/* ── Calendar strip Fri/Sat/Sun × Morning/Midday/Evening ── */}
      <div style={{background:'var(--surface)',borderBottom:'0.5px solid var(--border)',display:'grid',gridTemplateColumns:'36px 1fr 1fr 1fr',flexShrink:0,fontSize:10}}>
        <div style={{borderRight:'0.5px solid rgba(0,0,0,.06)',borderBottom:'0.5px solid rgba(0,0,0,.06)'}}/>
        {[{l:'FRI',d:fri2},{l:'SAT',d:sat2},{l:'SUN',d:sun2}].map(({l,d})=>(
          <div key={l} style={{borderRight:'0.5px solid rgba(0,0,0,.06)',borderBottom:'0.5px solid rgba(0,0,0,.06)',padding:'3px 0',textAlign:'center',fontWeight:700,letterSpacing:'.06em',color:'#8A8378'}}>{l} {d.getDate()}</div>
        ))}
        {[{slot:'morning',label:'AM'},{slot:'midday',label:'PM'},{slot:'night',label:'EVE'}].map(({slot,label})=>(
          [
            <div key={`lbl-${slot}`} style={{borderRight:'0.5px solid rgba(0,0,0,.06)',padding:'2px 0',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,color:'#C8C3BB',letterSpacing:'.04em'}}>{label}</div>,
            ...[calStrip.fri,calStrip.sat,calStrip.sun].map((dayEvts,di)=>{
              const slotEvts = dayEvts.filter(e=>{
                const raw=(e.time||'').toLowerCase();
                const m=raw.match(/(\d{1,2})(?::\d{2})?\s*(am|pm)/);
                if(!m) return false;
                let h=parseInt(m[1]); if(m[2]==='pm'&&h!==12)h+=12; if(m[2]==='am'&&h===12)h=0;
                if(slot==='morning') return h<12; if(slot==='midday') return h>=12&&h<17; return h>=17;
              });
              return <div key={`${slot}-${di}`} style={{borderRight:'0.5px solid rgba(0,0,0,.06)',padding:'2px 3px',minHeight:18,background:slotEvts.length?(slot==='morning'?'#FFFBF0':slot==='midday'?'#F0F7FF':'#F5F0FF'):'transparent',display:'flex',flexWrap:'wrap',gap:2}}>
                {slotEvts.map((e,i)=><div key={i} style={{fontSize:8,background:'#1C1A17',color:'rgba(255,255,255,.8)',borderRadius:3,padding:'1px 4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>{e.title||e.name}</div>)}
              </div>;
            })
          ]
        ))}
      </div>

      {/* ── Main content ── */}
      {isMobile
        ? <MobileLayout visibleCats={visibleCats} {...colProps} />
        : <div style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
              style={{flex:1,display:'grid',gridTemplateColumns:`repeat(${pageCats.length},1fr)`,overflow:'hidden'}}
            >
              {pageCats.map(cat=>(
                <CatColumn key={cat.id} cat={cat} {...colProps} />
              ))}
              {/* Sidebar */}
              {spotlightMode==='sidebar'&&(
                <div style={{width:220,background:'#1C1A17',display:'flex',flexDirection:'column',overflow:'hidden',borderLeft:'0.5px solid rgba(255,255,255,.06)',flexShrink:0}}>
                  <SpotlightSidebar activities={activities} onCal={onCalendar} />
                  <div style={{padding:'11px 13px',borderBottom:'0.5px solid rgba(255,255,255,.07)',flexShrink:0,overflowY:'auto',maxHeight:'40%'}} className="no-scroll">
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#C9A84C',marginBottom:9}}>Your weekend</div>
                    {allEvents.map((e,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:6}}>
                        <span style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.28)',textTransform:'uppercase',width:22}}>{e.day}</span>
                        <span style={{fontSize:12,color:'rgba(255,255,255,.72)',fontWeight:500,flex:1,lineHeight:1.2}}>{e.name}</span>
                        <span style={{fontSize:10,color:'rgba(255,255,255,.28)'}}>{e.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Page nav */}
            {numPages>1&&(
              <div style={{background:'#1C1A17',borderTop:'0.5px solid rgba(255,255,255,.06)',padding:'6px 18px',display:'flex',alignItems:'center',gap:8}}>
                <button onClick={()=>setColPage(p=>Math.max(0,p-1))} disabled={colPage===0} style={{padding:'5px 14px',borderRadius:8,cursor:colPage===0?'default':'pointer',background:colPage===0?'rgba(255,255,255,.04)':'rgba(255,255,255,.1)',border:'0.5px solid rgba(255,255,255,.12)',color:colPage===0?'rgba(255,255,255,.2)':'rgba(255,255,255,.7)',fontSize:14,fontFamily:'DM Sans,sans-serif'}}>←</button>
                <div style={{flex:1,display:'flex',justifyContent:'center',gap:5}}>
                  {Array.from({length:numPages}).map((_,i)=>(
                    <div key={i} onClick={()=>setColPage(i)} style={{width:i===colPage?18:6,height:6,borderRadius:99,background:i===colPage?'#C9A84C':'rgba(255,255,255,.2)',cursor:'pointer',transition:'all .2s'}}/>
                  ))}
                </div>
                <button onClick={()=>setColPage(p=>Math.min(numPages-1,p+1))} disabled={colPage===numPages-1} style={{padding:'5px 14px',borderRadius:8,cursor:colPage===numPages-1?'default':'pointer',background:colPage===numPages-1?'rgba(255,255,255,.04)':'rgba(201,168,76,.2)',border:'0.5px solid rgba(201,168,76,.3)',color:colPage===numPages-1?'rgba(255,255,255,.2)':'#C9A84C',fontSize:14,fontFamily:'DM Sans,sans-serif'}}>→</button>
              </div>
            )}
          </div>
      }

      {/* ── Footer: category + time filter ── */}
      <div style={{background:'var(--bg2)',borderTop:'0.5px solid var(--border)',padding:'5px 18px',display:'flex',alignItems:'center',gap:4,overflowX:'auto',flexWrap:'wrap'}} className="no-scroll">
        {[{id:'all',label:'All',icon:'✦'},...ALL_CATEGORIES].map(c=>(
          <button key={c.id} onClick={()=>{setActiveCat(c.id);setColPage(0);}} style={{
            fontSize:11,padding:'4px 11px',borderRadius:'var(--radius-pill)',cursor:'pointer',whiteSpace:'nowrap',
            background:activeCat===c.id?'var(--dark)':'transparent',
            color:activeCat===c.id?'rgba(255,255,255,.85)':'var(--muted)',
            border:activeCat===c.id?'none':'0.5px solid var(--border)',
            fontFamily:'var(--font-body)',transition:'all .15s',flexShrink:0,
          }}>{c.icon?`${c.icon} `:''}{c.label}</button>
        ))}
        <div style={{width:1,height:18,background:'var(--border)',margin:'0 4px',flexShrink:0}}/>
        {[{id:'all',label:'Any time'},{id:'morning',label:'🌅 Morning'},{id:'midday',label:'☀️ Midday'},{id:'night',label:'🌙 Evening'}].map(t=>(
          <button key={t.id} onClick={()=>setTimeFilter(t.id)} style={{
            fontSize:11,padding:'4px 10px',borderRadius:'var(--radius-pill)',cursor:'pointer',whiteSpace:'nowrap',
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
