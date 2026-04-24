import { useState, useRef, useEffect, useCallback, Component } from 'react';
import { ALL_CATEGORIES, ACTIVITIES as MOCK_ACTIVITIES, WEATHER as MOCK_WEATHER, CALENDAR_EVENTS, PROFILE_COLORS } from '../data/content';
import AIPromptModal from './AIPromptModal';
import WeatherIcon from './WeatherIcon';
import ThemeToggle, { useTheme } from './ThemeToggle';
import { postFeedback, fetchPromptResponse } from '../lib/api';
import { usePipelineStatus } from '../hooks/usePipelineStatus';
import {
  isFrontendBlocked, isRestaurant, formatTimeStr, formatMusicGenre, formatSportsEmoji,
  formatWhen, formatVenue, formatCost, dedupeActivities, getTimeOfDay,
  getWeekendWeather, getWeatherBoost, getWeekendDateStr, isPastEvent,
  sortCategoriesByRelevancy,
} from './ActiveMode/utils';
import { useIsMobile } from './ActiveMode/useIsMobile';
import ReserveModal from './ActiveMode/ReserveModal';
import AskClaude from './ActiveMode/AskClaude';
import ActCard from './ActiveMode/ActCard';

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
  { label:'A Fun-Filled Saturday', canned: true },
  { label:'Something New', canned: true },
  { label:'Weekend Away Itinerary', canned: true },
  { label:'✏️ Ask Anything', canned: true },
];

