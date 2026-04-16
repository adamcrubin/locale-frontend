import { useState } from 'react';
import { TerminalVariant, BrutalistVariant, NeonVariant, MagazineVariant } from './variants/ActiveVariants';

const VARIANTS = [
  { id:'default',   label:'Default',   emoji:'🏠', desc:'Warm editorial' },
  { id:'terminal',  label:'Terminal',  emoji:'💻', desc:'Hacker green' },
  { id:'brutalist', label:'Brutalist', emoji:'🔲', desc:'Raw & bold' },
  { id:'neon',      label:'Neon',      emoji:'🌈', desc:'Club energy' },
  { id:'magazine',  label:'Magazine',  emoji:'📰', desc:'Editorial spread' },
];

export function useVariant() {
  const [variantId, setVariantId] = useState(() => {
    try { return localStorage.getItem('locale-variant') || 'default'; } catch { return 'default'; }
  });

  const setVariant = (id) => {
    setVariantId(id);
    try { localStorage.setItem('locale-variant', id); } catch {}
    document.documentElement.setAttribute('data-variant', id === 'default' ? '' : id);
  };

  return { variantId, setVariant, variants: VARIANTS };
}

export function VariantSwitcher({ variantId, setVariant, activities, weather, settings }) {
  const [open,      setOpen]      = useState(false);
  const [previewing, setPreviewing] = useState(null);

  const current = VARIANTS.find(v => v.id === variantId) || VARIANTS[0];

  const handlePreview = (variant) => {
    if (variant.id === 'default') { setPreviewing(null); return; }
    setPreviewing(variant.id);
  };

  const handleSelect = (variant) => {
    setVariant(variant.id);
    setOpen(false);
    setPreviewing(null);
  };

  const Props = { activities, weather, settings, onClose: () => setPreviewing(null) };

  return (
    <>
      {/* Preview overlays */}
      {previewing === 'terminal'  && <TerminalVariant  {...Props} />}
      {previewing === 'brutalist' && <BrutalistVariant {...Props} />}
      {previewing === 'neon'      && <NeonVariant      {...Props} />}
      {previewing === 'magazine'  && <MagazineVariant  {...Props} />}

      {/* Floating switcher button */}
      <div style={{ position:'fixed', bottom:60, right:16, zIndex:40 }}>
        {open && (
          <div style={{
            position:'absolute', bottom:'100%', right:0, marginBottom:8,
            background:'#1C1A17', border:'0.5px solid rgba(255,255,255,.15)',
            borderRadius:12, padding:8, width:200,
            boxShadow:'0 8px 32px rgba(0,0,0,.4)',
            animation:'scaleIn 200ms cubic-bezier(.34,1.56,.64,1) both',
          }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', padding:'4px 8px 8px' }}>UI Variant</div>
            {VARIANTS.map(v => (
              <div key={v.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:8, cursor:'pointer', transition:'background .1s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.07)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <span style={{ fontSize:16 }}>{v.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500, color: v.id === variantId ? '#C9A84C' : 'rgba(255,255,255,.8)' }}>{v.label}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>{v.desc}</div>
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  <button onClick={() => handlePreview(v)} style={{
                    fontSize:9, padding:'2px 6px', borderRadius:4,
                    background:'rgba(255,255,255,.08)', border:'0.5px solid rgba(255,255,255,.12)',
                    color:'rgba(255,255,255,.5)', cursor:'pointer', fontFamily:'DM Sans, sans-serif',
                  }}>preview</button>
                  <button onClick={() => handleSelect(v)} style={{
                    fontSize:9, padding:'2px 6px', borderRadius:4,
                    background: v.id === variantId ? 'rgba(201,168,76,.2)' : 'rgba(255,255,255,.08)',
                    border: v.id === variantId ? '0.5px solid rgba(201,168,76,.3)' : '0.5px solid rgba(255,255,255,.12)',
                    color: v.id === variantId ? '#C9A84C' : 'rgba(255,255,255,.5)',
                    cursor:'pointer', fontFamily:'DM Sans, sans-serif',
                  }}>{v.id === variantId ? '✓' : 'use'}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width:40, height:40, borderRadius:'50%',
            background:'#1C1A17', border:'0.5px solid rgba(255,255,255,.2)',
            color:'rgba(255,255,255,.7)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:16, boxShadow:'0 4px 16px rgba(0,0,0,.4)',
            transition:'all .15s',
          }}
          title="Switch UI variant"
        >
          {current.emoji}
        </button>
      </div>

      {/* Close overlay when open */}
      {open && <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:39 }} />}
    </>
  );
}
