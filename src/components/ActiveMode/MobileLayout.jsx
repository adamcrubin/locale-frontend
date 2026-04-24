import { useState, useRef, useEffect } from 'react';
import WeatherIcon from '../WeatherIcon';
import { ACTIVITIES as MOCK_ACTIVITIES } from '../../data/content';
import { dedupeActivities, isPastEvent, isFrontendBlocked, getTimeOfDay, getWeekendWeather } from './utils';
import ActCard from './ActCard';

export default function MobileLayout({ visibleCats, activities, removed, onCal, onRemove, onHeart, onThumbUp, onThumbDown, onReserve, weatherDim, weatherBoost, homeAddress, profileId, spotlightMode, timeFilter, curatedMode, weather }) {
  const [activeCat, setActiveCat] = useState(visibleCats[0]?.id || 'outdoors');
  const swipeX   = useRef(null);
  const swipeDir = useRef(null);
  const listRef  = useRef(null);

  useEffect(() => {
    if (visibleCats.length > 0 && !visibleCats.find(c => c.id === activeCat)) {
      setActiveCat(visibleCats[0].id);
    }
  }, [visibleCats]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [activeCat]);

  const catIdx = visibleCats.findIndex(c => c.id === activeCat);
  const cat    = visibleCats[catIdx] || visibleCats[0];

  const goNext = () => {
    if (!visibleCats.length) return;
    setActiveCat(visibleCats[(catIdx + 1) % visibleCats.length].id);
  };
  const goPrev = () => {
    if (!visibleCats.length) return;
    setActiveCat(visibleCats[(catIdx - 1 + visibleCats.length) % visibleCats.length].id);
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

      {/* Weekend weather row */}
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

      {/* Category header with L/R arrows */}
      <div className={cat.cls} style={{
        padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, minWidth: 0,
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

      {/* Card list */}
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
