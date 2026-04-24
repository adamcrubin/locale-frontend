// ── FilterSheet.jsx ──────────────────────────────────────────────────────
// Unified filter sheet used by both mobile header button and desktop top-bar
// Filter button. Time + Price multi-select chip rows, plus a row that opens
// a sub-sheet with the 20 Always / Sometimes / Never category toggles.
//
// Live-applies filters (no Apply button). Mobile renders as a bottom sheet;
// desktop renders centered.

import { useState } from 'react';
import { ALL_CATEGORIES } from '../data/content';
import { useIsMobile } from './ActiveMode/useIsMobile';

const TIME_OPTIONS = [
  { id:'morning', label:'🌅 Morning' },
  { id:'midday',  label:'☀ Midday'   },
  { id:'night',   label:'🌙 Evening' },
];
const PRICE_OPTIONS = [
  { id:'free', label:'Free' },
  { id:'$',    label:'$'    },
  { id:'$$',   label:'$$'   },
  { id:'$$$',  label:'$$$'  },
];

function MultiChips({ value, options, onChange, anyLabel }) {
  const isAny = !value?.length;
  const toggle = (id) => {
    const set = new Set(value || []);
    if (set.has(id)) set.delete(id); else set.add(id);
    onChange(Array.from(set));
  };
  const chipStyle = (active) => ({
    padding: '7px 13px', fontSize: 12, cursor: 'pointer', borderRadius: 99,
    border: '0.5px solid ' + (active ? 'rgba(201,168,76,.55)' : 'rgba(255,255,255,.15)'),
    background: active ? 'rgba(201,168,76,.18)' : 'rgba(255,255,255,.04)',
    color:      active ? '#C9A84C'              : 'rgba(255,255,255,.65)',
    fontWeight: active ? 600 : 400,
    fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap', minHeight: 40, minWidth: 44,
  });
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
      <button onClick={() => onChange([])} style={chipStyle(isAny)}>{anyLabel}</button>
      {options.map(o => (
        <button key={o.id} onClick={() => toggle(o.id)}
          style={chipStyle(!isAny && value.includes(o.id))}>{o.label}</button>
      ))}
    </div>
  );
}

// Reused inside the category sub-sheet — mirrors the row in the profile editor.
function CatStateRow({ cat, state, onChange }) {
  const states = ['never','sometimes','always'];
  const labels = { never:'Never', sometimes:'Sometimes', always:'Always' };
  const colors = { never:'rgba(255,255,255,.2)', sometimes:'rgba(201,168,76,.4)', always:'#1D9E75' };
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'8px 4px', borderBottom:'0.5px solid rgba(255,255,255,.06)',
      fontSize:12, color:'rgba(255,255,255,.7)',
    }}>
      <span>{cat.icon} {cat.label}</span>
      <div style={{ display:'flex', gap:4 }}>
        {states.map(s => (
          <button key={s} onClick={() => onChange(s)} style={{
            fontSize:10, padding:'3px 10px', borderRadius:99, cursor:'pointer',
            fontFamily:'DM Sans, sans-serif', minHeight:28,
            background: state === s ? colors[s] : 'rgba(255,255,255,.05)',
            color: state === s ? 'white' : 'rgba(255,255,255,.35)',
            border: `0.5px solid ${state===s ? colors[s] : 'rgba(255,255,255,.1)'}`,
            fontWeight: state===s ? 500 : 400,
          }}>{labels[s]}</button>
        ))}
      </div>
    </div>
  );
}

