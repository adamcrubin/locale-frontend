import { ALL_CATEGORIES } from '../data/content';

export default function SavedPage({ savedItems, onCalendar, onRemove, onClose }) {
  const grouped = savedItems.reduce((acc, item) => {
    const k = item.catId || 'other';
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});

  return (
    <div className="fade-enter" style={{
      position:'fixed', inset:0, background:'#141210',
      zIndex:60, display:'flex', flexDirection:'column',
    }}>
      <div style={{
        background:'#1C1A17', borderBottom:'0.5px solid rgba(255,255,255,.07)',
        padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
      }}>
        <span className="serif" style={{ fontSize:20, color:'rgba(255,255,255,.9)', fontWeight:300 }}>Saved</span>
        <button onClick={onClose} style={{
          background:'rgba(255,255,255,.07)', border:'0.5px solid rgba(255,255,255,.12)',
          borderRadius:8, padding:'5px 14px', fontSize:12, cursor:'pointer',
          fontFamily:'DM Sans, sans-serif', color:'rgba(255,255,255,.55)',
        }}>← Back</button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }} className="no-scroll">
        {savedItems.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:'rgba(255,255,255,.3)' }}>
            <div style={{ fontSize:48, marginBottom:14 }}>🤍</div>
            <div className="serif" style={{ fontSize:20, fontWeight:300, marginBottom:8 }}>Nothing saved yet</div>
            <div style={{ fontSize:13, lineHeight:1.6 }}>
              Tap ♥ on any activity to save it here.<br />
              Saved items stay across sessions.
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
            {Object.entries(grouped).map(([catId, items]) => {
              const cat = ALL_CATEGORIES.find(c => c.id === catId);
              return items.map(item => (
                <div key={item.title} style={{
                  background:'rgba(255,255,255,.04)', border:'0.5px solid rgba(255,255,255,.08)',
                  borderRadius:12, overflow:'hidden',
                }}>
                  {cat && (
                    <div className={cat.cls} style={{ padding:'8px 14px', display:'flex', alignItems:'center', gap:7 }}>
                      <span style={{ fontSize:14 }}>{cat.icon}</span>
                      <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase' }}>{cat.label}</span>
                    </div>
                  )}
                  <div style={{ padding:'12px 14px' }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,.88)', marginBottom:4 }}>{item.title}</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.45)', marginBottom:5 }}>{item.when} · {item.where} · {item.cost}</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.32)', fontStyle:'italic', lineHeight:1.5, marginBottom:10 }}>{item.why}</div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => onCalendar(item)} style={{
                        fontSize:11, padding:'5px 12px', borderRadius:99,
                        background:'rgba(26,99,50,.3)', color:'#6EE7A0',
                        border:'0.5px solid rgba(110,231,160,.2)', cursor:'pointer', fontFamily:'DM Sans, sans-serif',
                      }}>📅 Calendar</button>
                      {item.reservable && (
                        <button style={{
                          fontSize:11, padding:'5px 12px', borderRadius:99,
                          background:'rgba(29,78,216,.25)', color:'#93C5FD',
                          border:'0.5px solid rgba(147,197,253,.2)', cursor:'pointer', fontFamily:'DM Sans, sans-serif',
                        }}>🎟 Reserve</button>
                      )}
                      <button onClick={() => onRemove(item)} style={{
                        fontSize:11, padding:'5px 12px', borderRadius:99,
                        background:'transparent', color:'rgba(255,255,255,.3)',
                        border:'0.5px solid rgba(255,255,255,.1)', cursor:'pointer', fontFamily:'DM Sans, sans-serif',
                        marginLeft:'auto',
                      }}>Remove</button>
                    </div>
                  </div>
                </div>
              ));
            })}
          </div>
        )}
      </div>
    </div>
  );
}
