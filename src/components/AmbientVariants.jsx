import { useState, useEffect, useMemo } from 'react';
import { useClock } from '../hooks/useClock';
import { WEATHER, ACTIVITIES, ALL_CATEGORIES, AMBIENT_THEMES, CALENDAR_EVENTS } from '../data/content';

// ── Helpers ───────────────────────────────────────────────────────────────────

function useRotatingFeature(activities, intervalSecs = 12) {
  const activitySource = Object.keys(activities || {}).length > 0 ? activities : ACTIVITIES;
  const allFeatures = ALL_CATEGORIES.flatMap(cat =>
    (activitySource[cat.id] || [])
      .filter(a => a?.title)
      .sort((a,b) => ((b.final_score||b.base_score||0) - (a.final_score||a.base_score||0)))
      .slice(0, 3)
      .map(a => ({ ...a, cat }))
  );
  const [idx, setIdx] = useState(0);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (!allFeatures.length) return;
    const iv = setInterval(() => { setIdx(i => (i + 1) % allFeatures.length); setKey(k => k + 1); }, intervalSecs * 1000);
    return () => clearInterval(iv);
  }, [allFeatures.length, intervalSecs]);
  return { feature: allFeatures[idx] || null, key };
}

function useTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 5)  return { label:'Late night',   emoji:'🌙', greeting:'Still up?' };
  if (hour < 10) return { label:'Good morning', emoji:'🌅', greeting:'Good morning' };
  if (hour < 12) return { label:'Morning',      emoji:'☀️',  greeting:'Good morning' };
  if (hour < 17) return { label:'Afternoon',    emoji:'🌤',  greeting:'Good afternoon' };
  if (hour < 20) return { label:'Evening',      emoji:'🌇',  greeting:'Good evening' };
  return              { label:'Night',       emoji:'🌃',  greeting:'Good evening' };
}

function getWeatherAlert(weather) {
  const days = weather?.length > 0 ? weather : WEATHER;
  const sat = days.find(d => d.day?.toLowerCase().startsWith('sat')) || days[1] || {};
  if ((sat.precip || 0) >= 60) return { type:'rain',    msg:`Rain Saturday (${sat.precip}%) — go big today or plan indoors`, icon:'🌧', color:'#93C5FD' };
  if ((sat.hi || 0) >= 85)    return { type:'hot',     msg:`Hot Saturday (${sat.hi}°) — water, shade, or AC recommended`,   icon:'🥵', color:'#FCA5A5' };
  if ((sat.hi || 0) >= 72 && (sat.precip||0) < 20) return { type:'perfect', msg:`Perfect weekend weather (${sat.hi}°) — get outside`, icon:'✨', color:'#86EFAC' };
  if ((sat.hi || 0) <= 32)    return { type:'cold',    msg:`Very cold Saturday (${sat.hi}°) — bundle up or stay cozy`,       icon:'🥶', color:'#BAE6FD' };
  return null;
}

function getUpcomingCalEvents(calQueue, savedItems) {
  const all = [
    ...(calQueue || []).map(e => ({ ...e, source:'calendar' })),
    ...(savedItems || []).filter(s => s.date).map(s => ({ ...s, source:'saved' })),
  ];
  const now = new Date();
  return all
    .filter(e => e.date && new Date(e.date + 'T23:59:59') >= now)
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4);
}

function PhotoBg({ photos, opacity = 0.45 }) {
  const [cur, setCur] = useState(0);
  useEffect(() => {
    if (!photos?.length) return;
    const iv = setInterval(() => setCur(c => (c + 1) % photos.length), 9000);
    return () => clearInterval(iv);
  }, [photos?.length]);
  if (!photos?.length) return null;
  return (
    <div style={{ position:'absolute', inset:0, zIndex:0 }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:`url(${photos[cur]?.url})`, backgroundSize:'cover', backgroundPosition:'center', opacity, transition:'opacity 2s ease' }} />
    </div>
  );
}

