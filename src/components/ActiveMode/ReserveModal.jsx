import { useState } from 'react';
import { getWeekendDateStr } from './utils';

export default function ReserveModal({ activity, catId, onClose, homeAddress }) {
  const [step,setStep]=useState(1); const [party,setParty]=useState(2); const [time,setTime]=useState('7:00 PM');
  const {satStr}=getWeekendDateStr();
  const isTicket=['sports','music'].includes(catId)||activity.tags?.some(t=>['baseball','concert','theater','arena','stadium'].includes(t));
  const isFood=['food'].includes(catId)||activity.reservable;
  const platform=isTicket?'StubHub':isFood?'Resy':'OpenTable';
  const platformColor=isTicket?'#60A5FA':isFood?'#F97316':'#34D399';
  const platformBg=isTicket?'rgba(96,165,250,.2)':isFood?'rgba(249,115,22,.2)':'rgba(52,211,153,.2)';
  const platformBorder=isTicket?'rgba(96,165,250,.3)':isFood?'rgba(249,115,22,.3)':'rgba(52,211,153,.3)';
  const times=isTicket?['General Admission','Section 101 Row C','Section 114 Row F','VIP Floor']:['6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM'];
  const handleBook=()=>{
    const v=encodeURIComponent(activity.title);
    if(platform==='Resy') window.open(`https://resy.com/cities/washington-dc?query=${v}`,'_blank');
    else if(platform==='OpenTable') window.open(`https://www.opentable.com/s?term=${v}&covers=${party}`,'_blank');
    else window.open(`https://www.stubhub.com/find/s/?q=${v}`,'_blank');
    setStep(3);
  };
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:75,padding:20}} onClick={onClose}>
      <div className="scale-enter" onClick={e=>e.stopPropagation()} style={{background:'#1C1A17',borderRadius:14,border:'0.5px solid rgba(255,255,255,.1)',width:310,maxWidth:'100%',overflow:'hidden'}}>
        <div style={{padding:'13px 17px',borderBottom:'0.5px solid rgba(255,255,255,.08)',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div><div style={{fontSize:11,color:platformColor,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:2}}>{isTicket?'🎟':'🍽'} {platform}</div>
          <div className="serif" style={{fontSize:15,color:'rgba(255,255,255,.9)',fontWeight:300}}>{activity.title}</div></div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.1)',borderRadius:7,padding:'3px 9px',fontSize:12,cursor:'pointer',fontFamily:'DM Sans,sans-serif',color:'rgba(255,255,255,.5)'}}>✕</button>
        </div>
        {step===1&&<div style={{padding:'14px 17px'}}>
          {!isTicket&&<><div style={{fontSize:10,color:'rgba(255,255,255,.4)',letterSpacing:'.05em',textTransform:'uppercase',marginBottom:7}}>Party size</div>
          <div style={{display:'flex',gap:5,marginBottom:13}}>{[1,2,3,4,5,6].map(n=><button key={n} onClick={()=>setParty(n)} style={{width:34,height:34,borderRadius:8,border:'0.5px solid rgba(255,255,255,.12)',background:party===n?platformBg:'rgba(255,255,255,.05)',color:party===n?platformColor:'rgba(255,255,255,.6)',cursor:'pointer',fontSize:13,fontWeight:500,fontFamily:'DM Sans,sans-serif',transition:'all .12s'}}>{n}</button>)}</div></>}
          <div style={{fontSize:10,color:'rgba(255,255,255,.4)',letterSpacing:'.05em',textTransform:'uppercase',marginBottom:7}}>{isTicket?'Section':'Time'}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:13}}>{times.map(t=><button key={t} onClick={()=>setTime(t)} style={{padding:'7px 5px',borderRadius:8,border:'0.5px solid rgba(255,255,255,.12)',background:time===t?platformBg:'rgba(255,255,255,.05)',color:time===t?platformColor:'rgba(255,255,255,.6)',cursor:'pointer',fontSize:11,fontFamily:'DM Sans,sans-serif',transition:'all .12s',textAlign:'center'}}>{t}</button>)}</div>
          <button onClick={()=>setStep(2)} style={{width:'100%',padding:10,borderRadius:9,background:platformBg,color:platformColor,border:`0.5px solid ${platformBorder}`,fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Continue → {!isTicket&&`${party} guests · `}{time}</button>
        </div>}
        {step===2&&<div style={{padding:'14px 17px'}}>
          <div style={{background:'rgba(255,255,255,.04)',borderRadius:9,padding:'11px 13px',marginBottom:13}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,.6)',lineHeight:1.7}}>
              <div><strong style={{color:'rgba(255,255,255,.82)'}}>{activity.title}</strong></div>
              <div>{activity.where}</div><div>{satStr} · {time}{!isTicket&&` · ${party} guests`}</div>
              <div style={{color:platformColor,marginTop:3,fontSize:11}}>via {platform}{!isTicket&&' -- free to cancel'}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>setStep(1)} style={{flex:1,padding:8,borderRadius:8,background:'transparent',border:'0.5px solid rgba(255,255,255,.12)',fontSize:12,cursor:'pointer',fontFamily:'DM Sans,sans-serif',color:'rgba(255,255,255,.4)'}}>Back</button>
            <button onClick={handleBook} style={{flex:2,padding:8,borderRadius:8,background:platformBg,color:platformColor,border:`0.5px solid ${platformBorder}`,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Open {platform} →</button>
          </div>
        </div>}
        {step===3&&<div style={{padding:'22px 17px',textAlign:'center'}}>
          <div style={{fontSize:38,marginBottom:10}}>{isTicket?'🎟':'✅'}</div>
          <div style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.9)',marginBottom:5}}>Opening {platform}...</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.4)',lineHeight:1.7,marginBottom:14}}>{activity.title}<br/>Complete your booking on {platform}</div>
          <button onClick={onClose} style={{padding:'8px 22px',borderRadius:99,background:'rgba(255,255,255,.08)',border:'0.5px solid rgba(255,255,255,.12)',fontSize:12,color:'rgba(255,255,255,.7)',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Done</button>
        </div>}
      </div>
    </div>
  );
}