export default function FilterSheet({
  open, onClose,
  timeFilters, setTimeFilters,
  priceFilters, setPriceFilters,
  activeProfile, updateProfile,
}) {
  const isMobile = useIsMobile();
  const [catsOpen, setCatsOpen] = useState(false);
  if (!open) return null;
  const activeCount = (timeFilters?.length || 0) + (priceFilters?.length || 0);

  const catStates = activeProfile?.categoryStates || {};
  const setCatState = (catId, state) => {
    if (!updateProfile || !activeProfile) return;
    updateProfile(activeProfile.id, { categoryStates: { ...catStates, [catId]: state } });
  };

  const sheetStyleMobile = {
    position:'fixed', left:0, right:0, bottom:0, zIndex:61,
    background:'#1C1A17', borderTop:'0.5px solid rgba(255,255,255,.1)',
    borderRadius:'18px 18px 0 0',
    padding:'14px 16px calc(22px + env(safe-area-inset-bottom))',
    maxHeight: '80vh', overflowY: 'auto',
    animation: 'fadeIn 180ms ease both', fontFamily:'DM Sans, sans-serif',
  };
  const sheetStyleDesktop = {
    position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:61,
    background:'#1C1A17', border:'0.5px solid rgba(255,255,255,.12)',
    borderRadius:14, width: 420, maxWidth:'calc(100vw - 40px)',
    padding:'16px 18px 18px', maxHeight:'80vh', overflowY:'auto',
    animation: 'scaleIn 180ms ease both', fontFamily:'DM Sans, sans-serif',
    boxShadow: '0 18px 60px rgba(0,0,0,.55)',
  };

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,.55)',
        animation: 'fadeIn 160ms ease both',
      }} />
      <div style={isMobile ? sheetStyleMobile : sheetStyleDesktop}>
        {isMobile && (
          <div onClick={onClose} style={{
            width:40, height:4, borderRadius:2, background:'rgba(255,255,255,.2)',
            margin:'0 auto 12px',
          }} />
        )}

        {!catsOpen ? (
          // ── Main filter panel ──
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ fontSize:15, fontWeight:600, color:'rgba(255,255,255,.9)' }}>
                Filters{activeCount > 0 ? ` · ${activeCount}` : ''}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {activeCount > 0 && (
                  <button onClick={() => { setTimeFilters([]); setPriceFilters([]); }}
                    style={{ fontSize:11, padding:'4px 10px', borderRadius:7, cursor:'pointer',
                      background:'transparent', border:'0.5px solid rgba(255,255,255,.12)',
                      color:'rgba(255,255,255,.45)', fontFamily:'DM Sans, sans-serif' }}>Clear all</button>
                )}
                <button onClick={onClose} style={{
                  fontSize:11, padding:'4px 12px', borderRadius:7, cursor:'pointer',
                  background:'rgba(201,168,76,.2)', border:'0.5px solid rgba(201,168,76,.35)',
                  color:'#C9A84C', fontWeight:600, fontFamily:'DM Sans, sans-serif',
                }}>Done</button>
              </div>
            </div>

            <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:7 }}>
              Time of day
            </div>
            <MultiChips value={timeFilters} options={TIME_OPTIONS} onChange={setTimeFilters} anyLabel="Any" />

            <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.08em', margin:'14px 0 7px' }}>
              Price
            </div>
            <MultiChips value={priceFilters} options={PRICE_OPTIONS} onChange={setPriceFilters} anyLabel="Any" />

            {activeProfile && updateProfile && (
              <>
                <div style={{ borderTop:'0.5px solid rgba(255,255,255,.08)', margin:'16px 0 12px' }} />
                <button onClick={() => setCatsOpen(true)} style={{
                  width:'100%', padding:'10px 12px', borderRadius:9,
                  background:'rgba(255,255,255,.04)', border:'0.5px solid rgba(255,255,255,.1)',
                  color:'rgba(255,255,255,.75)', fontSize:12,
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  fontFamily:'DM Sans, sans-serif', cursor:'pointer', minHeight:44,
                }}>
                  <span>⚙  Manage categories</span>
                  <span style={{ color:'rgba(255,255,255,.35)' }}>→</span>
                </button>
              </>
            )}
          </>
        ) : (
          // ── Category sub-sheet ──
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <button onClick={() => setCatsOpen(false)} style={{
                fontSize:11, padding:'4px 10px', borderRadius:7, cursor:'pointer',
                background:'rgba(255,255,255,.06)', border:'0.5px solid rgba(255,255,255,.1)',
                color:'rgba(255,255,255,.5)', fontFamily:'DM Sans, sans-serif',
              }}>← Back</button>
              <div style={{ fontSize:15, fontWeight:600, color:'rgba(255,255,255,.9)' }}>
                Manage categories
              </div>
              <div style={{ width: 60 }} />
            </div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginBottom:8, lineHeight:1.5 }}>
              Choose which columns appear in your feed. Changes save to your current profile.
            </div>
            <div>
              {ALL_CATEGORIES.filter(cat => cat.id !== 'curated').map(cat => (
                <CatStateRow
                  key={cat.id} cat={cat}
                  state={catStates[cat.id] || 'always'}
                  onChange={state => setCatState(cat.id, state)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