// Bigger, richer weather display for ambient
function WeatherBlock({ weather, onWeather, compact = false }) {
  const days = (weather?.length > 0 ? weather : WEATHER).slice(0, compact ? 3 : 7);
  const today = days[0] || {};
  if (compact) return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      {days.map((d, i) => (
        <div key={d.day||i} onClick={()=>onWeather(i)} style={{
          display:'flex', alignItems:'center', gap:8,
          background:'rgba(0,0,0,.35)', border:'0.5px solid rgba(255,255,255,.08)',
          borderRadius:99, padding:'5px 13px', cursor:'pointer',
          backdropFilter:'blur(8px)', transition:'background .15s',
        }}>
          <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,.35)', width:24, textTransform:'uppercase' }}>{d.day?.slice(0,3)}</span>
          <span style={{ fontSize:15 }}>{d.icon}</span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:500, minWidth:48 }}>{d.hi}°/{d.lo}°</span>
          {d.precip > 20 && <span style={{ fontSize:10, color:'#93C5FD' }}>{d.precip}%</span>}
        </div>
      ))}
    </div>
  );

  // Full weather block for PC
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      {/* Today hero */}
      <div onClick={()=>onWeather(0)} style={{
        display:'flex', alignItems:'center', gap:12,
        background:'rgba(0,0,0,.4)', border:'0.5px solid rgba(255,255,255,.1)',
        borderRadius:14, padding:'10px 16px', cursor:'pointer', backdropFilter:'blur(10px)',
        marginBottom:4,
      }}>
        <span style={{ fontSize:36 }}>{today.icon}</span>
        <div>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:42, fontWeight:300, color:'rgba(255,255,255,.95)', lineHeight:1 }}>
            {today.current ?? today.hi}°
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.5)', marginTop:1 }}>{today.desc}</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>H:{today.hi}° L:{today.lo}° · {today.precip}% rain</div>
        </div>
      </div>
      {/* Next 6 days */}
      <div style={{ display:'flex', gap:4 }}>
        {days.slice(1).map((d,i) => (
          <div key={d.day||i} onClick={()=>onWeather(i+1)} style={{
            flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            background:'rgba(0,0,0,.3)', border:'0.5px solid rgba(255,255,255,.07)',
            borderRadius:10, padding:'7px 4px', cursor:'pointer', backdropFilter:'blur(8px)',
          }}>
            <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase' }}>{d.day?.slice(0,3)}</span>
            <span style={{ fontSize:18 }}>{d.icon}</span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:500 }}>{d.hi}°</span>
            {d.precip > 20 && <span style={{ fontSize:9, color:'#93C5FD' }}>{d.precip}%</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Saved/calendar events panel
function UpcomingPanel({ calQueue, savedItems }) {
  const events = getUpcomingCalEvents(calQueue, savedItems);
  const displayEvents = events.length > 0 ? events : CALENDAR_EVENTS.slice(0,3);

  return (
    <div style={{
      background:'rgba(0,0,0,.45)', border:'0.5px solid rgba(255,255,255,.08)',
      borderRadius:12, padding:'11px 14px', backdropFilter:'blur(10px)', minWidth:180,
    }}>
      <div style={{ fontSize:8, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#C9A84C', marginBottom:8 }}>
        {events.length > 0 ? 'Your weekend' : 'This weekend'}
      </div>
      {displayEvents.map((e,i) => {
        const dayStr = e.date
          ? new Date(e.date+'T12:00').toLocaleDateString('en-US',{weekday:'short'}).toUpperCase()
          : e.day || '—';
        return (
          <div key={i} style={{ display:'flex', gap:7, alignItems:'baseline', marginBottom:i<displayEvents.length-1?6:0 }}>
            <span style={{ fontSize:8, fontWeight:700, color:'rgba(255,255,255,.25)', textTransform:'uppercase', width:22, flexShrink:0 }}>{dayStr}</span>
            <span style={{ fontSize:11, color:e.source==='saved'?'#C9A84C':'rgba(255,255,255,.72)', flex:1, lineHeight:1.2 }}>{e.title||e.name}</span>
            <span style={{ fontSize:9, color:'rgba(255,255,255,.25)', flexShrink:0 }}>{e.time}</span>
          </div>
        );
      })}
      {events.length === 0 && (
        <div style={{ fontSize:10, color:'rgba(255,255,255,.2)', fontStyle:'italic' }}>Add events to see them here</div>
      )}
    </div>
  );
}

// Weather alert banner
function WeatherAlert({ weather }) {
  const alert = getWeatherAlert(weather);
  if (!alert) return null;
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8,
      background:'rgba(0,0,0,.45)', border:`0.5px solid ${alert.color}44`,
      borderRadius:99, padding:'6px 14px', backdropFilter:'blur(8px)',
    }}>
      <span style={{ fontSize:14 }}>{alert.icon}</span>
      <span style={{ fontSize:11, color:alert.color, fontWeight:500 }}>{alert.msg}</span>
    </div>
  );
}

// ── VARIANT A — Cinematic (default) ──────────────────────────────────────────
export function AmbientA({ city, weather=[], activities={}, photos=[], calQueue=[], savedItems=[], activeProfile, onActivate, onWeather }) {
  const { timeStr, dateStr } = useClock();
  const { feature, key } = useRotatingFeature(activities);
  const tod = useTimeOfDay();
  const liveWeather = weather.length > 0 ? weather : WEATHER;
  const today = liveWeather[0];
  const theme = AMBIENT_THEMES[feature?.cat?.id] || AMBIENT_THEMES.default;
  const isWide = typeof window !== 'undefined' && window.innerWidth >= 1024;

  return (
    <div onClick={onActivate} style={{
      position:'relative', width:'100%', height:'100%', overflow:'hidden',
      cursor:'pointer', userSelect:'none',
      background:`linear-gradient(155deg, ${theme.from}, ${theme.via}, ${theme.to})`,
      transition:'background 1.5s',
    }}>
      <PhotoBg photos={photos} opacity={0.42} />
      <div style={{ position:'absolute', inset:0, zIndex:1, background:'linear-gradient(to top, rgba(4,3,2,.96) 0%, rgba(4,3,2,.3) 55%, transparent 100%)' }} />
      <div style={{ position:'absolute', inset:0, zIndex:1, background:'linear-gradient(to bottom, rgba(4,3,2,.5) 0%, transparent 30%)' }} />

      {/* Center photo frame */}
      <div style={{
        position:'absolute', top:'6%', left:'50%', transform:'translateX(-50%)',
        width:'min(300px,48%)', height:'min(300px,40vh)',
        borderRadius:14, overflow:'hidden', zIndex:2,
        border:'0.5px solid rgba(255,255,255,.1)', opacity:.72,
      }}>
        {photos?.length > 0
          ? <div style={{ position:'absolute', inset:0, backgroundImage:`url(${photos[0]?.url})`, backgroundSize:'cover', backgroundPosition:'center' }} />
          : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:48 }}>🌸</div>
        }
      </div>

      {/* TL — greeting + weather */}
      <div style={{ position:'absolute', top:22, left:24, zIndex:3 }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:6 }}>
          {tod.emoji} {activeProfile?.name ? `${tod.greeting}, ${activeProfile.name}` : tod.greeting}
        </div>
        {isWide
          ? <WeatherBlock weather={liveWeather} onWeather={onWeather} compact={false} />
          : (
            <div onClick={e=>{e.stopPropagation();onWeather(0);}} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
              <span style={{ fontSize:38, lineHeight:1 }}>{today.icon}</span>
              <div>
                <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:52, fontWeight:300, color:'rgba(255,255,255,.9)', lineHeight:1 }}>
                  {today.current ?? today.feel ?? today.hi}°
                </div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', marginTop:2 }}>{today.desc}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.28)', marginTop:1 }}>H:{today.hi}° L:{today.lo}° · {today.precip}% rain</div>
              </div>
            </div>
          )
        }
      </div>

      {/* TR — city */}
      <div style={{ position:'absolute', top:24, right:24, zIndex:3, fontSize:11, color:'rgba(255,255,255,.28)', letterSpacing:'.1em', textTransform:'uppercase' }}>{city}</div>

      {/* Center clock */}
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-52%)', zIndex:3, textAlign:'center' }}>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'min(15vw,108px)', fontWeight:300, color:'rgba(255,255,255,.92)', lineHeight:1, letterSpacing:'-.02em', textShadow:'0 2px 40px rgba(0,0,0,.4)' }}>{timeStr}</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', letterSpacing:'.18em', textTransform:'uppercase', marginTop:8 }}>{dateStr}</div>
      </div>

      {/* Right — 7-day pills (mobile/tablet) or full block already shown TL on PC */}
      {!isWide && (
        <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', right:22, top:'50%', transform:'translateY(-50%)', zIndex:3 }}>
          <WeatherBlock weather={liveWeather} onWeather={onWeather} compact={true} />
        </div>
      )}

      {/* Weather alert — above feature card */}
      <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', bottom: isWide ? 130 : 100, left:24, right: isWide ? 240 : 24, zIndex:3 }}>
        <WeatherAlert weather={liveWeather} />
      </div>

      {/* Feature card — bottom left */}
      {feature && (
        <div key={key} style={{ position:'absolute', bottom:36, left:24, right: isWide ? 240 : 24, zIndex:3 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.32)', marginBottom:5 }}>
            <span style={{ padding:'2px 8px', borderRadius:99, background:'rgba(255,255,255,.07)' }}>{feature.cat?.icon} {feature.cat?.label}</span>
            {feature.expires && <span style={{ marginLeft:6, color:'#C9A84C' }}>· last chance</span>}
          </div>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'min(4.2vw,32px)', fontWeight:400, color:'rgba(255,255,255,.92)', lineHeight:1.2, marginBottom:4 }}>{feature.title}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.38)' }}>{feature.when} · {feature.where} · {feature.cost}</div>
        </div>
      )}

      {/* BR — upcoming events */}
      {isWide && (
        <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', bottom:28, right:22, zIndex:3 }}>
          <UpcomingPanel calQueue={calQueue} savedItems={savedItems} />
        </div>
      )}
      {!isWide && (
        <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', bottom:28, right:16, zIndex:3 }}>
          <UpcomingPanel calQueue={calQueue} savedItems={savedItems} />
        </div>
      )}

      <div style={{ position:'absolute', left:18, top:'50%', transform:'translateY(-50%) rotate(180deg)', zIndex:3, writingMode:'vertical-rl', fontSize:8, color:'rgba(255,255,255,.1)', letterSpacing:'.14em', textTransform:'uppercase' }}>tap to explore</div>
    </div>
  );
}

