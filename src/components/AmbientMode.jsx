import { useState, useEffect, useCallback } from 'react';
import { WEATHER, ACTIVITIES, ALL_CATEGORIES, CALENDAR_EVENTS, MOCK_PHOTOS, AMBIENT_THEMES } from '../data/content';

// ── Weather icon with explicit colors (no CSS filter) ─────────────────────────
function WeatherIcon({ icon, desc = '', size = 18 }) {
  const d = (desc || '').toLowerCase();
  const i = (icon || '');
  if (d.includes('thunder') || d.includes('storm') || i.includes('⛈') || i.includes('🌩'))
    return <span style={{ fontSize: size, color: '#818CF8' }}>🌩️</span>;
  if (d.includes('snow') || d.includes('ice') || d.includes('blizzard') || i.includes('❄') || i.includes('🌨'))
    return <span style={{ fontSize: size, color: '#BAE6FD' }}>❄️</span>;
  if (d.includes('frost'))
    return <span style={{ fontSize: size, color: '#93C5FD' }}>🌬️</span>;
  if (d.includes('rain') || d.includes('shower') || i.includes('🌧') || i.includes('🌦'))
    return <span style={{ fontSize: size, color: '#38BDF8' }}>🌧️</span>;
  if (d.includes('drizzle') || d.includes('slight chance'))
    return <span style={{ fontSize: size, color: '#7DD3FC' }}>🌦️</span>;
  if (d.includes('fog') || d.includes('haz') || d.includes('smoke') || i.includes('🌫'))
    return <span style={{ fontSize: size, color: '#94A3B8' }}>🌫️</span>;
  if (d.includes('wind') || d.includes('breezy') || i.includes('💨'))
    return <span style={{ fontSize: size, color: '#94A3B8' }}>💨</span>;
  if (d.includes('mostly cloudy') || d.includes('overcast') || i.includes('☁'))
    return <span style={{ fontSize: size, color: '#CBD5E1' }}>☁️</span>;
  if (d.includes('partly') || i.includes('⛅') || i.includes('🌤'))
    return <span style={{ fontSize: size, color: '#FCD34D' }}>⛅</span>;
  if (i.includes('🌙') || (d.includes('clear') && d.includes('night')))
    return <span style={{ fontSize: size, color: '#FDE68A' }}>🌙</span>;
  if (d.includes('sunny') || d.includes('clear') || i.includes('☀') || i.includes('🌞'))
    return <span style={{ fontSize: size, color: '#FCD34D' }}>☀️</span>;
  return <span style={{ fontSize: size, color: '#E2E8F0' }}>{icon || '🌡️'}</span>;
}

// ── Fun facts ─────────────────────────────────────────────────────────────────
const FUN_FACTS = [
  "DC has more therapy dogs per capita than any other US city. Harlow approves.",
  "The Potomac River has been used for kayaking since before the city was founded.",
  "Georgetown was a separate city from DC until 1871.",
  "The Library of Congress is the largest library in the world — 170M+ items.",
  "DC's Metro system has the longest escalators in the Western Hemisphere.",
  "There are more monuments per square mile in DC than anywhere in the US.",
  "The National Mall is twice the length of the Champs-Élysées.",
  "DC has no voting representation in Congress despite being a US city.",
  "The White House has 132 rooms and 35 bathrooms.",
  "Eastern Market has been open continuously since 1873.",
  "Ben's Chili Bowl has served presidents, rock stars, and everyone in between since 1958.",
  "The Smithsonian is the world's largest museum complex — all free.",
  "Great Falls is one of the most powerful rapids on the East Coast.",
  "DC cherry trees were a gift from Japan in 1912 — over 3,700 trees.",
  "The Kennedy Center opened in 1971 and offers free Millennium Stage shows nightly.",
];

// ── Clock hook ────────────────────────────────────────────────────────────────
function useClock() {
  const fmt = () => {
    const n = new Date();
    const h = n.getHours() % 12 || 12;
    const m = String(n.getMinutes()).padStart(2, '0');
    const day = n.toLocaleDateString('en-US', { weekday:'long' }).toUpperCase();
    const date = n.toLocaleDateString('en-US', { month:'long', day:'numeric' }).toUpperCase();
    return { timeStr:`${h}:${m}`, dateStr:`${day} · ${date}` };
  };
  const [t, setT] = useState(fmt);
  useEffect(() => { const iv = setInterval(() => setT(fmt()), 10000); return () => clearInterval(iv); }, []);
  return t;
}

