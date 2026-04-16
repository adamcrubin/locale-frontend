export default function PostEventFeedback({ prompt, onRespond }) {
  if (!prompt) return null;

  const responses = [
    { key:'loved', icon:'🔥', label:'Loved it',  bg:'rgba(201,168,76,.2)',  border:'rgba(201,168,76,.4)',  color:'#C9A84C' },
    { key:'ok',    icon:'👍', label:'It was ok', bg:'rgba(26,99,50,.2)',    border:'rgba(110,231,160,.3)', color:'#6EE7A0' },
    { key:'meh',   icon:'👎', label:'Meh',       bg:'rgba(159,18,57,.15)',  border:'rgba(253,164,175,.25)',color:'#FDA4AF' },
  ];

  return (
    <div style={{
      position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
      zIndex:80, width:'calc(100% - 32px)', maxWidth:380,
      background:'#1C1A17', border:'0.5px solid rgba(255,255,255,.12)',
      borderRadius:14, padding:'14px 16px',
      boxShadow:'0 8px 32px rgba(0,0,0,.5)',
      animation:'sheetUp 300ms cubic-bezier(.4,0,.2,1) both',
      fontFamily:'DM Sans, sans-serif',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <div style={{ fontSize:10, color:'#C9A84C', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:4 }}>
            How was it?
          </div>
          <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,.9)', lineHeight:1.2 }}>
            {prompt.title}
          </div>
        </div>
        <button onClick={() => onRespond('skip')} style={{
          background:'none', border:'none', color:'rgba(255,255,255,.25)',
          cursor:'pointer', fontSize:14, padding:'2px 4px', lineHeight:1,
        }}>✕</button>
      </div>

      <div style={{ display:'flex', gap:6 }}>
        {responses.map(r => (
          <button key={r.key} onClick={() => onRespond(r.key)} style={{
            flex:1, padding:'9px 6px', borderRadius:10, cursor:'pointer',
            background:r.bg, border:`0.5px solid ${r.border}`,
            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            fontFamily:'DM Sans, sans-serif', transition:'all .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity='.85'}
            onMouseLeave={e => e.currentTarget.style.opacity='1'}
          >
            <span style={{ fontSize:18 }}>{r.icon}</span>
            <span style={{ fontSize:11, color:r.color, fontWeight:600 }}>{r.label}</span>
          </button>
        ))}
      </div>

      <div style={{ fontSize:10, color:'rgba(255,255,255,.2)', textAlign:'center', marginTop:9 }}>
        Your feedback improves future recommendations
      </div>
    </div>
  );
}
