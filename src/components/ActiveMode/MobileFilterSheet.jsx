// ── MobileFilterSheet.jsx ────────────────────────────────────────────────
// Bottom sheet with time + price multi-select chip rows. Selections apply
// live — "Done" just closes the sheet. Tapping outside / swiping down also
// dismisses. Each row has an "Any" reset chip; tapping Any clears that row.

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
    fontFamily: 'DM Sans, sans-serif',
    whiteSpace: 'nowrap', minHeight: 40, minWidth: 44,
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

export default function MobileFilterSheet({
  open, onClose,
  timeFilters, setTimeFilters,
  priceFilters, setPriceFilters,
}) {
  if (!open) return null;
  const activeCount = (timeFilters?.length || 0) + (priceFilters?.length || 0);

  return (
    <>
      {/* Backdrop — tap to dismiss */}
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,.45)',
        animation: 'fadeIn 160ms ease both',
      }} />
      {/* Sheet */}
      <div style={{
        position:'fixed', left:0, right:0, bottom:0, zIndex:61,
        background:'#1C1A17', borderTop:'0.5px solid rgba(255,255,255,.1)',
        borderRadius:'18px 18px 0 0',
        padding:'14px 16px calc(22px + env(safe-area-inset-bottom))',
        animation: 'fadeIn 180ms ease both',
        fontFamily:'DM Sans, sans-serif',
      }}>
        {/* Grabber */}
        <div onClick={onClose} style={{
          width:40, height:4, borderRadius:2, background:'rgba(255,255,255,.2)',
          margin:'0 auto 12px',
        }} />
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
      </div>
    </>
  );
}