// ── Photo carousel — FULL BLEED ───────────────────────────────────────────────
function PhotoCarousel({ photos }) {
  const items = photos && photos.length > 0 ? photos : MOCK_PHOTOS;
  const isReal = photos && photos.length > 0;
  const [current, setCurrent] = useState(0);
  const [prev,    setPrev]    = useState(null);

  useEffect(() => { setCurrent(0); setPrev(null); }, [isReal]);

  useEffect(() => {
    const iv = setInterval(() => {
      setPrev(current);
      setCurrent(c => (c + 1) % items.length);
    }, 8000);
    return () => clearInterval(iv);
  }, [current, items.length]);

  const renderItem = (item, key, style) => {
    if (isReal && item?.url) {
      return (
        <div key={key} style={{
          position:'absolute', inset:0,
          backgroundImage:`url(${item.url})`,
          backgroundSize:'cover', backgroundPosition:'center',
          ...style,
        }} />
      );
    }
    return (
      <div key={key} style={{
        position:'absolute', inset:0,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:120, opacity:0.15, ...style,
      }}>{item}</div>
    );
  };

  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
      {prev !== null && renderItem(items[prev], `prev-${prev}`, { animation:'photoFadeOut 1600ms ease forwards' })}
      {renderItem(items[current], `cur-${current}`, { animation:'photoFadeIn 1600ms ease both' })}
      {isReal && items[current]?.credit && (
        <div style={{ position:'absolute', bottom:80, right:16, fontSize:9, color:'rgba(255,255,255,.2)', zIndex:2 }}>
          📷 {items[current].credit.name}
        </div>
      )}
    </div>
  );
}

// ── Rotation timing ──────────────────────────────────────────────────────
// The ambient view alternates between a big clock+weather "home" panel
// and a full-page weekend calendar. Operator-set timing (2026-05-11):
// 60 seconds on home, 20 seconds on calendar, looping. Tuned for an
// iPad-on-a-counter use case — most of the time you want the clock; the
// calendar peek nudges you to actually plan something.
const AMBIENT_HOME_MS = 60_000;
const AMBIENT_CAL_MS  = 20_000;

