import { useState, useRef, useEffect } from 'react';
import { WEATHER as MOCK_WEATHER } from '../data/content';

// Maps NWS description keywords to a colored symbol — no CSS filter tricks.
// Each returns a styled span with an explicit color that reads on dark backgrounds.
function WeatherIcon({ icon, desc = '', size = 17 }) {
  const d = (desc || '').toLowerCase();
  const i = (icon || '');

  // Thunderstorm
  if (d.includes('thunder') || d.includes('storm') || i.includes('⛈') || i.includes('🌩'))
    return <span style={{ fontSize: size, color: '#818CF8' }}>🌩️</span>;
  // Snow / ice
  if (d.includes('snow') || d.includes('ice') || d.includes('blizzard') || i.includes('❄') || i.includes('🌨'))
    return <span style={{ fontSize: size, color: '#BAE6FD' }}>❄️</span>;
  // Frost
  if (d.includes('frost'))
    return <span style={{ fontSize: size, color: '#93C5FD' }}>🌬️</span>;
  // Heavy rain / showers
  if (d.includes('rain') || d.includes('shower') || i.includes('🌧') || i.includes('🌦'))
    return <span style={{ fontSize: size, color: '#38BDF8' }}>🌧️</span>;
  // Drizzle / slight chance rain
  if (d.includes('drizzle') || d.includes('slight chance'))
    return <span style={{ fontSize: size, color: '#7DD3FC' }}>🌦️</span>;
  // Foggy / hazy
  if (d.includes('fog') || d.includes('haz') || d.includes('smoke') || i.includes('🌫'))
    return <span style={{ fontSize: size, color: '#94A3B8' }}>🌫️</span>;
  // Windy
  if (d.includes('wind') || d.includes('breezy') || i.includes('💨'))
    return <span style={{ fontSize: size, color: '#94A3B8' }}>💨</span>;
  // Mostly cloudy / overcast
  if (d.includes('mostly cloudy') || d.includes('overcast') || i.includes('☁'))
    return <span style={{ fontSize: size, color: '#CBD5E1' }}>☁️</span>;
  // Partly cloudy day
  if (d.includes('partly') || i.includes('⛅') || i.includes('🌤'))
    return <span style={{ fontSize: size, color: '#FCD34D' }}>⛅</span>;
  // Clear night / mostly clear night
  if (d.includes('clear') && (d.includes('night') || i.includes('🌙')))
    return <span style={{ fontSize: size, color: '#FDE68A' }}>🌙</span>;
  // Mostly clear night fallback
  if (i.includes('🌙'))
    return <span style={{ fontSize: size, color: '#FDE68A' }}>🌙</span>;
  // Sunny / clear day
  if (d.includes('sunny') || d.includes('clear') || i.includes('☀') || i.includes('🌞'))
    return <span style={{ fontSize: size, color: '#FCD34D' }}>☀️</span>;
  // Fallback — render as-is but bright
  return <span style={{ fontSize: size, color: '#E2E8F0' }}>{icon || '🌡️'}</span>;
}