// ── VARIANT B — Full Bleed ────────────────────────────────────────────────────
export function AmbientB({ city, weather=[], activities={}, photos=[], calQueue=[], savedItems=[], activeProfile, onActivate, onWeather }) {
  const { timeStr, dateStr } = useClock();
  const { feature, key } = useRotatingFeature(activities);
  const tod = useTimeOfDay();
  const liveWeather = weather.length > 0 ? weather : WEATHER;
  const today = liveWeather[0];
  const isWide = typeof window !== 'undefined' && window.innerWidth >= 1024;
  const [photoCur, setPhotoCur] = useState(0);

  useEffect(() => {
    if (!photos?.length) return;
    const iv = setInterval(() => setPhotoCur(c => (c + 1) % photos.length), 9000);
    return () => clearInterval(iv);
  }, [photos?.length]);

  return (
    <div onClick={onActivate} style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden', cursor:'pointer', userSelect:'none', background:'#0a0a0a' }}>
      {photos?.length > 0 && (
        <div style={{ position:'absolute', inset:0, zIndex:0, backgroundImage:`url(${photos[photoCur]?.url})`, backgroundSize:'cover', backgroundPosition:'center', filter:'brightness(0.4) saturate(0.8)', transition:'background-image 2s ease' }} />
      )}
      <div style={{ position:'absolute', inset:0, zIndex:1, background:'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,.65) 100%)' }} />
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'60%', zIndex:1, background:'linear-gradient(to top, rgba(0,0,0,.92) 0%, transparent 100%)' }} />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'30%', zIndex:1, background:'linear-gradient(to bottom, rgba(0,0,0,.6) 0%, transparent 100%)' }} />

      {/* Top row */}
      <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:3, padding:'18px 24px', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.28)', letterSpacing:'.12em', textTransform:'uppercase', marginBottom:4 }}>{tod.emoji} {activeProfile?.name ? `${tod.greeting}, ${activeProfile.name}` : tod.greeting}</div>
          <div onClick={e=>{e.stopPropagation();onWeather(0);}} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
            <span style={{ fontSize:42 }}>{today.icon}</span>
            <div>
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:56, fontWeight:300, color:'rgba(255,255,255,.95)', lineHeight:1 }}>{today.current??today.hi}°</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>{today.desc} · H:{today.hi}° L:{today.lo}°</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.25)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:6 }}>{city}</div>
          {isWide && (
            <div onClick={e=>e.stopPropagation()}>
              <WeatherBlock weather={liveWeather} onWeather={onWeather} compact={true} />
            </div>
          )}
        </div>
      </div>

      {/* Center clock */}
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:3, textAlign:'center' }}>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'min(22vw,160px)', fontWeight:200, color:'rgba(255,255,255,.9)', lineHeight:1, letterSpacing:'-.03em' }}>{timeStr}</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', letterSpacing:'.22em', textTransform:'uppercase', marginTop:10 }}>{dateStr}</div>
      </div>

      {/* Bottom */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:3, padding:'0 24px 28px' }}>
        <WeatherAlert weather={liveWeather} />
        <div style={{ marginTop:12, display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:16 }}>
          {feature && (
            <div key={key} style={{ flex:1 }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.28)', letterSpacing:'.12em', textTransform:'uppercase', marginBottom:5 }}>
                <span style={{ padding:'2px 8px', borderRadius:99, background:'rgba(255,255,255,.08)' }}>{feature.cat?.icon} {feature.cat?.label}</span>
                {feature.expires && <span style={{ marginLeft:6, color:'#C9A84C' }}>· last chance</span>}
              </div>
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'min(5vw,36px)', fontWeight:400, color:'rgba(255,255,255,.92)', lineHeight:1.2, marginBottom:4 }}>{feature.title}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.38)' }}>{feature.when} · {feature.where} · {feature.cost}</div>
            </div>
          )}
          <div onClick={e=>e.stopPropagation()}>
            <UpcomingPanel calQueue={calQueue} savedItems={savedItems} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── VARIANT C — Split Panel ───────────────────────────────────────────────────
