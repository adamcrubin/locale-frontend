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

// ── Main component ────────────────────────────────────────────────────────────
export default function AmbientMode({ city, weather = [], activities = {}, photos = [], calQueue = [], activeProfile, settings = {}, onActivate, onWeather }) {
  const { timeStr, dateStr } = useClock();

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

  return (
    <div
      onClick={onActivate}
      style={{ position:'absolute', inset:0, cursor:'pointer', overflow:'hidden', background:'#0a0a0a' }}
    >
      {/* ── Full bleed photo background ── */}
      <PhotoCarousel photos={photos} />

      {/* ── Gradient overlays for legibility ── */}
      {/* Top bar */}
      <div style={{ position:'absolute', inset:0, zIndex:1, background:`
        linear-gradient(to bottom, rgba(0,0,0,.72) 0%, rgba(0,0,0,.15) 22%, transparent 40%),
        linear-gradient(to top, rgba(0,0,0,.88) 0%, rgba(0,0,0,.4) 28%, transparent 55%)
      `}} />

      {/* ── 7-day weather + calendar grid — top banner ── */}
      {(() => {
        const now = new Date();
        const toKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const dates = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now); d.setDate(now.getDate() + i); return d;
        });
        const eventsByDate = {};
        for (const e of (calQueue || [])) {
          if (e.date) { if (!eventsByDate[e.date]) eventsByDate[e.date] = []; eventsByDate[e.date].push(e); }
        }
        return (
          <div onClick={e => e.stopPropagation()} style={{
            position:'absolute', top:0, left:0, right:0, zIndex:4,
            padding:'10px 20px 8px',
            background:'rgba(0,0,0,.52)',
            backdropFilter:'blur(14px)',
            WebkitBackdropFilter:'blur(14px)',
            borderBottom:'0.5px solid rgba(255,255,255,.08)',
            display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6,
          }}>
            {dates.map((d, i) => {
              const w    = liveWeather[i] || {};
              const key  = toKey(d);
              const evts = eventsByDate[key] || [];
              const isToday = i === 0;
              const dayLabel = isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
              const dateLabel = `${d.getMonth()+1}/${d.getDate()}`;
              return (
                <div key={i} style={{ display:'flex', flexDirection:'column', gap:3, minWidth:0 }}>
                  {/* Row 1: day + date */}
                  <div style={{ fontSize:13, fontWeight:700, color: isToday ? '#C9A84C' : 'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:'.05em', whiteSpace:'nowrap' }}>
                    {dayLabel} <span style={{ fontWeight:400, opacity:.7 }}>{dateLabel}</span>
                  </div>
                  {/* Row 2: weather pill */}
                  <div onClick={() => onWeather(i)} style={{
                    display:'inline-flex', alignItems:'center', gap:4,
                    background:'rgba(255,255,255,.09)', border:'0.5px solid rgba(255,255,255,.12)',
                    borderRadius:99, padding:'4px 10px', cursor:'pointer',
                    transition:'background .12s', width:'fit-content',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.18)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.09)'}
                  >
                    <WeatherIcon icon={w.icon} desc={w.desc} size={14} />
                    <span style={{ fontSize:13, color:'rgba(255,255,255,.85)', fontWeight:500, whiteSpace:'nowrap' }}>{w.hi}°/{w.lo}°</span>
                    {w.precip > 20 && <span style={{ fontSize:11, color:'#93C5FD' }}>{w.precip}%</span>}
                  </div>
                  {/* Row 3: calendar events */}
                  {evts.slice(0, 3).map((e, j) => (
                    <div key={j} style={{ fontSize:12, color:'rgba(255,255,255,.7)', lineHeight:1.35, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'baseline', gap:4 }}>
                      <span style={{ color:'rgba(255,255,255,.4)', flexShrink:0 }}>•</span>
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>
                        {e.time ? <span style={{ color:'rgba(255,255,255,.4)', marginRight:3, fontSize:10 }}>{e.time}</span> : null}
                        {e.title || e.name}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Location — top right ── */}
      <div style={{ position:'absolute', top:108, right:28, zIndex:3, textAlign:'right' }}>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', letterSpacing:'.12em', textTransform:'uppercase', fontWeight:500 }}>{city}</div>
      </div>

      {/* ── Today's weather — top left (glass backdrop) ── */}
      <div style={{ position:'absolute', top:110, left:30, zIndex:3 }}>
        <div style={{
          display:'inline-flex', flexDirection:'column', alignItems:'flex-start',
          background:'rgba(0,0,0,.42)', backdropFilter:'blur(12px)',
          WebkitBackdropFilter:'blur(12px)',
          borderRadius:14, padding:'12px 18px',
          border:'0.5px solid rgba(255,255,255,.1)',
          minWidth:200,
        }}>
          {/* Icon + temp inline */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <WeatherIcon icon={currentHourData?.icon || today.icon} desc={currentHourData?.desc || today.desc} size={52} />
            <div>
              <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
                <span style={{ fontFamily:'Cormorant Garamond, serif', fontSize:56, fontWeight:300, color:'#fff', lineHeight:1 }}>
                  {currentHourData?.temp ?? today.current ?? today.feel ?? today.hi}°
                </span>
                <span style={{ fontSize:14, color:'rgba(255,255,255,.4)', paddingBottom:4 }}>F</span>
              </div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.65)', letterSpacing:'.03em', marginTop:2 }}>{currentHourData?.desc || today.desc}</div>
            </div>
          </div>
          {/* Bottom stats row */}
          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,.38)', marginTop:4 }}>
            <WeatherIcon icon={today.icon} desc={today.desc} size={12} />
            <span>H:{today.hi}° · L:{today.lo}° · Rain:{today.precip}%</span>
          </div>
          {/* Hourly graph — always 12am→12am, gaps stay empty without shrinking the chart */}
          {today.hours && today.hours.length >= 2 && (() => {
            // Parse "7am"/"12pm"/etc. → 0..23. Returns null on unknown labels.
            const parseHour = (lbl) => {
              if (lbl == null) return null;
              const s = String(lbl).toLowerCase().trim();
              const m = s.match(/^(\d{1,2})\s*(am|pm)$/);
              if (!m) return null;
              let h = parseInt(m[1], 10);
              if (m[2] === 'am') return h === 12 ? 0 : h;
              return h === 12 ? 12 : h + 12;
            };
            // Build a 25-slot array (0..24) so the x-axis runs 12am through 12am.
            // Slot i=24 mirrors i=0 only if we have data there; else null (gap).
            const slots = Array.from({ length: 25 }, () => ({ temp: null, p: null }));
            for (const h of today.hours) {
              const idx = parseHour(h?.t);
              if (idx == null) continue;
              slots[idx] = { temp: h.temp ?? null, p: h.p ?? null };
            }
            // Determine y-range from available temps; fall back to today.lo/hi for blank days.
            const knownTemps = slots.map(s => s.temp).filter(t => t != null);
            let minT = knownTemps.length ? Math.min(...knownTemps) : (today.lo ?? 40);
            let maxT = knownTemps.length ? Math.max(...knownTemps) : (today.hi ?? 80);
            // Round to nice 10° ticks and guarantee a visible band.
            minT = Math.floor(minT / 10) * 10;
            maxT = Math.ceil(maxT / 10) * 10;
            if (maxT - minT < 20) maxT = minT + 20;
            const rangeT = maxT - minT;

            const W = 320, H = 80;
            const padL = 28, padR = 8, padT = 6, padB = 14;
            const plotW = W - padL - padR;
            const plotH = H - padT - padB;
            const xAt = i => padL + (i / 24) * plotW;
            const yAtTemp = t => padT + (1 - (t - minT) / rangeT) * plotH;
            const yAtP    = p => padT + (1 - (p / 100)) * plotH;

            // Y-axis ticks: 3 lines (min, mid, max). Keep labels small but readable.
            const yTicks = [minT, Math.round((minT + maxT) / 2 / 10) * 10, maxT];
            // X-axis ticks: 12am, 6am, 12pm, 6pm, 12am.
            const xTicks = [0, 6, 12, 18, 24];
            const xLabel = h => h === 0 || h === 24 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h-12}p`;

            // Build temp polyline segments that skip nulls (so gaps stay empty).
            const segments = [];
            let cur = [];
            for (let i = 0; i <= 24; i++) {
              if (slots[i].temp == null) {
                if (cur.length > 1) segments.push(cur);
                cur = [];
              } else {
                cur.push(`${xAt(i)},${yAtTemp(slots[i].temp)}`);
              }
            }
            if (cur.length > 1) segments.push(cur);

            return (
              // SVG scales down responsively on narrow viewports via viewBox;
              // maxWidth caps the growth so it doesn't blow past the widget.
              <div style={{ marginTop:10, width:'100%', maxWidth: W }}>
                <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ overflow:'visible', display:'block' }}>
                  {/* Y-axis gridlines + labels */}
                  {yTicks.map(t => {
                    const y = yAtTemp(t);
                    return (
                      <g key={`yt-${t}`}>
                        <line x1={padL} x2={W-padR} y1={y} y2={y} stroke="rgba(255,255,255,.10)" strokeWidth={0.5} />
                        <text x={padL-4} y={y+3} textAnchor="end" fontSize={9} fill="rgba(255,255,255,.4)" fontFamily="DM Sans, sans-serif">{t}°</text>
                      </g>
                    );
                  })}
                  {/* Precip bars (only where we have data) */}
                  {slots.map((s, i) => s.p == null || s.p === 0 ? null : (
                    <rect key={`p-${i}`} x={xAt(i)-5} y={yAtP(s.p)} width={10} height={H-padB-yAtP(s.p)} fill="rgba(96,165,250,.28)" rx={2} />
                  ))}
                  {/* Temp line segments (skip null gaps) */}
                  {segments.map((pts, i) => (
                    <polyline key={`seg-${i}`} points={pts.join(' ')} fill="none" stroke="rgba(252,211,77,.85)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  ))}
                  {/* Baseline x-axis */}
                  <line x1={padL} x2={W-padR} y1={H-padB} y2={H-padB} stroke="rgba(255,255,255,.15)" strokeWidth={0.5} />
                  {/* X-axis tick labels */}
                  {xTicks.map(h => (
                    <text key={`xt-${h}`} x={xAt(h)} y={H-2} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,.4)" fontFamily="DM Sans, sans-serif">{xLabel(h)}</text>
                  ))}
                </svg>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Clock — centered (offset down slightly so it clears the top grid) ── */}
      <div style={{
        position:'absolute', top:'calc(50% + 40px)', left:'50%',
        transform:'translate(-50%, -50%)',
        zIndex:3, textAlign:'center', pointerEvents:'none',
        padding:'20px 36px 24px',
        borderRadius:24,
        background:'rgba(0,0,0,.22)',
        backdropFilter:'blur(4px)',
        WebkitBackdropFilter:'blur(4px)',
      }}>
        <div style={{
          fontFamily:'Cormorant Garamond, serif',
          fontSize:'min(22vw, 150px)',
          fontWeight:300, color:'#fff', lineHeight:1,
          letterSpacing:'-.02em',
          textShadow:'0 2px 60px rgba(0,0,0,.6), 0 0 120px rgba(0,0,0,.3)',
        }}>{timeStr}</div>
        <div style={{
          fontSize:14, color:'rgba(255,255,255,.6)',
          letterSpacing:'.18em', textTransform:'uppercase', marginTop:12,
          textShadow:'0 1px 12px rgba(0,0,0,.8)',
        }}>{dateStr}</div>
      </div>

      {/* ── Bottom: featured activity ── */}
      <div style={{
        position:'absolute', bottom:44, left:30, right:28, zIndex:3,
        display:'grid', gridTemplateColumns:'1fr', gap:24, alignItems:'end',
      }}>
        {/* Featured rotating activity */}
        {feature && (
          <div key={animKey} style={{ animation:'ambientSlideUp 600ms cubic-bezier(0.16,1,0.3,1) both' }}>
            <div style={{
              fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase',
              color: feature.expires ? '#C9A84C' : 'rgba(255,255,255,.4)',
              marginBottom:8, display:'flex', alignItems:'center', gap:8,
            }}>
              <span className={feature.cat?.cls || ''} style={{ padding:'3px 9px', borderRadius:99, fontSize:10 }}>
                {feature.cat?.icon} {feature.cat?.label}
              </span>
              {feature.expires && <span style={{ color:'#C9A84C' }}>· expiring soon</span>}
            </div>
            <div style={{
              fontFamily:'Cormorant Garamond, serif',
              fontSize:'min(4.5vw, 38px)', fontWeight:400,
              color:'#fff', lineHeight:1.15, marginBottom:8,
              textShadow:'0 2px 20px rgba(0,0,0,.6)',
            }}>{feature.title}</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,.55)', letterSpacing:'.03em', marginBottom:5 }}>
              {feature.when} · {feature.where} · {feature.cost}
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.38)', fontStyle:'italic', lineHeight:1.55 }}>
              {feature.why}
            </div>
          </div>
        )}

      </div>

      {/* ── Fun fact ticker — bottom strip ── */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, zIndex:4,
        height:34, background:'rgba(0,0,0,.6)',
        borderTop:'0.5px solid rgba(255,255,255,.07)',
        display:'flex', alignItems:'center', padding:'0 28px', gap:12,
        overflow:'hidden',
        backdropFilter:'blur(8px)',
      }} onClick={e => e.stopPropagation()}>
        <span style={{
          fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase',
          padding:'2px 8px', borderRadius:99, flexShrink:0,
          background:'rgba(201,168,76,.15)', color:'#C9A84C',
          border:'0.5px solid rgba(201,168,76,.2)',
        }}>FUN FACT</span>
        <span key={factKey} style={{
          fontSize:12, color:'rgba(255,255,255,.5)',
          flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          animation:'tickerSlide 400ms ease both',
        }}>{FUN_FACTS[factIdx]}</span>
      </div>

      {/* ── Tap hint — left side vertical ── */}
      <div style={{
        position:'absolute', top:'50%', left:14, zIndex:3,
        writingMode:'vertical-rl', transform:'translateY(-50%) rotate(180deg)',
        fontSize:9, color:'rgba(255,255,255,.18)', letterSpacing:'.14em', textTransform:'uppercase',
        pointerEvents:'none',
      }}>tap to explore</div>
    </div>
  );
}