// Frontend blocklist + pure helpers have moved to ./ActiveMode/utils.js (imported above).


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
                <span style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.55)',letterSpacing:'.04em',flex:1}}>{label} {date.getDate()}</span>
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
                  <WeatherIcon icon={wx.icon} desc={wx.desc} size={13} />
                  <span style={{fontSize:11,color:'rgba(255,255,255,.65)',fontWeight:500}}>{wx.hi}°<span style={{color:'rgba(255,255,255,.35)',fontWeight:400}}>/{wx.lo}°</span></span>
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
                        <span style={{fontSize:10,color:'rgba(255,255,255,.3)',flexShrink:0,width:34,lineHeight:1.2}}>{e.time||'All day'}</span>
                        <span style={{fontSize:13,color:'rgba(255,255,255,.72)',fontWeight:500,lineHeight:1.2,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.title||e.name}</span>
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
function MobileLayout({ visibleCats, activities, removed, onCal, onRemove, onHeart, onThumbUp, onThumbDown, onReserve, weatherDim, weatherBoost, homeAddress, profileId, spotlightMode, timeFilter, curatedMode, weather }) {
  const [activeCat, setActiveCat] = useState(visibleCats[0]?.id || 'outdoors');
  const swipeX   = useRef(null);
  const swipeDir = useRef(null);
  const listRef  = useRef(null);

  // Keep activeCat valid when visibleCats changes
  useEffect(() => {
    if (visibleCats.length > 0 && !visibleCats.find(c => c.id === activeCat)) {
      setActiveCat(visibleCats[0].id);
    }
  }, [visibleCats]);

  // Scroll list to top when category changes
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [activeCat]);

  const catIdx = visibleCats.findIndex(c => c.id === activeCat);
  const cat    = visibleCats[catIdx] || visibleCats[0];

  const goNext = () => {
    if (!visibleCats.length) return;
    const next = (catIdx + 1) % visibleCats.length;
    setActiveCat(visibleCats[next].id);
  };
  const goPrev = () => {
    if (!visibleCats.length) return;
    const prev = (catIdx - 1 + visibleCats.length) % visibleCats.length;
    setActiveCat(visibleCats[prev].id);
  };

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
    if (dx < -40) goNext();
    else if (dx > 40) goPrev();
  };

  if (!cat) return null;

  const weekendDays = getWeekendWeather(weather);
  const weekendWithDate = (() => {
    const now = new Date();
    const day = now.getDay();
    const daysToFri = (5 - day + 7) % 7;
    const fri = new Date(now); fri.setDate(now.getDate() + (day === 6 ? -1 : day === 0 ? -2 : daysToFri));
    const sat = new Date(fri); sat.setDate(fri.getDate() + 1);
    const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
    const dates = [fri, sat, sun];
    const fmt = d => `${d.getMonth()+1}/${d.getDate()}`;
    return weekendDays.slice(0, 3).map((w, i) => ({ ...w, dateStr: dates[i] ? fmt(dates[i]) : '' }));
  })();

  const allActs = dedupeActivities(
    (activities[cat.id]?.length > 0 ? activities[cat.id] : MOCK_ACTIVITIES[cat.id] || [])
      .filter(a => !removed[`${cat.id}::${a.title}`])
      .filter(a => !isPastEvent(a))
      .filter(a => !isFrontendBlocked(a))
      .filter(a => {
        if (!timeFilter || timeFilter === 'all') return true;
        const tod = getTimeOfDay(a);
        return tod === timeFilter || tod === 'any';
      })
  );

  const isDimmed  = weatherDim.includes(cat.id);
  const isBoosted = weatherBoost.includes(cat.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, background: 'var(--bg)', maxWidth: '100vw' }}>

      {/* ── Weekend weather row ── */}
      <div style={{
        display:'flex', gap:6, padding:'6px 10px', flexShrink:0,
        background:'rgba(0,0,0,.04)', borderBottom:'0.5px solid rgba(0,0,0,.06)',
        overflowX:'auto',
      }} className="no-scroll">
        {weekendWithDate.map((d, i) => (
          <div key={i} style={{
            flex:'1 1 0', minWidth:0,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
            padding:'5px 6px', borderRadius:10,
            background:'rgba(255,255,255,.7)', border:'0.5px solid rgba(0,0,0,.06)',
            fontFamily:'DM Sans, sans-serif',
          }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:4, lineHeight:1 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#3A3530' }}>{d.day}</span>
              <span style={{ fontSize:10, color:'#6B6560' }}>({d.dateStr})</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4, lineHeight:1 }}>
              <WeatherIcon icon={d.icon} desc={d.desc} size={14} />
              <span style={{ fontSize:11, fontWeight:600, color:'#3A3530' }}>{d.hi}°<span style={{ color:'#B8B3AA' }}>/{d.lo}°</span></span>
              {d.precip > 20 && <span style={{ fontSize:10, color:'#2563EB' }}>{d.precip}%</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Category header with L/R arrows ── */}
      <div className={cat.cls} style={{
        padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        minWidth: 0,
      }}>
        <button onClick={goPrev} style={{
          width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'rgba(0,0,0,.15)', fontSize: 16, flexShrink: 0,
          color: 'currentColor', fontFamily: 'DM Sans, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>

        <span style={{ fontSize: 18, flexShrink: 0 }}>{cat.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.label}</div>
          <div style={{ fontSize: 10, opacity: .55 }}>
            {catIdx + 1}/{visibleCats.length} · {allActs.length} events
            {isBoosted && ' · ☀ great today'}
            {isDimmed  && ' · 🌧 rain likely'}
          </div>
        </div>

        <button onClick={goNext} style={{
          width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'rgba(0,0,0,.15)', fontSize: 16, flexShrink: 0,
          color: 'currentColor', fontFamily: 'DM Sans, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>→</button>
      </div>

      {/* ── Card list ── */}
      <div
        ref={listRef}
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
        style={{
          flex: 1, overflowY: 'auto', padding: '10px 12px',
          display: 'flex', flexDirection: 'column', gap: 8,
          WebkitOverflowScrolling: 'touch',
          maxWidth: '100vw', boxSizing: 'border-box',
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
            <ActCard key={`${cat.id}-${a.title}`} act={a} catId={cat.id}
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
    </div>
  );
}



// ── Main ──────────────────────────────────────────────────────────────────────
export default function ActiveMode({ settings, activeProfile, calQueue, activities={}, weather=[], activitiesSource='mock', weatherSource='mock', calendar, onCalendar, onWeather, onSettings, onAmbient, onSwitchProfile, onSaveItem, onShowSaved, onThumbUp, onThumbDown, onEditCal, timeFilter='all', isDemo=false, onLoginPrompt }) {
  const gateDemo = (feature, fn) => (...args) => {
    if (isDemo) { onLoginPrompt?.(feature); return; }
    return fn?.(...args);
  };
  const [removed,      setRemoved]      = useState({});
  const [activeCat,    setActiveCat]    = useState('all');
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
  const curatedCat   = ALL_CATEGORIES.find(c=>c.id==='curated');
  let baseCats = activeCat==='all'
    ? (alwaysCats.length>0?[...alwaysCats,...sometimesCats.slice(0,4)]:defaultCats)
    : ALL_CATEGORIES.filter(c=>c.id===activeCat);

  // Apply column ordering
  let visibleCats = columnOrder==='relevancy'
    ? sortCategoriesByRelevancy(baseCats, activities)
    : columnOrder==='random'
    ? [...baseCats].sort(()=>Math.random()-0.5)
    : baseCats;

  // Always pin "Curated" first when showing the full set, regardless of saved
  // categoryStates (profiles predate the curated category) or sort order.
  if (activeCat === 'all' && curatedCat) {
    visibleCats = [curatedCat, ...visibleCats.filter(c => c.id !== 'curated')];
  }

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

  const colProps = { removed, onCal:onCalendar, onRemove:removeAct, onHeart:heartAct, onThumbUp:thumbUp, onThumbDown:thumbDown, onReserve:gateDemo('reserve',(act,cid)=>setReserveAct({act,catId:cid})), weatherDim:dim, weatherBoost:boost, homeAddress, profileId:activeProfile?.id||'default', spotlightMode, activities, isMobile, timeFilter, hasConflict: calendar?.hasConflict, crossCatSeen, curatedMode, weather };

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
          <div>
            <span style={{fontSize:20,color:'rgba(255,255,255,.9)',fontWeight:300,letterSpacing:'.06em',fontFamily:'var(--font-display)'}}>Locale</span>
            {!isMobile && <div style={{fontSize:10,color:'rgba(255,255,255,.25)',fontFamily:'var(--font-body)',letterSpacing:'.02em',marginTop:-2}}>your personal weekend planner</div>}
          </div>
          <button onClick={()=>onSettings()} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:8,cursor:'pointer',background:'rgba(255,255,255,.06)',border:'0.5px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.45)',fontSize:11,fontFamily:'var(--font-body)'}}>
            <span>{settings.city}</span>
            <span style={{fontSize:9,opacity:.7}}>▾</span>
          </button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {/* Ask -- desktop only */}
          {!isMobile && (
            <button onClick={gateDemo('ai',()=>setShowAsk(true))} style={{fontSize:11,padding:'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'var(--accent-bg)',border:'0.5px solid var(--accent-border)',color:'var(--accent)',fontFamily:'var(--font-body)'}}>Ask</button>
          )}
          {/* Status dot -- desktop only */}
          {!isMobile && (
            <div title={`Activities: ${activitiesSource}`} style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:activitiesSource==='live'?'#22c55e':'#f59e0b',boxShadow:activitiesSource==='live'?'0 0 6px #22c55e88':'0 0 6px #f59e0b66'}}/>
          )}
          {/* Saved -- desktop only */}
          {!isMobile && (
            <button onClick={onShowSaved} style={{fontSize:13,padding:'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.12)',color:'#E53E3E',fontFamily:'var(--font-body)'}}>♥</button>
          )}
          {/* Profile avatar -- desktop only, hidden in demo */}
          {!isMobile && !isDemo && (
            <button onClick={onSwitchProfile} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 7px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:profileColor.border,border:`0.5px solid ${profileColor.border}`,fontFamily:'var(--font-body)'}}>
              <div style={{width:16,height:16,borderRadius:'50%',background:profileColor.hex,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'white',fontWeight:600}}>{activeProfile?.name?.charAt(0)||'A'}</div>
              <span style={{fontSize:11,color:profileColor.light,fontWeight:500}}>{activeProfile?.name}</span>
              <span style={{fontSize:9,color:`${profileColor.light}88`}}>▾</span>
            </button>
          )}
          {/* Sign in CTA -- demo mode only */}
          {isDemo && (
            <button onClick={()=>onLoginPrompt?.('default')} style={{fontSize:11,padding:'5px 12px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'#C9A84C',border:'none',color:'#1C1A17',fontWeight:600,fontFamily:'var(--font-body)'}}>Sign in</button>
          )}
          {/* Pipeline live indicator -- desktop only */}
          {!isMobile && pipelineActive && (
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

      {/* ── Quick prompts -- desktop only ── */}
      {!isMobile && <div style={{background:'var(--header-bg2)',padding:'7px 18px',display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:11,color:'rgba(255,255,255,.28)',whiteSpace:'nowrap',flexShrink:0,fontFamily:'DM Sans,sans-serif'}}>Pick a plan for me...</span>
        <div style={{display:'flex',gap:5,overflowX:'auto',flex:1}} className="no-scroll">
          {QUICK_PROMPTS.map(p=>(
            <button key={p.label} onClick={gateDemo('ai',()=>setAiPrompt(p))} style={{
              fontSize:11,padding:'5px 12px',borderRadius:99,whiteSpace:'nowrap',
              background:'rgba(255,255,255,.09)',border:'0.5px solid rgba(255,255,255,.14)',
              color:'rgba(255,255,255,.7)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:500,transition:'all .15s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(201,168,76,.2)';e.currentTarget.style.color='#C9A84C';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.09)';e.currentTarget.style.color='rgba(255,255,255,.7)';}}
            >{p.label}</button>
          ))}
        </div>
      </div>}



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