// ── Main component ────────────────────────────────────────────────────────────
export default function AmbientMode({ city, weather = [], activities = {}, photos = [], calQueue = [], activeProfile, settings = {}, onActivate, onWeather }) {
  const { timeStr, dateStr } = useClock();

  // View rotation state. 'home' = clock + weather. 'calendar' = full-page
  // weekend events. Timer alternates them on the AMBIENT_HOME_MS /
  // AMBIENT_CAL_MS cadence.
  const [view, setView] = useState('home');
  useEffect(() => {
    const delay = view === 'home' ? AMBIENT_HOME_MS : AMBIENT_CAL_MS;
    const iv = setTimeout(() => setView(v => v === 'home' ? 'calendar' : 'home'), delay);
    return () => clearTimeout(iv);
  }, [view]);

  // Live weather with fallback
  const liveWeather = weather.length > 0 ? weather : WEATHER;
  const today = liveWeather[0] || WEATHER[0];

  // Current hour's icon/desc from today's hourly data
  const currentHourData = (() => {
    const h = new Date().getHours();
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 || 12;
    const label = `${h12} ${ampm}`;
    const norm = s => (s||'').toLowerCase().replace(/\s+/g,'');
    return (today.hours||[]).find(x => norm(x.t) === norm(label)) || null;
  })();

  // Live activities with fallback
  const activitySource = Object.keys(activities).length > 0 ? activities : ACTIVITIES;

  // Rotating featured activity
  const allFeatures = ALL_CATEGORIES.flatMap(cat =>
    (activitySource[cat.id] || []).slice(0, 3).map(a => ({ ...a, cat }))
  );
  const [featureIdx, setFeatureIdx] = useState(0);
  const [animKey,    setAnimKey]    = useState(0);
  useEffect(() => {
    if (allFeatures.length === 0) return;
    const iv = setInterval(() => {
      setFeatureIdx(i => (i + 1) % allFeatures.length);
      setAnimKey(k => k + 1);
    }, 10000);
    return () => clearInterval(iv);
  }, [allFeatures.length]);
  const feature = allFeatures[featureIdx] || null;

  // Fun facts rotation
  const [factIdx, setFactIdx] = useState(() => Math.floor(Math.random() * FUN_FACTS.length));
  const [factKey, setFactKey] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => {
      setFactIdx(i => (i + 1) % FUN_FACTS.length);
      setFactKey(k => k + 1);
    }, 15000);
    return () => clearInterval(iv);
  }, []);

  // ── Weekend events (rotation-target view) ──────────────────────────────
  // Compute Fri/Sat/Sun anchors for THIS weekend (matching getWeekendDates
  // semantics elsewhere in the app — step backward on Sat/Sun).
  const weekend = (() => {
    const now = new Date();
    const dow = now.getDay();
    let daysToFri;
    if (dow === 5) daysToFri = 0;       // Fri
    else if (dow === 6) daysToFri = -1; // Sat → Fri was yesterday
    else if (dow === 0) daysToFri = -2; // Sun → Fri was 2 days ago
    else                daysToFri = 5 - dow;
    const fri = new Date(now); fri.setDate(now.getDate() + daysToFri); fri.setHours(0,0,0,0);
    const sat = new Date(fri); sat.setDate(fri.getDate() + 1);
    const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
    const toKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const byDate = { [toKey(fri)]: [], [toKey(sat)]: [], [toKey(sun)]: [] };
    for (const e of (calQueue || [])) {
      if (byDate[e.date] !== undefined) byDate[e.date].push(e);
    }
    return { fri, sat, sun, byDate, toKey };
  })();

  return (
    <div
      onClick={onActivate}
      style={{ position:'absolute', inset:0, cursor:'pointer', overflow:'hidden', background:'#0a0a0a' }}
    >
      <PhotoCarousel photos={photos} />

      {/* Darker overlay than before — large type needs to dominate, photo
          is just texture. */}
      <div style={{
        position:'absolute', inset:0, zIndex:1,
        background:'linear-gradient(135deg, rgba(0,0,0,.78) 0%, rgba(0,0,0,.55) 50%, rgba(0,0,0,.78) 100%)',
      }} />

      {/* HOME view — massive clock left, massive weather right */}
      {view === 'home' && (
        <div key="home" style={{
          position:'absolute', inset:0, zIndex:2,
          display:'grid', gridTemplateColumns:'1fr 1fr',
          animation:'ambientFadeIn 700ms ease both',
        }}>
          {/* Left half — clock */}
          <div style={{
            display:'flex', flexDirection:'column',
            justifyContent:'center', alignItems:'center',
            padding:'40px 32px',
            borderRight:'0.5px solid rgba(255,255,255,.08)',
            pointerEvents:'none',
          }}>
            <div style={{
              fontFamily:"'DM Sans', sans-serif",
              fontSize:'min(28vw, 280px)',
              fontWeight:200,
              color:'#fff', lineHeight:0.95,
              letterSpacing:'-.05em',
              fontVariantNumeric:'tabular-nums',
              textShadow:'0 4px 80px rgba(0,0,0,.7)',
              whiteSpace:'nowrap',
            }}>{timeStr}</div>
            <div style={{
              fontSize:'min(2.6vw, 26px)',
              color:'rgba(255,255,255,.72)',
              letterSpacing:'.18em', textTransform:'uppercase',
              marginTop:24, textAlign:'center',
              fontWeight:400,
              textShadow:'0 2px 16px rgba(0,0,0,.8)',
            }}>{dateStr}</div>
          </div>

          {/* Right half — weather */}
          <div style={{
            display:'flex', flexDirection:'column',
            justifyContent:'center', alignItems:'center',
            padding:'40px 32px', pointerEvents:'none', textAlign:'center',
          }}>
            <div style={{ fontSize:'min(22vw, 220px)', lineHeight:1, marginBottom:24, textShadow:'0 4px 60px rgba(0,0,0,.5)' }}>
              <WeatherIcon icon={today.icon} desc={today.desc} size={'min(22vw, 220px)'} />
            </div>
            <div style={{
              fontFamily:"'DM Sans', sans-serif",
              fontSize:'min(22vw, 200px)',
              fontWeight:200, color:'#fff', lineHeight:0.95,
              letterSpacing:'-.04em',
              fontVariantNumeric:'tabular-nums',
              textShadow:'0 4px 80px rgba(0,0,0,.7)',
            }}>
              {today.hi != null ? `${today.hi}°` : '—'}
            </div>
            <div style={{
              fontSize:'min(2.4vw, 24px)',
              color:'rgba(255,255,255,.7)',
              letterSpacing:'.14em', textTransform:'uppercase',
              marginTop:14, fontWeight:400,
              textShadow:'0 2px 16px rgba(0,0,0,.8)',
            }}>
              {today.desc || 'Clear'}
            </div>
            {today.lo != null && (
              <div style={{
                fontSize:'min(2.0vw, 20px)',
                color:'rgba(255,255,255,.45)',
                marginTop:10, fontWeight:300, letterSpacing:'.06em',
              }}>
                H {today.hi}° · L {today.lo}°
              </div>
            )}
            {today.precip != null && today.precip > 0 && (
              <div style={{
                fontSize:'min(1.8vw, 18px)',
                color:'rgba(96,165,250,.85)',
                marginTop:8, fontWeight:500, letterSpacing:'.06em',
              }}>
                {today.precip}% rain
              </div>
            )}
          </div>
        </div>
      )}

      {/* CALENDAR view — full-page weekend grid */}
      {view === 'calendar' && (
        <div key="calendar" style={{
          position:'absolute', inset:0, zIndex:2,
          padding:'48px 36px 36px',
          animation:'ambientFadeIn 700ms ease both',
          display:'flex', flexDirection:'column',
          pointerEvents:'none',
        }}>
          <div style={{
            fontSize:'min(2.4vw, 26px)',
            color:'rgba(255,255,255,.7)',
            letterSpacing:'.18em', textTransform:'uppercase',
            marginBottom:24, fontWeight:600,
            textShadow:'0 2px 16px rgba(0,0,0,.8)',
          }}>
            This Weekend · {weekend.fri.toLocaleDateString('en-US', { month:'long', day:'numeric' })}–{weekend.sun.toLocaleDateString('en-US', { day:'numeric' })}
          </div>
          <div style={{
            flex:1,
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:24,
            minHeight:0,
          }}>
            {[
              { d: weekend.fri, label:'Friday' },
              { d: weekend.sat, label:'Saturday' },
              { d: weekend.sun, label:'Sunday' },
            ].map(({ d, label }) => {
              const evts = (weekend.byDate[weekend.toKey(d)] || []).slice(0, 6);
              return (
                <div key={label} style={{
                  display:'flex', flexDirection:'column', minHeight:0,
                  background:'rgba(0,0,0,.32)',
                  border:'0.5px solid rgba(255,255,255,.08)',
                  borderRadius:14, padding:'18px 18px 12px',
                  backdropFilter:'blur(6px)',
                }}>
                  <div style={{
                    fontSize:'min(3vw, 32px)', fontWeight:600, color:'#C9A84C',
                    letterSpacing:'-.01em', marginBottom:4,
                  }}>{label}</div>
                  <div style={{
                    fontSize:'min(1.4vw, 14px)', color:'rgba(255,255,255,.4)',
                    letterSpacing:'.06em', marginBottom:14,
                  }}>{d.toLocaleDateString('en-US', { month:'short', day:'numeric' })}</div>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, overflow:'hidden' }}>
                    {evts.length === 0 ? (
                      <div style={{ fontSize:'min(1.5vw, 16px)', color:'rgba(255,255,255,.3)', fontStyle:'italic' }}>
                        Nothing on your calendar yet.
                      </div>
                    ) : evts.map((e, i) => (
                      <div key={i} style={{
                        display:'flex', gap:10, alignItems:'baseline',
                        padding:'6px 0',
                        borderBottom: i < evts.length - 1 ? '0.5px solid rgba(255,255,255,.05)' : 'none',
                      }}>
                        <div style={{
                          fontSize:'min(1.5vw, 15px)', fontWeight:600,
                          color:'#C9A84C', minWidth:50, fontVariantNumeric:'tabular-nums',
                        }}>{e.time || '—'}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{
                            fontSize:'min(1.8vw, 18px)', color:'rgba(255,255,255,.9)',
                            fontWeight:500, lineHeight:1.25, overflow:'hidden',
                            textOverflow:'ellipsis', whiteSpace:'nowrap',
                          }}>{e.title}</div>
                          {(e.where || e.venue) && (
                            <div style={{
                              fontSize:'min(1.3vw, 13px)', color:'rgba(255,255,255,.4)',
                              marginTop:1, overflow:'hidden',
                              textOverflow:'ellipsis', whiteSpace:'nowrap',
                            }}>{e.where || e.venue}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tap-hint — appears only on home view to avoid clutter */}
      {view === 'home' && (
        <div style={{
          position:'absolute', bottom:18, left:'50%',
          transform:'translateX(-50%)', zIndex:3,
          fontSize:11, color:'rgba(255,255,255,.22)',
          letterSpacing:'.16em', textTransform:'uppercase',
          pointerEvents:'none',
        }}>tap to explore</div>
      )}
    </div>
  );
}
