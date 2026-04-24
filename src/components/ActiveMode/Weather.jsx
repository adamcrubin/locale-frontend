import { useState } from 'react';
import WeatherIcon from '../WeatherIcon';
import { WEATHER as MOCK_WEATHER } from '../../data/content';

export function WeatherPillBar({ weather, onWeather }) {
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

export function SpotlightWeatherBar({ activities, weather, onCal, onWeather }) {
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

        {spotlightItems.length > 0 && weekendWeather.length > 0 && (
          <div style={{ width: 1, background: 'rgba(255,255,255,.08)', flexShrink: 0, margin: '0 4px', alignSelf: 'stretch' }} />
        )}

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
