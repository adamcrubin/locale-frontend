import WeatherIcon from '../WeatherIcon';
import { WEATHER as MOCK_WEATHER } from '../../data/content';

export default function WeekendSidebar({ activities, calQueue, weather, onCal, onWeather, calendar, onEditCal }) {
  // Sidebar's headline card is now a sponsored event — falls back to the
  // top-scored regular event when no sponsor exists for this weekend.
  const allEvents = Object.values(activities).flat().filter(a => a?.title);
  const sponsoredCandidates = allEvents.filter(a => a.is_sponsored);
  const hero = sponsoredCandidates.length > 0
    ? sponsoredCandidates.sort((a,b) => (b.final_score||b.base_score||0) - (a.final_score||a.base_score||0))[0]
    : allEvents.sort((a,b) => ((b.final_score||b.base_score||0)+(b.expires?0.3:0)) - ((a.final_score||a.base_score||0)+(a.expires?0.3:0)))[0];
  const isSponsoredHero = !!hero?.is_sponsored;

  const now = new Date();
  const dow = now.getDay();
  let dToFri = (5-dow+7)%7;
  if (dow===6) dToFri=6; else if (dow===0) dToFri=5;
  const fri = new Date(now); fri.setDate(now.getDate()+(dow===6?-1:dow===0?-2:dToFri)); fri.setHours(0,0,0,0);
  const sat = new Date(fri); sat.setDate(fri.getDate()+1);
  const sun = new Date(fri); sun.setDate(fri.getDate()+2);
  const toKey = d => d.toISOString().split('T')[0];

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
      {hero && (
        <div
          onClick={() => onCal(hero)}
          style={{
            padding: '11px 14px', borderBottom: '0.5px solid rgba(255,255,255,.07)',
            cursor: 'pointer', flexShrink: 0, transition: 'background .12s',
            background: isSponsoredHero ? 'rgba(201,168,76,.10)' : 'transparent',
          }}
          onMouseEnter={e => e.currentTarget.style.background = isSponsoredHero ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.04)'}
          onMouseLeave={e => e.currentTarget.style.background = isSponsoredHero ? 'rgba(201,168,76,.10)' : 'transparent'}
        >
          <div style={{fontSize:8,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#C9A84C',marginBottom:5}}>
            {isSponsoredHero ? '⚡ SPONSORED' : '⭐ TOP PICK'}
          </div>
          <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.88)',lineHeight:1.25,marginBottom:3}}>{hero.title}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,.38)',lineHeight:1.3}}>
            {hero.when}{hero.cost ? ` · ${hero.cost}` : ''}
          </div>
          {hero.expires && !isSponsoredHero && <div style={{fontSize:9,color:'#C9A84C',marginTop:4}}>⚡ Last chance</div>}
          {hero.why && <div style={{fontSize:10,color:'rgba(255,255,255,.28)',fontStyle:'italic',lineHeight:1.4,marginTop:4}}>{hero.why?.slice(0,80)}{hero.why?.length>80?'...':''}</div>}
        </div>
      )}

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
              <div style={{ padding:'6px 14px 4px',display:'flex',alignItems:'center',gap:6 }}>
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
