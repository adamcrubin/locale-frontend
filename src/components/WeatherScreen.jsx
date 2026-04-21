import { useState } from 'react';
import { WEATHER as MOCK_WEATHER } from '../data/content';

// Map emoji to weather TV-style colors
function getIconColor(icon) {
  if (!icon) return 'none';
  if (icon.includes('☀') || icon.includes('🌞'))           return 'sepia(1) saturate(4) hue-rotate(0deg) brightness(1.1)';   // bright yellow
  if (icon.includes('🌤') || icon.includes('⛅'))           return 'sepia(1) saturate(3) hue-rotate(10deg) brightness(1.1)';  // yellow-white
  if (icon.includes('🌥') || icon.includes('☁'))           return 'grayscale(0.3) brightness(1.6)';                           // light grey
  if (icon.includes('🌧') || icon.includes('🌦'))           return 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)'; // blue
  if (icon.includes('⛈') || icon.includes('🌩'))           return 'sepia(1) saturate(2) hue-rotate(200deg) brightness(0.9)'; // dark blue-purple
  if (icon.includes('⚡') || icon.includes('🌪'))           return 'sepia(1) saturate(4) hue-rotate(40deg) brightness(1.2)';  // yellow-green
  if (icon.includes('❄') || icon.includes('🌨') || icon.includes('☃')) return 'grayscale(0.1) brightness(2) saturate(0.5)';   // bright white-blue
  if (icon.includes('🌙') || icon.includes('🌛'))           return 'sepia(1) saturate(2) hue-rotate(30deg) brightness(1.3)';  // warm gold
  if (icon.includes('🌬') || icon.includes('💨'))           return 'grayscale(0.2) brightness(1.5)';                           // light grey
  if (icon.includes('🌫'))                                  return 'grayscale(0.4) brightness(1.4)';                           // grey
  return 'none';
}

function WeatherIcon({ icon, size = 17 }) {
  return (
    <span style={{
      fontSize: size,
      display: 'inline-block',
      filter: getIconColor(icon),
    }}>{icon}</span>
  );
}

export default function WeatherScreen({ initialDay, city, weather, onClose }) {
  const [idx, setIdx] = useState(initialDay);
  const WEATHER = (weather && weather.length > 0) ? weather : MOCK_WEATHER;
  const d = WEATHER[idx] || WEATHER[0];

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

        {/* Stats row — skip null fields gracefully */}
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

        {/* Split panel: hourly left, 7-day right */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', flex:1, overflow:'hidden', minHeight:0 }}>

          {/* Left: hourly for selected day */}
          <div style={{ padding:'12px 16px', borderRight:'0.5px solid rgba(255,255,255,.08)', overflowY:'auto' }} className="no-scroll">
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#C9A84C', marginBottom:10 }}>
              Hourly — {d.day?.toLowerCase()}
            </div>
            {d.hours && d.hours.length > 0 ? d.hours.map((h,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:i<d.hours.length-1?'0.5px solid rgba(255,255,255,.06)':'none', fontSize:12 }}>
                <span style={{ width:36, color:'rgba(255,255,255,.35)', flexShrink:0 }}>{h.t}</span>
                <span style={{ width:22, textAlign:'center', flexShrink:0 }}><WeatherIcon icon={h.icon} size={14} /></span>
                <span style={{ flex:1, color:'rgba(255,255,255,.42)', fontSize:11 }}>{h.desc}</span>
                <span style={{ fontWeight:600, color:'rgba(255,255,255,.8)', width:28, textAlign:'right' }}>{h.temp}°</span>
                <span style={{ fontSize:10, color:'#60A5FA', width:26, textAlign:'right' }}>{h.p ? `${h.p}%` : ''}</span>
              </div>
            )) : (
              <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontStyle:'italic', paddingTop:8 }}>No hourly data for this day</div>
            )}
          </div>

          {/* Right: 7-day forecast */}
          <div style={{ padding:'12px 16px', overflowY:'auto' }} className="no-scroll">
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
                <WeatherIcon icon={dd.icon} size={17} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,.4)', flex:1 }}>{dd.desc}</span>
                <div style={{ width:36, height:3, background:'rgba(255,255,255,.08)', borderRadius:99, overflow:'hidden', flexShrink:0 }}>
                  <div style={{ height:'100%', width:`${dd.precip ?? 0}%`, background:'#4A90D4', borderRadius:99 }} />
                </div>
                <span style={{ fontSize:11, color: i===idx?'rgba(255,255,255,.8)':'rgba(255,255,255,.45)', width:54, textAlign:'right' }}>{dd.hi}°/{dd.lo}°</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
