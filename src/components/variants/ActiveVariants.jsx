import { useState, useEffect, useRef } from 'react';
import { ALL_CATEGORIES, ACTIVITIES as MOCK_ACTIVITIES } from '../../data/content';

// ── Shared helpers ────────────────────────────────────────────────────────────
function getActs(activities, catId) {
  const live = activities?.[catId];
  return (live?.length > 0 ? live : MOCK_ACTIVITIES[catId] || []);
}

// ── VARIANT A: Terminal / Hacker ─────────────────────────────────────────────
// Green on black, monospace, typing animations, raw data feel
export function TerminalVariant({ activities, weather, settings, onClose }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [typed,     setTyped]     = useState('');
  const allActs = ALL_CATEGORIES.flatMap(cat => getActs(activities, cat.id).map(a => ({ ...a, cat })));
  const current = allActs[activeIdx];
  const fullText = current ? `> ${current.title.toUpperCase()}\n  ${current.when} | ${current.where} | ${current.cost}\n  ${current.why}` : '';

  useEffect(() => {
    setTyped('');
    let i = 0;
    const iv = setInterval(() => {
      if (i < fullText.length) { setTyped(fullText.slice(0, ++i)); }
      else clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, [activeIdx, fullText]);

  const today = weather?.[0];

  return (
    <div style={{ position:'fixed', inset:0, background:'#0a0f0a', color:'#00ff41', fontFamily:"'Courier New', monospace", display:'flex', flexDirection:'column', zIndex:50 }}>
      {/* Scanline effect */}
      <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.15) 2px, rgba(0,0,0,.15) 4px)', pointerEvents:'none', zIndex:1 }} />

      {/* Header */}
      <div style={{ padding:'12px 20px', borderBottom:'1px solid rgba(0,255,65,.2)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
        <div>
          <span style={{ fontSize:13, fontWeight:'bold', letterSpacing:'.1em' }}>LOCALE.SYS v2.6</span>
          <span style={{ fontSize:11, color:'#00aa2d', marginLeft:16 }}>{settings?.city || 'FALLS CHURCH, VA'}</span>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          {today && <span style={{ fontSize:11, color:'#00aa2d' }}>{today.hi}°F · {today.desc?.toUpperCase()}</span>}
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid rgba(0,255,65,.3)', color:'#00ff41', padding:'3px 10px', cursor:'pointer', fontFamily:'inherit', fontSize:11, letterSpacing:'.06em' }}>[ESC]</button>
        </div>
      </div>

      <div style={{ flex:1, display:'grid', gridTemplateColumns:'200px 1fr', overflow:'hidden' }}>
        {/* Category list */}
        <div style={{ borderRight:'1px solid rgba(0,255,65,.15)', overflowY:'auto', padding:'8px 0' }} className="no-scroll">
          <div style={{ padding:'6px 16px', fontSize:10, color:'#006618', letterSpacing:'.1em', marginBottom:4 }}>// CATEGORIES</div>
          {ALL_CATEGORIES.map((cat, i) => {
            const acts = getActs(activities, cat.id);
            return (
              <div key={cat.id} onClick={() => setActiveIdx(ALL_CATEGORIES.slice(0,i).reduce((s,c) => s + getActs(activities, c.id).length, 0))}
                style={{ padding:'5px 16px', fontSize:11, cursor:'pointer', color: acts.length ? '#00ff41' : '#006618', letterSpacing:'.04em',
                  borderLeft: '2px solid transparent',
                  transition:'all .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderLeftColor = '#00ff41'}
                onMouseLeave={e => e.currentTarget.style.borderLeftColor = 'transparent'}
              >
                {cat.label.toUpperCase()} <span style={{ color:'#006618' }}>[{acts.length}]</span>
              </div>
            );
          })}
        </div>

        {/* Main display */}
        <div style={{ display:'flex', flexDirection:'column', padding:'16px 20px', overflow:'hidden' }}>
          <div style={{ fontSize:10, color:'#006618', letterSpacing:'.08em', marginBottom:12 }}>
            // RECORD {activeIdx + 1}/{allActs.length} — WEEKEND EVENTS DATABASE
          </div>

          {/* Typing text */}
          <div style={{ flex:1, fontSize:13, lineHeight:1.8, whiteSpace:'pre-wrap', overflow:'hidden' }}>
            {typed}
            <span style={{ animation:'cursor-blink 1s infinite' }}>█</span>
          </div>

          {/* Navigation */}
          <div style={{ display:'flex', gap:12, borderTop:'1px solid rgba(0,255,65,.15)', paddingTop:12, marginTop:12 }}>
            {allActs.map((_, i) => (
              <div key={i} onClick={() => setActiveIdx(i)} style={{
                width:8, height:8, borderRadius:'50%', cursor:'pointer',
                background: i === activeIdx ? '#00ff41' : 'rgba(0,255,65,.2)',
                transition:'all .15s',
              }} />
            ))}
          </div>

          <div style={{ fontSize:10, color:'#006618', marginTop:8, letterSpacing:'.06em' }}>
            [←][→] NAVIGATE  [ENTER] ADD TO CALENDAR  [ESC] EXIT
          </div>
        </div>
      </div>
    </div>
  );
}

// ── VARIANT B: Brutalist ──────────────────────────────────────────────────────
// Raw thick borders, massive type, bold blocks, newspaper clipping feel
export function BrutalistVariant({ activities, weather, settings, onClose }) {
  const [activecat, setActiveCat] = useState(ALL_CATEGORIES[0].id);
  const acts = getActs(activities, activecat);
  const today = weather?.[0];
  const cat = ALL_CATEGORIES.find(c => c.id === activecat);

  return (
    <div style={{ position:'fixed', inset:0, background:'#f5f0e8', color:'#000', fontFamily:"'Arial Black', sans-serif", display:'flex', flexDirection:'column', zIndex:50, overflow:'hidden' }}>

      {/* Brutal header */}
      <div style={{ background:'#000', color:'#f5f0e8', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'4px solid #ff4500', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:24, fontWeight:900, letterSpacing:'-.02em', lineHeight:1 }}>LOCALE</div>
          <div style={{ fontSize:11, letterSpacing:'.15em', color:'rgba(255,255,255,.5)' }}>{settings?.city?.toUpperCase()}</div>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          {today && (
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:28, fontWeight:900, lineHeight:1 }}>{today.hi}°</div>
              <div style={{ fontSize:10, letterSpacing:'.1em', color:'rgba(255,255,255,.5)' }}>{today.desc?.toUpperCase()}</div>
            </div>
          )}
          <button onClick={onClose} style={{ background:'#ff4500', color:'#fff', border:'none', padding:'8px 16px', fontFamily:'inherit', fontSize:13, fontWeight:900, cursor:'pointer', letterSpacing:'.05em' }}>✕ CLOSE</button>
        </div>
      </div>

      {/* Category tabs — thick black */}
      <div style={{ display:'flex', borderBottom:'4px solid #000', flexShrink:0, overflowX:'auto' }} className="no-scroll">
        {ALL_CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} style={{
            padding:'10px 16px', border:'none', borderRight:'2px solid #000',
            background: c.id === activecat ? '#ff4500' : 'transparent',
            color: c.id === activecat ? '#fff' : '#000',
            fontFamily:'inherit', fontWeight:900, fontSize:11,
            letterSpacing:'.08em', cursor:'pointer', whiteSpace:'nowrap',
            textTransform:'uppercase', flexShrink:0,
          }}>{c.label}</button>
        ))}
      </div>

      {/* Cards — newspaper grid */}
      <div style={{ flex:1, overflowY:'auto', padding:'0', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))' }} className="no-scroll">
        {acts.map((act, i) => (
          <div key={act.title} style={{
            border:'2px solid #000', borderCollapse:'collapse',
            padding:'16px', margin:'-1px',
            background: i % 3 === 0 ? '#000' : i % 3 === 1 ? '#ff4500' : '#f5f0e8',
            color: i % 3 === 0 ? '#f5f0e8' : i % 3 === 1 ? '#fff' : '#000',
          }}>
            <div style={{ fontSize:9, fontWeight:900, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:6, opacity:.6 }}>{cat?.label}</div>
            <div style={{ fontSize:22, fontWeight:900, lineHeight:1.1, marginBottom:8, letterSpacing:'-.02em' }}>{act.title}</div>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:6, letterSpacing:'.04em', textTransform:'uppercase' }}>{act.when} · {act.cost}</div>
            <div style={{ fontSize:11, lineHeight:1.5, opacity:.7 }}>{act.where}</div>
            <div style={{ fontSize:11, lineHeight:1.5, marginTop:8, fontStyle:'italic' }}>{act.why}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── VARIANT C: Neon / Club ────────────────────────────────────────────────────
// Dark with vivid neon glows, club-poster energy
export function NeonVariant({ activities, weather, settings, onClose }) {
  const [activecat, setActiveCat] = useState('music');
  const acts = getActs(activities, activecat);
  const today = weather?.[0];

  const NEON_COLORS = {
    outdoors:'#00ff88', food:'#ff6b35', arts:'#b44fff',
    music:'#ff00ff', sports:'#00d4ff', miss:'#ffff00',
    trips:'#00ffcc', nerdy:'#ff4488', away:'#aa44ff',
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'#04040c', color:'#fff', fontFamily:"'DM Sans', sans-serif", display:'flex', flexDirection:'column', zIndex:50, overflow:'hidden' }}>

      {/* Neon header */}
      <div style={{ padding:'14px 22px', borderBottom:'1px solid rgba(255,0,255,.2)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
        <div style={{ fontSize:26, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', animation:'neon-pulse 2s ease-in-out infinite' }}>
          LOCALE
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          {today && <span style={{ fontSize:13, color:'#ff00ff', fontWeight:500 }}>◈ {today.hi}° {today.desc}</span>}
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid rgba(255,0,255,.4)', color:'#ff00ff', padding:'5px 14px', cursor:'pointer', fontFamily:'inherit', fontSize:12, borderRadius:4, letterSpacing:'.08em' }}>✕</button>
        </div>
      </div>

      {/* Category pills — neon glow */}
      <div style={{ display:'flex', gap:6, padding:'10px 22px', overflowX:'auto', flexShrink:0 }} className="no-scroll">
        {ALL_CATEGORIES.map(c => {
          const neon = NEON_COLORS[c.id] || '#ff00ff';
          const active = c.id === activecat;
          return (
            <button key={c.id} onClick={() => setActiveCat(c.id)} style={{
              padding:'6px 14px', borderRadius:4, border:`1px solid ${active ? neon : 'rgba(255,255,255,.1)'}`,
              background: active ? `${neon}22` : 'transparent',
              color: active ? neon : 'rgba(255,255,255,.4)',
              fontFamily:'inherit', fontWeight:600, fontSize:11, cursor:'pointer',
              letterSpacing:'.06em', textTransform:'uppercase', whiteSpace:'nowrap',
              boxShadow: active ? `0 0 12px ${neon}66, inset 0 0 8px ${neon}11` : 'none',
              transition:'all .15s', flexShrink:0,
            }}>{c.icon} {c.label}</button>
          );
        })}
      </div>

      {/* Cards */}
      <div style={{ flex:1, overflowY:'auto', padding:'8px 22px', display:'flex', flexDirection:'column', gap:10 }} className="no-scroll">
        {acts.map(act => {
          const neon = NEON_COLORS[activecat] || '#ff00ff';
          return (
            <div key={act.title} style={{
              background:'#0d0d1a', border:`1px solid ${neon}33`,
              borderRadius:8, padding:'14px 16px',
              boxShadow:`0 0 20px ${neon}11, inset 0 0 30px rgba(0,0,0,.5)`,
              transition:'all .2s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow=`0 0 30px ${neon}44, inset 0 0 20px ${neon}08`}
              onMouseLeave={e => e.currentTarget.style.boxShadow=`0 0 20px ${neon}11, inset 0 0 30px rgba(0,0,0,.5)`}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div style={{ fontSize:16, fontWeight:700, color:'#fff', lineHeight:1.2, flex:1 }}>{act.title}</div>
                <div style={{ fontSize:13, color:neon, fontWeight:700, flexShrink:0, marginLeft:12 }}>{act.cost}</div>
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:6, letterSpacing:'.03em' }}>
                {act.when} · {act.where}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', fontStyle:'italic', lineHeight:1.5 }}>{act.why}</div>
              {act.tags?.length > 0 && (
                <div style={{ display:'flex', gap:4, marginTop:8, flexWrap:'wrap' }}>
                  {act.tags.map(t => (
                    <span key={t} style={{ fontSize:10, padding:'2px 7px', borderRadius:3, background:`${neon}15`, color:neon, border:`1px solid ${neon}30`, letterSpacing:'.05em' }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── VARIANT D: Magazine / Editorial ──────────────────────────────────────────
// Rich editorial layout, large photos/emojis, magazine spread feel
export function MagazineVariant({ activities, weather, settings, onClose }) {
  const [page, setPage] = useState(0);
  const today = weather?.[0];
  const sat   = weather?.[1];

  // Build editorial "story" — hero + supporting items
  const heroActs  = ALL_CATEGORIES.flatMap(cat => getActs(activities, cat.id).slice(0,1).map(a => ({ ...a, cat })));
  const hero      = heroActs[page % heroActs.length];
  const supporting = heroActs.filter((_, i) => i !== page % heroActs.length).slice(0, 4);

  const COVER_GRADIENTS = [
    'linear-gradient(135deg, #1a0533 0%, #3d0066 50%, #1a0033 100%)',
    'linear-gradient(135deg, #001a33 0%, #003366 50%, #001a4d 100%)',
    'linear-gradient(135deg, #1a1a00 0%, #4d3300 50%, #1a0d00 100%)',
    'linear-gradient(135deg, #001a1a 0%, #004d33 50%, #001a0d 100%)',
  ];

  return (
    <div style={{ position:'fixed', inset:0, background:'#0f0d0b', color:'#fff', fontFamily:"'DM Sans', sans-serif", display:'flex', flexDirection:'column', zIndex:50 }}>

      {/* Magazine masthead */}
      <div style={{ padding:'10px 22px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'0.5px solid rgba(255,255,255,.1)', flexShrink:0 }}>
        <div>
          <span style={{ fontFamily:'Cormorant Garamond, serif', fontSize:22, fontWeight:300, letterSpacing:'.2em', color:'#C9A84C' }}>LOCALE</span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginLeft:12, letterSpacing:'.1em', textTransform:'uppercase' }}>Weekend Edition</span>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          {sat && <span style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>Sat {sat.hi}° {sat.icon}</span>}
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.07)', border:'0.5px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.6)', padding:'5px 12px', cursor:'pointer', fontFamily:'inherit', fontSize:11, borderRadius:6 }}>✕</button>
        </div>
      </div>

      <div style={{ flex:1, overflow:'hidden', display:'grid', gridTemplateRows:'1fr auto' }}>

        {/* Hero story */}
        {hero && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', overflow:'hidden' }}>
            {/* Left: visual */}
            <div style={{ background: COVER_GRADIENTS[page % COVER_GRADIENTS.length], display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, padding:32 }}>
              <div style={{ fontSize:80 }}>{hero.cat?.icon}</div>
              <div style={{ fontSize:11, letterSpacing:'.2em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', textAlign:'center' }}>{hero.cat?.label}</div>
            </div>

            {/* Right: story */}
            <div style={{ padding:'28px 26px', display:'flex', flexDirection:'column', justifyContent:'center', borderLeft:'0.5px solid rgba(255,255,255,.08)', overflowY:'auto' }} className="no-scroll">
              {hero.expires && (
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#C9A84C', marginBottom:10 }}>⚡ Expiring this weekend</div>
              )}
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:28, fontWeight:400, lineHeight:1.15, color:'#fff', marginBottom:12 }}>{hero.title}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:10, letterSpacing:'.03em' }}>
                {hero.when} · {hero.where}
              </div>
              <div style={{ fontSize:14, color:'rgba(255,255,255,.7)', lineHeight:1.7, fontStyle:'italic', marginBottom:16 }}>{hero.why}</div>
              <div style={{ fontSize:13, fontWeight:600, color:'#C9A84C' }}>{hero.cost}</div>
            </div>
          </div>
        )}

        {/* Supporting stories strip */}
        <div style={{ borderTop:'0.5px solid rgba(255,255,255,.08)', display:'grid', gridTemplateColumns:'repeat(4, 1fr)', flexShrink:0 }}>
          {supporting.map((act, i) => (
            <div key={act.title} onClick={() => setPage(heroActs.findIndex(a => a.title === act.title))} style={{
              padding:'12px 14px', borderRight: i < 3 ? '0.5px solid rgba(255,255,255,.07)' : 'none',
              cursor:'pointer', transition:'background .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.04)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
            >
              <div style={{ fontSize:16, marginBottom:5 }}>{act.cat?.icon}</div>
              <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,.8)', lineHeight:1.2, marginBottom:3 }}>{act.title}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>{act.when} · {act.cost}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
