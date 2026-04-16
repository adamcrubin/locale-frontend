import { ALL_CATEGORIES } from '../data/content';

export default function SavedPanel({ savedItems, onCalendar, onRemove, onClose }) {
  const grouped = savedItems.reduce((acc, item) => {
    const k = item.catId || 'other';
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});

  return (
    <div style={{
      position:'fixed', inset:0,
      background:'rgba(0,0,0,.5)',
      zIndex:70,
      display:'flex', alignItems:'flex-end', justifyContent:'center',
    }} onClick={onClose}>
      <div
        className="sheet-enter"
        onClick={e => e.stopPropagation()}
        style={{
          background:'#1C1A17',
          borderRadius:'16px 16px 0 0',
          border:'0.5px solid rgba(255,255,255,.1)',
          width:'100%', maxWidth:600,
          maxHeight:'80vh',
          display:'flex', flexDirection:'column',
        }}
      >
        {/* Handle + header */}
        <div style={{ padding:'14px 20px 10px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:99, background:'rgba(255,255,255,.2)', margin:'0 auto 16px' }} />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span className="serif" style={{ fontSize:18, color:'rgba(255,255,255,.85)', fontWeight:300 }}>
              Saved
            </span>
            <button onClick={onClose} style={{
              background:'rgba(255,255,255,.07)', border:'0.5px solid rgba(255,255,255,.1)',
              borderRadius:8, padding:'4px 12px', fontSize:12, cursor:'pointer',
              fontFamily:'DM Sans, sans-serif', color:'rgba(255,255,255,.5)',
            }}>Done</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding:'0 20px 24px' }} className="no-scroll">
          {savedItems.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,.3)', fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🔖</div>
              Tap 👍 on any activity to save it here
            </div>
          ) : (
            Object.entries(grouped).map(([catId, items]) => {
              const cat = ALL_CATEGORIES.find(c => c.id === catId);
              return (
                <div key={catId} style={{ marginBottom:16 }}>
                  {cat && (
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                      <span style={{ fontSize:14 }}>{cat.icon}</span>
                      <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'rgba(255,255,255,.4)' }}>
                        {cat.label}
                      </span>
                    </div>
                  )}
                  {items.map(item => (
                    <div key={item.title} style={{
                      background:'rgba(255,255,255,.04)', border:'0.5px solid rgba(255,255,255,.08)',
                      borderRadius:10, padding:'11px 13px', marginBottom:7,
                    }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,.85)', marginBottom:3 }}>{item.title}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginBottom:4 }}>
                        {item.when} · {item.where} · {item.cost}
                      </div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontStyle:'italic', marginBottom:7, lineHeight:1.5 }}>
                        {item.why}
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => onCalendar(item)} style={{
                          fontSize:11, padding:'4px 11px', borderRadius:99,
                          background:'rgba(26,99,50,.3)', color:'#6EE7A0',
                          border:'0.5px solid rgba(110,231,160,.2)', cursor:'pointer', fontFamily:'DM Sans, sans-serif',
                        }}>📅 Add to calendar</button>
                        {item.reservable && (
                          <button style={{
                            fontSize:11, padding:'4px 11px', borderRadius:99,
                            background:'rgba(29,78,216,.25)', color:'#93C5FD',
                            border:'0.5px solid rgba(147,197,253,.2)', cursor:'pointer', fontFamily:'DM Sans, sans-serif',
                          }}>🎟 Reserve</button>
                        )}
                        <button onClick={() => onRemove(item)} style={{
                          fontSize:11, padding:'4px 11px', borderRadius:99,
                          background:'transparent', color:'rgba(255,255,255,.3)',
                          border:'0.5px solid rgba(255,255,255,.1)', cursor:'pointer', fontFamily:'DM Sans, sans-serif',
                        }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
