import { useState, useEffect } from 'react';
import { ALL_CATEGORIES } from '../../data/content';

export function SpotlightHero({ activities, onCal }) {
  const hero = Object.values(activities).flat()
    .filter(a=>a&&a.title)
    .sort((a,b)=>((b.final_score||b.base_score||0)+(b.expires?0.5:0))-((a.final_score||a.base_score||0)+(a.expires?0.5:0)))[0];

  if (!hero) return null;
  const cat = ALL_CATEGORIES.find(c=>(hero.categories||[hero.category||'']).includes(c.id));

  return (
    <div onClick={()=>onCal(hero)} style={{
      margin:'0 0 8px',background:'linear-gradient(135deg,#1C1A17 0%,#2A2520 100%)',
      border:'0.5px solid rgba(201,168,76,.25)',borderRadius:12,padding:'14px 16px',
      cursor:'pointer',transition:'all .15s',
    }}
      onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.5)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.25)'}
    >
      <div style={{fontSize:9,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#C9A84C',marginBottom:6}}>⭐ Spotlight this weekend</div>
      {cat&&<span className={cat.cls} style={{fontSize:9,padding:'1px 7px',borderRadius:99,marginBottom:6,display:'inline-block'}}>{cat.icon} {cat.label}</span>}
      <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:22,fontWeight:400,color:'rgba(255,255,255,.95)',lineHeight:1.2,marginBottom:5}}>{hero.title}</div>
      <div style={{fontSize:11,color:'rgba(255,255,255,.5)',marginBottom:4}}>{hero.when} · {hero.where} · {hero.cost}</div>
      <div style={{fontSize:11,color:'rgba(255,255,255,.38)',fontStyle:'italic'}}>{hero.why}</div>
      {hero.expires&&<div style={{fontSize:10,color:'#C9A84C',marginTop:6}}>⚡ Expiring this weekend -- don't miss it</div>}
    </div>
  );
}

export function SpotlightOverlay({ activities, onDismiss, onCal }) {
  const [visible, setVisible] = useState(true);
  const hero = Object.values(activities).flat()
    .filter(a=>a&&a.title)
    .sort((a,b)=>((b.final_score||b.base_score||0)+(b.expires?0.5:0))-((a.final_score||a.base_score||0)+(a.expires?0.5:0)))[0];

  useEffect(()=>{ const t=setTimeout(()=>{setVisible(false);onDismiss();},5000); return ()=>clearTimeout(t); },[]);

  if (!visible||!hero) return null;
  const cat = ALL_CATEGORIES.find(c=>(hero.categories||[]).includes(c.id));

  return (
    <div onClick={()=>{setVisible(false);onDismiss();}} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:60,
      display:'flex',alignItems:'center',justifyContent:'center',padding:24,
      animation:'fadeIn 300ms ease both',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'#1C1A17',borderRadius:16,border:'0.5px solid rgba(201,168,76,.3)',
        padding:28,maxWidth:420,width:'100%',
        animation:'scaleIn 350ms cubic-bezier(.34,1.56,.64,1) both',
      }}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'#C9A84C',marginBottom:10}}>⭐ This weekend's spotlight</div>
        {cat&&<span className={cat.cls} style={{fontSize:10,padding:'2px 9px',borderRadius:99,marginBottom:10,display:'inline-block'}}>{cat.icon} {cat.label}</span>}
        <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:28,fontWeight:400,color:'rgba(255,255,255,.95)',lineHeight:1.2,marginBottom:8}}>{hero.title}</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.5)',marginBottom:8}}>{hero.when} · {hero.where} · {hero.cost}</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.5)',fontStyle:'italic',lineHeight:1.6,marginBottom:16}}>{hero.why}</div>
        {hero.expires&&<div style={{fontSize:11,color:'#C9A84C',marginBottom:16}}>⚡ Last chance this weekend</div>}
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>onCal(hero)} style={{flex:1,padding:10,borderRadius:9,background:'rgba(201,168,76,.2)',border:'0.5px solid rgba(201,168,76,.3)',color:'#C9A84C',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Add to calendar</button>
          <button onClick={()=>{setVisible(false);onDismiss();}} style={{padding:'10px 16px',borderRadius:9,background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.4)',fontSize:12,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Dismiss</button>
        </div>
        <div style={{fontSize:10,color:'rgba(255,255,255,.2)',textAlign:'center',marginTop:10}}>Auto-dismisses in 5s</div>
      </div>
    </div>
  );
}