export function AmbientC({ city, weather=[], activities={}, photos=[], calQueue=[], savedItems=[], activeProfile, onActivate, onWeather }) {
  const { timeStr, dateStr } = useClock();
  const { feature, key } = useRotatingFeature(activities);
  const tod = useTimeOfDay();
  const liveWeather = weather.length > 0 ? weather : WEATHER;
  const today = liveWeather[0];

  return (
    <div onClick={onActivate} style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden', cursor:'pointer', userSelect:'none', display:'flex' }}>
      {/* Left panel — dark */}
      <div style={{ width:'42%', background:'#0e0c0a', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'28px 24px', zIndex:2, borderRight:'0.5px solid rgba(255,255,255,.06)' }}>
        <div>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:14, fontWeight:300, color:'rgba(255,255,255,.3)', letterSpacing:'.2em', textTransform:'uppercase', marginBottom:24 }}>Locale</div>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'min(8vw,72px)', fontWeight:300, color:'rgba(255,255,255,.92)', lineHeight:1, letterSpacing:'-.02em' }}>{timeStr}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', letterSpacing:'.15em', textTransform:'uppercase', marginTop:8 }}>{dateStr}</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.2)', marginTop:4 }}>{activeProfile?.name ? `${tod.greeting}, ${activeProfile.name}` : city}</div>
        </div>
        <div>
          <WeatherAlert weather={liveWeather} />
          <div style={{ marginTop:12 }} onClick={e=>e.stopPropagation()}>
            <UpcomingPanel calQueue={calQueue} savedItems={savedItems} />
          </div>
        </div>
      </div>

      {/* Right panel — photo */}
      <div style={{ flex:1, position:'relative' }}>
        <PhotoBg photos={photos} opacity={0.65} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right, rgba(14,12,10,.8) 0%, transparent 40%)' }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.85) 0%, transparent 50%)' }} />

        {/* Weather */}
        <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', top:24, right:20, zIndex:3 }}>
          <WeatherBlock weather={liveWeather} onWeather={onWeather} compact={true} />
        </div>

        {/* Feature */}
        {feature && (
          <div key={key} style={{ position:'absolute', bottom:28, left:28, right:20, zIndex:3 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:6 }}>
              <span style={{ padding:'2px 8px', borderRadius:99, background:'rgba(255,255,255,.08)' }}>{feature.cat?.icon} {feature.cat?.label}</span>
            </div>
            <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'min(4vw,30px)', fontWeight:400, color:'rgba(255,255,255,.92)', lineHeight:1.2, marginBottom:5 }}>{feature.title}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.42)' }}>{feature.when} · {feature.where} · {feature.cost}</div>
            {feature.expires && <div style={{ fontSize:10, color:'#C9A84C', marginTop:4 }}>⚡ Last chance</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── VARIANT D — Editorial ─────────────────────────────────────────────────────
export function AmbientD({ city, weather=[], activities={}, photos=[], calQueue=[], savedItems=[], activeProfile, onActivate, onWeather }) {
  const { timeStr, dateStr } = useClock();
  const { feature, key } = useRotatingFeature(activities, 15);
  const tod = useTimeOfDay();
  const liveWeather = weather.length > 0 ? weather : WEATHER;
  const today = liveWeather[0];

  // Get top 3 features for editorial cards
  const activitySource = Object.keys(activities || {}).length > 0 ? activities : ACTIVITIES;
  const topFeatures = ALL_CATEGORIES.flatMap(cat =>
    (activitySource[cat.id] || []).filter(a=>a?.title).slice(0,2).map(a=>({...a,cat}))
  ).sort((a,b)=>((b.final_score||b.base_score||0)-(a.final_score||a.base_score||0))).slice(0,3);

  return (
    <div onClick={onActivate} style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden', cursor:'pointer', userSelect:'none', background:'#f4f1eb' }}>
      {/* Header bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:3, background:'#1C1A17', padding:'12px 28px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'Cormorant Garamond, serif', fontSize:22, color:'rgba(255,255,255,.9)', fontWeight:300, letterSpacing:'.08em' }}>Locale</span>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:28, fontWeight:300, color:'rgba(255,255,255,.9)', lineHeight:1 }}>{timeStr}</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,.3)', letterSpacing:'.12em', textTransform:'uppercase' }}>{dateStr}</div>
          </div>
          <div onClick={e=>{e.stopPropagation();onWeather(0);}} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
            <span style={{ fontSize:24 }}>{today.icon}</span>
            <div>
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:28, fontWeight:300, color:'rgba(255,255,255,.9)', lineHeight:1 }}>{today.current??today.hi}°</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.35)' }}>{today.desc}</div>
            </div>
          </div>
        </div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.25)', letterSpacing:'.1em', textTransform:'uppercase' }}>
          {activeProfile?.name ? `${tod.greeting}, ${activeProfile.name}` : city}
        </div>
      </div>

      {/* Editorial grid */}
      <div style={{ position:'absolute', top:64, left:0, right:0, bottom:0, padding:'16px 24px', display:'grid', gridTemplateColumns:'2fr 1fr', gridTemplateRows:'1fr 1fr', gap:12, overflow:'hidden' }}>
        {/* Hero photo */}
        <div style={{ gridRow:'1/3', borderRadius:14, overflow:'hidden', position:'relative' }}>
          {photos?.length > 0
            ? <div style={{ position:'absolute', inset:0, backgroundImage:`url(${photos[0]?.url})`, backgroundSize:'cover', backgroundPosition:'center' }} />
            : <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#1C1A17,#2A2520)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:64 }}>🌆</div>
          }
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.85) 0%, transparent 50%)' }} />
          {topFeatures[0] && (
            <div style={{ position:'absolute', bottom:16, left:16, right:16 }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:5 }}>{topFeatures[0].cat?.icon} {topFeatures[0].cat?.label}</div>
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'min(3.2vw,26px)', color:'rgba(255,255,255,.92)', lineHeight:1.2, marginBottom:3 }}>{topFeatures[0].title}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.4)' }}>{topFeatures[0].when} · {topFeatures[0].cost}</div>
              {topFeatures[0].expires && <div style={{ fontSize:9, color:'#C9A84C', marginTop:3 }}>⚡ Last chance</div>}
            </div>
          )}
        </div>

        {/* Top right */}
        <div style={{ borderRadius:14, overflow:'hidden', position:'relative', background:'#2A2520' }}>
          <div onClick={e=>e.stopPropagation()}>
            <WeatherBlock weather={liveWeather} onWeather={onWeather} compact={false} />
          </div>
        </div>

        {/* Bottom right */}
        <div style={{ borderRadius:14, overflow:'hidden', position:'relative', background:'#1C1A17', padding:'12px 14px' }} onClick={e=>e.stopPropagation()}>
          <WeatherAlert weather={liveWeather} />
          <div style={{ marginTop:8 }}>
            <UpcomingPanel calQueue={calQueue} savedItems={savedItems} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Default export — variant picker ──────────────────────────────────────────
