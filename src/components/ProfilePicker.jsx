import { PROFILE_COLORS } from '../data/content';

export default function ProfilePicker({ profiles, activeId, onSelect, onClose }) {
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
          width:'100%', maxWidth:480,
          padding:'20px 24px 32px',
        }}
      >
        {/* Handle */}
        <div style={{ width:36, height:4, borderRadius:99, background:'rgba(255,255,255,.2)', margin:'0 auto 20px' }} />

        <div className="serif" style={{ fontSize:18, color:'rgba(255,255,255,.85)', fontWeight:300, marginBottom:6, textAlign:'center' }}>
          Who's planning?
        </div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.35)', textAlign:'center', marginBottom:20 }}>
          Activities will be tailored to your preferences
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {profiles.map(p => {
            const color = PROFILE_COLORS.find(c => c.id === p.colorId) || PROFILE_COLORS[0];
            const isActive = p.id === activeId;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                style={{
                  display:'flex', alignItems:'center', gap:14,
                  padding:'12px 16px', borderRadius:12,
                  background: isActive ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.03)',
                  border: `0.5px solid ${isActive ? color.border : 'rgba(255,255,255,.08)'}`,
                  cursor:'pointer', fontFamily:'DM Sans, sans-serif',
                  transition:'all .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.08)'}
                onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.03)'}
              >
                {/* Avatar */}
                <div style={{
                  width:40, height:40, borderRadius:'50%',
                  background: color.hex,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:16, fontWeight:600, color:'white',
                  flexShrink:0,
                }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1, textAlign:'left' }}>
                  <div style={{ fontSize:15, fontWeight:500, color:'rgba(255,255,255,.85)' }}>{p.name}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:1 }}>
                    {p.prefs?.slice(0,3).join(' · ') || 'No preferences set'}
                  </div>
                </div>
                {isActive && (
                  <div style={{
                    fontSize:11, padding:'2px 9px', borderRadius:99,
                    background: color.border, color: color.light,
                    fontWeight:500, flexShrink:0,
                  }}>Active</div>
                )}
              </button>
            );
          })}
        </div>

        <button onClick={onClose} style={{
          width:'100%', marginTop:16, padding:'10px',
          background:'transparent', border:'0.5px solid rgba(255,255,255,.12)',
          borderRadius:10, fontSize:13, color:'rgba(255,255,255,.4)',
          cursor:'pointer', fontFamily:'DM Sans, sans-serif',
        }}>Continue as {profiles.find(p=>p.id===activeId)?.name || 'current profile'}</button>
      </div>
    </div>
  );
}