export default function WeatherScreen({ initialDay, city, weather, onClose }) {
  const [idx, setIdx] = useState(initialDay);
  const hourlyRef = useRef(null);
  const WEATHER = (weather && weather.length > 0) ? weather : MOCK_WEATHER;
  const d = WEATHER[idx] || WEATHER[0];

  // Scroll hourly panel to 7am whenever the selected day changes
  useEffect(() => {
    const el = hourlyRef.current;
    if (!el || !d.hours?.length) return;
    const target = d.hours.findIndex(h => {
      const t = (h.t || '').toLowerCase().replace(/\s/g, '');
      return t === '7am';
    });
    if (target > 0) el.scrollTop = target * 33;
    else el.scrollTop = 0;
  }, [idx]);

  return (
    <div className="fade-enter" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 20px' }} onClick={onClose}>
      <div className="scale-enter" onClick={e=>e.stopPropagation()} style={{ background:'#1C1A17', borderRadius:16, border:'0.5px solid rgba(255,255,255,.1)', width:'100%', maxWidth:640, maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'12px 18px', borderBottom:'0.5px solid rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div className="serif" style={{ fontSize:16, color:'rgba(255,255,255,.9)', fontWeight:300 }}>{d.full} — {city}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:1 }}>NWS</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.07)', border:'0.5px solid rgba(255,255,255,.1)', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'DM Sans, sans-serif', color:'rgba(255,255,255,.55)' }}>Close</button>
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderBottom:'0.5px solid rgba(255,255,255,.08)', flexShrink:0 }}>
          {[
            { l:'High / Low', v:`${d.hi}° / ${d.lo}°` },
            { l:'Feels like',  v: d.feel != null ? `${d.feel}°` : null },
            { l:'Wind',        v: d.wind || '—' },
            { l:'Precip',      v:`${d.precip ?? 0}%` },
          ].filter(s => s.v !== null).map((s,i,arr)=>(
            <div key={i} style={{ padding:'9px 8px', textAlign:'center', borderRight:i<arr.length-1?'0.5px solid rgba(255,255,255,.08)':'none' }}>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:3 }}>{s.l}</div>
              <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,.85)' }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Split panel: 7-day LEFT, hourly RIGHT */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', flex:1, overflow:'hidden', minHeight:0 }}>

          {/* Left: 7-day forecast */}
          <div style={{ padding:'12px 16px', borderRight:'0.5px solid rgba(255,255,255,.08)', overflowY:'auto' }} className="no-scroll">
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#C9A84C', marginBottom:10 }}>
              7-day forecast
            </div>
            {WEATHER.map((dd,i)=>(
              <div key={i} onClick={()=>setIdx(i)} style={{
                display:'flex', alignItems:'center', gap:8, padding:'8px 8px',
                borderRadius:8, cursor:'pointer',
                background: i===idx ? 'rgba(255,255,255,.07)' : 'transparent',
                transition:'background .12s', marginBottom:2,
              }}>
                <span style={{ fontSize:12, fontWeight:600, color: i===idx?'rgba(255,255,255,.9)':'rgba(255,255,255,.55)', width:32 }}>{dd.day}</span>
                <WeatherIcon icon={dd.icon} desc={dd.desc} size={17} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,.4)', flex:1 }}>{dd.desc}</span>
                <div style={{ width:36, height:3, background:'rgba(255,255,255,.08)', borderRadius:99, overflow:'hidden', flexShrink:0 }}>
                  <div style={{ height:'100%', width:`${dd.precip ?? 0}%`, background:'#4A90D4', borderRadius:99 }} />
                </div>
                <span style={{ fontSize:11, color: i===idx?'rgba(255,255,255,.8)':'rgba(255,255,255,.45)', width:54, textAlign:'right' }}>{dd.hi}°/{dd.lo}°</span>
              </div>
            ))}
          </div>

          {/* Right: hourly for selected day — fixed 12AM–10PM even-hour grid */}
          <div ref={hourlyRef} style={{ padding:'0 16px 12px', overflowY:'auto', position:'relative' }} className="no-scroll">
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#C9A84C', padding:'12px 0 10px', position:'sticky', top:0, background:'#1C1A17', zIndex:1 }}>
              Hourly — {d.day?.toLowerCase()}
            </div>
            {(() => {
              // Build canonical even-hour slots 12AM, 2AM, … 10PM (12 entries)
              const SLOTS = [
                '12 AM','2 AM','4 AM','6 AM','8 AM','10 AM',
                '12 PM','2 PM','4 PM','6 PM','8 PM','10 PM',
              ];
              const normalize = s => (s||'').toLowerCase().replace(/\s+/g,'');
              const hoursMap = {};
              (d.hours||[]).forEach(h => { hoursMap[normalize(h.t)] = h; });
              const rows = SLOTS.map(slot => hoursMap[normalize(slot)] || { t: slot, temp: null, desc: null, icon: null, p: null });
              return rows.map((h, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:i<rows.length-1?'0.5px solid rgba(255,255,255,.06)':'none', fontSize:12 }}>
                  <span style={{ width:40, color:'rgba(255,255,255,.35)', flexShrink:0, fontSize:11 }}>{h.t}</span>
                  <span style={{ width:22, textAlign:'center', flexShrink:0 }}>
                    {h.icon || h.desc ? <WeatherIcon icon={h.icon} desc={h.desc||''} size={14} /> : <span style={{color:'rgba(255,255,255,.2)',fontSize:12}}>—</span>}
                  </span>
                  <span style={{ flex:1, color:'rgba(255,255,255,.42)', fontSize:11 }}>{h.desc || <span style={{color:'rgba(255,255,255,.2)'}}>n/a</span>}</span>
                  <span style={{ fontWeight:600, color: h.temp != null ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.2)', width:28, textAlign:'right' }}>{h.temp != null ? `${h.temp}°` : '—'}</span>
                  <span style={{ fontSize:10, color:'#60A5FA', width:26, textAlign:'right' }}>{h.p != null ? `${h.p}%` : ''}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
