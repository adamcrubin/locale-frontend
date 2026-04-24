import { useState, useEffect, useCallback } from 'react';
import { WEATHER, ACTIVITIES, ALL_CATEGORIES, CALENDAR_EVENTS, MOCK_PHOTOS, AMBIENT_THEMES } from '../data/content';

// ── Weather icon with explicit colors (no CSS filter) ─────────────────────────
function WeatherIcon({ icon, desc = '', size = 18 }) {
  const d = (desc || '').toLowerCase();
  const i = (icon || '');
  if (d.includes('thunder') || d.includes('storm') || i.includes('⛈') || i.includes('🌩'))
    return <span style={{ fontSize: size, color: '#818CF8' }}>⛈</span>;
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

      {/* ── Weather — top left ── */}
      <div style={{ position:'absolute', top:28, left:30, zIndex:3 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <WeatherIcon icon={today.icon} desc={today.desc} size={36} />
          <span style={{
            fontFamily:'Cormorant Garamond, serif', fontSize:64, fontWeight:300,
            color:'#fff', lineHeight:1, textShadow:'0 2px 20px rgba(0,0,0,.5)',
          }}>{today.current ?? today.feel ?? today.hi}°</span>
          <span style={{ fontSize:18, color:'rgba(255,255,255,.5)', alignSelf:'flex-end', paddingBottom:10 }}>F</span>
        </div>
        <div style={{ fontSize:16, color:'rgba(255,255,255,.75)', letterSpacing:'.04em', marginBottom:3 }}>{today.desc}</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.45)' }}>H:{today.hi}° · L:{today.lo}° · Rain:{today.precip}% · {today.wind}</div>
      </div>

      {/* ── Location — top right ── */}
      <div style={{ position:'absolute', top:32, right:28, zIndex:3, textAlign:'right' }}>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', letterSpacing:'.12em', textTransform:'uppercase', fontWeight:500 }}>{city}</div>
      </div>

      {/* ── Clock — centered ── */}
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%, -50%)',
        zIndex:3, textAlign:'center', pointerEvents:'none',
        padding:'20px 36px 24px',
        borderRadius:24,
        background:'rgba(0,0,0,.18)',
        backdropFilter:'blur(2px)',
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

      {/* ── 7-day weather pills — right side ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ position:'absolute', right:28, top:'50%', transform:'translateY(-50%)', zIndex:3, display:'flex', flexDirection:'column', gap:5 }}
      >
        {liveWeather.slice(0,7).map((d, i) => (
          <div key={d.day} onClick={() => onWeather(i)} style={{
            display:'flex', alignItems:'center', gap:8,
            background:'rgba(0,0,0,.45)', border:'0.5px solid rgba(255,255,255,.12)',
            borderRadius:99, padding:'6px 14px', backdropFilter:'blur(12px)',
            cursor:'pointer', transition:'all .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,.65)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,.45)'}
          >
            <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', letterSpacing:'.06em', textTransform:'uppercase', width:28 }}>{d.day}</span>
            <WeatherIcon icon={d.icon} desc={d.desc} size={18} />
            <span style={{ fontSize:13, color:'rgba(255,255,255,.85)', fontWeight:500, minWidth:54 }}>{d.hi}°/{d.lo}°</span>
            {d.precip > 20 && <span style={{ fontSize:11, color:'#93C5FD', minWidth:28 }}>{d.precip}%</span>}
          </div>
        ))}
      </div>

      {/* ── Bottom: featured activity + calendar ── */}
      <div style={{
        position:'absolute', bottom:44, left:30, right:28, zIndex:3,
        display:'grid', gridTemplateColumns: calQueue.length > 0 ? '1fr 220px' : '1fr', gap:24, alignItems:'end',
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

        {/* Calendar — only shown when real events exist (no mock fallback) */}
        {calQueue.length > 0 && (
          <div style={{
            background:'rgba(0,0,0,.55)', border:'0.5px solid rgba(255,255,255,.1)',
            borderRadius:14, padding:'14px 16px', backdropFilter:'blur(16px)',
          }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#C9A84C', marginBottom:10 }}>
              This weekend
            </div>
            {calQueue.slice(0,4).map((e, i) => {
              const day = e.date ? new Date(e.date+'T12:00').toLocaleDateString('en-US',{weekday:'short'}) : '';
              return (
                <div key={i} style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:7 }}>
                  <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', width:24 }}>{day}</span>
                  <span style={{ fontSize:13, color:'rgba(255,255,255,.8)', fontWeight:500, flex:1, lineHeight:1.2 }}>{e.title||e.name}</span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>{e.time}</span>
                </div>
              );
            })}
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
