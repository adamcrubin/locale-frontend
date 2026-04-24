import { useState, useRef, useEffect } from 'react';

export default function AskClaude({ settings, activeProfile, onClose }) {
  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const inputRef = useRef(null);

  useEffect(()=>{ inputRef.current?.focus(); },[]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const res  = await fetch(`${BASE}/ask`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          city:     settings?.city || 'Falls Church, VA',
          profile:  activeProfile ? {
            id:      activeProfile.id,
            prefs:   activeProfile.prefs || [],
            aboutMe: (activeProfile.aboutMe || '').slice(0, 200),
          } : null,
        }),
      });
      const json = await res.json();
      const data = json.data;
      const parts = [];
      if (data?.intro) parts.push(data.intro);
      if (data?.items?.length) {
        parts.push('');
        data.items.forEach(i => {
          const label = [i.time, i.title].filter(Boolean).join(' -- ');
          parts.push(`${i.icon ? i.icon + ' ' : ''}${label}${i.detail ? '\n' + i.detail : ''}`);
        });
      }
      if (data?.note) parts.push('\n💡 ' + data.note);
      setMessages(m => [...m, { role: 'claude', text: parts.join('\n') }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'claude', text: "Sorry, couldn't connect right now. Try again?" }]);
    }
    setLoading(false);
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:70,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 0 0 0'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'#1C1A17',width:'100%',maxWidth:560,
        borderRadius:'16px 16px 0 0',border:'0.5px solid rgba(255,255,255,.12)',
        display:'flex',flexDirection:'column',maxHeight:'70vh',
        animation:'sheetUp 300ms cubic-bezier(.4,0,.2,1) both',
      }}>
        <div style={{padding:'14px 18px',borderBottom:'0.5px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontSize:11,color:'#C9A84C',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:2}}>🎤 Ask Claude</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.4)'}}>Ask anything about this weekend in {settings?.city||'DC'}</div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.12)',borderRadius:8,padding:'5px 12px',fontSize:12,cursor:'pointer',fontFamily:'DM Sans,sans-serif',color:'rgba(255,255,255,.55)'}}>✕</button>
        </div>
        <div style={{padding:'7px 18px',background:'rgba(201,168,76,.06)',borderBottom:'0.5px solid rgba(201,168,76,.12)',flexShrink:0}}>
          <span style={{fontSize:10,color:'rgba(201,168,76,.6)',letterSpacing:'.04em'}}>⚠️ Experimental — answers are general and may not reflect current event listings</span>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'14px 18px',display:'flex',flexDirection:'column',gap:10}} className="no-scroll">
          {messages.length === 0 && (
            <div style={{fontSize:12,color:'rgba(255,255,255,.3)',fontStyle:'italic',textAlign:'center',paddingTop:20}}>
              Ask me anything -- "good dog-friendly hikes?", "best brunch near Georgetown?", "what should we do Sunday afternoon?"
            </div>
          )}
          {messages.map((m,i)=>(
            <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
              <div style={{
                maxWidth:'85%',padding:'9px 13px',borderRadius:10,fontSize:12,lineHeight:1.6,
                background:m.role==='user'?'rgba(201,168,76,.2)':'rgba(255,255,255,.07)',
                border:`0.5px solid ${m.role==='user'?'rgba(201,168,76,.3)':'rgba(255,255,255,.08)'}`,
                color:m.role==='user'?'#C9A84C':'rgba(255,255,255,.8)',
                whiteSpace:'pre-wrap',
              }}>{m.text}</div>
            </div>
          ))}
          {loading&&(
            <div style={{display:'flex',justifyContent:'flex-start'}}>
              <div style={{padding:'9px 13px',borderRadius:10,background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.08)',fontSize:12,color:'rgba(255,255,255,.4)',fontStyle:'italic'}}>Thinking...</div>
            </div>
          )}
        </div>

        <div style={{padding:'12px 18px',borderTop:'0.5px solid rgba(255,255,255,.08)',display:'flex',gap:8,flexShrink:0}}>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder="Ask about this weekend..." style={{
              flex:1,background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.12)',
              borderRadius:8,padding:'8px 12px',fontSize:12,color:'rgba(255,255,255,.8)',
              fontFamily:'DM Sans,sans-serif',outline:'none',
            }}
          />
          <button onClick={send} disabled={!input.trim()||loading} style={{
            padding:'8px 16px',borderRadius:8,background:'rgba(201,168,76,.2)',
            border:'0.5px solid rgba(201,168,76,.3)',color:'#C9A84C',
            fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',
            opacity:(!input.trim()||loading)?0.4:1,transition:'opacity .15s',
          }}>Send</button>
        </div>
      </div>
    </div>
  );
}