const VARIANTS = [
  { id:'A', label:'A — Cinematic', component:AmbientA },
  { id:'B', label:'B — Full Bleed', component:AmbientB },
  { id:'C', label:'C — Split',     component:AmbientC },
  { id:'D', label:'D — Editorial', component:AmbientD },
];

export default function AmbientVariantPicker(props) {
  const [active, setActive] = useState('A');
  const Current = VARIANTS.find(v => v.id === active).component;

  return (
    <div style={{ position:'relative', width:'100%', height:'100%' }}>
      <Current {...props} />
      <div onClick={e => e.stopPropagation()} style={{
        position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)',
        zIndex:99, display:'flex', gap:4,
        background:'rgba(0,0,0,.7)', border:'0.5px solid rgba(255,255,255,.15)',
        borderRadius:99, padding:'4px 6px', backdropFilter:'blur(12px)',
      }}>
        {VARIANTS.map(v => (
          <button key={v.id} onClick={() => setActive(v.id)} style={{
            padding:'5px 14px', borderRadius:99, border:'none', cursor:'pointer',
            fontSize:11, fontFamily:'DM Sans, sans-serif', fontWeight:500,
            background: active===v.id ? 'rgba(201,168,76,.9)' : 'transparent',
            color: active===v.id ? '#1a1a1a' : 'rgba(255,255,255,.5)',
            transition:'all .15s',
          }}>{v.label}</button>
        ))}
      </div>
    </div>
  );
}
