import { useState, useEffect } from 'react';
import { fetchPromptResponse } from '../lib/api';

// Mock fallback responses (used if backend unavailable)
const MOCK_RESPONSES = {
  'Plan my Saturday': { title:'Your Saturday', intro:'Perfect weather Saturday. Here\'s a full day:', items:[{time:'9:00 AM',icon:'🌿',title:'Billy Goat Trail',detail:'Great Falls, MD · Free · Best spring wildflowers right now'},{time:'2:00 PM',icon:'🌸',title:'Petalpalooza at Yards Park',detail:'Yards Park, DC · Free · Last weekend for cherry blossoms'},{time:'4:00 PM',icon:'🍺',title:'Oyster happy hour at Salt Line',detail:'Navy Yard · $2/oyster · You\'re already steps away'},{time:'8:00 PM',icon:'🎵',title:'Blues Alley late set',detail:'Georgetown · $35 · Cap the night with jazz'}], note:'Sunday has rain — go big today.' },
  'Date night': { title:'Date night · Saturday', intro:'Something upscale and intentional:', items:[{time:'6:30 PM',icon:'🍸',title:'Cocktails at Columbia Room',detail:'Shaw · $$$ · Pre-dinner cocktail course'},{time:'8:00 PM',icon:'🍽',title:'Dinner at Tail Up Goat',detail:'Adams Morgan · $$$ · Inventive small plates'},{time:'10:00 PM',icon:'🎵',title:'Blues Alley late set',detail:'Georgetown · $35 · Perfect closer'}], note:'Reserve Columbia Room and Tail Up Goat now — they fill up.' },
};

export default function AIPromptModal({ prompt, settings, activeProfile, onClose }) {
  const [loading,  setLoading]  = useState(true);
  const [response, setResponse] = useState(null);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPromptResponse(prompt.label, settings?.city || 'Falls Church, VA', activeProfile)
      .then(data => {
        if (!cancelled) {
          setResponse(data);
          setLoading(false);
        }
      })
      .catch(e => {
        if (!cancelled) {
          console.warn('Using mock prompt response:', e.message);
          // Fall back to mock
          const mock = MOCK_RESPONSES[prompt.label] || {
            title: prompt.label,
            intro: 'Here are some great options based on your preferences:',
            items: [{ time:'Any time', icon:'✨', title:'Connecting to backend...', detail:'Make sure your backend is running at localhost:3001' }],
            note: '',
          };
          setResponse(mock);
          setLoading(false);
          setError(e.message);
        }
      });

    return () => { cancelled = true; };
  }, [prompt.label, settings?.city, activeProfile?.id]);

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.6)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:70, padding:'20px 16px',
    }} onClick={onClose}>
      <div className="scale-enter" onClick={e => e.stopPropagation()} style={{
        background:'#1C1A17', borderRadius:16,
        border:'0.5px solid rgba(255,255,255,.1)',
        width:'100%', maxWidth:560,
        maxHeight:'85vh', display:'flex', flexDirection:'column',
        overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{ padding:'14px 18px', borderBottom:'0.5px solid rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:11, color:'#C9A84C', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:3 }}>
              🎤 Locale AI {error && <span style={{ color:'rgba(255,165,0,.7)', fontSize:9 }}>(cached)</span>}
            </div>
            <div className="serif" style={{ fontSize:18, color:'rgba(255,255,255,.9)', fontWeight:300 }}>
              {loading ? 'Thinking...' : (response?.title || prompt.label)}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.07)', border:'0.5px solid rgba(255,255,255,.12)', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'DM Sans, sans-serif', color:'rgba(255,255,255,.55)' }}>Done</button>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 18px' }} className="no-scroll">
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px 0' }}>
              <div style={{ fontSize:24, marginBottom:12, animation:'blink 1s ease-in-out infinite' }}>⟳</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.4)' }}>Getting real-time local recommendations...</div>
            </div>
          ) : response ? (
            <>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.55)', lineHeight:1.6, marginBottom:16 }}>
                {response.intro}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {(response.items || []).map((item, i) => (
                  <div key={i} style={{ display:'flex', gap:12, padding:'11px 13px', background:'rgba(255,255,255,.04)', border:'0.5px solid rgba(255,255,255,.07)', borderRadius:10 }}>
                    <div style={{ flexShrink:0, textAlign:'center' }}>
                      <div style={{ fontSize:20, marginBottom:4 }}>{item.icon}</div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', whiteSpace:'nowrap' }}>{item.time}</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,.85)', marginBottom:3 }}>{item.title}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', lineHeight:1.5 }}>{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              {response.note && (
                <div style={{ marginTop:14, padding:'10px 13px', background:'rgba(201,168,76,.1)', border:'0.5px solid rgba(201,168,76,.2)', borderRadius:9, fontSize:12, color:'rgba(201,168,76,.85)', lineHeight:1.6 }}>
                  💡 {response.note}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
